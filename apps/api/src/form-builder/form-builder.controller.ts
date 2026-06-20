import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequirePermission } from "../auth/permissions.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { CreateFormFieldDto, UpdateFormFieldDto } from "./dto/form-field.dto";
import { CreateFormDto, CreateFormSectionDto, ReorderDto, UpdateFormSectionDto } from "./dto/form-section.dto";
import { SubmitRegistrationDto, ValidateRegistrationDto } from "./dto/public-registration.dto";
import { FormBuilderService } from "./form-builder.service";

@Controller()
export class FormBuilderController {
  constructor(private readonly forms: FormBuilderService) {}

  @Get("form-builder/forms")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("form_builder", "read")
  formsList() {
    return this.forms.listForms();
  }

  @Post("form-builder/forms")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("form_builder", "manage")
  createForm(@Body() dto: CreateFormDto, @CurrentUser() user: AuthenticatedUser) {
    return this.forms.createForm(dto, user);
  }

  @Get("form-builder/sections")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("form_builder", "read")
  sections(@Query("formCode") formCode?: string) {
    return this.forms.listSections(formCode);
  }

  @Post("form-builder/sections")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("form_builder", "manage")
  createSection(@Body() dto: CreateFormSectionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.forms.createSection(dto, user);
  }

  @Patch("form-builder/sections/:id")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("form_builder", "manage")
  updateSection(@Param("id") id: string, @Body() dto: UpdateFormSectionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.forms.updateSection(id, dto, user);
  }

  @Delete("form-builder/sections/:id")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("form_builder", "manage")
  deleteSection(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.forms.deleteSection(id, user);
  }

  @Post("form-builder/sections/reorder")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("form_builder", "manage")
  reorderSections(@Body() dto: ReorderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.forms.reorderSections(dto, user);
  }

  @Post("form-builder/fields")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("form_builder", "manage")
  createField(@Body() dto: CreateFormFieldDto, @CurrentUser() user: AuthenticatedUser) {
    return this.forms.createField(dto, user);
  }

  @Patch("form-builder/fields/:id")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("form_builder", "manage")
  updateField(@Param("id") id: string, @Body() dto: UpdateFormFieldDto, @CurrentUser() user: AuthenticatedUser) {
    return this.forms.updateField(id, dto, user);
  }

  @Delete("form-builder/fields/:id")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("form_builder", "manage")
  deleteField(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.forms.deleteField(id, user);
  }

  @Post("form-builder/sections/:sectionId/fields/reorder")
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission("form_builder", "manage")
  reorderFields(@Param("sectionId") sectionId: string, @Body() dto: ReorderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.forms.reorderFields(sectionId, dto, user);
  }

  @Get("public/registration-form")
  publicForm(@Query("membershipTypeId") membershipTypeId?: string) {
    return this.forms.publicRegistrationForm(membershipTypeId);
  }

  @Get("public/forms/:code")
  publicFormByCode(@Param("code") code: string, @Query("membershipTypeId") membershipTypeId?: string) {
    return this.forms.publicFormByCode(code, membershipTypeId);
  }

  @Post("public/registration-form/validate")
  validate(@Body() dto: ValidateRegistrationDto) {
    return this.forms.validateRegistration(dto);
  }

  @Post("public/registration-form/submit")
  submit(@Body() dto: SubmitRegistrationDto) {
    return this.forms.submitRegistration(dto);
  }

  @Post("public/registration-form/uploads/:fieldKey")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(@Param("fieldKey") fieldKey: string, @UploadedFile() file?: Express.Multer.File) {
    return this.forms.storeUpload(file, fieldKey);
  }
}
