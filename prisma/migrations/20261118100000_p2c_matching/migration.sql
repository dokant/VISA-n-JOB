-- P2c (R-209 ~ R-212, R-216): interview status / 면접 확정 / per-interview consent decline,
-- 소개 확인서 file metadata, Placement and VisaCase timestamps, lookup indexes.
-- BR-13: no 고유식별정보 column is added to VisaCase (Phase 3).

-- AlterTable
ALTER TABLE "Interview" ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "consentDeclinedAt" TIMESTAMP(3),
ADD COLUMN     "introConfirmMime" TEXT,
ADD COLUMN     "introConfirmUploadedAt" TIMESTAMP(3),
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Placement" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "VisaCase" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Consent_interviewId_type_idx" ON "Consent"("interviewId", "type");

-- CreateIndex
CREATE INDEX "Interview_recommendationId_idx" ON "Interview"("recommendationId");

-- CreateIndex
CREATE INDEX "VisaCase_seekerId_idx" ON "VisaCase"("seekerId");


-- Interview.status values (src/lib/interviews/manage.ts).
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_status_check" CHECK ("status" IN ('SCHEDULED', 'CONFIRMED', 'CANCELLED'));
