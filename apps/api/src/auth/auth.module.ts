import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuditModule } from "../audit/audit.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { MemberAccessService } from "./member-access.service";
import { PermissionGuard } from "./permission.guard";

@Module({
  imports: [JwtModule.register({}), AuditModule],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, MemberAccessService, PermissionGuard],
  exports: [JwtModule, AuthService, JwtAuthGuard, MemberAccessService, PermissionGuard]
})
export class AuthModule {}
