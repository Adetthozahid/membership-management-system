CREATE TABLE "blog_post_comments" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "postSlug" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "authorName" TEXT NOT NULL,
  "authorEmail" TEXT NOT NULL,
  "authorRole" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "memberId" TEXT,
  "published" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "blog_post_comments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "blog_post_comments_postSlug_published_createdAt_idx" ON "blog_post_comments"("postSlug", "published", "createdAt");
CREATE INDEX "blog_post_comments_postId_published_createdAt_idx" ON "blog_post_comments"("postId", "published", "createdAt");
CREATE INDEX "blog_post_comments_userId_idx" ON "blog_post_comments"("userId");
CREATE INDEX "blog_post_comments_memberId_idx" ON "blog_post_comments"("memberId");

ALTER TABLE "blog_post_comments"
  ADD CONSTRAINT "blog_post_comments_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "blog_post_comments"
  ADD CONSTRAINT "blog_post_comments_memberId_fkey"
  FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;
