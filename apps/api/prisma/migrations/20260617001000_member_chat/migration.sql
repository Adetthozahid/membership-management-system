CREATE TYPE "ChatConversationType" AS ENUM ('direct', 'group');

CREATE TABLE "member_chat_presence" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "appearOffline" BOOLEAN NOT NULL DEFAULT false,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "member_chat_presence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_conversations" (
  "id" TEXT NOT NULL,
  "type" "ChatConversationType" NOT NULL,
  "nameCiphertext" TEXT,
  "nameIv" TEXT,
  "nameAuthTag" TEXT,
  "encryptionKeyVersion" INTEGER NOT NULL DEFAULT 1,
  "createdByMemberId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_participants" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastReadAt" TIMESTAMP(3),

  CONSTRAINT "chat_participants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_messages" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderMemberId" TEXT NOT NULL,
  "bodyCiphertext" TEXT,
  "bodyIv" TEXT,
  "bodyAuthTag" TEXT,
  "encryptionKeyVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chat_attachments" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "storedFileName" TEXT NOT NULL,
  "originalNameCiphertext" TEXT NOT NULL,
  "originalNameIv" TEXT NOT NULL,
  "originalNameAuthTag" TEXT NOT NULL,
  "mimeTypeCiphertext" TEXT NOT NULL,
  "mimeTypeIv" TEXT NOT NULL,
  "mimeTypeAuthTag" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "fileIv" TEXT NOT NULL,
  "fileAuthTag" TEXT NOT NULL,
  "encryptionKeyVersion" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "chat_attachments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "member_chat_presence_memberId_key" ON "member_chat_presence"("memberId");
CREATE INDEX "member_chat_presence_appearOffline_lastSeenAt_idx" ON "member_chat_presence"("appearOffline", "lastSeenAt");
CREATE INDEX "chat_conversations_type_updatedAt_idx" ON "chat_conversations"("type", "updatedAt");
CREATE UNIQUE INDEX "chat_participants_conversationId_memberId_key" ON "chat_participants"("conversationId", "memberId");
CREATE INDEX "chat_participants_memberId_idx" ON "chat_participants"("memberId");
CREATE INDEX "chat_messages_conversationId_createdAt_idx" ON "chat_messages"("conversationId", "createdAt");
CREATE INDEX "chat_messages_senderMemberId_idx" ON "chat_messages"("senderMemberId");
CREATE UNIQUE INDEX "chat_attachments_messageId_key" ON "chat_attachments"("messageId");

ALTER TABLE "member_chat_presence" ADD CONSTRAINT "member_chat_presence_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_participants" ADD CONSTRAINT "chat_participants_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_senderMemberId_fkey" FOREIGN KEY ("senderMemberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chat_attachments" ADD CONSTRAINT "chat_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "chat_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
