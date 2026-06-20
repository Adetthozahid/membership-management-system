import { Transform } from "class-transformer";
import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateMembershipTypeDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsBoolean()
  renewalRequired!: boolean;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  renewalFee!: number;

  @IsOptional()
  @IsString()
  renewalCycle?: string;

  @IsInt()
  @Min(0)
  gracePeriodDays!: number;

  @IsBoolean()
  directoryVisibleWhenExpired!: boolean;

  @IsBoolean()
  monthlyChandaRequired!: boolean;

  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  monthlyChandaAmount!: number;

  @IsBoolean()
  active!: boolean;
}

export class UpdateMembershipTypeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  renewalRequired?: boolean;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  renewalFee?: number;

  @IsOptional()
  @IsString()
  renewalCycle?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  gracePeriodDays?: number;

  @IsOptional()
  @IsBoolean()
  directoryVisibleWhenExpired?: boolean;

  @IsOptional()
  @IsBoolean()
  monthlyChandaRequired?: boolean;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  monthlyChandaAmount?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
