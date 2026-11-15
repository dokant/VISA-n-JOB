/**
 * PLAN P0c-6: minimal console notification adapter (formal R-214 tests come in P2d).
 */
import { describe, expect, it } from "vitest";

import { getNotificationProvider } from "@/lib/notifications";
import { createConsoleProvider, maskRecipient } from "@/lib/notifications/console";

const message = {
  channel: "SMS" as const,
  to: "+821012345678",
  templateKey: "notifications.otp",
  locale: "ko" as const,
  params: { code: "123456" },
};

describe("notifications/console", () => {
  it("logs one JSON line with a masked recipient", async () => {
    const lines: string[] = [];
    const provider = createConsoleProvider((l) => lines.push(l), "development");
    const result = await provider.send(message);
    expect(result.ok).toBe(true);
    expect(lines).toHaveLength(1);
    const logged = JSON.parse(lines[0]) as Record<string, unknown>;
    expect(logged).toMatchObject({
      provider: "console",
      to: "***78",
      templateKey: "notifications.otp",
      params: { code: "123456" },
    });
    expect(lines[0]).not.toContain("1012345678");
  });

  it("omits params in production", async () => {
    const lines: string[] = [];
    await createConsoleProvider((l) => lines.push(l), "production").send(message);
    expect(lines[0]).not.toContain("123456");
    expect(JSON.parse(lines[0])).not.toHaveProperty("params");
  });

  it("defaults to console.info and empty params; index returns a cached provider", async () => {
    expect(maskRecipient("hong@example.com")).toBe("***om");
    const p = getNotificationProvider();
    expect(p.name).toBe("console");
    expect(getNotificationProvider()).toBe(p);
    const lines: string[] = [];
    await createConsoleProvider((l) => lines.push(l), "test").send({
      ...message,
      params: undefined,
    });
    expect(JSON.parse(lines[0]).params).toEqual({});
  });
});
