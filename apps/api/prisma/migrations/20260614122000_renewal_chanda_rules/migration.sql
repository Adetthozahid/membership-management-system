-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('renewal', 'chanda', 'other');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "purpose" "PaymentPurpose" NOT NULL DEFAULT 'other';

-- CreateIndex
CREATE INDEX "Payment_memberId_purpose_status_idx" ON "Payment"("memberId", "purpose", "status");
