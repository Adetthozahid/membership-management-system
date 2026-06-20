CREATE TABLE "website_section_settings" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "navVisible" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "website_section_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "website_section_settings_key_key" ON "website_section_settings"("key");
CREATE INDEX "website_section_settings_active_navVisible_sortOrder_idx" ON "website_section_settings"("active", "navVisible", "sortOrder");
