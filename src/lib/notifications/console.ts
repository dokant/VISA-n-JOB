/**
 * Console notification adapter (development / test). One JSON line per message (STANDARD 5).
 *
 * The recipient is always masked. Template params (which may hold a dev OTP code — the
 * STANDARD 4.7 "개발용 콘솔 OTP 어댑터" exception) are printed only outside production.
 */
import { randomUUID } from "node:crypto";

import type { NotificationMessage, NotificationProvider, SendResult } from "./types";

export type LogLine = (line: string) => void;

/** "+821012345678" → "***78". Never print a full phone number or e-mail address. */
export function maskRecipient(to: string): string {
  return `***${to.slice(-2)}`;
}

export function createConsoleProvider(
  log: LogLine = (line) => console.info(line),
  env: string | undefined = process.env.NODE_ENV,
): NotificationProvider {
  return {
    name: "console",
    async send(message: NotificationMessage): Promise<SendResult> {
      const id = randomUUID();
      log(
        JSON.stringify({
          level: "info",
          event: "notification.send",
          provider: "console",
          id,
          channel: message.channel,
          to: maskRecipient(message.to),
          templateKey: message.templateKey,
          locale: message.locale,
          ...(env === "production" ? {} : { params: message.params ?? {} }),
        }),
      );
      return { ok: true, provider: "console", id };
    },
  };
}
