-- Append-only ledgers (BR-09, R-006, WO §5 추가 지시).
-- Recommendation and AuditLog reject UPDATE, DELETE and TRUNCATE at the database level.
-- Row-level BEFORE UPDATE/DELETE triggers + a statement-level BEFORE TRUNCATE trigger.
-- Written by hand (`prisma migrate dev --create-only`); Prisma does not diff triggers, so this
-- causes no schema drift. Dev reset = drop/create database (`pnpm db:reset`), never row deletion.

CREATE OR REPLACE FUNCTION "forbid_ledger_mutation"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'append-only ledger "%": % is not allowed (BR-09)', TG_TABLE_NAME, TG_OP
    USING ERRCODE = 'restrict_violation';
END;
$$;

CREATE TRIGGER "Recommendation_no_update_delete"
  BEFORE UPDATE OR DELETE ON "Recommendation"
  FOR EACH ROW EXECUTE FUNCTION "forbid_ledger_mutation"();

CREATE TRIGGER "Recommendation_no_truncate"
  BEFORE TRUNCATE ON "Recommendation"
  FOR EACH STATEMENT EXECUTE FUNCTION "forbid_ledger_mutation"();

CREATE TRIGGER "AuditLog_no_update_delete"
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION "forbid_ledger_mutation"();

CREATE TRIGGER "AuditLog_no_truncate"
  BEFORE TRUNCATE ON "AuditLog"
  FOR EACH STATEMENT EXECUTE FUNCTION "forbid_ledger_mutation"();
