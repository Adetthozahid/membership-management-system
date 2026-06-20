import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequirePermission } from "../auth/permissions.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CreateMembershipTypeDto, UpdateMembershipTypeDto } from "./dto/membership-type.dto";
import { MembershipTypesService } from "./membership-types.service";

@Controller("membership-types")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class MembershipTypesController {
  constructor(private readonly membershipTypes: MembershipTypesService) {}

  @Get()
  @RequirePermission("membership_types", "read")
  list() {
    return this.membershipTypes.list();
  }

  @Post()
  @RequirePermission("membership_types", "manage")
  create(@Body() dto: CreateMembershipTypeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.membershipTypes.create(dto, user);
  }

  @Patch(":id")
  @RequirePermission("membership_types", "manage")
  update(@Param("id") id: string, @Body() dto: UpdateMembershipTypeDto, @CurrentUser() user: AuthenticatedUser) {
    return this.membershipTypes.update(id, dto, user);
  }

  @Delete(":id")
  @RequirePermission("membership_types", "manage")
  deactivate(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.membershipTypes.deactivate(id, user);
  }
}
