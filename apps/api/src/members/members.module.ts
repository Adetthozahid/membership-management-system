import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { MailModule } from "../mail/mail.module";
import { RenewalsModule } from "../renewals/renewals.module";
import { MemberSelfServiceController, MembersController, PublicApplicationsController } from "./members.controller";
import { MembersService } from "./members.service";

@Module({
  imports: [AuditModule, AuthModule, MailModule, RenewalsModule],
  controllers: [MembersController, MemberSelfServiceController, PublicApplicationsController],
  providers: [MembersService]
})
export class MembersModule {}
