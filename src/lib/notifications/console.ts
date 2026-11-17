/**
 * Console notification adapter (development / test). One JSON line per message (STANDARD 5).
 *
 * - Nobody receives a console message, so every result is `delivery: "SIMULATED"` (DECISIONS Q-27):
 *   jobs that act on "the seeker was told" (the 14-day no-reply transition) do not count it.
 * - The recipient is always masked. Template params (which may hold a dev OTP code — the
 *   STANDARD 4.7 "개발용 콘솔 OTP 어댑터" exception) are printed only outside production.
 * - Links in params are always masked, whatever NODE_ENV is (QA P2d O-2: the worker runs without
 *   NODE_ENV, and a still-searching link works for 14 days): only the origin and the route words of
 *   the path stay; token / id segments and query values become `***` (`maskLink`). Links inside a
 *   sentence are found and masked too (QA P2d O-1).
 */
import { randomUUID } from "node:crypto";

import type { NotificationMessage, NotificationProvider, SendResult } from "./types";

export type LogLine = (line: string) => void;

/** "+821012345678" → "***78". Never print a full phone number or e-mail address. */
export function maskRecipient(to: string): string {
  return `***${to.slice(-2)}`;
}

/** A route word such as `ko`, `seeker`, `still-searching` (lower-case letters and single hyphens). */
const ROUTE_WORD = /^[a-z]+(?:-[a-z]+)*$/;
const MAX_ROUTE_WORD = 24;
const LINK = /^(?:https?:\/\/|\/)/i;

/** Masks one link (the whole string is the link). */
function maskOneLink(value: string): string {
  const absolute = /^https?:\/\//i.test(value);
  let url: URL;
  try {
    url = new URL(value, "http://relative.invalid");
  } catch {
    return "***";
  }
  const path = url.pathname
    .split("/")
    .map((seg) =>
      seg === "" || (seg.length <= MAX_ROUTE_WORD && ROUTE_WORD.test(seg)) ? seg : "***",
    )
    .join("/");
  const query = [...url.searchParams.keys()].map((k) => `${encodeURIComponent(k)}=***`).join("&");
  return `${absolute ? url.origin : ""}${path}${query ? `?${query}` : ""}`;
}

/**
 * A link inside a sentence (QA P2d O-1): an `http(s)://` URL anywhere, or a `/path` that starts the
 * value or follows white space / an opening bracket or quote, or a scheme-less `www.` link (QA P2e
 * O-3, masked like an absolute link and printed without the added scheme). Ends at white space,
 * quotes or brackets.
 */
const EMBEDDED_LINK =
  /https?:\/\/[^\s"'<>()[\]{}]+|(?<![\w./@-])www\.[^\s"'<>()[\]{}]+|(?<=^|[\s("'[{<])\/[^\s"'<>()[\]{}]*/gi;
/** A link without a scheme that starts with `www.` (QA P2e O-3). */
const WWW_LINK = /^www\./i;
/** Sentence punctuation right after a link stays outside the masked part. */
const TRAILING_PUNCT = /[.,;:!?]+$/;

/**
 * "https://site/ko/seeker/still-searching/eyJ…~sig" → "https://site/ko/seeker/still-searching/***".
 * Every path segment that is not a short route word (tokens, ids, signatures) and every query value
 * is replaced; the fragment is dropped. A value that is one link is masked as a whole; any other
 * value has each link found inside it masked the same way (QA P2d O-1), the rest unchanged.
 */
export function maskLink(value: string): string {
  if (LINK.test(value) && !/\s/.test(value)) return maskOneLink(value);
  return value.replace(EMBEDDED_LINK, (match) => {
    const punct = TRAILING_PUNCT.exec(match)?.[0] ?? "";
    const link = punct ? match.slice(0, -punct.length) : match;
    if (link === "" || link === "/") return match;
    if (WWW_LINK.test(link)) return maskOneLink(`http://${link}`).replace(/^http:\/\//, "") + punct;
    return maskOneLink(link) + punct;
  });
}

function maskParams(params: NotificationMessage["params"]): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params ?? {})) {
    out[key] = typeof value === "string" ? maskLink(value) : value;
  }
  return out;
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
          delivery: "SIMULATED",
          id,
          channel: message.channel,
          to: maskRecipient(message.to),
          templateKey: message.templateKey,
          locale: message.locale,
          ...(env === "production" ? {} : { params: maskParams(message.params) }),
        }),
      );
      return { ok: true, provider: "console", id, delivery: "SIMULATED" };
    },
  };
}
