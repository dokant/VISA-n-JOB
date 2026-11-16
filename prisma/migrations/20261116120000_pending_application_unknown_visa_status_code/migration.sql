-- P1c run 2 (STANDARD v2.7 3.3 B-5 / Q-10): pendingApplication gets "모름" (UNKNOWN); null = 미응답.
-- CreateEnum
CREATE TYPE "YesNoUnknown" AS ENUM ('YES', 'NO', 'UNKNOWN');

-- AlterTable: keep existing answers. true → YES; false after Step 2 was confirmed → NO; else null.
ALTER TABLE "SeekerProfile" ALTER COLUMN "pendingApplication" DROP DEFAULT;
ALTER TABLE "SeekerProfile" ALTER COLUMN "pendingApplication" DROP NOT NULL;
ALTER TABLE "SeekerProfile" ALTER COLUMN "pendingApplication" TYPE "YesNoUnknown" USING (
  CASE
    WHEN "pendingApplication" THEN 'YES'
    WHEN "visaConfirmedAt" IS NOT NULL THEN 'NO'
    ELSE NULL
  END
)::"YesNoUnknown";

-- AlterTable (STANDARD v2.7 3.2 VisaLabel B-3): rows that are not a 체류자격 code show the name only.
ALTER TABLE "VisaType" ADD COLUMN     "isStatusCode" BOOLEAN NOT NULL DEFAULT true;

-- Backfill for databases seeded before this migration (the seed never overwrites existing rows).
-- Same values as prisma/seed/visaTypes.ts; operators may edit them afterwards.
UPDATE "VisaType" SET "isStatusCode" = false WHERE "code" IN ('OTHER', 'NONE', 'UNKNOWN');
