import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { MemberStatus, PaymentPurpose, PaymentStatus, Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { MemberAccessService } from "../auth/member-access.service";
import { PrismaService } from "../prisma/prisma.service";
import type { RecordChandaPaymentDto, RecordRenewalDto } from "./dto/record-renewal.dto";

type MemberWithRules = Prisma.MemberGetPayload<{
  include: {
    membershipType: true;
    memberships: { include: { membershipType: true }; orderBy: { endsAt: "desc" } };
    payments: true;
  };
}>;

type PublicDirectoryQuery = {
  search?: string;
  membershipTypeId?: string;
  page?: string | number;
  limit?: string | number;
};

type PublicMemberWithRules = Prisma.MemberGetPayload<{
  include: {
    membershipType: true;
    memberships: { include: { membershipType: true }; orderBy: { endsAt: "desc" } };
    payments: true;
    formValues: { include: { field: true } };
  };
}>;

@Injectable()
export class RenewalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly memberAccess: MemberAccessService
  ) {}

  calculateRenewalPeriod(start: Date, cycle?: string | null) {
    const startsAt = this.startOfDay(start);
    const endsAt = new Date(startsAt);
    const normalizedCycle = cycle ?? "yearly";

    if (normalizedCycle === "monthly") {
      endsAt.setMonth(endsAt.getMonth() + 1);
    } else {
      endsAt.setFullYear(endsAt.getFullYear() + 1);
    }

    endsAt.setDate(endsAt.getDate() - 1);
    return { startsAt, endsAt };
  }

  async getMemberRenewalState(memberId: string) {
    const member = await this.loadMember(memberId);
    return this.buildSummary(member);
  }

  async getMyRenewalState(user: AuthenticatedUser) {
    const member = await this.memberAccess.requirePortalMember(user.id, this.memberIncludes());
    return this.buildSummary(member);
  }

  async publicDirectory(query: PublicDirectoryQuery = {}) {
    const page = Math.max(1, Number(query.page ?? 1) || 1);
    const limit = Math.min(Math.max(1, Number(query.limit ?? 12) || 12), 50);
    const search = query.search?.trim();
    const [members, membershipTypes] = await this.prisma.$transaction([
      this.prisma.member.findMany({
        where: {
          status: { in: [MemberStatus.active, MemberStatus.expired] },
          membershipTypeId: query.membershipTypeId,
          OR: search
            ? [
                { fullName: { contains: search, mode: "insensitive" } },
                { memberId: { contains: search, mode: "insensitive" } },
                { membershipType: { name: { contains: search, mode: "insensitive" } } }
              ]
            : undefined
        },
        include: this.publicMemberIncludes(),
        orderBy: { fullName: "asc" }
      }),
      this.prisma.membershipType.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true }
      })
    ]);

    const visible = members
      .map((member) => this.buildSummary(member))
      .map((summary, index) => ({ summary, member: members[index] }))
      .filter(({ summary }) => summary.directoryVisible)
      .map(({ summary, member }) => this.serializePublicMember(member, summary));
    const start = (page - 1) * limit;

    return {
      items: visible.slice(start, start + limit),
      page,
      limit,
      total: visible.length,
      totalPages: Math.ceil(visible.length / limit),
      filters: {
        membershipTypes
      }
    };
  }

  async visibleDirectoryMembers() {
    const directory = await this.publicDirectory({ limit: 50 });
    return directory.items;
  }

  async verifyPublicMember(identifier: string) {
    const member = await this.prisma.member.findFirst({
      where: {
        OR: [{ id: identifier }, { memberId: identifier }]
      },
      include: this.publicMemberIncludes()
    });

    if (!member) {
      throw new NotFoundException("Member verification record not found.");
    }

    const summary = this.buildSummary(member);
    if (!summary.directoryVisible) {
      throw new NotFoundException("Member verification record not found.");
    }

    return {
      verified: true,
      member: this.serializePublicMember(member, summary)
    };
  }

  async syncMemberExpiry(memberId: string) {
    const member = await this.loadMember(memberId);
    const summary = this.buildSummary(member);
    const shouldExpire = summary.renewal.status === "expired" && member.status === MemberStatus.active;
    const shouldRestore = summary.renewal.status !== "expired" && member.status === MemberStatus.expired;

    if (!shouldExpire && !shouldRestore) {
      return summary;
    }

    const nextStatus = shouldExpire ? MemberStatus.expired : MemberStatus.active;
    await this.prisma.$transaction([
      this.prisma.member.update({
        where: { id: memberId },
        data: {
          status: nextStatus,
          expiredAt: shouldExpire ? new Date() : null
        }
      }),
      this.prisma.memberStatusLog.create({
        data: {
          memberId,
          fromStatus: member.status,
          toStatus: nextStatus,
          note: shouldExpire ? "Renewal grace period expired." : "Renewal is current."
        }
      })
    ]);

    return this.getMemberRenewalState(memberId);
  }

  async recordRenewal(memberId: string, dto: RecordRenewalDto, user: AuthenticatedUser) {
    const member = await this.loadMember(memberId);
    if (!member.membershipType) throw new BadRequestException("Member does not have a membership type.");

    const startsAt = dto.startsAt
      ? this.startOfDay(new Date(dto.startsAt))
      : this.nextRenewalStart(member);
    const period = this.calculateRenewalPeriod(startsAt, member.membershipType.renewalCycle);
    const amount = dto.amount ?? Number(member.membershipType.renewalFee);

    await this.prisma.$transaction(async (tx) => {
      const membership = await tx.membership.create({
        data: {
          memberId,
          membershipTypeId: member.membershipTypeId!,
          startsAt: period.startsAt,
          endsAt: period.endsAt,
          status: MemberStatus.active
        }
      });

      if (amount > 0) {
        await tx.payment.create({
          data: {
            memberId,
            membershipId: membership.id,
            amountCents: Math.round(amount * 100),
            purpose: PaymentPurpose.renewal,
            status: PaymentStatus.paid,
            paidAt: new Date()
          }
        });
      }

      await tx.member.update({
        where: { id: memberId },
        data: {
          status: MemberStatus.active,
          expiredAt: null
        }
      });
    });

    await this.audit.log({
      userId: user.id,
      module: "renewals",
      action: "record_renewal",
      entityType: "Member",
      entityId: memberId,
      metadata: {
        startsAt: period.startsAt.toISOString(),
        endsAt: period.endsAt.toISOString(),
        amount
      }
    });

    return this.getMemberRenewalState(memberId);
  }

  async recordChandaPayment(memberId: string, dto: RecordChandaPaymentDto, user: AuthenticatedUser) {
    await this.loadMember(memberId);
    await this.prisma.payment.create({
      data: {
        memberId,
        amountCents: Math.round(dto.amount * 100),
        purpose: PaymentPurpose.chanda,
        status: PaymentStatus.paid,
        paidAt: new Date()
      }
    });

    await this.audit.log({
      userId: user.id,
      module: "renewals",
      action: "record_chanda_payment",
      entityType: "Member",
      entityId: memberId,
      metadata: { amount: dto.amount }
    });

    return this.getMemberRenewalState(memberId);
  }

  buildSummary(member: MemberWithRules, at = new Date()) {
    const membershipType = member.membershipType;
    const latestMembership = member.memberships[0] ?? null;
    const joinedAt = member.joinedAt ?? member.approvedAt ?? member.createdAt;
    const renewalRequired = Boolean(membershipType?.renewalRequired);
    const gracePeriodDays = membershipType?.gracePeriodDays ?? 0;
    const now = this.startOfDay(at);
    const renewalBase = latestMembership
      ? { startsAt: latestMembership.startsAt, endsAt: latestMembership.endsAt }
      : this.calculateRenewalPeriod(joinedAt, membershipType?.renewalCycle);
    const graceEndsAt = this.addDays(renewalBase.endsAt, gracePeriodDays);

    let renewalStatus: "not_required" | "current" | "due" | "expired" = "not_required";
    if (renewalRequired) {
      if (now > graceEndsAt) renewalStatus = "expired";
      else if (now > this.startOfDay(renewalBase.endsAt)) renewalStatus = "due";
      else renewalStatus = "current";
    }

    const chanda = this.calculateChanda(member, now);
    const directoryVisible = this.isDirectoryVisible(member, renewalStatus);

    return {
      member: {
        id: member.id,
        userId: member.userId,
        memberId: member.memberId,
        fullName: member.fullName,
        email: member.email,
        phone: member.phone,
        status: renewalStatus === "expired" ? MemberStatus.expired : member.status,
        joinedAt: member.joinedAt?.toISOString() ?? null,
        expiredAt: member.expiredAt?.toISOString() ?? null
      },
      membershipType: membershipType
        ? {
            id: membershipType.id,
            name: membershipType.name,
            code: membershipType.code,
            renewalRequired: membershipType.renewalRequired,
            renewalFee: Number(membershipType.renewalFee),
            renewalCycle: membershipType.renewalCycle,
            gracePeriodDays: membershipType.gracePeriodDays,
            directoryVisibleWhenExpired: membershipType.directoryVisibleWhenExpired,
            monthlyChandaRequired: membershipType.monthlyChandaRequired,
            monthlyChandaAmount: Number(membershipType.monthlyChandaAmount)
          }
        : null,
      renewal: {
        required: renewalRequired,
        status: renewalStatus,
        cycle: membershipType?.renewalCycle ?? null,
        fee: membershipType ? Number(membershipType.renewalFee) : 0,
        periodStartsAt: renewalRequired ? renewalBase.startsAt.toISOString() : null,
        periodEndsAt: renewalRequired ? renewalBase.endsAt.toISOString() : null,
        graceEndsAt: renewalRequired ? graceEndsAt.toISOString() : null,
        daysUntilDue: renewalRequired ? this.daysBetween(now, this.startOfDay(renewalBase.endsAt)) : null,
        latestMembership: latestMembership
          ? {
              id: latestMembership.id,
              startsAt: latestMembership.startsAt.toISOString(),
              endsAt: latestMembership.endsAt.toISOString(),
              status: latestMembership.status
            }
          : null
      },
      chanda,
      directoryVisible
    };
  }

  private calculateChanda(member: MemberWithRules, now: Date) {
    const membershipType = member.membershipType;
    const required = Boolean(membershipType?.monthlyChandaRequired);
    const monthlyAmount = membershipType ? Number(membershipType.monthlyChandaAmount) : 0;
    if (!required || monthlyAmount <= 0) {
      return {
        required,
        monthlyAmount,
        monthsDue: 0,
        totalDue: 0,
        paidTotal: this.paidTotal(member, PaymentPurpose.chanda),
        balance: 0
      };
    }

    const start = this.startOfMonth(member.joinedAt ?? member.approvedAt ?? member.createdAt);
    const monthsDue = Math.max(0, (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1);
    const totalDue = monthsDue * monthlyAmount;
    const paidTotal = this.paidTotal(member, PaymentPurpose.chanda);
    return {
      required,
      monthlyAmount,
      monthsDue,
      totalDue,
      paidTotal,
      balance: Math.max(0, totalDue - paidTotal)
    };
  }

  private isDirectoryVisible(member: MemberWithRules, renewalStatus: string) {
    if (member.status !== MemberStatus.active && member.status !== MemberStatus.expired) return false;
    if (!member.membershipType?.renewalRequired) return member.status === MemberStatus.active;
    if (renewalStatus !== "expired") return true;
    return member.membershipType.directoryVisibleWhenExpired;
  }

  private nextRenewalStart(member: MemberWithRules) {
    const latest = member.memberships[0];
    if (!latest) return this.startOfDay(member.joinedAt ?? member.approvedAt ?? member.createdAt);
    return this.addDays(latest.endsAt, 1);
  }

  private paidTotal(member: MemberWithRules, purpose: PaymentPurpose) {
    return member.payments
      .filter((payment) => payment.purpose === purpose && payment.status === PaymentStatus.paid)
      .reduce((sum, payment) => sum + payment.amountCents / 100, 0);
  }

  private async loadMember(memberId: string) {
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      include: this.memberIncludes()
    });
    if (!member) throw new NotFoundException("Member not found.");
    return member;
  }

  private memberIncludes() {
    return {
      membershipType: true,
      memberships: {
        include: { membershipType: true },
        orderBy: { endsAt: "desc" as const }
      },
      payments: true
    };
  }

  private publicMemberIncludes() {
    return {
      ...this.memberIncludes(),
      formValues: {
        where: {
          field: {
            active: true,
            publicVisible: true,
            adminOnly: false
          }
        },
        include: {
          field: true
        },
        orderBy: {
          fieldLabelSnapshot: "asc" as const
        }
      }
    };
  }

  private serializePublicMember(member: PublicMemberWithRules, summary: ReturnType<RenewalsService["buildSummary"]>) {
    return {
      id: member.id,
      memberId: member.memberId,
      fullName: member.fullName,
      photo: member.photo,
      email: summary.member.email,
      phone: summary.member.phone,
      status: summary.member.status,
      joinedAt: summary.member.joinedAt,
      membershipType: summary.membershipType
        ? {
            id: summary.membershipType.id,
            name: summary.membershipType.name,
            code: summary.membershipType.code
          }
        : null,
      renewal: {
        status: summary.renewal.status,
        required: summary.renewal.required
      },
      publicFields: member.formValues
        .filter((value) => this.isPublicProfileField(value.fieldKeySnapshot, value.fieldLabelSnapshot))
        .map((value) => ({
          key: value.fieldKeySnapshot,
          label: value.fieldLabelSnapshot,
          type: value.fieldTypeSnapshot,
          value: value.fileUrl
            ? {
                fileUrl: value.fileUrl,
                fileName: value.fileName,
                mimeType: value.mimeType,
                fileSize: value.fileSize
              }
            : value.value
        }))
    };
  }

  private isPublicProfileField(key: string, label: string) {
    const normalized = `${key} ${label}`.toLowerCase().replace(/[^a-z0-9]/g, "");
    const blockedTerms = [
      "payment",
      "transaction",
      "trx",
      "receipt",
      "bkash",
      "nagad",
      "rocket",
      "amount",
      "renewal",
      "membershiptype",
      "membertype",
      "signature",
      "typedname",
      "consent",
      "declaration",
      "confirmed",
      "agreed"
    ];
    if (blockedTerms.some((term) => normalized.includes(term))) return false;
    return [
      "gender",
      "blood",
      "bloodgroup",
      "session",
      "batch",
      "graduation",
      "graduationyear",
      "degree",
      "occupation",
      "profession",
      "organization",
      "organisation",
      "company",
      "designation",
      "workaddress",
      "linkedin",
      "website",
      "facebook",
      "instagram"
    ].some((term) => normalized.includes(term));
  }

  private startOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  private startOfMonth(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  private addDays(date: Date, days: number) {
    const next = this.startOfDay(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private daysBetween(from: Date, to: Date) {
    return Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
  }
}
