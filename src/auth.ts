/**
 * Auth.js v5 (next-auth 5.0.0-beta.32, pinned) — full Node.js configuration (PLAN P1b-1).
 *
 * Three Credentials providers:
 *   seeker-otp        phone + OTP code        (R-104)
 *   seeker-signup     server-made proof right after registration (R-105 / R-106 Step 0)
 *   employer-password e-mail + password       (R-123)
 *   staff-password    e-mail + password       (R-118) → twoFactorVerified=false until TOTP
 * The TOTP step upgrades the session with `unstable_update({ totpProof })`; the JWT callback accepts
 * only a valid server-made proof (see authCredentials.ts), so the client cannot skip 2FA.
 *
 * Integration QA I-1 (server-side sign-out): the JWT callback stamps `User.sessionVersion` into the
 * token at sign-in and refuses any later token whose `sv` is not the current one; every sign-out
 * (`events.signOut`: the admin action and Auth.js /api/auth/signout) raises the version.
 * The same step ends every session at `authTime` + the role's lifetime (staff 8 hours, others
 * SESSION_MAX_AGE_SEC), so calling /api/auth/session — which re-signs the cookie — never extends it
 * (STANDARD 4.11, Q-29).
 *
 * Failures throw `AuthCodeError` (a CredentialsSignin subclass); its `code` is the AuthFailureCode
 * the login forms translate (errors.auth.*). The middleware uses the Edge-safe `authConfig` only.
 */
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import {
  type AuthFailureCode,
  type AuthResult,
  authorizeEmployerPassword,
  authorizeSeekerOtp,
  authorizeSeekerSignupProof,
  applySessionVersion,
  authorizeStaffPassword,
  revokeSessions,
  verifyTotpProof,
} from "@/lib/authCredentials";
import { authConfig } from "@/lib/authConfig";
import { clientIp } from "@/lib/rateLimit";
import { employerLoginSchema, seekerOtpVerifySchema, staffLoginSchema } from "@/schemas/auth/auth";

export class AuthCodeError extends CredentialsSignin {
  constructor(code: AuthFailureCode) {
    super();
    this.code = code;
  }
}

function unwrap(result: AuthResult) {
  if (!result.ok) throw new AuthCodeError(result.code);
  return result.user;
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "seeker-otp",
      credentials: { phone: {}, code: {} },
      async authorize(credentials, request) {
        const parsed = seekerOtpVerifySchema.safeParse(credentials);
        if (!parsed.success) throw new AuthCodeError("INVALID_CREDENTIALS");
        return unwrap(await authorizeSeekerOtp({ ...parsed.data, ip: clientIp(request.headers) }));
      },
    }),
    Credentials({
      id: "seeker-signup",
      credentials: { proof: {} },
      async authorize(credentials) {
        return unwrap(await authorizeSeekerSignupProof({ proof: credentials?.proof }));
      },
    }),
    Credentials({
      id: "employer-password",
      credentials: { email: {}, password: {} },
      async authorize(credentials, request) {
        const parsed = employerLoginSchema.safeParse(credentials);
        if (!parsed.success) throw new AuthCodeError("INVALID_CREDENTIALS");
        return unwrap(
          await authorizeEmployerPassword({ ...parsed.data, ip: clientIp(request.headers) }),
        );
      },
    }),
    Credentials({
      id: "staff-password",
      credentials: { email: {}, password: {} },
      async authorize(credentials, request) {
        const parsed = staffLoginSchema.safeParse(credentials);
        if (!parsed.success) throw new AuthCodeError("INVALID_CREDENTIALS");
        return unwrap(
          await authorizeStaffPassword({ ...parsed.data, ip: clientIp(request.headers) }),
        );
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt(params) {
      const token = await applySessionVersion(
        await authConfig.callbacks.jwt(params),
        params.user != null,
      );
      if (!token) return null;
      if (params.trigger === "update" && token.sub) {
        const proof = (params.session as { totpProof?: unknown } | undefined)?.totpProof;
        if (verifyTotpProof(proof, token.sub)) {
          token.twoFactorVerified = true;
          token.totpEnrolled = true;
        }
      }
      return token;
    },
  },
  events: {
    async signOut(message) {
      await revokeSessions("token" in message ? message.token : null);
    },
  },
});
