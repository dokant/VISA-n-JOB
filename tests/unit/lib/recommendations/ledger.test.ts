/**
 * R-209 / BR-09 / WO15-07: the Recommendation ledger.
 * - The app layer has no update / delete path: the repository exports create / find only, and no
 *   file in src/ calls recommendation.update|delete|upsert (qa:static BR-09/ledger-mutation) or
 *   creates a row outside the repository (BR-09/ledger-repository).
 * - The database refuses UPDATE / DELETE through the app's own Prisma client (trigger).
 * - 추천 실행 writes RECOMMENDATION_CREATE in the same transaction (BR-15); a repeat is not added.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import * as ledger from "@/lib/recommendations/ledger";

import { RULES, runRules } from "../../../../scripts/lib/qa-rules";
import { auditRows } from "../admin/adminFixtures";
import { matchSeeker, matchSetup } from "./matchingFixtures";

afterAll(() => db.$disconnect());

describe("R-209 Recommendation ledger (BR-09)", () => {
  it("R-209: the repository exposes create / find only", () => {
    const names = Object.keys(ledger).sort();
    expect(names).toEqual(["createRecommendation", "findRecommendation", "findRecommendations"]);
    for (const n of names) expect(n).not.toMatch(/update|delete|upsert|remove|edit/i);
    const source = readFileSync(
      path.join(process.cwd(), "src/lib/recommendations/ledger.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/recommendation\.(update|updateMany|delete|deleteMany|upsert)\s*\(/);
  });

  it("R-209: src/ has no recommendation update / delete / upsert and no create outside the ledger", () => {
    const ids = ["BR-09/ledger-mutation", "BR-09/ledger-repository", "BR-09/ledger-raw-sql"];
    const rules = RULES.filter((r) => ids.includes(r.id));
    expect(rules).toHaveLength(3);
    const hits = runRules(process.cwd(), rules).filter((h) => ids.includes(h.rule.id));
    expect(hits.map((h) => `${h.file}:${h.line} ${h.text}`)).toEqual([]);
  });

  it("R-209 / BR-15: a recommendation adds one row + RECOMMENDATION_CREATE; a repeat is not added", async () => {
    const setup = await matchSetup("L1");
    const s = await matchSeeker(setup);
    const first = await ledger.createRecommendation({
      seekerId: s.id,
      companyId: setup.employer.companyId,
      postingId: setup.posting.id,
      staffId: setup.staff.id,
      note: "메모",
    });
    expect(first.already).toBe(false);
    const audit = await auditRows(first.recommendation.id, "RECOMMENDATION_CREATE");
    expect(audit).toHaveLength(1);
    expect(audit[0].actorId).toBe(setup.staff.id);
    expect(JSON.stringify(audit[0].meta)).not.toContain("메모");

    const again = await Promise.all(
      [0, 1, 2].map(() =>
        ledger.createRecommendation({
          seekerId: s.id,
          companyId: setup.employer.companyId,
          postingId: setup.posting.id,
          staffId: setup.staff.id,
          note: null,
        }),
      ),
    );
    for (const r of again) {
      expect(r.already).toBe(true);
      expect(r.recommendation.id).toBe(first.recommendation.id);
    }
    expect(await db.recommendation.count({ where: { seekerId: s.id } })).toBe(1);
  });

  it("WO15-07 / R-209: UPDATE and DELETE through the app client are refused by the DB trigger", async () => {
    const setup = await matchSetup("L2");
    const s = await matchSeeker(setup);
    const { recommendation } = await ledger.createRecommendation({
      seekerId: s.id,
      companyId: setup.employer.companyId,
      postingId: setup.posting.id,
      staffId: setup.staff.id,
      note: "original",
    });
    // The app code never does this (qa:static); the test calls the client directly to prove the
    // database refuses it as well.
    const client = db as unknown as {
      recommendation: {
        update(a: unknown): Promise<unknown>;
        delete(a: unknown): Promise<unknown>;
      };
    };
    await expect(
      client.recommendation.update({
        where: { id: recommendation.id },
        data: { note: "changed" },
      }),
    ).rejects.toThrow(/append-only ledger/);
    await expect(
      client.recommendation.delete({ where: { id: recommendation.id } }),
    ).rejects.toThrow(/append-only ledger/);
    await expect(
      db.$executeRawUnsafe(
        `UPDATE "Recommendation" SET note = 'x' WHERE id = $1`,
        recommendation.id,
      ),
    ).rejects.toThrow(/append-only ledger/);
    const row = await ledger.findRecommendation(recommendation.id, { note: true });
    expect(row?.note).toBe("original");
  });
});
