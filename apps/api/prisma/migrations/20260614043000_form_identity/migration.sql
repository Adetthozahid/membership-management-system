-- Add saved form identity so registration is a dedicated form and other modules can request forms by code.
CREATE TABLE "forms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "system" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forms_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "forms_code_key" ON "forms"("code");
CREATE INDEX "forms_active_code_idx" ON "forms"("active", "code");

INSERT INTO "forms" ("id", "name", "code", "description", "active", "system", "createdAt", "updatedAt")
VALUES ('registration', 'Registration', 'registration', 'Default public member registration form.', true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

ALTER TABLE "form_sections" ADD COLUMN "formId" TEXT;
UPDATE "form_sections" SET "formId" = 'registration' WHERE "formId" IS NULL;
ALTER TABLE "form_sections" ALTER COLUMN "formId" SET NOT NULL;

CREATE INDEX "form_sections_formId_sortOrder_idx" ON "form_sections"("formId", "sortOrder");
ALTER TABLE "form_sections" ADD CONSTRAINT "form_sections_formId_fkey" FOREIGN KEY ("formId") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
