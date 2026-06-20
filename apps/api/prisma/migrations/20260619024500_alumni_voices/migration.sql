CREATE TABLE "alumni_voices" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "affiliation" TEXT,
    "quote" TEXT NOT NULL,
    "initials" TEXT,
    "imageUrl" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alumni_voices_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "alumni_voices_published_sortOrder_idx" ON "alumni_voices"("published", "sortOrder");
