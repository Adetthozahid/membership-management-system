import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

export class CreateDirectConversationDto {
  @IsUUID()
  memberId!: string;
}

export class CreateGroupConversationDto {
  @IsString()
  @MaxLength(80)
  name!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID(undefined, { each: true })
  memberIds!: string[];
}

export class SendMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  body?: string;
}

export class UpdatePresenceDto {
  @IsBoolean()
  appearOffline!: boolean;
}
