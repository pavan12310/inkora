-- Daily view counts, so stats can be charted over time.
CREATE TABLE "PostDay" (
    "id"     TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "day"    TEXT NOT NULL,
    "views"  INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "PostDay_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PostDay_postId_day_key" ON "PostDay"("postId", "day");
CREATE INDEX "PostDay_day_idx" ON "PostDay"("day");

ALTER TABLE "PostDay" ADD CONSTRAINT "PostDay_postId_fkey"
    FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
