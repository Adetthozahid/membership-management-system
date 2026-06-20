import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import type { CreateMembershipTypeDto, UpdateMembershipTypeDto } from "./dto/membership-type.dto";

@Injectable()
export class MembershipTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async list() {
    const rows = await this.prisma.membershipType.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }]
    });

    return rows.map((row) => this.serialize(row));
  }

  async create(dto: CreateMembershipTypeDto, user: AuthenticatedUser) {
    const row = await this.prisma.membershipType.create({
      data: {
        ...dto,
        code: dto.code.trim().toUpperCase()
      }
    });

    await this.audit.log({
      userId: user.id,
      module: "membership_types",
      action: "create",
      entityType: "MembershipType",
      entityId: row.id,
      metadata: { code: row.code }
    });

    return this.serialize(row);
  }

  async update(id: string, dto: UpdateMembershipTypeDto, user: AuthenticatedUser) {
    await this.ensureExists(id);
    const row = await this.prisma.membershipType.update({
      where: { id },
      data: {
        ...dto,
        code: dto.code ? dto.code.trim().toUpperCase() : undefined
      }
    });

    await this.audit.log({
      userId: user.id,
      module: "membership_types",
      action: "update",
      entityType: "MembershipType",
      entityId: id,
      metadata: { ...dto }
    });

    return this.serialize(row);
  }

  async deactivate(id: string, user: AuthenticatedUser) {
    await this.ensureExists(id);
    const row = await this.prisma.membershipType.update({
      where: { id },
      data: { active: false }
    });

    await this.audit.log({
      userId: user.id,
      module: "membership_types",
      action: "deactivate",
      entityType: "MembershipType",
      entityId: id
    });

    return this.serialize(row);
  }

  private async ensureExists(id: string) {
    const exists = await this.prisma.membershipType.findUnique({ where: { id }, select: { id: true } });
    if (!exists) {
      throw new NotFoundException("Membership type not found.");
    }
  }

  private serialize(row: {
    id: string;
    name: string;
    code: string;
    description: string | null;
    renewalRequired: boolean;
    renewalFee: unknown;
    renewalCycle: string | null;
    gracePeriodDays: number;
    directoryVisibleWhenExpired: boolean;
    monthlyChandaRequired: boolean;
    monthlyChandaAmount: unknown;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      ...row,
      renewalFee: Number(row.renewalFee),
      monthlyChandaAmount: Number(row.monthlyChandaAmount),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}
