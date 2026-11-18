-- Integration QA I-1: server-side sign-out for JWT sessions. Every session token carries the
-- account's sessionVersion (claim `sv`); signing out raises it, so tokens issued before are refused.
-- Existing tokens have no `sv` claim and are refused too (one more sign-in after this migration).

-- AlterTable
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
