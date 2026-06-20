CREATE TYPE "WebsitePageStatus" AS ENUM ('draft', 'published', 'hidden');

CREATE TYPE "WebsitePageLayout" AS ENUM ('standard', 'landing', 'sidebar', 'custom');

CREATE TABLE "website_general_settings" (
  "id" TEXT NOT NULL,
  "siteTitle" TEXT NOT NULL,
  "logoUrl" TEXT,
  "faviconUrl" TEXT,
  "metaKeywords" TEXT,
  "metaDescription" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "website_general_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "website_page_settings" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "route" TEXT NOT NULL,
  "status" "WebsitePageStatus" NOT NULL DEFAULT 'published',
  "layout" "WebsitePageLayout" NOT NULL DEFAULT 'standard',
  "metaTitle" TEXT,
  "metaDescription" TEXT,
  "metaKeywords" TEXT,
  "heroTitle" TEXT,
  "heroSubtitle" TEXT,
  "body" TEXT,
  "customTemplate" TEXT,
  "contentBlocks" JSONB NOT NULL DEFAULT '[]',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "website_page_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "website_page_settings_key_key" ON "website_page_settings"("key");
CREATE INDEX "website_page_settings_status_sortOrder_idx" ON "website_page_settings"("status", "sortOrder");
