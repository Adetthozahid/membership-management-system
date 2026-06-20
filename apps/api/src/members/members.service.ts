import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { FormField, FormFieldType, MemberStatus, Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { MemberAccessService } from "../auth/member-access.service";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { RenewalsService } from "../renewals/renewals.service";
import type { CreateMemberPaymentDto } from "./dto/create-member-payment.dto";
import type { MemberQueryDto } from "./dto/member-query.dto";
import type { UpdateMemberStatusDto } from "./dto/update-member-status.dto";
import type { ApproveApplicationDto, RejectApplicationDto, RequestCorrectionDto, SubmitCorrectionDto } from "./dto/application-workflow.dto";

const fileTypes: FormFieldType[] = [FormFieldType.file, FormFieldType.image, FormFieldType.document];
const registrationFormCode = "registration";
const paymentProofUploadRoot = join(process.cwd(), "uploads", "payments");
const allowedPaymentProofMimeTypes = new Set(["image/png", "image/jpeg", "image/webp", "application/pdf"]);
type MemberNotificationType = "notice" | "event" | "post" | "gallery" | "website";
type MemberNotificationPreferenceInput = Partial<Record<"noticeEnabled" | "eventEnabled" | "postEnabled" | "galleryEnabled" | "websiteEnabled", boolean>>;
const portalEnabledStatuses = new Set<MemberStatus>([MemberStatus.active]);

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly memberAccess: MemberAccessService,
    private readonly mail: MailService,
    private readonly renewals: RenewalsService
  ) {}

  async list(query: MemberQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const where: Prisma.MemberWhereInput = {
      status: query.status,
      membershipTypeId: query.membershipTypeId,
      OR: query.search
        ? [
            { fullName: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } },
            { phone: { contains: query.search, mode: "insensitive" } },
            { memberId: { contains: query.search, mode: "insensitive" } }
          ]
        : undefined
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.member.findMany({
        where,
        include: {
          membershipType: true
        },
        orderBy: {
          createdAt: "desc"
        },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.member.count({ where })
    ]);

    return {
      items: items.map((member) => this.serializeListItem(member)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }

  async details(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      include: {
        membershipType: true,
        statusLogs: {
          orderBy: { createdAt: "desc" },
          take: 50
        },
        documents: {
          orderBy: { createdAt: "desc" }
        },
        formValues: {
          include: { field: true },
          orderBy: { createdAt: "asc" }
        },
        correctionRequests: {
          orderBy: { createdAt: "desc" }
        },
        correctionSubmissions: {
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!member) {
      throw new NotFoundException("Member not found.");
    }

    const correctionFieldLabels = await this.correctionFieldLabels(member.membershipTypeId ?? undefined, member.formValues);

    return {
      ...this.serializeListItem(member),
      photo: member.photo,
      userId: member.userId,
      approvalNote: member.approvalNote,
      rejectionReason: member.rejectionReason,
      correctionRequestedAt: member.correctionRequestedAt?.toISOString() ?? null,
      correctionNote: member.correctionNote,
      approvedByUserId: member.approvedByUserId,
      rejectedByUserId: member.rejectedByUserId,
      correctionByUserId: member.correctionByUserId,
      approvedAt: member.approvedAt?.toISOString() ?? null,
      expiredAt: member.expiredAt?.toISOString() ?? null,
      statusLogs: member.statusLogs.map((log) => ({
        id: log.id,
        fromStatus: log.fromStatus,
        toStatus: log.toStatus,
        note: log.note,
        changedByUserId: log.changedByUserId,
        createdAt: log.createdAt.toISOString()
      })),
      documents: member.documents.map((document) => ({
        ...document,
        createdAt: document.createdAt.toISOString()
      })),
      formValues: member.formValues.map((value) => this.serializeFormValue(value)),
      correctionRequests: member.correctionRequests.map((request) => ({
        id: request.id,
        message: request.message,
        fieldKeys: Array.isArray(request.fieldKeys) ? request.fieldKeys : [],
        documentTypes: Array.isArray(request.documentTypes) ? request.documentTypes : [],
        requestedByUserId: request.requestedByUserId,
        resolvedAt: request.resolvedAt?.toISOString() ?? null,
        createdAt: request.createdAt.toISOString()
      })),
      correctionSubmissions: member.correctionSubmissions.map((submission) => ({
        id: submission.id,
        requestId: submission.requestId,
        message: submission.message,
        values: this.asRecord(submission.values),
        fieldLabels: this.labelsForValues(this.asRecord(submission.values), correctionFieldLabels),
        documents: Array.isArray(submission.documents) ? submission.documents : [],
        createdAt: submission.createdAt.toISOString()
      }))
    };
  }

  async pendingApplications(query: MemberQueryDto) {
    return this.list({
      ...query,
      status: query.status ?? MemberStatus.pending
    });
  }

  async pendingCorrections(query: MemberQueryDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const where: Prisma.MemberCorrectionSubmissionWhereInput = {
      member: query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: "insensitive" } },
              { email: { contains: query.search, mode: "insensitive" } },
              { phone: { contains: query.search, mode: "insensitive" } },
              { memberId: { contains: query.search, mode: "insensitive" } }
            ]
          }
        : undefined
    };

    const [submissions, totalRaw] = await this.prisma.$transaction([
      this.prisma.memberCorrectionSubmission.findMany({
        where,
        include: {
          member: {
            include: {
              membershipType: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: Math.min(limit * 3, 100)
      }),
      this.prisma.memberCorrectionSubmission.count({ where })
    ]);

    const appliedLogs = await this.prisma.auditLog.findMany({
      where: {
        action: "member_registration_correction_applied",
        entityType: "MemberCorrectionSubmission",
        entityId: {
          in: submissions.map((submission) => submission.id)
        }
      },
      select: {
        entityId: true
      }
    });
    const appliedSubmissionIds = new Set(appliedLogs.map((log) => log.entityId).filter(Boolean));
    const pendingItems = submissions.filter((submission) => !appliedSubmissionIds.has(submission.id));
    const items = pendingItems.slice((page - 1) * limit, page * limit);
    const appliedInWindow = submissions.length - pendingItems.length;
    const total = Math.max(pendingItems.length, totalRaw - appliedInWindow);

    return {
      items: await Promise.all(
        items.map(async (submission) => {
          const values = this.asRecord(submission.values);
          const fieldLabels = await this.correctionFieldLabels(submission.member.membershipTypeId ?? undefined);
          return {
            id: submission.id,
            requestId: submission.requestId,
            memberId: submission.memberId,
            member: this.serializeListItem(submission.member),
            message: submission.message,
            values,
            fieldLabels: this.labelsForValues(values, fieldLabels),
            documents: Array.isArray(submission.documents) ? submission.documents : [],
            createdAt: submission.createdAt.toISOString()
          };
        })
      ),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }

  async myProfile(user: AuthenticatedUser) {
    const member = await this.loadOwnMember(user.id, {
      membershipType: true,
      user: true,
      formValues: {
        where: {
          field: {
            active: true,
            adminOnly: false,
            key: {
              in: ["website_url", "facebook_url", "instagram_url", "linkedin_url"]
            }
          }
        },
        include: {
          field: true
        },
        orderBy: {
          fieldLabelSnapshot: "asc"
        }
      }
    });
    const socialValues = new Map(member.formValues.map((value) => [value.fieldKeySnapshot, value]));
    const socialDefinitions = [
      { key: "website_url", label: "Website" },
      { key: "facebook_url", label: "Facebook" },
      { key: "instagram_url", label: "Instagram" },
      { key: "linkedin_url", label: "LinkedIn" }
    ];

    return {
      id: member.id,
      userId: member.userId!,
      memberId: member.memberId,
      memberNumber: member.memberId,
      fullName: member.fullName,
      email: member.email,
      username: member.email,
      mustChangePassword: member.user?.mustChangePassword ?? false,
      phone: member.phone,
      photo: member.photo,
      status: member.status,
      membershipTypeId: member.membershipTypeId,
      membershipType: member.membershipType
        ? {
            id: member.membershipType.id,
            name: member.membershipType.name,
            code: member.membershipType.code
          }
        : null,
      joinedAt: member.joinedAt?.toISOString() ?? null,
      approvedAt: member.approvedAt?.toISOString() ?? null,
      expiredAt: member.expiredAt?.toISOString() ?? null,
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
      socialLinks: socialDefinitions.map((item) => ({
        key: item.key,
        label: item.label,
        value: socialValues.get(item.key)?.value ?? ""
      })),
      editing: {
        directEditAllowed: false,
        updateRequestAvailable: true,
        message: "Direct profile editing is not enabled. Please request corrections through the organization."
      }
    };
  }

  async myRegistrationData(user: AuthenticatedUser) {
    const member = await this.loadOwnMember(user.id, {
      formValues: true
    });
    const fields = await this.publicFields(member.membershipTypeId ?? undefined);
    const valuesByFieldId = new Map(member.formValues.map((value) => [value.fieldId, value]));

    const sectionMap = new Map<
      string,
      {
        id: string;
        title: string;
        description: string | null;
        sortOrder: number;
        fields: Array<{
          id: string;
          key: string;
          label: string;
          type: FormFieldType;
          placeholder: string | null;
          helpText: string | null;
          required: boolean;
          memberEditable: boolean;
          options: Prisma.JsonValue | null;
          value: Prisma.JsonValue | null;
          fileUrl: string | null;
          fileName: string | null;
          mimeType: string | null;
          fileSize: number | null;
          updatedAt: string;
        }>;
      }
    >();

    for (const field of fields) {
      const section = field.section;
      if (!section.active) continue;
      const value = valuesByFieldId.get(field.id);
      const row =
        sectionMap.get(section.id) ??
        {
          id: section.id,
          title: section.title,
          description: section.description,
          sortOrder: section.sortOrder,
          fields: []
        };
      row.fields.push({
        id: value?.id ?? field.id,
        key: value?.fieldKeySnapshot ?? field.key,
        label: value?.fieldLabelSnapshot ?? field.label,
        type: value?.fieldTypeSnapshot ?? field.type,
        placeholder: field.placeholder,
        helpText: field.helpText,
        required: field.required,
        memberEditable: field.memberEditable,
        options: Array.isArray(field.options) ? field.options : null,
        value: value?.value ?? null,
        fileUrl: value?.fileUrl ?? null,
        fileName: value?.fileName ?? null,
        mimeType: value?.mimeType ?? null,
        fileSize: value?.fileSize ?? null,
        updatedAt: (value?.updatedAt ?? field.updatedAt).toISOString()
      });
      sectionMap.set(section.id, row);
    }

    return {
      memberId: member.memberId ?? member.id,
      sections: Array.from(sectionMap.values())
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((section) => ({
          ...section,
          fields: section.fields
        }))
    };
  }

  async submitOwnRegistrationCorrection(user: AuthenticatedUser, dto: SubmitCorrectionDto) {
    const member = await this.loadOwnMember(user.id, {});
    const fields = await this.publicFields(member.membershipTypeId ?? undefined);
    const editable = new Map(fields.filter((field) => !fileTypes.includes(field.type)).map((field) => [field.key, field]));
    const coreEditable = new Set(["fullName", "email", "phone"]);
    const submittedValues = dto.values ?? {};
    const cleanedValues: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(submittedValues)) {
      const field = editable.get(key);
      if (!field && !coreEditable.has(key)) {
        throw new BadRequestException(`Field ${key} is not available for member correction.`);
      }
      cleanedValues[key] = value;
    }

    if (!Object.keys(cleanedValues).length && !dto.message?.trim()) {
      throw new BadRequestException("Please provide at least one correction or a message.");
    }

    const submission = await this.prisma.memberCorrectionSubmission.create({
      data: {
        memberId: member.id,
        message: dto.message?.trim() || null,
        values: cleanedValues as Prisma.InputJsonValue,
        documents: []
      }
    });

    await this.audit.log({
      userId: user.id,
      module: "members",
      action: "member_registration_correction_submitted",
      entityType: "Member",
      entityId: member.id,
      metadata: {
        submissionId: submission.id,
        fieldKeys: Object.keys(cleanedValues)
      }
    });

    return {
      id: submission.id,
      status: "pending_review",
      message: "Your correction request has been submitted for admin approval."
    };
  }

  async updateOwnSocialLinks(
    user: AuthenticatedUser,
    input: Partial<Record<"website_url" | "facebook_url" | "instagram_url" | "linkedin_url", string>>
  ) {
    const member = await this.loadOwnMember(user.id, {});
    const allowedKeys = ["website_url", "facebook_url", "instagram_url", "linkedin_url"];
    const fields = await this.publicFields(member.membershipTypeId ?? undefined);
    const socialFields = new Map(fields.filter((field) => allowedKeys.includes(field.key)).map((field) => [field.key, field]));
    const cleanedValues = Object.fromEntries(
      Object.entries(input)
        .filter(([key]) => allowedKeys.includes(key))
        .map(([key, value]) => [key, typeof value === "string" ? value.trim() : ""])
    );

    await this.prisma.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(cleanedValues)) {
        const field = socialFields.get(key);
        if (!field) continue;
        await tx.memberFormValue.upsert({
          where: { memberId_fieldId: { memberId: member.id, fieldId: field.id } },
          update: this.memberValueData(field, value),
          create: {
            memberId: member.id,
            ...this.memberValueData(field, value)
          }
        });
      }

      await tx.auditLog.create({
        data: {
          userId: user.id,
          module: "members",
          action: "member_social_links_updated",
          entityType: "Member",
          entityId: member.id,
          metadata: {
            fieldKeys: Object.keys(cleanedValues)
          }
        }
      });
    });

    return {
      message: "Social links updated."
    };
  }

  async myPaymentHistory(user: AuthenticatedUser, query: { page?: string | number; limit?: string | number } = {}) {
    const member = await this.loadOwnMember(user.id, {});
    const page = Math.max(1, Number(query.page ?? 1) || 1);
    const limit = Math.min(Math.max(1, Number(query.limit ?? 20) || 20), 100);
    const where: Prisma.PaymentWhereInput = { memberId: member.id };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        include: {
          membership: {
            include: {
              membershipType: true
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.payment.count({ where })
    ]);

    return {
      items: items.map((payment) => ({
        id: payment.id,
        amount: payment.amountCents / 100,
          amountCents: payment.amountCents,
          purpose: payment.purpose,
          status: payment.status,
          note: payment.note,
          proofUrl: payment.proofUrl,
          proofFileName: payment.proofFileName,
          proofMimeType: payment.proofMimeType,
          proofFileSize: payment.proofFileSize,
          paidAt: payment.paidAt?.toISOString() ?? null,
        createdAt: payment.createdAt.toISOString(),
        membership: payment.membership
          ? {
              id: payment.membership.id,
              startsAt: payment.membership.startsAt.toISOString(),
              endsAt: payment.membership.endsAt.toISOString(),
              membershipType: {
                id: payment.membership.membershipType.id,
                name: payment.membership.membershipType.name,
                code: payment.membership.membershipType.code
              }
            }
          : null
      })),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }

  async createOwnPayment(user: AuthenticatedUser, dto: CreateMemberPaymentDto, proof?: Express.Multer.File) {
    const member = await this.loadOwnMember(user.id, {});
    const amountCents = Math.round(dto.amount * 100);
    if (amountCents <= 0) {
      throw new BadRequestException("Payment amount must be greater than zero.");
    }
    const storedProof = proof ? await this.storePaymentProof(proof) : null;

    const payment = await this.prisma.payment.create({
      data: {
        memberId: member.id,
        amountCents,
        purpose: dto.purpose,
        status: "pending",
        note: dto.note?.trim() || null,
        proofUrl: storedProof?.url ?? null,
        proofFileName: storedProof?.fileName ?? null,
        proofMimeType: storedProof?.mimeType ?? null,
        proofFileSize: storedProof?.fileSize ?? null
      }
    });

    await this.audit.log({
      userId: user.id,
      module: "payments",
      action: "member_payment_submitted",
      metadata: {
        memberId: member.id,
        paymentId: payment.id,
        purpose: dto.purpose,
        amount: dto.amount,
        note: dto.note,
        proofUrl: storedProof?.url
      }
    });

    return {
      id: payment.id,
      amount: payment.amountCents / 100,
      amountCents: payment.amountCents,
      purpose: payment.purpose,
      status: payment.status,
      note: payment.note,
      proofUrl: payment.proofUrl,
      proofFileName: payment.proofFileName,
      proofMimeType: payment.proofMimeType,
      proofFileSize: payment.proofFileSize,
      paidAt: payment.paidAt?.toISOString() ?? null,
      createdAt: payment.createdAt.toISOString(),
      membership: null
    };
  }

  async myDonationHistory(user: AuthenticatedUser) {
    await this.loadOwnMember(user.id, {});
    return this.emptyCollection();
  }

  async myEventRegistrations(user: AuthenticatedUser) {
    await this.loadOwnMember(user.id, {});
    return this.emptyCollection();
  }

  async myNotifications(user: AuthenticatedUser) {
    const member = await this.loadOwnMember(user.id, {});
    const preferences = await this.ensureNotificationPreferences(member.id);
    const items = [
      ...(await this.buildMemberSmritirPataNotifications(member)),
      ...(await this.buildWebsiteNotifications())
    ].filter((item) => this.notificationTypeEnabled(item.type, preferences));
    const unreadCount = preferences.lastSeenAt ? items.filter((item) => new Date(item.createdAt) > preferences.lastSeenAt!).length : items.length;

    return {
      items,
      unreadCount,
      preferences: this.serializeNotificationPreferences(preferences),
      page: 1,
      limit: items.length,
      total: items.length,
      totalPages: items.length ? 1 : 0
    };
  }

  async updateMyNotificationPreferences(user: AuthenticatedUser, input: MemberNotificationPreferenceInput) {
    const member = await this.loadOwnMember(user.id, {});
    const preferences = await this.ensureNotificationPreferences(member.id);
    const updated = await this.prisma.memberNotificationPreference.update({
      where: { id: preferences.id },
      data: {
        noticeEnabled: typeof input.noticeEnabled === "boolean" ? input.noticeEnabled : undefined,
        eventEnabled: typeof input.eventEnabled === "boolean" ? input.eventEnabled : undefined,
        postEnabled: typeof input.postEnabled === "boolean" ? input.postEnabled : undefined,
        galleryEnabled: typeof input.galleryEnabled === "boolean" ? input.galleryEnabled : undefined,
        websiteEnabled: typeof input.websiteEnabled === "boolean" ? input.websiteEnabled : undefined
      }
    });

    return this.serializeNotificationPreferences(updated);
  }

  async markMyNotificationsSeen(user: AuthenticatedUser) {
    const member = await this.loadOwnMember(user.id, {});
    const preferences = await this.ensureNotificationPreferences(member.id);
    const updated = await this.prisma.memberNotificationPreference.update({
      where: { id: preferences.id },
      data: { lastSeenAt: new Date() }
    });

    return this.serializeNotificationPreferences(updated);
  }

  async myNotices(user: AuthenticatedUser) {
    await this.loadOwnMember(user.id, {});
    return this.emptyCollection();
  }

  async myCommitteeHistory(user: AuthenticatedUser) {
    await this.loadOwnMember(user.id, {});
    return this.emptyCollection();
  }

  async myCertificates(user: AuthenticatedUser) {
    await this.loadOwnMember(user.id, {});
    return this.emptyCollection();
  }

  async markUnderReview(id: string, user: AuthenticatedUser) {
    return this.transitionApplication(id, MemberStatus.under_review, user, "Application marked under review.", {}, "mark_under_review");
  }

  async approveApplication(id: string, dto: ApproveApplicationDto, user: AuthenticatedUser) {
    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member) throw new NotFoundException("Application not found.");
    if (member.status === MemberStatus.rejected) throw new BadRequestException("Rejected applications cannot be approved.");
    if (member.memberId) throw new BadRequestException("Application is already approved.");

    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({ where: { email: member.email } });
      if (existingUser && member.userId && existingUser.id !== member.userId) {
        throw new ConflictException("A different user account already uses this email.");
      }
      if (existingUser && !member.userId) {
        throw new ConflictException("A user account already uses this email.");
      }

      const memberId = await this.generateMemberId(tx);
      const memberRole = await tx.role.findUnique({ where: { slug: "member" } });
      if (!memberRole) throw new BadRequestException("Member role is not configured.");
      const membershipType = member.membershipTypeId
        ? await tx.membershipType.findUnique({ where: { id: member.membershipTypeId } })
        : null;

      const account = member.userId
        ? await tx.user.update({
            where: { id: member.userId },
            data: { fullName: member.fullName, email: member.email, passwordHash, mustChangePassword: true, isActive: true }
          })
        : await tx.user.create({
            data: {
              fullName: member.fullName,
              email: member.email,
              passwordHash,
              mustChangePassword: true,
              isActive: true
            }
          });

      await tx.userRoleAssignment.upsert({
        where: { userId_roleId: { userId: account.id, roleId: memberRole.id } },
        update: {},
        create: { userId: account.id, roleId: memberRole.id }
      });

      const period = membershipType?.renewalRequired
        ? this.renewals.calculateRenewalPeriod(now, membershipType.renewalCycle)
        : null;

      const row = await tx.member.update({
        where: { id },
        data: {
          userId: account.id,
          memberId,
          status: MemberStatus.active,
          approvalNote: dto.approvalNote,
          approvedByUserId: user.id,
          approvedAt: now,
          joinedAt: now,
          expiredAt: period?.endsAt ?? null
        },
        include: { membershipType: true }
      });
      await this.syncUserAccessForMemberStatus({ userId: account.id }, MemberStatus.active, tx);

      if (membershipType && period) {
        await tx.membership.create({
          data: {
            memberId: id,
            membershipTypeId: membershipType.id,
            startsAt: period.startsAt,
            endsAt: period.endsAt,
            status: MemberStatus.active
          }
        });
      }

      await tx.memberStatusLog.create({
        data: {
          memberId: id,
          fromStatus: member.status,
          toStatus: MemberStatus.active,
          note: dto.approvalNote ?? "Application approved.",
          changedByUserId: user.id
        }
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          module: "applications",
          action: "approve",
          entityType: "Member",
          entityId: id,
          metadata: { memberId }
        }
      });

      return row;
    });

    const email = await this.mail.sendMembershipApprovedEmail({
      to: updated.email,
      fullName: updated.fullName,
      memberId: updated.memberId!,
      username: updated.email,
      temporaryPassword
    });

    await this.audit.log({
      userId: user.id,
      module: "applications",
      action: email.sent ? "approval_email_sent" : "approval_email_skipped",
      entityType: "Member",
      entityId: id,
      metadata: {
        email: updated.email,
        reason: email.sent ? null : email.reason
      }
    });

    return {
      member: this.serializeListItem(updated),
      temporaryPassword,
      email
    };
  }

  async rejectApplication(id: string, dto: RejectApplicationDto, user: AuthenticatedUser) {
    return this.transitionApplication(id, MemberStatus.rejected, user, dto.reason, {
      rejectionReason: dto.reason,
      rejectedByUserId: user.id
    }, "reject");
  }

  async requestCorrection(id: string, dto: RequestCorrectionDto, user: AuthenticatedUser) {
    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member) throw new NotFoundException("Application not found.");
    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const request = await tx.memberCorrectionRequest.create({
        data: {
          memberId: id,
          message: dto.message,
          fieldKeys: dto.fieldKeys ?? [],
          documentTypes: dto.documentTypes ?? [],
          requestedByUserId: user.id
        }
      });

      const row = await tx.member.update({
        where: { id },
        data: {
          status: MemberStatus.correction_requested,
          correctionNote: dto.message,
          correctionByUserId: user.id,
          correctionRequestedAt: now
        },
        include: { membershipType: true }
      });
      await this.syncUserAccessForMemberStatus(member, MemberStatus.correction_requested, tx);

      await tx.memberStatusLog.create({
        data: {
          memberId: id,
          fromStatus: member.status,
          toStatus: MemberStatus.correction_requested,
          note: dto.message,
          changedByUserId: user.id
        }
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          module: "applications",
          action: "request_correction",
          entityType: "Member",
          entityId: id,
          metadata: {
            requestId: request.id,
            fieldKeys: dto.fieldKeys ?? [],
            documentTypes: dto.documentTypes ?? []
          }
        }
      });

      return row;
    });

    return this.serializeListItem(updated);
  }

  async applyCorrectionSubmission(memberId: string, submissionId: string, user: AuthenticatedUser) {
    const member = await this.prisma.member.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException("Member not found.");

    const submission = await this.prisma.memberCorrectionSubmission.findFirst({
      where: { id: submissionId, memberId }
    });
    if (!submission) throw new NotFoundException("Correction submission not found.");

    const fields = await this.publicFields(member.membershipTypeId ?? undefined);
    const allowed = new Map(fields.filter((field) => !fileTypes.includes(field.type)).map((field) => [field.key, field]));
    const values = this.asRecord(submission.values);

    if (typeof values.email === "string" && values.email.toLowerCase() !== member.email) {
      const existing = await this.prisma.member.findUnique({
        where: { email: values.email.toLowerCase() },
        select: { id: true }
      });
      if (existing && existing.id !== member.id) {
        throw new ConflictException("A registration already exists for this email.");
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const coreUpdate: Prisma.MemberUpdateInput = {};
      if (typeof values.fullName === "string") coreUpdate.fullName = values.fullName;
      if (typeof values.email === "string") coreUpdate.email = values.email.toLowerCase();
      if (typeof values.phone === "string") coreUpdate.phone = values.phone;

      for (const [key, value] of Object.entries(values)) {
        const field = allowed.get(key);
        if (!field) continue;
        await tx.memberFormValue.upsert({
          where: { memberId_fieldId: { memberId: member.id, fieldId: field.id } },
          update: this.memberValueData(field, value),
          create: {
            memberId: member.id,
            ...this.memberValueData(field, value)
          }
        });
      }

      const row = Object.keys(coreUpdate).length
        ? await tx.member.update({
            where: { id: member.id },
            data: coreUpdate,
            include: { membershipType: true }
          })
        : await tx.member.findUniqueOrThrow({
            where: { id: member.id },
            include: { membershipType: true }
          });

      await tx.memberStatusLog.create({
        data: {
          memberId: member.id,
          fromStatus: member.status,
          toStatus: member.status,
          note: `Correction submission applied: ${submission.id}`,
          changedByUserId: user.id
        }
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          module: "members",
          action: "member_registration_correction_applied",
          entityType: "MemberCorrectionSubmission",
          entityId: submission.id,
          metadata: {
            memberId: member.id,
            fieldKeys: Object.keys(values)
          }
        }
      });

      return row;
    });

    return {
      member: this.serializeListItem(updated),
      message: "Correction submission has been applied."
    };
  }

  async correctionForm(token: string) {
    const member = await this.prisma.member.findUnique({
      where: { correctionToken: token },
      include: {
        correctionRequests: { orderBy: { createdAt: "desc" } },
        formValues: true
      }
    });
    if (!member) throw new NotFoundException("Correction request not found.");
    if (member.status !== MemberStatus.correction_requested) {
      throw new BadRequestException("This application is not waiting for corrections.");
    }

    const fields = await this.publicFields(member.membershipTypeId ?? undefined);
    const values = Object.fromEntries(
      member.formValues.map((value) => [
        value.fieldKeySnapshot,
        value.fileUrl
          ? {
              fileUrl: value.fileUrl,
              fileName: value.fileName,
              mimeType: value.mimeType,
              fileSize: value.fileSize
            }
          : value.value
      ])
    );

    return {
      applicationId: member.id,
      fullName: member.fullName,
      email: member.email,
      phone: member.phone,
      status: member.status,
      values,
      fields: fields.map((field) => this.serializeField(field)),
      latestRequest: member.correctionRequests[0]
        ? {
            id: member.correctionRequests[0].id,
            message: member.correctionRequests[0].message,
            fieldKeys: Array.isArray(member.correctionRequests[0].fieldKeys) ? member.correctionRequests[0].fieldKeys : [],
            documentTypes: Array.isArray(member.correctionRequests[0].documentTypes) ? member.correctionRequests[0].documentTypes : [],
            createdAt: member.correctionRequests[0].createdAt.toISOString()
          }
        : null
    };
  }

  async submitCorrection(token: string, dto: SubmitCorrectionDto) {
    const member = await this.prisma.member.findUnique({
      where: { correctionToken: token },
      include: { correctionRequests: { where: { resolvedAt: null }, orderBy: { createdAt: "desc" } } }
    });
    if (!member) throw new NotFoundException("Correction request not found.");
    if (member.status !== MemberStatus.correction_requested) {
      throw new BadRequestException("This application is not waiting for corrections.");
    }

    const fields = await this.publicFields(member.membershipTypeId ?? undefined);
    const allowed = new Map(fields.map((field) => [field.key, field]));
    const submittedValues = dto.values ?? {};
    for (const key of Object.keys(submittedValues)) {
      if (!allowed.has(key)) throw new BadRequestException(`Field ${key} is not available for correction.`);
    }

    const request = member.correctionRequests[0];
    await this.prisma.$transaction(async (tx) => {
      for (const [key, value] of Object.entries(submittedValues)) {
        const field = allowed.get(key);
        if (!field) continue;
        await tx.memberFormValue.upsert({
          where: { memberId_fieldId: { memberId: member.id, fieldId: field.id } },
          update: this.memberValueData(field, value),
          create: {
            memberId: member.id,
            ...this.memberValueData(field, value)
          }
        });
      }

      await tx.memberCorrectionSubmission.create({
        data: {
          memberId: member.id,
          requestId: request?.id,
          message: dto.message,
          values: submittedValues as Prisma.InputJsonValue,
          documents: (dto.documents ?? []) as Prisma.InputJsonValue
        }
      });

      await tx.memberCorrectionRequest.updateMany({
        where: { memberId: member.id, resolvedAt: null },
        data: { resolvedAt: new Date() }
      });

      await tx.member.update({
        where: { id: member.id },
        data: {
          status: MemberStatus.under_review,
          correctionNote: null
        }
      });
      await this.syncUserAccessForMemberStatus(member, MemberStatus.under_review, tx);

      await tx.memberStatusLog.create({
        data: {
          memberId: member.id,
          fromStatus: member.status,
          toStatus: MemberStatus.under_review,
          note: dto.message ?? "Applicant submitted corrections."
        }
      });

      await tx.auditLog.create({
        data: {
          module: "applications",
          action: "correction_submitted",
          entityType: "Member",
          entityId: member.id,
          metadata: {
            requestId: request?.id ?? null,
            fieldKeys: Object.keys(submittedValues)
          }
        }
      });
    });

    return { applicationId: member.id, status: MemberStatus.under_review };
  }

  async updateStatus(id: string, dto: UpdateMemberStatusDto, user: AuthenticatedUser) {
    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member) {
      throw new NotFoundException("Member not found.");
    }

    const now = new Date();
    const statusMetadata = this.statusMetadata(dto, user.id, now);
    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.member.update({
        where: { id },
        data: {
          status: dto.status,
          ...statusMetadata
        },
        include: {
          membershipType: true
        }
      });
      await this.syncUserAccessForMemberStatus(member, dto.status, tx);

      await tx.memberStatusLog.create({
        data: {
          memberId: id,
          fromStatus: member.status,
          toStatus: dto.status,
          note: dto.note ?? dto.approvalNote ?? dto.rejectionReason ?? dto.correctionNote,
          changedByUserId: user.id
        }
      });

      return row;
    });

    await this.audit.log({
      userId: user.id,
      module: "members",
      action: "status_update",
      entityType: "Member",
      entityId: id,
      metadata: {
        fromStatus: member.status,
        toStatus: dto.status
      }
    });

    return this.serializeListItem(updated);
  }

  private statusMetadata(dto: UpdateMemberStatusDto, userId: string, now: Date): Prisma.MemberUpdateInput {
    if (dto.status === MemberStatus.approved || dto.status === MemberStatus.active) {
      return {
        approvalNote: dto.approvalNote,
        approvedByUserId: userId,
        approvedAt: now,
        joinedAt: dto.status === MemberStatus.active ? now : undefined
      };
    }

    if (dto.status === MemberStatus.rejected) {
      return {
        rejectionReason: dto.rejectionReason,
        rejectedByUserId: userId
      };
    }

    if (dto.status === MemberStatus.correction_requested) {
      return {
        correctionNote: dto.correctionNote,
        correctionByUserId: userId,
        correctionRequestedAt: now
      };
    }

    if (dto.status === MemberStatus.expired) {
      return {
        expiredAt: now
      };
    }

    return {};
  }

  private async transitionApplication(
    id: string,
    status: MemberStatus,
    user: AuthenticatedUser,
    note: string,
    data: Prisma.MemberUpdateInput = {},
    auditAction: string = status
  ) {
    const member = await this.prisma.member.findUnique({ where: { id } });
    if (!member) throw new NotFoundException("Application not found.");

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.member.update({
        where: { id },
        data: { status, ...data },
        include: { membershipType: true }
      });
      await this.syncUserAccessForMemberStatus(member, status, tx);

      await tx.memberStatusLog.create({
        data: {
          memberId: id,
          fromStatus: member.status,
          toStatus: status,
          note,
          changedByUserId: user.id
        }
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          module: "applications",
          action: auditAction,
          entityType: "Member",
          entityId: id,
          metadata: { fromStatus: member.status, toStatus: status, note }
        }
      });

      return row;
    });

    return this.serializeListItem(updated);
  }

  private async generateMemberId(tx: Prisma.TransactionClient) {
    const scope = "SUSTSA2021";
    await tx.memberIdSequence.upsert({
      where: { scope },
      create: { scope, nextValue: 1 },
      update: {}
    });
    const sequence = await tx.memberIdSequence.update({
      where: { scope },
      data: { nextValue: { increment: 1 } }
    });
    const number = sequence.nextValue - 1;
    return `${scope}-${String(number).padStart(2, "0")}`;
  }

  private generateTemporaryPassword() {
    return randomBytes(12).toString("base64url");
  }

  private async syncUserAccessForMemberStatus(
    member: { userId: string | null },
    nextStatus: MemberStatus,
    tx: Prisma.TransactionClient
  ) {
    if (!member.userId) return;

    if (portalEnabledStatuses.has(nextStatus)) {
      const memberRole = await tx.role.findUnique({ where: { slug: "member" } });
      if (!memberRole) throw new BadRequestException("Member role is not configured.");
      await tx.user.update({
        where: { id: member.userId },
        data: { isActive: true }
      });
      await tx.userRoleAssignment.upsert({
        where: { userId_roleId: { userId: member.userId, roleId: memberRole.id } },
        update: {},
        create: { userId: member.userId, roleId: memberRole.id }
      });
      return;
    }

    const now = new Date();
    await tx.user.update({
      where: { id: member.userId },
      data: { isActive: false }
    });
    await tx.refreshTokenSession.updateMany({
      where: {
        userId: member.userId,
        revokedAt: null
      },
      data: { revokedAt: now }
    });
  }

  private async loadOwnMember<T extends Prisma.MemberInclude>(userId: string, include: T) {
    return this.memberAccess.requirePortalMember(userId, include);
  }

  private emptyCollection() {
    return {
      items: [],
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0
    };
  }

  private async ensureNotificationPreferences(memberId: string) {
    return this.prisma.memberNotificationPreference.upsert({
      where: { memberId },
      update: {},
      create: { memberId }
    });
  }

  private async buildWebsiteNotifications() {
    const [pages, albums, photos] = await this.prisma.$transaction([
      this.prisma.websitePageSetting.findMany({
        where: { status: "published" },
        orderBy: { updatedAt: "desc" },
        take: 30
      }),
      this.prisma.galleryAlbum.findMany({
        where: { published: true },
        orderBy: { updatedAt: "desc" },
        take: 20
      }),
      this.prisma.galleryPhoto.findMany({
        where: { published: true, album: { published: true } },
        include: { album: true },
        orderBy: { updatedAt: "desc" },
        take: 30
      })
    ]);

    return [
      ...pages
        .filter((page) => !["home", "login", "registration"].includes(page.key))
        .map((page) => {
          const type = this.notificationTypeForPage(page.key);
          return {
            id: `page:${page.id}:${page.updatedAt.getTime()}`,
            type,
            title: this.notificationTitle(type, page.title),
            message: this.notificationMessageForPage(page.key, page.title, page.metaDescription),
            href: page.route,
            createdAt: page.updatedAt.toISOString()
          };
        }),
      ...albums.map((album) => ({
        id: `gallery-album:${album.id}:${album.updatedAt.getTime()}`,
        type: "gallery" as const,
        title: `Gallery album: ${album.title}`,
        message: album.description ?? "A gallery album has been published or updated.",
        href: "/gallery",
        createdAt: album.updatedAt.toISOString()
      })),
      ...photos.map((photo) => ({
        id: `gallery-photo:${photo.id}:${photo.updatedAt.getTime()}`,
        type: "gallery" as const,
        title: `New gallery photo: ${photo.title}`,
        message: photo.caption ?? `Added to ${photo.album.title}.`,
        href: "/gallery",
        createdAt: photo.updatedAt.toISOString()
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  private async buildMemberSmritirPataNotifications(member: { id: string; userId: string | null; memberId: string | null }) {
    const page = await this.prisma.websitePageSetting.findUnique({ where: { key: "srithir_patha" } });
    const rawItems: unknown[] = Array.isArray(page?.contentBlocks) ? (page.contentBlocks as unknown[]) : [];
    return rawItems
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
      .filter((item) => {
        const submittedBy = this.stringValue(item.submittedByMemberId);
        const authorUser = this.stringValue(item.authorUserId);
        return submittedBy === member.id || Boolean(member.userId && authorUser === member.userId);
      })
      .flatMap((item) => {
        const id = this.stringValue(item.id) || this.slugify(this.stringValue(item.title) || "smritir-pata");
        const title = this.stringValue(item.title) || "Untitled Smritir Pata article";
        const href = `/member/smritir-pata/${encodeURIComponent(id)}${member.memberId ? `?memberId=${encodeURIComponent(member.memberId)}` : ""}`;
        const notifications = [];
        const correctionRequestedAt = this.stringValue(item.correctionRequestedAt);
        const correctionNote = this.stringValue(item.correctionNote);
        if (this.stringValue(item.status) === "correction_requested" && correctionRequestedAt) {
          notifications.push({
            id: `smritir-correction:${id}:${new Date(correctionRequestedAt).getTime()}`,
            type: "post" as const,
            title: "Smritir Pata correction requested",
            message: correctionNote ? `${title}: ${correctionNote}` : `${title} needs an update before approval.`,
            href,
            createdAt: correctionRequestedAt
          });
        }

        const rejectedAt = this.stringValue(item.rejectedAt);
        const rejectionNote = this.stringValue(item.rejectionNote);
        if (this.stringValue(item.status) === "rejected" && rejectedAt) {
          notifications.push({
            id: `smritir-rejected:${id}:${new Date(rejectedAt).getTime()}`,
            type: "post" as const,
            title: "Smritir Pata article rejected",
            message: rejectionNote ? `${title}: ${rejectionNote}` : `${title} was rejected by admin.`,
            href,
            createdAt: rejectedAt
          });
        }
        return notifications;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  private notificationTypeForPage(key: string): MemberNotificationType {
    if (key === "notices") return "notice";
    if (key === "events") return "event";
    if (key === "gallery") return "gallery";
    if (key === "about" || key === "donation" || key === "election_results") return "post";
    return "website";
  }

  private notificationTitle(type: MemberNotificationType, title: string) {
    if (type === "notice") return `Notice update: ${title}`;
    if (type === "event") return `Event update: ${title}`;
    if (type === "post") return `Post update: ${title}`;
    if (type === "gallery") return `Gallery update: ${title}`;
    return `Website update: ${title}`;
  }

  private notificationMessageForPage(key: string, title: string, metaDescription: string | null) {
    if (key === "srithir_patha") {
      return "New Smritir Pata updates are available on Sociology Alumni Association of SUST.";
    }

    const description = metaDescription?.trim();
    if (description && !/^manage\b/i.test(description)) return description;

    return `${title} has been updated on Sociology Alumni Association of SUST.`;
  }

  private stringValue(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  private slugify(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/['"]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  private notificationTypeEnabled(type: MemberNotificationType, preferences: {
    noticeEnabled: boolean;
    eventEnabled: boolean;
    postEnabled: boolean;
    galleryEnabled: boolean;
    websiteEnabled: boolean;
  }) {
    if (type === "notice") return preferences.noticeEnabled;
    if (type === "event") return preferences.eventEnabled;
    if (type === "post") return preferences.postEnabled;
    if (type === "gallery") return preferences.galleryEnabled;
    return preferences.websiteEnabled;
  }

  private serializeNotificationPreferences(preferences: {
    noticeEnabled: boolean;
    eventEnabled: boolean;
    postEnabled: boolean;
    galleryEnabled: boolean;
    websiteEnabled: boolean;
    lastSeenAt: Date | null;
  }) {
    return {
      noticeEnabled: preferences.noticeEnabled,
      eventEnabled: preferences.eventEnabled,
      postEnabled: preferences.postEnabled,
      galleryEnabled: preferences.galleryEnabled,
      websiteEnabled: preferences.websiteEnabled,
      lastSeenAt: preferences.lastSeenAt?.toISOString() ?? null
    };
  }

  private async storePaymentProof(file: Express.Multer.File) {
    if (!allowedPaymentProofMimeTypes.has(file.mimetype)) {
      throw new BadRequestException("Only PNG, JPG, WebP, or PDF payment proofs are allowed.");
    }
    if (file.size > 8 * 1024 * 1024) {
      throw new BadRequestException("Payment proof must be 8MB or smaller.");
    }
    await mkdir(paymentProofUploadRoot, { recursive: true });
    const extension = this.safeUploadExtension(file.originalname, file.mimetype);
    const storedName = `proof-${Date.now()}-${randomBytes(8).toString("hex")}${extension}`;
    await writeFile(join(paymentProofUploadRoot, storedName), file.buffer);
    return {
      url: `/uploads/payments/${storedName}`,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size
    };
  }

  private safeUploadExtension(fileName: string, mimeType: string) {
    const extension = extname(fileName).toLowerCase();
    if ([".png", ".jpg", ".jpeg", ".webp", ".pdf"].includes(extension)) return extension;
    if (mimeType === "image/png") return ".png";
    if (mimeType === "image/jpeg") return ".jpg";
    if (mimeType === "image/webp") return ".webp";
    return ".pdf";
  }

  private async publicFields(membershipTypeId?: string) {
    const form = await this.prisma.form.findUnique({ where: { code: registrationFormCode } });
    if (!form?.active) throw new NotFoundException("Registration form not found.");
    const fields = await this.prisma.formField.findMany({
      where: {
        active: true,
        publicVisible: true,
        adminOnly: false,
        section: { formId: form.id, active: true }
      },
      include: {
        section: true
      },
      orderBy: [{ section: { sortOrder: "asc" } }, { sortOrder: "asc" }]
    });

    return fields.filter((field) => {
      if (!field.membershipTypeSpecific) return true;
      const ids = Array.isArray(field.membershipTypeIds) ? field.membershipTypeIds : [];
      return Boolean(membershipTypeId && ids.includes(membershipTypeId));
    });
  }

  private memberValueData(field: FormField, value: unknown) {
    const fileValue = fileTypes.includes(field.type) && typeof value === "object" && value !== null ? value : null;
    return {
      fieldId: field.id,
      fieldKeySnapshot: field.key,
      fieldLabelSnapshot: field.label,
      fieldTypeSnapshot: field.type,
      value: fileValue ? undefined : (value as Prisma.InputJsonValue),
      fileUrl: fileValue ? String((fileValue as { fileUrl?: string }).fileUrl ?? "") : undefined,
      fileName: fileValue ? String((fileValue as { fileName?: string }).fileName ?? "") : undefined,
      mimeType: fileValue ? String((fileValue as { mimeType?: string }).mimeType ?? "") : undefined,
      fileSize: fileValue ? Number((fileValue as { fileSize?: number }).fileSize ?? 0) : undefined
    };
  }

  private asRecord(value: Prisma.JsonValue | null) {
    return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private async correctionFieldLabels(
    membershipTypeId?: string,
    existingValues: Array<{ fieldKeySnapshot: string; fieldLabelSnapshot: string }> = []
  ) {
    const labels = new Map<string, string>([
      ["fullName", "Full name"],
      ["email", "Email"],
      ["phone", "Phone"]
    ]);

    for (const value of existingValues) {
      labels.set(value.fieldKeySnapshot, value.fieldLabelSnapshot);
    }

    try {
      const fields = await this.publicFields(membershipTypeId);
      for (const field of fields) {
        labels.set(field.key, field.label);
      }
    } catch {
      // Keep core and snapshot labels if the registration form is unavailable.
    }

    return labels;
  }

  private labelsForValues(values: Record<string, unknown>, labels: Map<string, string>) {
    return Object.fromEntries(Object.keys(values).map((key) => [key, labels.get(key) ?? this.humanizeFieldKey(key)]));
  }

  private humanizeFieldKey(key: string) {
    return key
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .trim()
      .replace(/\s+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private serializeField(field: FormField) {
    return {
      id: field.id,
      label: field.label,
      key: field.key,
      type: field.type,
      required: field.required,
      helpText: field.helpText,
      placeholder: field.placeholder,
      options: Array.isArray(field.options) ? field.options : null
    };
  }

  private serializeFormValue(value: {
    id: string;
    fieldId: string;
    fieldKeySnapshot: string;
    fieldLabelSnapshot: string;
    fieldTypeSnapshot: FormFieldType;
    value: Prisma.JsonValue | null;
    fileUrl: string | null;
    fileName: string | null;
    mimeType: string | null;
    fileSize: number | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: value.id,
      fieldId: value.fieldId,
      key: value.fieldKeySnapshot,
      label: value.fieldLabelSnapshot,
      type: value.fieldTypeSnapshot,
      value: value.value,
      fileUrl: value.fileUrl,
      fileName: value.fileName,
      mimeType: value.mimeType,
      fileSize: value.fileSize,
      createdAt: value.createdAt.toISOString(),
      updatedAt: value.updatedAt.toISOString()
    };
  }

  private serializeListItem(member: {
    id: string;
    userId: string | null;
    memberId: string | null;
    fullName: string;
    email: string;
    phone: string | null;
    status: MemberStatus;
    membershipTypeId: string | null;
    membershipType?: { id: string; name: string; code: string } | null;
    joinedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: member.id,
      userId: member.userId,
      memberId: member.memberId,
      memberNumber: member.memberId,
      fullName: member.fullName,
      email: member.email,
      phone: member.phone,
      status: member.status,
      membershipTypeId: member.membershipTypeId,
      membershipType: member.membershipType
        ? {
            id: member.membershipType.id,
            name: member.membershipType.name,
            code: member.membershipType.code
          }
        : null,
      joinedAt: member.joinedAt?.toISOString() ?? null,
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString()
    };
  }
}
