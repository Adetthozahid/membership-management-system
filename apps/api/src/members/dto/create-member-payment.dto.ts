import { PaymentPurpose } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from "class-validator";

export class CreateMemberPaymentDto {
  @IsEnum(PaymentPurpose)
  purpose!: PaymentPurpose;

  @IsNumber()
  @IsPositive()
  @Type(() => Number)
  amount!: number;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  note?: string;
}
