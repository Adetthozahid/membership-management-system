import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { ChatConversationType, MemberStatus } from "@prisma/client";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { randomUUID } from "node:crypto";
import type { AuthenticatedUser } from "../auth/auth.types";
import { MemberAccessService } from "../auth/member-access.service";
import { PrismaService } from "../prisma/prisma.service";
import { ChatCryptoService } from "./chat-crypto.service";
import type { CreateGroupConversationDto, SendMessageDto } from "./dto/chat.dto";

const ONLINE_WINDOW_MS = 2 * 60 * 1000;

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly memberAccess: MemberAccessService,
    private readonly crypto: ChatCryptoService
  ) {}

  async contacts(user: AuthenticatedUser) {
    const currentMember = await this.currentMember(user);
    await this.touchPresence(currentMember.id);
    const onlineSince = new Date(Date.now() - ONLINE_WINDOW_MS);
    const members = await this.prisma.member.findMany({
      where: {
        id: { not: currentMember.id },
        userId: { not: null },
        status: MemberStatus.active
      },
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        memberId: true,
        photo: true,
        membershipType: { select: { name: true } },
        chatPresence: { select: { appearOffline: true, lastSeenAt: true } }
      }
    });

    return members.map((member) => ({
      id: member.id,
      fullName: member.fullName,
      memberId: member.memberId,
      photo: member.photo,
      membershipType: member.membershipType?.name ?? null,
      online: Boolean(member.chatPresence && !member.chatPresence.appearOffline && member.chatPresence.lastSeenAt >= onlineSince),
      lastSeenAt: member.chatPresence?.lastSeenAt ?? null
    }));
  }

  async conversations(user: AuthenticatedUser) {
    const currentMember = await this.currentMember(user);
    await this.touchPresence(currentMember.id);
    const conversations = await this.prisma.chatConversation.findMany({
      where: { participants: { some: { memberId: currentMember.id } } },
      orderBy: { updatedAt: "desc" },
      include: {
        participants: {
          include: {
            member: {
              select: {
                id: true,
                fullName: true,
                memberId: true,
                photo: true,
                chatPresence: { select: { appearOffline: true, lastSeenAt: true } }
              }
            }
          }
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { attachment: true, sender: { select: { id: true, fullName: true } } }
        }
      }
    });

    const onlineSince = new Date(Date.now() - ONLINE_WINDOW_MS);
    return conversations.map((conversation) => {
      const otherParticipants = conversation.participants.filter((participant) => participant.memberId !== currentMember.id);
      const lastMessage = conversation.messages[0];
      return {
        id: conversation.id,
        type: conversation.type,
        name: this.conversationName(conversation, otherParticipants),
        participants: conversation.participants.map((participant) => ({
          id: participant.member.id,
          fullName: participant.member.fullName,
          memberId: participant.member.memberId,
          photo: participant.member.photo,
          online: Boolean(participant.member.chatPresence && !participant.member.chatPresence.appearOffline && participant.member.chatPresence.lastSeenAt >= onlineSince)
        })),
        lastMessage: lastMessage ? this.formatMessage(lastMessage) : null,
        updatedAt: conversation.updatedAt
      };
    });
  }

  async createDirect(user: AuthenticatedUser, otherMemberId: string) {
    const currentMember = await this.currentMember(user);
    if (otherMemberId === currentMember.id) {
      throw new BadRequestException("Choose another member to start a chat.");
    }
    await this.assertMemberCanChat(otherMemberId);

    const existing = await this.prisma.chatConversation.findMany({
      where: {
        type: ChatConversationType.direct,
        participants: { some: { memberId: currentMember.id } }
      },
      include: { participants: true }
    });
    const direct = existing.find((conversation) => {
      const participantIds = conversation.participants.map((participant) => participant.memberId).sort();
      return participantIds.length === 2 && participantIds[0] === [currentMember.id, otherMemberId].sort()[0] && participantIds[1] === [currentMember.id, otherMemberId].sort()[1];
    });
    if (direct) return { id: direct.id };

    const conversation = await this.prisma.chatConversation.create({
      data: {
        type: ChatConversationType.direct,
        createdByMemberId: currentMember.id,
        participants: {
          create: [{ memberId: currentMember.id, role: "owner" }, { memberId: otherMemberId }]
        }
      }
    });
    return { id: conversation.id };
  }

  async createGroup(user: AuthenticatedUser, dto: CreateGroupConversationDto) {
    const currentMember = await this.currentMember(user);
    const memberIds = Array.from(new Set([currentMember.id, ...dto.memberIds]));
    if (memberIds.length < 3) {
      throw new BadRequestException("A group needs at least two other members.");
    }
    const chatMembers = await this.prisma.member.count({
      where: {
        id: { in: memberIds },
        userId: { not: null },
        status: MemberStatus.active
      }
    });
    if (chatMembers !== memberIds.length) {
      throw new BadRequestException("One or more selected members cannot use chat.");
    }
    const encryptedName = this.crypto.encryptText(dto.name.trim());
    const conversation = await this.prisma.chatConversation.create({
      data: {
        type: ChatConversationType.group,
        nameCiphertext: encryptedName.ciphertext,
        nameIv: encryptedName.iv,
        nameAuthTag: encryptedName.authTag,
        encryptionKeyVersion: this.crypto.keyVersion,
        createdByMemberId: currentMember.id,
        participants: {
          create: memberIds.map((memberId) => ({
            memberId,
            role: memberId === currentMember.id ? "owner" : "member"
          }))
        }
      }
    });
    return { id: conversation.id };
  }

  async messages(user: AuthenticatedUser, conversationId: string) {
    const currentMember = await this.currentMember(user);
    await this.assertParticipant(conversationId, currentMember.id);
    await this.touchPresence(currentMember.id);
    await this.prisma.chatParticipant.updateMany({
      where: { conversationId, memberId: currentMember.id },
      data: { lastReadAt: new Date() }
    });
    const messages = await this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      take: 200,
      include: { attachment: true, sender: { select: { id: true, fullName: true, photo: true } } }
    });
    return messages.map((message) => this.formatMessage(message));
  }

  async sendMessage(user: AuthenticatedUser, conversationId: string, dto: SendMessageDto, file?: Express.Multer.File) {
    const currentMember = await this.currentMember(user);
    await this.assertParticipant(conversationId, currentMember.id);
    const body = dto.body?.trim();
    if (!body && !file) {
      throw new BadRequestException("Write a message or attach a file.");
    }
    const encryptedBody = body ? this.crypto.encryptText(body) : null;
    const message = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        senderMemberId: currentMember.id,
        bodyCiphertext: encryptedBody?.ciphertext,
        bodyIv: encryptedBody?.iv,
        bodyAuthTag: encryptedBody?.authTag,
        encryptionKeyVersion: this.crypto.keyVersion
      }
    });

    if (file) {
      await this.saveAttachment(message.id, file);
    }

    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() }
    });
    await this.touchPresence(currentMember.id);
    return { id: message.id };
  }

  async updatePresence(user: AuthenticatedUser, appearOffline: boolean) {
    const currentMember = await this.currentMember(user);
    const presence = await this.prisma.memberChatPresence.upsert({
      where: { memberId: currentMember.id },
      create: { memberId: currentMember.id, appearOffline, lastSeenAt: new Date() },
      update: { appearOffline, lastSeenAt: new Date() }
    });
    return {
      appearOffline: presence.appearOffline,
      online: !presence.appearOffline,
      lastSeenAt: presence.lastSeenAt
    };
  }

  async downloadAttachment(user: AuthenticatedUser, attachmentId: string) {
    const currentMember = await this.currentMember(user);
    const attachment = await this.prisma.chatAttachment.findUnique({
      where: { id: attachmentId },
      include: { message: true }
    });
    if (!attachment) throw new NotFoundException("Attachment not found.");
    await this.assertParticipant(attachment.message.conversationId, currentMember.id);
    const encrypted = await readFile(join(process.cwd(), "uploads", "chat", attachment.storedFileName));
    const buffer = this.crypto.decryptFile({
      ciphertext: encrypted,
      iv: attachment.fileIv,
      authTag: attachment.fileAuthTag
    });
    return {
      buffer,
      fileName: this.crypto.decryptText({
        ciphertext: attachment.originalNameCiphertext,
        iv: attachment.originalNameIv,
        authTag: attachment.originalNameAuthTag
      }),
      mimeType: this.crypto.decryptText({
        ciphertext: attachment.mimeTypeCiphertext,
        iv: attachment.mimeTypeIv,
        authTag: attachment.mimeTypeAuthTag
      })
    };
  }

  private async saveAttachment(messageId: string, file: Express.Multer.File) {
    const uploadsDir = join(process.cwd(), "uploads", "chat");
    await mkdir(uploadsDir, { recursive: true });
    const encryptedFile = this.crypto.encryptFile(file.buffer);
    const storedFileName = `${randomUUID()}${extname(file.originalname)}.enc`;
    await writeFile(join(uploadsDir, storedFileName), encryptedFile.ciphertext);
    const encryptedName = this.crypto.encryptText(file.originalname || "attachment");
    const encryptedMimeType = this.crypto.encryptText(file.mimetype || "application/octet-stream");
    await this.prisma.chatAttachment.create({
      data: {
        messageId,
        storedFileName,
        originalNameCiphertext: encryptedName.ciphertext,
        originalNameIv: encryptedName.iv,
        originalNameAuthTag: encryptedName.authTag,
        mimeTypeCiphertext: encryptedMimeType.ciphertext,
        mimeTypeIv: encryptedMimeType.iv,
        mimeTypeAuthTag: encryptedMimeType.authTag,
        fileSize: file.size,
        fileIv: encryptedFile.iv,
        fileAuthTag: encryptedFile.authTag,
        encryptionKeyVersion: this.crypto.keyVersion
      }
    });
  }

  private async currentMember(user: AuthenticatedUser) {
    return this.memberAccess.requirePortalMember(user.id, {});
  }

  private async assertMemberCanChat(memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: {
        id: memberId,
        userId: { not: null },
        status: MemberStatus.active
      }
    });
    if (!member) throw new NotFoundException("Member not found.");
  }

  private async assertParticipant(conversationId: string, memberId: string) {
    const participant = await this.prisma.chatParticipant.findUnique({
      where: { conversationId_memberId: { conversationId, memberId } }
    });
    if (!participant) throw new ForbiddenException("You are not a participant in this chat.");
  }

  private async touchPresence(memberId: string) {
    await this.prisma.memberChatPresence.upsert({
      where: { memberId },
      create: { memberId, lastSeenAt: new Date() },
      update: { lastSeenAt: new Date() }
    });
  }

  private conversationName(conversation: { type: ChatConversationType; nameCiphertext: string | null; nameIv: string | null; nameAuthTag: string | null }, otherParticipants: Array<{ member: { fullName: string } }>) {
    if (conversation.type === ChatConversationType.group && conversation.nameCiphertext && conversation.nameIv && conversation.nameAuthTag) {
      return this.crypto.decryptText({
        ciphertext: conversation.nameCiphertext,
        iv: conversation.nameIv,
        authTag: conversation.nameAuthTag
      });
    }
    return otherParticipants.map((participant) => participant.member.fullName).join(", ") || "Chat";
  }

  private formatMessage(message: {
    id: string;
    bodyCiphertext: string | null;
    bodyIv: string | null;
    bodyAuthTag: string | null;
    createdAt: Date;
    sender: { id: string; fullName: string; photo?: string | null };
    attachment?: {
      id: string;
      originalNameCiphertext: string;
      originalNameIv: string;
      originalNameAuthTag: string;
      mimeTypeCiphertext: string;
      mimeTypeIv: string;
      mimeTypeAuthTag: string;
      fileSize: number;
    } | null;
  }) {
    return {
      id: message.id,
      body:
        message.bodyCiphertext && message.bodyIv && message.bodyAuthTag
          ? this.crypto.decryptText({ ciphertext: message.bodyCiphertext, iv: message.bodyIv, authTag: message.bodyAuthTag })
          : "",
      sender: message.sender,
      createdAt: message.createdAt,
      attachment: message.attachment
        ? {
            id: message.attachment.id,
            fileName: this.crypto.decryptText({
              ciphertext: message.attachment.originalNameCiphertext,
              iv: message.attachment.originalNameIv,
              authTag: message.attachment.originalNameAuthTag
            }),
            mimeType: this.crypto.decryptText({
              ciphertext: message.attachment.mimeTypeCiphertext,
              iv: message.attachment.mimeTypeIv,
              authTag: message.attachment.mimeTypeAuthTag
            }),
            fileSize: message.attachment.fileSize
          }
        : null
    };
  }
}
