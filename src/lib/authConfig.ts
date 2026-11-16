/**
 * Edge-safe part of the Auth.js v5 configuration (PLAN P1b-1, 위험: "미들웨어에서 Prisma 금지").
 *
 * The middleware builds its own NextAuth instance from this object to read the session cookie.
 * Nothing here may import Prisma, argon2 or other Node-only modules; the providers (which touch the
 * database) are added in `src/auth.ts`, which only runs in the Node.js runtime.
 *
 * Session = JWT (encrypted cookie). Claims: `sub` (user id), `role`, `twoFactorVerified`,
 * `totpEnrolled`, `authTime`. No e-mail, phone or name is put into the token.
 */
import type { Role } from "@prisma/client";
import type { NextAuthConfig } from "next-auth";
import type {} from "next-auth/jwt";

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
  }
}

export const authConfig = {
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SEC },
  // Local development and E2E run behind `next start` on 127.0.0.1 (deployment is out of scope).
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
