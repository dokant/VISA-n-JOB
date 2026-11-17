-- P2d run 2 (DECISIONS Q-27): whether the open 30-day status check reached a real channel.
-- Existing open checks were sent through the console adapter (no real channel existed), so they
-- default to false: they are closed without INACTIVE / S→A when their 14-day window passes.

-- AlterTable
ALTER TABLE "SeekerProfile" ADD COLUMN "statusCheckDeliveredReal" BOOLEAN NOT NULL DEFAULT false;
