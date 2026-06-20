import { IsArray, IsObject, IsOptional, IsString } from "class-validator";

export class ApproveApplicationDto {
  @IsOptional()
  @IsString()
  approvalNote?: string;
}

export class RejectApplicationDto {
  @IsString()
  reason!: string;
}

export class RequestCorrectionDto {
  @IsString()
  message!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fieldKeys?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentTypes?: string[];
}

export class SubmitCorrectionDto {
  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsObject()
  values?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  documents?: Array<Record<string, unknown>>;
}

export class ApplyCorrectionSubmissionDto {
  @IsString()
  submissionId!: string;
}
