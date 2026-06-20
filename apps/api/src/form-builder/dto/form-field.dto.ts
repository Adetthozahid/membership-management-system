import { Transform } from "class-transformer";
import { IsArray, IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, Min } from "class-validator";
import { FormFieldType } from "@prisma/client";

export class CreateFormFieldDto {
  @IsString()
  sectionId!: string;

  @IsString()
  label!: string;

  @IsString()
  key!: string;

  @IsOptional()
  @IsString()
  placeholder?: string;

  @IsOptional()
  @IsString()
  helpText?: string;

  @IsEnum(FormFieldType)
  type!: FormFieldType;

  @IsBoolean()
  required!: boolean;

  @IsBoolean()
  publicVisible!: boolean;

  @IsBoolean()
  memberEditable!: boolean;

  @IsBoolean()
  adminOnly!: boolean;

  @IsBoolean()
  membershipTypeSpecific!: boolean;

  @IsOptional()
  @IsArray()
  membershipTypeIds?: string[];

  @IsOptional()
  @IsObject()
  validationRules?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  options?: Array<{ label: string; value: string }>;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  sortOrder!: number;

  @IsBoolean()
  active!: boolean;
}

export class UpdateFormFieldDto {
  @IsOptional()
  @IsString()
  sectionId?: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  placeholder?: string;

  @IsOptional()
  @IsString()
  helpText?: string;

  @IsOptional()
  @IsEnum(FormFieldType)
  type?: FormFieldType;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsBoolean()
  publicVisible?: boolean;

  @IsOptional()
  @IsBoolean()
  memberEditable?: boolean;

  @IsOptional()
  @IsBoolean()
  adminOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  membershipTypeSpecific?: boolean;

  @IsOptional()
  @IsArray()
  membershipTypeIds?: string[];

  @IsOptional()
  @IsObject()
  validationRules?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  options?: Array<{ label: string; value: string }>;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
