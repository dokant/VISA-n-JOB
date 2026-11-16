-- AlterTable
ALTER TABLE "SeekerProfile" ALTER COLUMN "sido" DROP NOT NULL,
ALTER COLUMN "visaCode" DROP NOT NULL,
ALTER COLUMN "track" DROP NOT NULL;

-- AlterTable
ALTER TABLE "VisaType" ADD COLUMN     "nextGoal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "subTypes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Backfill the new VisaType columns for databases seeded before P1c (the seed never overwrites
-- existing rows). Same values as prisma/seed/visaTypes.ts; operators may edit them afterwards.
UPDATE "VisaType" SET "subTypes" = ARRAY['F-2-R', 'F-2-7', 'F-2-99'], "nextGoal" = true WHERE "code" = 'F-2';
UPDATE "VisaType" SET "subTypes" = ARRAY['E-7-1', 'E-7-2', 'E-7-3', 'E-7-4', 'E-7-4R'], "nextGoal" = true WHERE "code" = 'E-7';
UPDATE "VisaType" SET "nextGoal" = true WHERE "code" IN ('F-4', 'F-5');
