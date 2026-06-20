ALTER TYPE "MemberStatus" ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE "MemberStatus" ADD VALUE IF NOT EXISTS 'under_review';
ALTER TYPE "MemberStatus" ADD VALUE IF NOT EXISTS 'correction_requested';
ALTER TYPE "MemberStatus" ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE "MemberStatus" ADD VALUE IF NOT EXISTS 'rejected';
ALTER TYPE "MemberStatus" ADD VALUE IF NOT EXISTS 'expired';

ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_memberId_fkey";
ALTER TABLE "Membership" DROP CONSTRAINT IF EXISTS "Membership_planId_fkey";
ALTER TABLE "Membership" DROP CONSTRAINT IF EXISTS "Membership_memberId_fkey";
ALTER TABLE "Payment" DROP CONSTRAINT IF EXISTS "Payment_memberId_fkey";

ALTER TABLE "Member" RENAME TO "members";
ALTER TABLE "members" RENAME CONSTRAINT "Member_pkey" TO "members_pkey";
ALTER INDEX IF EXISTS "Member_email_key" RENAME TO "members_email_key";
ALTER INDEX IF EXISTS "Member_memberNumber_key" RENAME TO "members_memberId_key";

ALTER TABLE "members" RENAME COLUMN "memberNumber" TO "memberId";
ALTER TABLE "members" ADD COLUMN "userId" TEXT;
ALTER TABLE "members" ADD COLUMN "photo" TEXT;
ALTER TABLE "members" ADD COLUMN "membershipTypeId" TEXT;
ALTER TABLE "members" ADD COLUMN "approvalNote" TEXT;
ALTER TABLE "members" ADD COLUMN "rejectionReason" TEXT;
ALTER TABLE "members" ADD COLUMN "correctionRequestedAt" TIMESTAMP(3);
ALTER TABLE "members" ADD COLUMN "correctionNote" TEXT;
ALTER TABLE "members" ADD COLUMN "approvedByUserId" TEXT;
ALTER TABLE "members" ADD COLUMN "rejectedByUserId" TEXT;
ALTER TABLE "members" ADD COLUMN "correctionByUserId" TEXT;
ALTER TABLE "members" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "members" ADD COLUMN "expiredAt" TIMESTAMP(3);
ALTER TABLE "members" ALTER COLUMN "memberId" DROP NOT NULL;
ALTER TABLE "members" ALTER COLUMN "joinedAt" DROP DEFAULT;

ALTER TABLE "MembershipPlan" RENAME TO "membership_types";
ALTER TABLE "membership_types" RENAME CONSTRAINT "MembershipPlan_pkey" TO "membership_types_pkey";
ALTER INDEX IF EXISTS "MembershipPlan_name_key" RENAME TO "membership_types_name_key";
ALTER TABLE "membership_types" ADD COLUMN "code" TEXT;
UPDATE "membership_types" SET "code" = UPPER(REGEXP_REPLACE("name", '[^a-zA-Z0-9]+', '_', 'g')) WHERE "code" IS NULL;
ALTER TABLE "membership_types" ALTER COLUMN "code" SET NOT NULL;
ALTER TABLE "membership_types" ADD COLUMN "renewalRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "membership_types" ADD COLUMN "renewalFee" DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE "membership_types" ADD COLUMN "renewalCycle" TEXT;
ALTER TABLE "membership_types" ADD COLUMN "gracePeriodDays" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "membership_types" ADD COLUMN "directoryVisibleWhenExpired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "membership_types" ADD COLUMN "monthlyChandaRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "membership_types" ADD COLUMN "monthlyChandaAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE "membership_types" RENAME COLUMN "isActive" TO "active";
ALTER TABLE "membership_types" DROP COLUMN IF EXISTS "priceCents";
ALTER TABLE "membership_types" DROP COLUMN IF EXISTS "durationDays";

CREATE UNIQUE INDEX "membership_types_code_key" ON "membership_types"("code");

ALTER TABLE "Membership" RENAME COLUMN "planId" TO "membershipTypeId";

CREATE TABLE "member_status_logs" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "fromStatus" "MemberStatus",
    "toStatus" "MemberStatus" NOT NULL,
    "note" TEXT,
    "changedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "member_status_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "member_documents" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "member_documents_pkey" PRIMARY KEY ("id")
);

UPDATE "members"
SET "userId" = "users"."id"
FROM "users"
WHERE "users"."memberId" = "members"."id";

ALTER TABLE "users" DROP COLUMN IF EXISTS "memberId";

CREATE UNIQUE INDEX "members_userId_key" ON "members"("userId");
CREATE INDEX "members_status_idx" ON "members"("status");
CREATE INDEX "members_membershipTypeId_idx" ON "members"("membershipTypeId");
CREATE INDEX "member_status_logs_memberId_idx" ON "member_status_logs"("memberId");
CREATE INDEX "member_documents_memberId_idx" ON "member_documents"("memberId");

ALTER TABLE "members" ADD CONSTRAINT "members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "members" ADD CONSTRAINT "members_membershipTypeId_fkey" FOREIGN KEY ("membershipTypeId") REFERENCES "membership_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_membershipTypeId_fkey" FOREIGN KEY ("membershipTypeId") REFERENCES "membership_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "member_status_logs" ADD CONSTRAINT "member_status_logs_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "member_documents" ADD CONSTRAINT "member_documents_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
