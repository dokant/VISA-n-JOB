-- P1d (PLAN P1d 위험 "진단 결과→리드 저장 시 JobLead 필수 필드 부재"):
-- a 무료 채용 진단 lead (R-124, source DIAGNOSIS) has no company name and no posting title.
-- Existing rows keep their values; ingest (R-114) still requires both at the API schema level.
ALTER TABLE "JobLead" ALTER COLUMN "companyName" DROP NOT NULL;
ALTER TABLE "JobLead" ALTER COLUMN "title" DROP NOT NULL;

-- R-116 archive job (grade + last contact) and R-125 lead lookup by company.
CREATE INDEX "JobLead_grade_lastContactedAt_idx" ON "JobLead"("grade", "lastContactedAt");
CREATE INDEX "JobLead_companyId_idx" ON "JobLead"("companyId");
