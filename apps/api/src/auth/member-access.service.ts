import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { MemberStatus, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export const MEMBER_PORTAL_ALLOWED_STATUSES = [MemberStatus.active] as const;

@Injectable()
export class MemberAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requirePortalMember<T extends Prisma.MemberInclude>(userId: string, include: T) {
    const member = await this.prisma.member.findFirst({
      where: { userId },
      include
    });

    if (!member) {
      throw new NotFoundException("Member profile not found.");
    }

    if (!this.isPortalEligible(member.status)) {
      throw new ForbiddenException("Member account is not eligible for portal access.");
    }

    return member;
  }

  isPortalEligible(status: MemberStatus) {
    return (MEMBER_PORTAL_ALLOWED_STATUSES as readonly MemberStatus[]).includes(status);
  }
}
