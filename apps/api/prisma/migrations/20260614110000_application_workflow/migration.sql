-- AlterTable
ALTER TABLE "members" ADD COLUMN "correctionToken" TEXT;

-- CreateTable
CREATE TABLE "member_id_sequences" (
    "scope" TEXT NOT NULL,
    "nextValue" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_id_sequences_pkey" PRIMARY KEY ("scope")
);

-- CreateTable
CREATE TABLE "member_correction_requests" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "fieldKeys" JSONB,
    "documentTypes" JSONB,
    "requestedByUserId" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_correction_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_correction_submissions" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "requestId" TEXT,
    "message" TEXT,
    "values" JSONB,
    "documents" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_correction_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "members_correctionToken_key" ON "members"("correctionToken");

-- CreateIndex
CREATE INDEX "member_correction_requests_memberId_idx" ON "member_correction_requests"("memberId");

-- CreateIndex
CREATE INDEX "member_correction_submissions_memberId_idx" ON "member_correction_submissions"("memberId");

-- AddForeignKey
ALTER TABLE "member_correction_requests" ADD CONSTRAINT "member_correction_requests_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_correction_submissions" ADD CONSTRAINT "member_correction_submissions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;
