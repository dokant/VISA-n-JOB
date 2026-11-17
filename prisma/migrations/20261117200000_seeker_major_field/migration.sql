-- P2b run 2 / DECISIONS Q-24: coded 전공 분야 (WO §7.5 majorField). Nullable: existing rows and
-- seekers who skip the optional question keep null. A code from MAJOR_FIELDS (src/lib/seeker/options.ts),
-- not personal free text, so it is stored in plain text (no *Enc column).
ALTER TABLE "SeekerProfile" ADD COLUMN "majorField" TEXT;
