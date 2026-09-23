-- Wide banner image for a publication's page.
-- Added as a second migration rather than edited into the first, because the
-- initial migration is already applied in production and rewriting it would
-- leave the deployed database out of step with its own history.
ALTER TABLE "Publication" ADD COLUMN "coverImage" TEXT NOT NULL DEFAULT '';
