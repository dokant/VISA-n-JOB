/**
 * Contact detection / masking for free-text input (WO §11 PII 가드, BR-01, BR-14, PRD R-012).
 *
 * Detects: domestic phone numbers (mobile, landline, 070, 15xx/16xx/18xx), international numbers
 * (+82, +84, 0084…), e-mail addresses (including "at"/"골뱅이"/"(dot)" spellings), URLs (scheme,
 * www, bare domains, short links), `@handle`, and messenger IDs (kakao/카톡, zalo, telegram, wechat,
 * viber, whatsapp …) in Korean and Latin spellings.
 *
 * Built to avoid false positives on ordinary job text: amounts (2,500,000원, 250만원), dates,
 * times, head counts, visa codes, postal codes and business hours are not contacts.
 *
 * Use on employer free-text before saving (reject with `assertNoContacts` or store `maskContacts`).
 */

export type ContactType =
  "PHONE_LOCAL" | "PHONE_INTL" | "EMAIL" | "URL" | "HANDLE" | "MESSENGER_ID";

export type ContactMatch = { type: ContactType; value: string; start: number; end: number };

export class ContactInfoError extends Error {
  readonly code = "CONTACT_INFO_DETECTED";
  readonly status = 422;
  constructor(
    readonly types: ContactType[],
    readonly field?: string,
  ) {
    super(`contact information is not allowed${field ? ` in ${field}` : ""}: ${types.join(", ")}`);
    this.name = "ContactInfoError";
  }

  toBody(): { error: { code: string; message: string } } {
    return { error: { code: this.code, message: this.message } };
  }
}

/** Full-width ASCII (０-９, ＠, ＋ …) → ASCII, one char for one char so indices stay valid. */
function normalizeWidth(text: string): string {
  return text.replace(/[！-～　]/g, (ch) =>
    ch === "　" ? " " : String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
  );
}

// ── Phone numbers ────────────────────────────────────────────────────────────
// A digit run: digits with at most 3 separator characters between them. Commas and colons are
// not separators, so "2,500,000" and "09:00" never form one run.
const SEP = "[\\s.\\-\\u2010-\\u2015\\u00B7/()]";
const DIGIT_RUN = new RegExp(`(?:\\+${SEP}{0,2})?\\d(?:${SEP}{0,3}\\d)+`, "g");
const KOREAN_DIGITS: Readonly<Record<string, string>> = {
  공: "0",
  영: "0",
  일: "1",
  이: "2",
  삼: "3",
  사: "4",
  오: "5",
  육: "6",
  칠: "7",
  팔: "8",
  구: "9",
};
// "공일공 1234 5678" / "영일영-일이삼사-오육칠팔": mobile numbers spelled with Korean digit words.
const KOREAN_SPELLED_MOBILE = new RegExp(
  `[공영]${SEP}{0,3}일${SEP}{0,3}[공영일육칠팔구](?:${SEP}{0,3}[0-9공영일이삼사오육칠팔구]){7,8}(?![0-9])`,
  "g",
);
const DOMESTIC_MOBILE = /^01[016789]\d{7,8}$/;
const DOMESTIC_LANDLINE = /^0(?:2\d{7,8}|[3-6][1-5]\d{7,8}|70\d{8}|50\d{8,9})$/;
const DOMESTIC_GENERIC = /^0[1-9]\d{8,9}$/; // 10–11 digits starting with a single 0
const REPRESENTATIVE = /^(?:15(?:44|66|77|88|99)|16(?:44|61|66|68|70|88)|18(?:33|55|77|99))\d{4}$/;
const COUNTRY_CODES = [
  "82",
  "84",
  "86",
  "7",
  "998",
  "855",
  "977",
  "976",
  "95",
  "62",
  "63",
  "66",
  "880",
  "92",
  "94",
  "1",
  "44",
  "81",
];

function classifyDigits(raw: string): ContactType | null {
  const digits = raw.replace(/\D/g, "");
  const hasSeparator = /[^\d+]/.test(raw.trim());
  if (raw.trimStart().startsWith("+")) {
    return digits.length >= 8 && digits.length <= 15 ? "PHONE_INTL" : null;
  }
  if (/^00[1-9]\d{7,14}$/.test(digits)) return "PHONE_INTL"; // 0084 912 …
  if (DOMESTIC_MOBILE.test(digits) || DOMESTIC_LANDLINE.test(digits)) return "PHONE_LOCAL";
  if (DOMESTIC_GENERIC.test(digits)) return "PHONE_LOCAL";
  if (hasSeparator && REPRESENTATIVE.test(digits)) return "PHONE_LOCAL";
  // mobile written without the leading 0 ("10-1234-5678", as after +82)
  if (/^1[016789][\s.-]\d{3,4}[\s.-]\d{4}$/.test(raw.trim())) return "PHONE_LOCAL";
  if (/^8210\d{7,8}$/.test(digits)) return "PHONE_INTL"; // 82 10 1234 5678 without "+"
  if (
    hasSeparator &&
    digits.length >= 11 &&
    digits.length <= 13 &&
    COUNTRY_CODES.some((cc) => cc.length >= 2 && digits.startsWith(cc))
  ) {
    return "PHONE_INTL";
  }
  return null;
}

/**
 * A run may join neighbouring numbers ("06236 / 02-123-4567"). Try the whole run first, then
 * windows of consecutive digit groups, left to right, longest first.
 */
function findPhonesInRun(run: string, offset: number, out: ContactMatch[]): void {
  const groups = [...run.matchAll(/\d+/g)].map((g) => ({
    start: g.index,
    end: g.index + g[0].length,
  }));
  let i = 0;
  while (i < groups.length) {
    let next = i + 1;
    for (let j = groups.length - 1; j >= i; j--) {
      const from = i === 0 ? 0 : groups[i].start; // keep a leading "+" only for the first group
      const value = run.slice(from, groups[j].end);
      const type = classifyDigits(value);
      if (type) {
        out.push({ type, value, start: offset + from, end: offset + groups[j].end });
        next = j + 1;
        break;
      }
    }
    i = next;
  }
}

function findPhones(text: string, out: ContactMatch[]): void {
  for (const m of text.matchAll(DIGIT_RUN)) findPhonesInRun(m[0], m.index, out);
  for (const m of text.matchAll(KOREAN_SPELLED_MOBILE)) {
    const digits = [...m[0]].map((c) => KOREAN_DIGITS[c] ?? c).join("");
    if (DOMESTIC_MOBILE.test(digits.replace(/\D/g, ""))) {
      out.push({ type: "PHONE_LOCAL", value: m[0], start: m.index, end: m.index + m[0].length });
    }
  }
}

// ── E-mail, URL, handle, messenger ───────────────────────────────────────────
const TLD =
  "(?:com|net|org|edu|gov|kr|co\\.kr|or\\.kr|go\\.kr|ac\\.kr|vn|com\\.vn|ru|cn|com\\.cn|uz|kz|jp|io|me|ly|gl|gg|to|app|site|info|biz|xyz|link|page|asia|shop|online|store|ai|tv|cc)";
const MAIL_HOSTS = "(?:naver|gmail|daum|hanmail|kakao|nate|yahoo|hotmail|outlook|icloud|zalo)";

const EMAIL_PATTERNS: RegExp[] = [
  // local@domain.tld, spaces / (dot) / 점 / 닷 allowed around the dots
  new RegExp(
    `[A-Za-z0-9._%+-]+\\s*@\\s*[A-Za-z0-9-]+(?:\\s*(?:\\.|\\(dot\\)|\\[dot\\]|\\{dot\\}|점|닷)\\s*[A-Za-z0-9-]+)+`,
    "gi",
  ),
  // local@naver (well-known mail host without TLD)
  new RegExp(`[A-Za-z0-9._%+-]+\\s*@\\s*${MAIL_HOSTS}\\b`, "gi"),
  // local (at) domain (dot) com / local 골뱅이 naver 점 com — TLD required
  new RegExp(
    `[A-Za-z0-9._%+-]+\\s*(?:\\(at\\)|\\[at\\]|\\{at\\}|\\bat\\b|골뱅이|앳)\\s*[A-Za-z0-9-]+\\s*(?:\\(dot\\)|\\[dot\\]|\\{dot\\}|\\bdot\\b|점|닷|\\.)\\s*${TLD}\\b`,
    "gi",
  ),
];

const URL_PATTERNS: RegExp[] = [
  /\b(?:https?|hxxps?|ftp):\/\/[^\s<>"']+/gi,
  /\bwww\s*\.\s*[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*(?:\/[^\s<>"']*)?/gi,
  // bare domain: example.com, sub.example.co.kr/path, short links (a letter must follow the last dot)
  new RegExp(
    `(?<![A-Za-z0-9@._-])(?:[A-Za-z0-9-]+\\.)+${TLD}(?![A-Za-z0-9-])(?:\\/[^\\s<>"']*)?`,
    "gi",
  ),
  // example(dot)com / example 점 com
  new RegExp(
    `(?<![A-Za-z0-9@._-])[A-Za-z0-9-]{2,}\\s*(?:\\(dot\\)|\\[dot\\]|\\{dot\\}|\\s점\\s|\\s닷\\s)\\s*${TLD}\\b`,
    "gi",
  ),
];

// @handle: ASCII id with at least one letter, not part of an e-mail local@domain.
const HANDLE = /(?<![A-Za-z0-9._%+-])@(?=[A-Za-z0-9_.]*[A-Za-z])[A-Za-z0-9_.]{3,}/g;

const LATIN_MESSENGERS = [
  "kakao\\s*talk",
  "kakao",
  "katalk",
  "ka\\s*talk",
  "zalo",
  "telegram",
  "wechat",
  "we\\s*chat",
  "weixin",
  "viber",
  "whats\\s*app",
].join("|");
const OTHER_MESSENGERS = [
  "카카오\\s*톡",
  "카카오",
  "카톡",
  "잘로",
  "텔레그램",
  "위챗",
  "微信",
  "바이버",
  "왓츠\\s*앱",
  "왓챕",
  "телеграм",
  "вайбер",
  "ватсап",
  "아이디",
].join("|");
// Latin names must not be the tail of another word ("settings", "zalora" are fine to skip).
const MESSENGER_KEYWORDS = `(?<![A-Za-z])(?:${LATIN_MESSENGERS})|${OTHER_MESSENGERS}`;

// An id token: ASCII with at least one letter, or a long digit string (phone-like ids).
const ID_TOKEN = "(?:(?=[A-Za-z0-9_.\\-]*[A-Za-z])[A-Za-z0-9_.\\-]{3,}|\\d[\\d\\s\\-]{6,}\\d)";

const MESSENGER_PATTERNS: RegExp[] = [
  // 카톡 아이디: hong123 / kakao id - hong_gd / zalo 0912 345 678 / 텔레그램 @hong
  new RegExp(
    `(?:${MESSENGER_KEYWORDS})(?:\\s*(?:id|ID|아이디|아디|계정|account))?[^A-Za-z0-9\\n]{0,8}@?${ID_TOKEN}`,
    "gi",
  ),
  // ID: hong123
  new RegExp(`\\bid\\s*[:：=]\\s*@?${ID_TOKEN}`, "gi"),
  // hong123 (카톡) / hong123 [zalo id]
  new RegExp(
    `${ID_TOKEN}\\s*[(\\[]\\s*(?:${MESSENGER_KEYWORDS})(?:\\s*(?:id|아이디))?\\s*[)\\]]`,
    "gi",
  ),
];

function collect(text: string, patterns: RegExp[], type: ContactType, out: ContactMatch[]): void {
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      out.push({ type, value: m[0], start: m.index, end: m.index + m[0].length });
    }
  }
}

const PRIORITY: Readonly<Record<ContactType, number>> = {
  EMAIL: 0,
  MESSENGER_ID: 1,
  PHONE_INTL: 2,
  PHONE_LOCAL: 3,
  URL: 4,
  HANDLE: 5,
};

/**
 * Overlapping matches are merged into one span. The span keeps the type of the match that starts
 * first (longest, then PRIORITY on ties): "hong@naver.com" is an EMAIL, not also a URL.
 */
function mergeOverlaps(matches: ContactMatch[], text: string): ContactMatch[] {
  const sorted = [...matches].sort(
    (a, b) => a.start - b.start || b.end - a.end || PRIORITY[a.type] - PRIORITY[b.type],
  );
  const merged: ContactMatch[] = [];
  for (const m of sorted) {
    const last = merged[merged.length - 1];
    if (last && m.start < last.end) {
      const end = Math.max(last.end, m.end);
      merged[merged.length - 1] = {
        type: last.type,
        start: last.start,
        end,
        value: text.slice(last.start, end),
      };
    } else merged.push(m);
  }
  return merged;
}

/** All contact-like spans in `text`, ordered by position. */
export function detectContacts(text: string): ContactMatch[] {
  if (!text) return [];
  const normalized = normalizeWidth(text);
  const found: ContactMatch[] = [];
  collect(normalized, EMAIL_PATTERNS, "EMAIL", found);
  collect(normalized, MESSENGER_PATTERNS, "MESSENGER_ID", found);
  findPhones(normalized, found);
  collect(normalized, URL_PATTERNS, "URL", found);
  collect(normalized, [HANDLE], "HANDLE", found);
  return mergeOverlaps(found, text);
}

export function hasContacts(text: string): boolean {
  return detectContacts(text).length > 0;
}

/** Replaces every detected span with `replacement` (default "***"). */
export function maskContacts(text: string, replacement = "***"): string {
  let out = "";
  let cursor = 0;
  for (const m of detectContacts(text)) {
    out += text.slice(cursor, m.start) + replacement;
    cursor = m.end;
  }
  return out + text.slice(cursor);
}

/** Throws `ContactInfoError` (422, code CONTACT_INFO_DETECTED) when `text` contains a contact. */
export function assertNoContacts(text: string, field?: string): void {
  const found = detectContacts(text);
  if (found.length > 0) {
    throw new ContactInfoError([...new Set(found.map((m) => m.type))], field);
  }
}
