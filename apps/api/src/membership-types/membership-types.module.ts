import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { MembershipTypesController } from "./membership-types.controller";
import { MembershipTypesService } from "./membership-types.service";

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [MembershipTypesController],
  providers: [MembershipTypesService]
})
export class MembershipTypesModule {}
