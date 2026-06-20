import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { FormField, FormFieldType, Prisma } from "@prisma/client";
import { AuditService } from "../audit/audit.service";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateFormFieldDto, UpdateFormFieldDto } from "./dto/form-field.dto";
import type { CreateFormDto, CreateFormSectionDto, ReorderDto, UpdateFormSectionDto } from "./dto/form-section.dto";
import type { SubmitRegistrationDto, ValidateRegistrationDto } from "./dto/public-registration.dto";

const uploadRoot = join(process.cwd(), "uploads", "registration");
const fileTypes: FormFieldType[] = [FormFieldType.file, FormFieldType.image, FormFieldType.document];
const registrationFormCode = "registration";

@Injectable()
export class FormBuilderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async listForms(includeInactive = true) {
    const forms = await this.prisma.form.findMany({
      where: includeInactive ? undefined : { active: true },
      orderBy: [{ system: "desc" }, { name: "asc" }]
    });

    return forms.map((form) => this.serializeForm(form));
  }

  async createForm(dto: CreateFormDto, user: AuthenticatedUser) {
    const form = await this.prisma.form.create({
      data: {
        name: dto.name,
        code: this.normalizeKey(dto.code),
        description: dto.description,
        active: dto.active ?? true,
        system: false
      }
    });
    await this.auditChange(user.id, "form_create", "Form", form.id, dto);
    return this.serializeForm(form);
  }

  async listSections(formCode = registrationFormCode, includeInactive = true) {
    const form = await this.ensureFormByCode(formCode);
    const sections = await this.prisma.formSection.findMany({
      where: {
        formId: form.id,
        ...(includeInactive ? {} : { active: true })
      },
      include: {
        fields: {
          where: includeInactive ? undefined : { active: true },
          orderBy: { sortOrder: "asc" }
        }
      },
      orderBy: { sortOrder: "asc" }
    });

    return sections.map((section) => this.serializeSection(section));
  }

  async createSection(dto: CreateFormSectionDto, user: AuthenticatedUser) {
    const formId = dto.formId ?? (await this.ensureFormByCode(registrationFormCode)).id;
    await this.ensureForm(formId);
    const section = await this.prisma.formSection.create({
      data: {
        formId,
        title: dto.title,
        description: dto.description,
        sortOrder: dto.sortOrder,
        active: dto.active
      }
    });
    await this.auditChange(user.id, "section_create", "FormSection", section.id, dto);
    return this.serializeSection({ ...section, fields: [] });
  }

  async updateSection(id: string, dto: UpdateFormSectionDto, user: AuthenticatedUser) {
    await this.ensureSection(id);
    const section = await this.prisma.formSection.update({
      where: { id },
      data: dto,
      include: { fields: { orderBy: { sortOrder: "asc" } } }
    });
    await this.auditChange(user.id, "section_update", "FormSection", id, dto);
    return this.serializeSection(section);
  }

  async deleteSection(id: string, user: AuthenticatedUser) {
    await this.ensureSection(id);
    const section = await this.prisma.formSection.update({
      where: { id },
      data: { active: false },
      include: { fields: { orderBy: { sortOrder: "asc" } } }
    });
    await this.auditChange(user.id, "section_deactivate", "FormSection", id);
    return this.serializeSection(section);
  }

  async reorderSections(dto: ReorderDto, user: AuthenticatedUser) {
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.formSection.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })
      )
    );
    await this.auditChange(user.id, "sections_reorder", "FormSection", undefined, dto.items);
    return this.listSections();
  }

  async createField(dto: CreateFormFieldDto, user: AuthenticatedUser) {
    await this.ensureSection(dto.sectionId);
    const field = await this.prisma.formField.create({ data: this.fieldData(dto) as Prisma.FormFieldUncheckedCreateInput });
    await this.auditChange(user.id, "field_create", "FormField", field.id, dto);
    return this.serializeField(field);
  }

  async updateField(id: string, dto: UpdateFormFieldDto, user: AuthenticatedUser) {
    await this.ensureField(id);
    if (dto.sectionId) await this.ensureSection(dto.sectionId);
    const field = await this.prisma.formField.update({ where: { id }, data: this.fieldData(dto) as Prisma.FormFieldUncheckedUpdateInput });
    await this.auditChange(user.id, "field_update", "FormField", id, dto);
    return this.serializeField(field);
  }

  async deleteField(id: string, user: AuthenticatedUser) {
    await this.ensureField(id);
    const field = await this.prisma.formField.update({ where: { id }, data: { active: false } });
    await this.auditChange(user.id, "field_deactivate", "FormField", id);
    return this.serializeField(field);
  }

  async reorderFields(sectionId: string, dto: ReorderDto, user: AuthenticatedUser) {
    await this.ensureSection(sectionId);
    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.formField.update({ where: { id: item.id }, data: { sectionId, sortOrder: item.sortOrder } })
      )
    );
    await this.auditChange(user.id, "fields_reorder", "FormField", sectionId, dto.items);
    const section = await this.prisma.formSection.findUnique({ where: { id: sectionId }, include: { form: true } });
    return this.listSections(section?.form.code ?? registrationFormCode);
  }

  async publicRegistrationForm(membershipTypeId?: string) {
    return this.publicFormByCode(registrationFormCode, membershipTypeId);
  }

  async publicFormByCode(formCode: string, membershipTypeId?: string) {
    const form = await this.ensureFormByCode(formCode, false);
    const sections = await this.prisma.formSection.findMany({
      where: { formId: form.id, active: true },
      include: {
        fields: {
          where: {
            active: true,
            publicVisible: true,
            adminOnly: false
          },
          orderBy: { sortOrder: "asc" }
        }
      },
      orderBy: { sortOrder: "asc" }
    });

    return sections
      .map((section) => ({
        ...this.serializeSection(section),
        fields: section.fields
          .filter((field) => this.fieldAppliesToMembershipType(field, membershipTypeId))
          .map((field) => this.serializeField(field))
      }))
      .filter((section) => section.fields.length > 0);
  }

  async validateRegistration(dto: ValidateRegistrationDto) {
    const fields = await this.publicFields(registrationFormCode, dto.membershipTypeId);
    const errors = this.validateValues(fields, dto.values);
    return { valid: Object.keys(errors).length === 0, errors };
  }

  async submitRegistration(dto: SubmitRegistrationDto) {
    const validation = await this.validateRegistration(dto);
    if (!validation.valid) {
      throw new BadRequestException({ message: "Registration form validation failed.", errors: validation.errors });
    }

    const fields = await this.publicFields(registrationFormCode, dto.membershipTypeId);
    const email = dto.email.toLowerCase();
    const existing = await this.prisma.member.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      throw new ConflictException("A registration already exists for this email.");
    }

    const member = await this.prisma.$transaction(async (tx) => {
      const row = await tx.member.create({
        data: {
          fullName: dto.fullName,
          email,
          phone: dto.phone,
          membershipTypeId: dto.membershipTypeId,
          status: "pending",
          correctionToken: randomUUID(),
          formValues: {
            create: fields
              .filter((field) => dto.values[field.key] !== undefined)
              .map((field) => this.memberValueData(field, dto.values[field.key]))
          }
        },
        include: {
          formValues: true
        }
      });

      await tx.memberStatusLog.create({
        data: {
          memberId: row.id,
          fromStatus: null,
          toStatus: "pending",
          note: "Public registration submitted."
        }
      });

      await tx.auditLog.create({
        data: {
          module: "applications",
          action: "public_registration_submitted",
          entityType: "Member",
          entityId: row.id,
          metadata: {
            email,
            membershipTypeId: dto.membershipTypeId ?? null
          }
        }
      });

      return row;
    });

    return { applicationId: member.id, memberId: member.id, status: member.status, correctionToken: member.correctionToken };
  }

  async storeUpload(file: Express.Multer.File | undefined, fieldKey: string) {
    if (!file) {
      throw new BadRequestException("File is required.");
    }

    const field = await this.prisma.formField.findUnique({ where: { key: fieldKey } });
    if (!field || !field.active || !field.publicVisible || field.adminOnly || !fileTypes.includes(field.type)) {
      throw new BadRequestException("Upload field is not available.");
    }

    this.validateFile(field, file);
    await mkdir(uploadRoot, { recursive: true });
    const extension = extname(file.originalname);
    const storedName = `${randomUUID()}${extension}`;
    const fullPath = join(uploadRoot, storedName);
    await writeFile(fullPath, file.buffer);

    return {
      value: {
        fileUrl: `/uploads/registration/${storedName}`,
        fileName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size
      }
    };
  }

  private async publicFields(formCode: string, membershipTypeId?: string) {
    const form = await this.ensureFormByCode(formCode, false);
    const fields = await this.prisma.formField.findMany({
      where: {
        active: true,
        publicVisible: true,
        adminOnly: false,
        section: { formId: form.id, active: true }
      },
      orderBy: [{ section: { sortOrder: "asc" } }, { sortOrder: "asc" }]
    });

    return fields.filter((field) => this.fieldAppliesToMembershipType(field, membershipTypeId));
  }

  private validateValues(fields: FormField[], values: Record<string, unknown>) {
    const errors: Record<string, string> = {};
    for (const field of fields) {
      const value = values[field.key];
      if (field.required && this.isEmpty(value)) {
        errors[field.key] = `${field.label} is required.`;
        continue;
      }
      if (this.isEmpty(value)) continue;
      const rules = this.asRecord(field.validationRules);
      if (typeof rules.minLength === "number" && String(value).length < rules.minLength) {
        errors[field.key] = `${field.label} is too short.`;
      }
      if (typeof rules.maxLength === "number" && String(value).length > rules.maxLength) {
        errors[field.key] = `${field.label} is too long.`;
      }
      if (field.type === FormFieldType.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value))) {
        errors[field.key] = `${field.label} must be a valid email.`;
      }
      if (field.type === FormFieldType.number && Number.isNaN(Number(value))) {
        errors[field.key] = `${field.label} must be a number.`;
      }
      if (fileTypes.includes(field.type) && typeof value === "object" && value !== null) {
        const fileValue = value as { fileUrl?: string };
        if (!fileValue.fileUrl) errors[field.key] = `${field.label} upload is invalid.`;
      }
    }
    return errors;
  }

  private validateFile(field: FormField, file: Express.Multer.File) {
    const rules = this.asRecord(field.validationRules);
    const maxSizeMb = typeof rules.maxSizeMb === "number" ? rules.maxSizeMb : 5;
    if (file.size > maxSizeMb * 1024 * 1024) {
      throw new BadRequestException(`File must be ${maxSizeMb}MB or smaller.`);
    }
    if (field.type === FormFieldType.image && !file.mimetype.startsWith("image/")) {
      throw new BadRequestException("Only image uploads are allowed for this field.");
    }
    if (field.type === FormFieldType.document) {
      const allowed = ["application/pdf", "image/jpeg", "image/png"];
      if (!allowed.includes(file.mimetype)) {
        throw new BadRequestException("Only PDF, JPG, or PNG documents are allowed.");
      }
    }
  }

  private memberValueData(field: FormField, value: unknown) {
    const fileValue = fileTypes.includes(field.type) && typeof value === "object" && value !== null ? value : null;
    return {
      fieldId: field.id,
      fieldKeySnapshot: field.key,
      fieldLabelSnapshot: field.label,
      fieldTypeSnapshot: field.type,
      value: fileValue ? undefined : (value as Prisma.InputJsonValue),
      fileUrl: fileValue ? String((fileValue as { fileUrl?: string }).fileUrl ?? "") : undefined,
      fileName: fileValue ? String((fileValue as { fileName?: string }).fileName ?? "") : undefined,
      mimeType: fileValue ? String((fileValue as { mimeType?: string }).mimeType ?? "") : undefined,
      fileSize: fileValue ? Number((fileValue as { fileSize?: number }).fileSize ?? 0) : undefined
    };
  }

  private fieldAppliesToMembershipType(field: FormField, membershipTypeId?: string) {
    if (!field.membershipTypeSpecific) return true;
    const ids = Array.isArray(field.membershipTypeIds) ? field.membershipTypeIds : [];
    return Boolean(membershipTypeId && ids.includes(membershipTypeId));
  }

  private fieldData(dto: Partial<CreateFormFieldDto | UpdateFormFieldDto>) {
    return {
      ...dto,
      key: dto.key ? this.normalizeKey(dto.key) : undefined,
      membershipTypeIds: dto.membershipTypeIds ?? undefined,
      validationRules: dto.validationRules ?? undefined,
      options: dto.options ?? undefined
    };
  }

  private normalizeKey(key: string) {
    return key.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "");
  }

  private isEmpty(value: unknown) {
    return value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
  }

  private asRecord(value: Prisma.JsonValue | null) {
    return typeof value === "object" && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
  }

  private async ensureSection(id: string) {
    const section = await this.prisma.formSection.findUnique({ where: { id }, select: { id: true } });
    if (!section) throw new NotFoundException("Form section not found.");
  }

  private async ensureForm(id: string) {
    const form = await this.prisma.form.findUnique({ where: { id }, select: { id: true } });
    if (!form) throw new NotFoundException("Form not found.");
  }

  private async ensureFormByCode(code: string, includeInactive = true) {
    const form = await this.prisma.form.findUnique({ where: { code: this.normalizeKey(code) } });
    if (!form || (!includeInactive && !form.active)) throw new NotFoundException("Form not found.");
    return form;
  }

  private async ensureField(id: string) {
    const field = await this.prisma.formField.findUnique({ where: { id }, select: { id: true } });
    if (!field) throw new NotFoundException("Form field not found.");
  }

  private auditChange(userId: string, action: string, entityType: string, entityId?: string, metadata?: unknown) {
    return this.audit.log({
      userId,
      module: "form_builder",
      action,
      entityType,
      entityId,
      metadata: metadata as Prisma.InputJsonValue
    });
  }

  private serializeForm(form: { id: string; name: string; code: string; description: string | null; active: boolean; system: boolean; createdAt: Date; updatedAt: Date }) {
    return {
      id: form.id,
      name: form.name,
      code: form.code,
      description: form.description,
      active: form.active,
      system: form.system,
      createdAt: form.createdAt.toISOString(),
      updatedAt: form.updatedAt.toISOString()
    };
  }

  private serializeSection(section: { id: string; formId: string; title: string; description: string | null; sortOrder: number; active: boolean; fields: FormField[]; createdAt: Date; updatedAt: Date }) {
    return {
      id: section.id,
      formId: section.formId,
      title: section.title,
      description: section.description,
      sortOrder: section.sortOrder,
      active: section.active,
      fields: section.fields.map((field) => this.serializeField(field)),
      createdAt: section.createdAt.toISOString(),
      updatedAt: section.updatedAt.toISOString()
    };
  }

  private serializeField(field: FormField) {
    return {
      id: field.id,
      sectionId: field.sectionId,
      label: field.label,
      key: field.key,
      placeholder: field.placeholder,
      helpText: field.helpText,
      type: field.type,
      required: field.required,
      publicVisible: field.publicVisible,
      memberEditable: field.memberEditable,
      adminOnly: field.adminOnly,
      membershipTypeSpecific: field.membershipTypeSpecific,
      membershipTypeIds: Array.isArray(field.membershipTypeIds) ? field.membershipTypeIds : null,
      validationRules: this.asRecord(field.validationRules),
      options: Array.isArray(field.options) ? field.options : null,
      sortOrder: field.sortOrder,
      active: field.active,
      createdAt: field.createdAt.toISOString(),
      updatedAt: field.updatedAt.toISOString()
    };
  }
}
