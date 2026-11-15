-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SEEKER', 'EMPLOYER', 'AGENCY', 'STAFF_PLACEMENT', 'STAFF_VISA', 'ADMIN');

-- CreateEnum
CREATE TYPE "SeekerTrack" AS ENUM ('JOB_MATCH', 'FUTURE_POOL', 'CONSULT_ONLY');

-- CreateEnum
CREATE TYPE "SeekerGrade" AS ENUM ('B', 'A', 'S');

-- CreateEnum
CREATE TYPE "JobSearchStatus" AS ENUM ('IMMEDIATE', 'WITHIN_1M', 'EMPLOYED_OPEN', 'NOT_SEARCHING');

-- CreateEnum
CREATE TYPE "SeekerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'EMPLOYED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "LeadGrade" AS ENUM ('C', 'B', 'A', 'ARCHIVED', 'DO_NOT_CONTACT');

-- CreateEnum
CREATE TYPE "PostingStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "RuleStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'RETIRED');

-- CreateEnum
CREATE TYPE "Outcome" AS ENUM ('GREEN', 'YELLOW', 'RED');

-- CreateEnum
CREATE TYPE "ShiftOk" AS ENUM ('YES', 'NO', 'CONDITIONAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "RegionLevel" AS ENUM ('SIDO', 'SIGUNGU');

-- CreateEnum
CREATE TYPE "StaffTaskType" AS ENUM ('PROFILE_COMPLETION_NOTICE', 'CONSULT', 'VISA_REVIEW', 'STAY_EXPIRY', 'STATUS_CHECK', 'INTEREST_FOLLOWUP', 'LEAD_REVIEW', 'OTHER');

-- CreateEnum
CREATE TYPE "StaffTaskStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "phoneEnc" TEXT,
    "phoneHash" TEXT,
    "email" TEXT,
    "password" TEXT,
    "totpSecret" TEXT,
    "totpEnabledAt" TIMESTAMP(3),
    "displayName" TEXT,
    "companyId" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'ko',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeekerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "legalNameEnc" TEXT,
    "messengerType" TEXT,
    "messengerIdEnc" TEXT,
    "emailEnc" TEXT,
    "birthYear" INTEGER,
    "gender" TEXT,
    "nationality" TEXT,
    "sido" TEXT NOT NULL,
    "sigungu" TEXT,
    "visaCode" TEXT NOT NULL,
    "visaSubType" TEXT,
    "stayExpiry" TIMESTAMP(3),
    "entryYear" INTEGER,
    "hasArc" BOOLEAN,
    "pendingApplication" BOOLEAN NOT NULL DEFAULT false,
    "visaConfirmedAt" TIMESTAMP(3),
    "educationLevel" TEXT,
    "major" TEXT,
    "schoolNameEnc" TEXT,
    "graduationDate" TIMESTAMP(3),
    "topikLevel" INTEGER,
    "kiipStage" INTEGER,
    "koreanSpeaking" INTEGER,
    "otherLanguages" JSONB,
    "skills" TEXT[],
    "licenses" TEXT[],
    "desiredIndustries" TEXT[],
    "desiredRegions" TEXT[],
    "needDormitory" BOOLEAN,
    "shiftOk" "ShiftOk",
    "desiredPayMin" INTEGER,
    "availableFrom" TIMESTAMP(3),
    "jobSearchStatus" "JobSearchStatus",
    "groupApply" BOOLEAN NOT NULL DEFAULT false,
    "groupFriendCode" TEXT,
    "nextVisaGoal" TEXT,
    "wantsConsult" BOOLEAN NOT NULL DEFAULT false,
    "consultTime" TEXT[],
    "track" "SeekerTrack" NOT NULL,
    "grade" "SeekerGrade" NOT NULL DEFAULT 'B',
    "needsVisaReview" BOOLEAN NOT NULL DEFAULT false,
    "verifiedVisa" BOOLEAN NOT NULL DEFAULT false,
    "verifiedKorean" BOOLEAN NOT NULL DEFAULT false,
    "consultedAt" TIMESTAMP(3),
    "convertibleVisa" TEXT,
    "convertibleAt" TIMESTAMP(3),
    "status" "SeekerStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastActiveConfirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statusCheckSentAt" TIMESTAMP(3),
    "stayAlertOptIn" BOOLEAN NOT NULL DEFAULT false,
    "noShowCount" INTEGER NOT NULL DEFAULT 0,
    "referralCode" TEXT NOT NULL,
    "referredByCode" TEXT,
    "sourceChannel" TEXT,
    "isQuickSignup" BOOLEAN NOT NULL DEFAULT false,
    "completedStep" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SeekerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkExperience" (
    "id" TEXT NOT NULL,
    "seekerId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "industryCode" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "months" INTEGER NOT NULL,
    "employerNameEnc" TEXT,

    CONSTRAINT "WorkExperience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "agreedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "ipHash" TEXT,
    "interviewId" TEXT,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "nameEnc" TEXT NOT NULL,
    "bizRegNoEnc" TEXT,
    "bizRegNoHash" TEXT,
    "industryCode" TEXT NOT NULL,
    "sido" TEXT NOT NULL,
    "sigungu" TEXT,
    "employeeCount" INTEGER,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "contractSignedAt" TIMESTAMP(3),
    "contractVersion" TEXT,
    "visaMandateAgreed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobLead" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceRef" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "bizRegNo" TEXT,
    "industryCode" TEXT,
    "sido" TEXT NOT NULL,
    "sigungu" TEXT,
    "title" TEXT NOT NULL,
    "payMin" INTEGER,
    "payMax" INTEGER,
    "postedAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "depopulationArea" BOOLEAN NOT NULL DEFAULT false,
    "grade" "LeadGrade" NOT NULL DEFAULT 'C',
    "foreignIntent" BOOLEAN,
    "nextActionAt" TIMESTAMP(3),
    "companyId" TEXT,
    "rawJson" JSONB NOT NULL,
    "diagnosisJson" JSONB,
    "requestJson" JSONB,
    "requestedAt" TIMESTAMP(3),
    "contactNameEnc" TEXT,
    "contactPhoneEnc" TEXT,
    "contactPhoneHash" TEXT,
    "contactEmailEnc" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "JobLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "note" TEXT,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobPosting" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "leadId" TEXT,
    "blindTitle" TEXT NOT NULL,
    "industryCode" TEXT NOT NULL,
    "sido" TEXT NOT NULL,
    "sigungu" TEXT,
    "role" TEXT NOT NULL,
    "payMin" INTEGER NOT NULL,
    "payMax" INTEGER,
    "overtimeNote" TEXT,
    "dormitory" TEXT NOT NULL,
    "meals" TEXT,
    "shift" TEXT,
    "headcount" INTEGER NOT NULL,
    "eligibleVisas" TEXT[],
    "status" "PostingStatus" NOT NULL DEFAULT 'DRAFT',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobPosting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterestRequest" (
    "id" TEXT NOT NULL,
    "initiator" TEXT NOT NULL,
    "seekerId" TEXT NOT NULL,
    "postingId" TEXT,
    "companyId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterestRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "seekerId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "postingId" TEXT,
    "staffId" TEXT NOT NULL,
    "recommendedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interview" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "place" TEXT NOT NULL,
    "interpreter" TEXT,
    "attended" BOOLEAN,
    "result" TEXT,
    "introConfirmFile" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Placement" (
    "id" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "contractDate" TIMESTAMP(3) NOT NULL,
    "monthlyWage" INTEGER NOT NULL,
    "feeAmount" INTEGER NOT NULL,
    "feeStatus" TEXT NOT NULL,

    CONSTRAINT "Placement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaCase" (
    "id" TEXT NOT NULL,
    "seekerId" TEXT NOT NULL,
    "companyId" TEXT,
    "caseType" TEXT NOT NULL,
    "targetVisa" TEXT,
    "status" TEXT NOT NULL,
    "mandateSignedAt" TIMESTAMP(3),
    "fee" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisaCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaRule" (
    "id" TEXT NOT NULL,
    "visaCode" TEXT NOT NULL,
    "industryCode" TEXT,
    "conditions" JSONB NOT NULL,
    "outcome" "Outcome" NOT NULL,
    "messageKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "RuleStatus" NOT NULL DEFAULT 'DRAFT',
    "isSample" BOOLEAN NOT NULL DEFAULT true,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisaRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreTable" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "items" JSONB NOT NULL,
    "passScore" INTEGER,
    "status" "RuleStatus" NOT NULL DEFAULT 'DRAFT',
    "isSample" BOOLEAN NOT NULL DEFAULT true,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyRequest" (
    "id" TEXT NOT NULL,
    "agencyId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "visaCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgencyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "meta" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisaType" (
    "code" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "defaultTrack" "SeekerTrack",
    "registrable" BOOLEAN NOT NULL,
    "autoConsult" BOOLEAN NOT NULL DEFAULT false,
    "needsVisaReview" BOOLEAN NOT NULL DEFAULT false,
    "graduationWindowMonths" INTEGER,
    "graduationWindowTrack" "SeekerTrack",
    "graduationWindowAutoConsult" BOOLEAN NOT NULL DEFAULT false,
    "requiresGraduationDate" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VisaType_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Industry" (
    "code" TEXT NOT NULL,
    "nameKo" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Industry_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Region" (
    "code" TEXT NOT NULL,
    "level" "RegionLevel" NOT NULL,
    "parentCode" TEXT,
    "nameKo" TEXT NOT NULL,
    "nameKey" TEXT,
    "depopulationArea" BOOLEAN NOT NULL DEFAULT false,
    "isSample" BOOLEAN NOT NULL DEFAULT true,
    "needsReview" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "OtpChallenge" (
    "id" TEXT NOT NULL,
    "phoneHash" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL DEFAULT 'SIGNUP',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("key","windowStart")
);

-- CreateTable
CREATE TABLE "StaffTask" (
    "id" TEXT NOT NULL,
    "type" "StaffTaskType" NOT NULL,
    "status" "StaffTaskStatus" NOT NULL DEFAULT 'OPEN',
    "assigneeRole" "Role",
    "assigneeId" TEXT,
    "seekerId" TEXT,
    "companyId" TEXT,
    "leadId" TEXT,
    "dueAt" TIMESTAMP(3),
    "dedupeKey" TEXT,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "StaffTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneHash_key" ON "User"("phoneHash");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "SeekerProfile_userId_key" ON "SeekerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SeekerProfile_publicId_key" ON "SeekerProfile"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "SeekerProfile_referralCode_key" ON "SeekerProfile"("referralCode");

-- CreateIndex
CREATE INDEX "SeekerProfile_grade_track_status_idx" ON "SeekerProfile"("grade", "track", "status");

-- CreateIndex
CREATE INDEX "SeekerProfile_visaCode_idx" ON "SeekerProfile"("visaCode");

-- CreateIndex
CREATE INDEX "SeekerProfile_sido_idx" ON "SeekerProfile"("sido");

-- CreateIndex
CREATE INDEX "WorkExperience_seekerId_idx" ON "WorkExperience"("seekerId");

-- CreateIndex
CREATE INDEX "Consent_userId_type_idx" ON "Consent"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Company_bizRegNoHash_key" ON "Company"("bizRegNoHash");

-- CreateIndex
CREATE UNIQUE INDEX "JobLead_sourceRef_key" ON "JobLead"("sourceRef");

-- CreateIndex
CREATE INDEX "JobLead_grade_idx" ON "JobLead"("grade");

-- CreateIndex
CREATE INDEX "JobLead_sido_industryCode_idx" ON "JobLead"("sido", "industryCode");

-- CreateIndex
CREATE INDEX "CallLog_leadId_idx" ON "CallLog"("leadId");

-- CreateIndex
CREATE INDEX "JobPosting_status_idx" ON "JobPosting"("status");

-- CreateIndex
CREATE INDEX "InterestRequest_seekerId_idx" ON "InterestRequest"("seekerId");

-- CreateIndex
CREATE INDEX "InterestRequest_companyId_createdAt_idx" ON "InterestRequest"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "Recommendation_seekerId_idx" ON "Recommendation"("seekerId");

-- CreateIndex
CREATE INDEX "Recommendation_companyId_idx" ON "Recommendation"("companyId");

-- CreateIndex
CREATE INDEX "Interview_scheduledAt_idx" ON "Interview"("scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "Placement_recommendationId_key" ON "Placement"("recommendationId");

-- CreateIndex
CREATE INDEX "VisaRule_visaCode_status_idx" ON "VisaRule"("visaCode", "status");

-- CreateIndex
CREATE INDEX "ScoreTable_name_status_idx" ON "ScoreTable"("name", "status");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_at_idx" ON "AuditLog"("action", "at");

-- CreateIndex
CREATE INDEX "Region_parentCode_idx" ON "Region"("parentCode");

-- CreateIndex
CREATE INDEX "OtpChallenge_phoneHash_createdAt_idx" ON "OtpChallenge"("phoneHash", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StaffTask_dedupeKey_key" ON "StaffTask"("dedupeKey");

-- CreateIndex
CREATE INDEX "StaffTask_status_type_idx" ON "StaffTask"("status", "type");

-- CreateIndex
CREATE INDEX "StaffTask_assigneeRole_status_idx" ON "StaffTask"("assigneeRole", "status");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeekerProfile" ADD CONSTRAINT "SeekerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkExperience" ADD CONSTRAINT "WorkExperience_seekerId_fkey" FOREIGN KEY ("seekerId") REFERENCES "SeekerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consent" ADD CONSTRAINT "Consent_interviewId_fkey" FOREIGN KEY ("interviewId") REFERENCES "Interview"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobLead" ADD CONSTRAINT "JobLead_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "JobLead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobPosting" ADD CONSTRAINT "JobPosting_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "JobLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestRequest" ADD CONSTRAINT "InterestRequest_seekerId_fkey" FOREIGN KEY ("seekerId") REFERENCES "SeekerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestRequest" ADD CONSTRAINT "InterestRequest_postingId_fkey" FOREIGN KEY ("postingId") REFERENCES "JobPosting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestRequest" ADD CONSTRAINT "InterestRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_seekerId_fkey" FOREIGN KEY ("seekerId") REFERENCES "SeekerProfile"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_postingId_fkey" FOREIGN KEY ("postingId") REFERENCES "JobPosting"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Interview" ADD CONSTRAINT "Interview_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "VisaCase" ADD CONSTRAINT "VisaCase_seekerId_fkey" FOREIGN KEY ("seekerId") REFERENCES "SeekerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisaCase" ADD CONSTRAINT "VisaCase_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_parentCode_fkey" FOREIGN KEY ("parentCode") REFERENCES "Region"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTask" ADD CONSTRAINT "StaffTask_seekerId_fkey" FOREIGN KEY ("seekerId") REFERENCES "SeekerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTask" ADD CONSTRAINT "StaffTask_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffTask" ADD CONSTRAINT "StaffTask_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "JobLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
