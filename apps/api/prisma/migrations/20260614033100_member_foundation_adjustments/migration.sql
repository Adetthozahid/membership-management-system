-- DropIndex
DROP INDEX "membership_types_name_key";

-- AlterTable
ALTER TABLE "members" ALTER COLUMN "status" SET DEFAULT 'pending',
ALTER COLUMN "joinedAt" DROP NOT NULL;
