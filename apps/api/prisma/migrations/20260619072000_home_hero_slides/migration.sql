CREATE TABLE "home_hero_slides" (
    "id" TEXT NOT NULL,
    "eyebrow" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "imagePosition" TEXT NOT NULL DEFAULT 'center center',
    "primaryLabel" TEXT,
    "primaryHref" TEXT,
    "secondaryLabel" TEXT,
    "secondaryHref" TEXT,
    "tertiaryLabel" TEXT,
    "tertiaryHref" TEXT,
    "accentClass" TEXT NOT NULL DEFAULT 'bg-[hsl(var(--cream))]',
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "home_hero_slides_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "home_hero_slides_published_sortOrder_idx" ON "home_hero_slides"("published", "sortOrder");
