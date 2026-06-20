import { IsEnum, IsOptional, IsString } from "class-validator";
import { MemberStatus } from "@prisma/client";

export class UpdateMemberStatusDto {
  @IsEnum(MemberStatus)
  status!: MemberStatus;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  approvalNote?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @IsOptional()
  @IsString()
  correctionNote?: string;
}
