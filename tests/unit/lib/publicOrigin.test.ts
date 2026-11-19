/**
 * R-118 / QA P1c O-9 (A-8 deployment): the `/admin` redirect of the middleware points at the public
 * origin (AUTH_URL / SITE_URL, or the trusted proxy headers), never at the internal server address.
 */
import { NextRequest, NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import middleware from "@/middleware";
import { publicOrigin, publicUrl } from "@/lib/publicOrigin";

// The locale branch (next-intl) is not under test; its ESM build does not load in Vitest.
// The mock answers "/" with a locale redirect on the internal origin, as next-intl builds it.
vi.mock("next-intl/middleware", () => ({
  default: () => (request: NextRequest) =>
    request.nextUrl.pathname === "/"
      ? NextResponse.redirect(new URL("/ko?src=qr", request.url))
      : NextResponse.next(),
}));

const INTERNAL = "http://localhost:3000";
const req = (path: string, headers: Record<string, string> = {}) => ({
  url: `${INTERNAL}${path}`,
  headers: new Headers(headers),
});

const ENV_KEYS = ["AUTH_URL", "SITE_URL", "TRUST_PROXY"] as const;
const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("O-9 publicOrigin", () => {
  it("R-118 / O-9: AUTH_URL wins (origin only), then SITE_URL", () => {
    const r = req("/admin", { host: "localhost:3000" });
    expect(
      publicOrigin(r, {
        AUTH_URL: "https://staging.visanjob.co.kr/api/auth",
        SITE_URL: "https://other.example",
      }),
    ).toBe("https://staging.visanjob.co.kr");
    expect(publicOrigin(r, { SITE_URL: "https://staging.visanjob.co.kr/" })).toBe(
      "https://staging.visanjob.co.kr",
    );
  });

  it("R-118 / O-9: invalid or non-http configured values are ignored", () => {
    const r = req("/admin", { host: "127.0.0.1:3160" });
    expect(publicOrigin(r, { AUTH_URL: "not a url", SITE_URL: "javascript:alert(1)" })).toBe(
      "http://127.0.0.1:3160",
    );
  });

  it("R-118 / O-9: X-Forwarded-Host / -Proto are used only with TRUST_PROXY=true", () => {
    const headers = {
      host: "app:3000",
      "x-forwarded-host": "staging.visanjob.co.kr",
      "x-forwarded-proto": "https",
    };
    expect(publicOrigin(req("/admin", headers), { TRUST_PROXY: "true" })).toBe(
      "https://staging.visanjob.co.kr",
    );
    // Without TRUST_PROXY the forwarding headers are client-controlled: the Host header is used.
    expect(publicOrigin(req("/admin", headers), {})).toBe("http://app:3000");
  });

  it("R-118 / O-9: crafted host headers cannot inject a path or credentials", () => {
    const evil = {
      host: "evil.example/phish",
      "x-forwarded-host": "user@evil.example",
      "x-forwarded-proto": "javascript",
    };
    expect(publicOrigin(req("/admin", evil), { TRUST_PROXY: "true" })).toBe(INTERNAL);
    expect(
      publicOrigin(
        req("/admin", { "x-forwarded-host": "ok.example", "x-forwarded-proto": "javascript" }),
        { TRUST_PROXY: "true" },
      ),
    ).toBe("http://ok.example");
  });

  it("R-118 / O-9: the Host header replaces the internal localhost (direct access, no config)", () => {
    expect(publicOrigin(req("/admin", { host: "127.0.0.1:3160" }), {})).toBe(
      "http://127.0.0.1:3160",
    );
    expect(publicOrigin(req("/admin"), {})).toBe(INTERNAL);
    expect(publicUrl("/admin/login", req("/admin", { host: "127.0.0.1:3160" }), {}).href).toBe(
      "http://127.0.0.1:3160/admin/login",
    );
  });
});

describe("O-9 middleware /admin redirect", () => {
  it("R-118 / O-9: behind the proxy, /admin without a session goes to the public /admin/login", async () => {
    process.env.AUTH_URL = "https://staging.visanjob.co.kr";
    process.env.TRUST_PROXY = "true";
    const res = await middleware(
      new NextRequest(`${INTERNAL}/admin`, {
        headers: {
          host: "staging.visanjob.co.kr",
          "x-forwarded-host": "staging.visanjob.co.kr",
          "x-forwarded-proto": "https",
          "x-forwarded-for": "203.0.113.7",
        },
      }),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://staging.visanjob.co.kr/admin/login");
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("R-118 / O-9: no configuration → the Host header the client used, not localhost", async () => {
    delete process.env.AUTH_URL;
    delete process.env.SITE_URL;
    delete process.env.TRUST_PROXY;
    const res = await middleware(
      new NextRequest(`${INTERNAL}/admin/leads`, { headers: { host: "127.0.0.1:3160" } }),
    );
    expect(res.headers.get("location")).toBe("http://127.0.0.1:3160/admin/login");
  });

  it("R-118 / O-9: a locale redirect on the internal origin is moved to the public origin", async () => {
    process.env.AUTH_URL = "https://staging.visanjob.co.kr";
    const res = await middleware(
      new NextRequest(`${INTERNAL}/?src=qr`, { headers: { host: "staging.visanjob.co.kr" } }),
    );
    expect(res.headers.get("location")).toBe("https://staging.visanjob.co.kr/ko?src=qr");
  });

  it("R-118 / O-9: direct access without configuration keeps the address the client used", async () => {
    delete process.env.AUTH_URL;
    delete process.env.SITE_URL;
    const res = await middleware(
      new NextRequest("http://127.0.0.1:3100/", { headers: { host: "127.0.0.1:3100" } }),
    );
    expect(res.headers.get("location")).toBe("http://127.0.0.1:3100/ko?src=qr");
  });
});
