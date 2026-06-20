import { Body, Controller, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequirePermission } from "../auth/permissions.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ApplyCorrectionSubmissionDto, ApproveApplicationDto, RejectApplicationDto, RequestCorrectionDto, SubmitCorrectionDto } from "./dto/application-workflow.dto";
import { CreateMemberPaymentDto } from "./dto/create-member-payment.dto";
import { MemberQueryDto } from "./dto/member-query.dto";
import { UpdateMemberStatusDto } from "./dto/update-member-status.dto";
import { MembersService } from "./members.service";

@Controller("members")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @RequirePermission("members", "read")
  list(@Query() query: MemberQueryDto) {
    return this.membersService.list(query);
  }

  @Get("applications/pending")
  @RequirePermission("members", "read")
  pendingApplications(@Query() query: MemberQueryDto) {
    return this.membersService.pendingApplications(query);
  }

  @Get("corrections/pending")
  @RequirePermission("members", "read")
  pendingCorrections(@Query() query: MemberQueryDto) {
    return this.membersService.pendingCorrections(query);
  }

  @Get("applications/:id")
  @RequirePermission("members", "read")
  applicationDetails(@Param("id") id: string) {
    return this.membersService.details(id);
  }

  @Post("applications/:id/under-review")
  @RequirePermission("members", "manage")
  markUnderReview(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.membersService.markUnderReview(id, user);
  }

  @Post("applications/:id/approve")
  @RequirePermission("members", "manage")
  approveApplication(
    @Param("id") id: string,
    @Body() dto: ApproveApplicationDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.membersService.approveApplication(id, dto, user);
  }

  @Post("applications/:id/reject")
  @RequirePermission("members", "manage")
  rejectApplication(
    @Param("id") id: string,
    @Body() dto: RejectApplicationDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.membersService.rejectApplication(id, dto, user);
  }

  @Post("applications/:id/request-correction")
  @RequirePermission("members", "manage")
  requestCorrection(
    @Param("id") id: string,
    @Body() dto: RequestCorrectionDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.membersService.requestCorrection(id, dto, user);
  }

  @Post("applications/:id/apply-correction")
  @RequirePermission("members", "manage")
  applyCorrectionSubmission(
    @Param("id") id: string,
    @Body() dto: ApplyCorrectionSubmissionDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.membersService.applyCorrectionSubmission(id, dto.submissionId, user);
  }

  @Get(":id")
  @RequirePermission("members", "read")
  details(@Param("id") id: string) {
    return this.membersService.details(id);
  }

  @Patch(":id/status")
  @RequirePermission("members", "manage")
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateMemberStatusDto,
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.membersService.updateStatus(id, dto, user);
  }
}

@Controller("member")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class MemberSelfServiceController {
  constructor(private readonly membersService: MembersService) {}

  @Get("profile")
  @RequirePermission("member", "access")
  profile(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.myProfile(user);
  }

  @Get("registration-data")
  @RequirePermission("member", "access")
  registrationData(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.myRegistrationData(user);
  }

  @Patch("profile/social-links")
  @RequirePermission("member", "access")
  updateSocialLinks(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { website_url?: string; facebook_url?: string; instagram_url?: string; linkedin_url?: string }
  ) {
    return this.membersService.updateOwnSocialLinks(user, body);
  }

  @Post("profile/social-links")
  @RequirePermission("member", "access")
  saveSocialLinks(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { website_url?: string; facebook_url?: string; instagram_url?: string; linkedin_url?: string }
  ) {
    return this.membersService.updateOwnSocialLinks(user, body);
  }

  @Post("registration-corrections")
  @RequirePermission("member", "access")
  registrationCorrection(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubmitCorrectionDto) {
    return this.membersService.submitOwnRegistrationCorrection(user, dto);
  }

  @Get("payments")
  @RequirePermission("member", "access")
  paymentHistory(@CurrentUser() user: AuthenticatedUser, @Query() query: { page?: string; limit?: string }) {
    return this.membersService.myPaymentHistory(user, query);
  }

  @Post("payments")
  @RequirePermission("member", "access")
  @UseInterceptors(FileInterceptor("proof", { storage: memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } }))
  createPayment(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateMemberPaymentDto, @UploadedFile() proof?: Express.Multer.File) {
    return this.membersService.createOwnPayment(user, dto, proof);
  }

  @Get("donations")
  @RequirePermission("member", "access")
  donationHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.myDonationHistory(user);
  }

  @Get("event-registrations")
  @RequirePermission("member", "access")
  eventRegistrations(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.myEventRegistrations(user);
  }

  @Get("notifications")
  @RequirePermission("member", "access")
  notifications(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.myNotifications(user);
  }

  @Patch("notifications/preferences")
  @RequirePermission("member", "access")
  updateNotificationPreferences(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: {
      noticeEnabled?: boolean;
      eventEnabled?: boolean;
      postEnabled?: boolean;
      galleryEnabled?: boolean;
      websiteEnabled?: boolean;
    }
  ) {
    return this.membersService.updateMyNotificationPreferences(user, body);
  }

  @Post("notifications/seen")
  @RequirePermission("member", "access")
  markNotificationsSeen(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.markMyNotificationsSeen(user);
  }

  @Get("notices")
  @RequirePermission("member", "access")
  notices(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.myNotices(user);
  }

  @Get("committee-history")
  @RequirePermission("member", "access")
  committeeHistory(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.myCommitteeHistory(user);
  }

  @Get("certificates")
  @RequirePermission("member", "access")
  certificates(@CurrentUser() user: AuthenticatedUser) {
    return this.membersService.myCertificates(user);
  }
}

@Controller("public/applications")
export class PublicApplicationsController {
  constructor(private readonly membersService: MembersService) {}

  @Get(":token/correction-form")
  correctionForm(@Param("token") token: string) {
    return this.membersService.correctionForm(token);
  }

  @Post(":token/corrections")
  submitCorrection(@Param("token") token: string, @Body() dto: SubmitCorrectionDto) {
    return this.membersService.submitCorrection(token, dto);
  }
}
