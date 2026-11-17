/**
 * PLAN P0c-6: minimal console notification adapter (formal R-214 tests come in P2d).
 * QA P2d O-2 / DECISIONS Q-27: results are SIMULATED; links in params are always masked, whatever
 * NODE_ENV is.
 */
import { describe, expect, it } from "vitest";

import { getNotificationProvider } from "@/lib/notifications";
import { createConsoleProvider, maskLink, maskRecipient } from "@/lib/notifications/console";
import { signStillSearchingToken, stillSearchingPath } from "@/lib/seeker/stillSearching";

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

  it("Q-27: every console result is SIMULATED (nobody receives it)", async () => {
    const result = await createConsoleProvider(() => {}, "development").send(message);
    expect(result).toMatchObject({ ok: true, provider: "console", delivery: "SIMULATED" });
  });

  it("O-2: the still-searching link is masked (path only, token ***) with any NODE_ENV", async () => {
    const token = signStillSearchingToken(
      "cm0seekerprofileid000001",
      new Date("2026-12-01T01:00:00Z"),
    );
    const url = `https://visanjob.test${stillSearchingPath("vi", token)}`;
    const [body, sig] = token.split("~");
    for (const env of [undefined, "development", "test", ""]) {
      const lines: string[] = [];
      await createConsoleProvider((l) => lines.push(l), env).send({
        channel: "EMAIL",
        to: "seeker@example.com",
        templateKey: "common.statusCheck.email",
        locale: "vi",
        params: { url, days: 14 },
      });
      expect(JSON.parse(lines[0]).params).toEqual({
        url: "https://visanjob.test/vi/seeker/still-searching/***",
        days: 14,
      });
      for (const secret of [token, body, sig, "seeker@example.com"]) {
        expect(lines[0]).not.toContain(secret);
      }
    }
  });

  it("maskLink keeps route words, masks token / id segments and query values, leaves non-links alone", () => {
    expect(maskLink("/ko/seeker/me")).toBe("/ko/seeker/me");
    expect(maskLink("/ko/seeker/register")).toBe("/ko/seeker/register");
    expect(maskLink("https://x.test/api/files/abc123DEF.sig?exp=1700000000&sig=zz#frag")).toBe(
      "https://x.test/api/files/***?exp=***&sig=***",
    );
    expect(maskLink("https://x.test/ko/seeker/still-searching/a~b")).toBe(
      "https://x.test/ko/seeker/still-searching/***",
    );
    expect(maskLink("123456")).toBe("123456");
    expect(maskLink("hello world")).toBe("hello world");
  });

  it("maskLink masks links inside a sentence too (QA P2d O-1), keeping the words around them", () => {
    const token = "eyJpZCI6ImNtMTIzIn0~c2lnbmF0dXJl";
    expect(maskLink(`see https://x.test/ko/seeker/still-searching/${token} soon`)).toBe(
      "see https://x.test/ko/seeker/still-searching/*** soon",
    );
    expect(maskLink(`확인: https://x.test/vi/seeker/still-searching/${token}.`)).toBe(
      "확인: https://x.test/vi/seeker/still-searching/***.",
    );
    expect(maskLink(`open /ko/seeker/still-searching/${token}?email=a@b.test now`)).toBe(
      "open /ko/seeker/still-searching/***?email=*** now",
    );
    expect(maskLink(`(https://x.test/api/files/abc123.sig?sig=zz), /ko/seeker/me`)).toBe(
      "(https://x.test/api/files/***?sig=***), /ko/seeker/me",
    );
    expect(maskLink(`/ko/seeker/still-searching/${token} and more`)).toBe(
      "/ko/seeker/still-searching/*** and more",
    );
    for (const plain of ["a/b c", "3/4 done", "no links here", "50% / 2"]) {
      expect(maskLink(plain)).toBe(plain);
    }
  });

  it("maskLink masks a scheme-less www. link too (QA P2e O-3)", () => {
    const token = "eyJpZCI6ImNtMTIzIn0~c2lnbmF0dXJl";
    expect(maskLink(`www.x.test/ko/seeker/still-searching/${token}`)).toBe(
      "www.x.test/ko/seeker/still-searching/***",
    );
    expect(maskLink(`열기 www.x.test/ko/seeker/still-searching/${token}?sig=zz, 감사`)).toBe(
      "열기 www.x.test/ko/seeker/still-searching/***?sig=***, 감사",
    );
    expect(maskLink(`see https://www.x.test/api/files/abc123.sig now`)).toBe(
      "see https://www.x.test/api/files/*** now",
    );
    expect(maskLink("mail a@www.x.test")).toBe("mail a@www.x.test");
  });
});
