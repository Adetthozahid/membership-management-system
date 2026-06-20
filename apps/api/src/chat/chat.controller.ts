import { Body, Controller, Get, Header, Param, Patch, Post, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import type { Response } from "express";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequirePermission } from "../auth/permissions.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { ChatService } from "./chat.service";
import { CreateDirectConversationDto, CreateGroupConversationDto, SendMessageDto, UpdatePresenceDto } from "./dto/chat.dto";

@Controller("member/chat")
@UseGuards(JwtAuthGuard, PermissionGuard)
@RequirePermission("member", "access")
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get("contacts")
  contacts(@CurrentUser() user: AuthenticatedUser) {
    return this.chatService.contacts(user);
  }

  @Get("conversations")
  conversations(@CurrentUser() user: AuthenticatedUser) {
    return this.chatService.conversations(user);
  }

  @Post("conversations/direct")
  createDirect(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDirectConversationDto) {
    return this.chatService.createDirect(user, dto.memberId);
  }

  @Post("conversations/groups")
  createGroup(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateGroupConversationDto) {
    return this.chatService.createGroup(user, dto);
  }

  @Get("conversations/:id/messages")
  messages(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.chatService.messages(user, id);
  }

  @Post("conversations/:id/messages")
  @UseInterceptors(FileInterceptor("attachment", { storage: memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } }))
  sendMessage(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: SendMessageDto, @UploadedFile() attachment?: Express.Multer.File) {
    return this.chatService.sendMessage(user, id, dto, attachment);
  }

  @Patch("presence")
  presence(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdatePresenceDto) {
    return this.chatService.updatePresence(user, dto.appearOffline);
  }

  @Get("attachments/:id")
  @Header("Cache-Control", "private, no-store")
  async attachment(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Res() response: Response) {
    const attachment = await this.chatService.downloadAttachment(user, id);
    response.setHeader("Content-Type", attachment.mimeType);
    response.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(attachment.fileName)}"`);
    response.send(attachment.buffer);
  }
}
