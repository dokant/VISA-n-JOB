/**
 * A-8 deployment: GET /api/health — 200 with the database up, 503 without detail when a query fails.
 */
import { afterAll, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/health/route";
import { db } from "@/lib/db";

afterAll(() => db.$disconnect());

describe("A-8 /api/health", () => {
  it("A-8: database reachable → 200 { status: ok }, not cached", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("A-8: database error → 503 with no error detail", async () => {
    const spy = vi.spyOn(db, "$queryRaw").mockRejectedValueOnce(new Error("secret host down"));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const res = await GET();
      expect(res.status).toBe(503);
      const body = JSON.stringify(await res.json());
      expect(body).toBe(JSON.stringify({ status: "unavailable" }));
      expect(log.mock.calls.flat().join(" ")).not.toContain("secret host");
    } finally {
      spy.mockRestore();
      log.mockRestore();
    }
  });
});
