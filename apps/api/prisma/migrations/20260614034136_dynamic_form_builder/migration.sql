-- CreateEnum
CREATE TYPE "FormFieldType" AS ENUM ('text', 'textarea', 'number', 'date', 'email', 'phone', 'dropdown', 'radio', 'checkbox', 'file', 'image', 'document');

-- CreateTable
CREATE TABLE "form_sections" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_fields" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "placeholder" TEXT,
    "helpText" TEXT,
    "type" "FormFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "publicVisible" BOOLEAN NOT NULL DEFAULT true,
    "memberEditable" BOOLEAN NOT NULL DEFAULT false,
    "adminOnly" BOOLEAN NOT NULL DEFAULT false,
    "membershipTypeSpecific" BOOLEAN NOT NULL DEFAULT false,
    "membershipTypeIds" JSONB,
    "validationRules" JSONB,
    "options" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_form_values" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "fieldKeySnapshot" TEXT NOT NULL,
    "fieldLabelSnapshot" TEXT NOT NULL,
    "fieldTypeSnapshot" "FormFieldType" NOT NULL,
    "value" JSONB,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "member_form_values_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "form_sections_active_sortOrder_idx" ON "form_sections"("active", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "form_fields_key_key" ON "form_fields"("key");

-- CreateIndex
CREATE INDEX "form_fields_sectionId_sortOrder_idx" ON "form_fields"("sectionId", "sortOrder");

-- CreateIndex
CREATE INDEX "form_fields_active_publicVisible_idx" ON "form_fields"("active", "publicVisible");

-- CreateIndex
CREATE INDEX "member_form_values_fieldKeySnapshot_idx" ON "member_form_values"("fieldKeySnapshot");

-- CreateIndex
CREATE UNIQUE INDEX "member_form_values_memberId_fieldId_key" ON "member_form_values"("memberId", "fieldId");

-- AddForeignKey
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "form_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_form_values" ADD CONSTRAINT "member_form_values_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "member_form_values" ADD CONSTRAINT "member_form_values_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "form_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
