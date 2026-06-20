import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { MemberRenewalsController, PublicDirectoryController, RenewalsController } from "./renewals.controller";
import { RenewalsService } from "./renewals.service";

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [RenewalsController, MemberRenewalsController, PublicDirectoryController],
  providers: [RenewalsService],
  exports: [RenewalsService]
})
export class RenewalsModule {}
