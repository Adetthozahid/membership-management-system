import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { ChatModule } from "./chat/chat.module";
import { FormBuilderModule } from "./form-builder/form-builder.module";
import { HealthModule } from "./health/health.module";
import { MembersModule } from "./members/members.module";
import { MembershipTypesModule } from "./membership-types/membership-types.module";
import { PrismaModule } from "./prisma/prisma.module";
import { PublicContentModule } from "./public-content/public-content.module";
import { RenewalsModule } from "./renewals/renewals.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    PrismaModule,
    AuditModule,
    AuthModule,
    ChatModule,
    FormBuilderModule,
    HealthModule,
    MembershipTypesModule,
    PublicContentModule,
    MembersModule,
    RenewalsModule
  ]
})
export class AppModule {}
