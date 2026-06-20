import { IsEmail, IsObject, IsOptional, IsString } from "class-validator";

export class ValidateRegistrationDto {
  @IsOptional()
  @IsString()
  membershipTypeId?: string;

  @IsObject()
  values!: Record<string, unknown>;
}

export class SubmitRegistrationDto extends ValidateRegistrationDto {
  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
