import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequirePermission } from "../auth/permissions.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { RecordChandaPaymentDto, RecordRenewalDto } from "./dto/record-renewal.dto";
import { RenewalsService } from "./renewals.service";

@Controller("renewals")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RenewalsController {
  constructor(private readonly renewals: RenewalsService) {}

  @Get("members/:id")
  @RequirePermission("members", "read")
  memberState(@Param("id") id: string) {
    return this.renewals.getMemberRenewalState(id);
  }

  @Post("members/:id/sync-expiry")
  @RequirePermission("members", "manage")
  syncExpiry(@Param("id") id: string) {
    return this.renewals.syncMemberExpiry(id);
  }

  @Post("members/:id/renew")
  @RequirePermission("members", "manage")
  recordRenewal(@Param("id") id: string, @Body() dto: RecordRenewalDto, @CurrentUser() user: AuthenticatedUser) {
    return this.renewals.recordRenewal(id, dto, user);
  }

  @Post("members/:id/chanda-payments")
  @RequirePermission("payments", "manage")
  recordChandaPayment(@Param("id") id: string, @Body() dto: RecordChandaPaymentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.renewals.recordChandaPayment(id, dto, user);
  }
}

@Controller("member")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class MemberRenewalsController {
  constructor(private readonly renewals: RenewalsService) {}

  @Get("renewal-summary")
  @RequirePermission("member", "access")
  mySummary(@CurrentUser() user: AuthenticatedUser) {
    return this.renewals.getMyRenewalState(user);
  }
}

@Controller("public/directory")
export class PublicDirectoryController {
  constructor(private readonly renewals: RenewalsService) {}

  @Get()
  listVisibleMembers(@Query() query: { search?: string; membershipTypeId?: string; page?: string; limit?: string }) {
    return this.renewals.publicDirectory(query);
  }

  @Get("verify/:identifier")
  verify(@Param("identifier") identifier: string) {
    return this.renewals.verifyPublicMember(identifier);
  }
}
