/**
 * Sends one R-213 job notice to a seeker on every channel the seeker has (PRD R-213, R-214):
 * SMS to the account phone (console adapter until a real SMS adapter exists, Phase 3) and EMAIL to
 * the profile e-mail when there is one (SMTP adapter when SMTP_* is set). Template keys follow
 * STANDARD 3.6 `common.{주제}.{sms|email}`; the e-mail template has `subject` and `body`.
 * Returns how many channels accepted the message (0 = nothing was delivered) and how many of those
 * were real channels (`deliveredReal`, DECISIONS Q-27: the console adapter is SIMULATED, nobody
 * receives it).
 */
import { type Locale, defaultLocale, locales } from "@/i18n/locales";
import type { NotificationProvider, SendResult } from "@/lib/notifications";

export type SeekerContact = {
  /** Decrypted by the db extension (User.phoneEnc). */
  phone: string | null;
  /** Decrypted by the db extension (SeekerProfile.emailEnc). */
  email: string | null;
  locale: string | null;
};

export function seekerLocale(value: string | null | undefined): Locale {
  return (locales as readonly string[]).includes(value ?? "") ? (value as Locale) : defaultLocale;
}

export async function notifySeeker(
  provider: NotificationProvider,
  contact: SeekerContact,
  topic: string,
  params: Readonly<Record<string, string | number>>,
): Promise<{ delivered: number; deliveredReal: number; attempted: number }> {
  const locale = seekerLocale(contact.locale);
  const sends: Promise<SendResult>[] = [];
  if (contact.phone) {
    sends.push(
      provider.send({
        channel: "SMS",
        to: contact.phone,
        templateKey: `${topic}.sms`,
        locale,
        params,
      }),
    );
  }
  if (contact.email) {
    sends.push(
      provider.send({
        channel: "EMAIL",
        to: contact.email,
        templateKey: `${topic}.email`,
        locale,
        params,
      }),
    );
  }
  const results = await Promise.all(sends);
  return {
    delivered: results.filter((r) => r.ok).length,
    deliveredReal: results.filter((r) => r.delivery === "REAL").length,
    attempted: results.length,
  };
}
