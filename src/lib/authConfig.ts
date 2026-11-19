/**
 * Edge-safe part of the Auth.js v5 configuration (PLAN P1b-1, 위험: "미들웨어에서 Prisma 금지").
 *
 * The middleware builds its own NextAuth instance from this object to read the session cookie.
 * Nothing here may import Prisma, argon2 or other Node-only modules; the providers (which touch the
 * database) are added in `src/auth.ts`, which only runs in the Node.js runtime.
 *
 * Session = JWT (encrypted cookie). Claims: `sub` (user id), `role`, `twoFactorVerified`,
 * `totpEnrolled`, `authTime`, `sv` (session version, integration QA I-1). No e-mail, phone or name
 * is put into the token.
 *
 * I-1: the middleware does not run an Auth.js instance any more. It only decrypts the cookie
 * (`readSessionClaims`) and never writes it back, so a request still in flight at sign-out cannot
 * put the old session cookie back. Whether the token is still valid (`sv` against the database) is
 * decided in the Node.js JWT callback (`src/auth.ts`) by every page, server action and Route Handler.
 */
import type { Role } from "@prisma/client";
import type { NextAuthConfig } from "next-auth";
import { type JWT, getToken } from "next-auth/jwt";

import { SESSION_MAX_AGE_SEC } from "@/config/limits";

import { isRole } from "./rbac";

declare module "next-auth" {
  interface User {
    role?: Role;
    twoFactorVerified?: boolean;
    totpEnrolled?: boolean;
  }
  interface Session {
    user: {
      id: string;
      role: Role;
      twoFactorVerified: boolean;
      totpEnrolled: boolean;
      authTime: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    twoFactorVerified?: boolean;
    totpEnrolled?: boolean;
    authTime?: number;
    /** session version (`User.sessionVersion` at sign-in), checked in `src/auth.ts` (I-1) */
    sv?: number;
  }
}

export const authConfig = {
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SEC },
  // Local development and E2E run behind `next start` on 127.0.0.1. In deployment (deploy/) the app
  // sits behind Caddy, which sets X-Forwarded-Host / -Proto; AUTH_URL fixes the public origin.
  trustHost: true,
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        // Fresh sign-in: copy only the non-PII claims returned by `authorize`.
        token.sub = user.id;
        token.role = user.role;
        token.twoFactorVerified = user.twoFactorVerified === true;
        token.totpEnrolled = user.totpEnrolled === true;
        token.authTime = Math.floor(Date.now() / 1000);
        delete token.name;
        delete token.email;
        delete token.picture;
      }
      return token;
    },
    session({ session, token }) {
      const role = isRole(token.role) ? token.role : undefined;
      if (!token.sub || !role) return { ...session, user: undefined } as unknown as typeof session;
      return {
        ...session,
        user: {
          id: token.sub,
          role,
          twoFactorVerified: token.twoFactorVerified === true,
          totpEnrolled: token.totpEnrolled === true,
          authTime: typeof token.authTime === "number" ? token.authTime : 0,
        },
      } as typeof session;
    },
  },
  logger: {
    // JSON one-liners without PII (STANDARD 5). Failed credential checks are expected traffic.
    error(error: Error) {
      if ((error as Error & { type?: string }).type === "CredentialsSignin") return;
      const type = (error as Error & { type?: string }).type ?? "unknown";
      console.error(JSON.stringify({ level: "error", event: "auth.error", type }));
    },
    warn(code: string) {
      console.warn(JSON.stringify({ level: "warn", event: "auth.warn", code }));
    },
    debug() {},
  },
} satisfies NextAuthConfig;

/** Cookie names Auth.js uses for the session token (https first; a browser only sends `__Secure-` over https). */
const SESSION_COOKIES = ["__Secure-authjs.session-token", "authjs.session-token"] as const;

/**
 * Middleware only (I-1): decrypted session claims from the request cookie, or null. Read-only — no
 * callback, no refresh, no Set-Cookie. The claims are a routing hint; the database check of the
 * session version happens in the pages and actions behind it.
 */
export async function readSessionClaims(headers: Headers): Promise<JWT | null> {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  const cookie = headers.get("cookie");
  if (!secret || !cookie) return null;
  // Only the cookie header: an Authorization bearer token is not a session here.
  const req = { headers: new Headers({ cookie }) };
  for (const cookieName of SESSION_COOKIES) {
    const token = await getToken({
      req,
      secret,
      cookieName,
      salt: cookieName,
      secureCookie: cookieName.startsWith("__Secure-"),
    });
    if (token) return token;
  }
  return null;
}
