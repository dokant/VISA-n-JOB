-- P2a R-201 / BR-05 / WO §15-4: a blind posting can be PUBLISHED only after staff verification.
-- The app refuses it first (src/lib/postings/manage.ts); this CHECK is the database backstop, so a
-- direct write cannot publish an unverified posting either.
ALTER TABLE "JobPosting"
  ADD CONSTRAINT "JobPosting_published_requires_verification"
  CHECK (
    "status" <> 'PUBLISHED'
    OR ("verifiedAt" IS NOT NULL AND "verifiedBy" IS NOT NULL AND "publishedAt" IS NOT NULL)
  );

-- R-202 public list: PUBLISHED postings, newest first.
CREATE INDEX "JobPosting_status_publishedAt_idx" ON "JobPosting"("status", "publishedAt");
