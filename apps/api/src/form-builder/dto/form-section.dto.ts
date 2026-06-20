import { Transform } from "class-transformer";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Min, ValidateNested } from "class-validator";

export class CreateFormDto {
  @IsString()
  name!: string;

  @IsString()
  code!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateFormDto extends CreateFormDto {}

export class CreateFormSectionDto {
  @IsOptional()
  @IsString()
  formId?: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateFormSectionDto extends CreateFormSectionDto {}

export class ReorderItemDto {
  @IsString()
  id!: string;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  sortOrder!: number;
}

export class ReorderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items!: ReorderItemDto[];
}
