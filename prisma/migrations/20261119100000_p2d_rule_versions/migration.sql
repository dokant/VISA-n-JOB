-- P2d (R-215): rule / score table versions.
-- VisaRule.ruleKey groups the versions of one rule; existing rows (seeded SAMPLE rows) become their
-- own rule (ruleKey = id). Versions are unique per ruleKey, and per ScoreTable name.

-- AlterTable
ALTER TABLE "VisaRule" ADD COLUMN "ruleKey" TEXT;
UPDATE "VisaRule" SET "ruleKey" = "id" WHERE "ruleKey" IS NULL;
ALTER TABLE "VisaRule" ALTER COLUMN "ruleKey" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "VisaRule_ruleKey_version_key" ON "VisaRule"("ruleKey", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ScoreTable_name_version_key" ON "ScoreTable"("name", "version");
