ALTER TABLE "blog_post_comments" ADD COLUMN "parentId" TEXT;

CREATE INDEX "blog_post_comments_parentId_idx" ON "blog_post_comments"("parentId");

ALTER TABLE "blog_post_comments"
  ADD CONSTRAINT "blog_post_comments_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "blog_post_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
