import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { FormBuilderController } from "./form-builder.controller";
import { FormBuilderService } from "./form-builder.service";

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [FormBuilderController],
  providers: [FormBuilderService]
})
export class FormBuilderModule {}
