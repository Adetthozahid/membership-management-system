CREATE TABLE "member_notification_preferences" (
  "id" TEXT NOT NULL,
  "memberId" TEXT NOT NULL,
  "noticeEnabled" BOOLEAN NOT NULL DEFAULT true,
  "eventEnabled" BOOLEAN NOT NULL DEFAULT true,
  "postEnabled" BOOLEAN NOT NULL DEFAULT true,
  "galleryEnabled" BOOLEAN NOT NULL DEFAULT true,
  "websiteEnabled" BOOLEAN NOT NULL DEFAULT true,
  "lastSeenAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "member_notification_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "member_notification_preferences_memberId_key" ON "member_notification_preferences"("memberId");
CREATE INDEX "member_notification_preferences_memberId_idx" ON "member_notification_preferences"("memberId");

ALTER TABLE "member_notification_preferences"
ADD CONSTRAINT "member_notification_preferences_memberId_fkey"
FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
