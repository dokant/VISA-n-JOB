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

/**
 * P2a QA D-1 / D-3 / O-1: text compared for contacts is normalised first, and every normalised
 * character keeps the original span it came from, so detected offsets (and `maskContacts`) still
 * refer to the input.
 * 1. The input is split into units (a character with its combining marks). Invisible characters
 *    (Unicode `Cf` and Default_Ignorable_Code_Point: U+200B ZWSP, U+200C/D, U+2060, U+FEFF, U+00AD
 *    soft hyphen, U+3164 Hangul filler, U+FE0F variation selector …) are dropped.
 * 2. Hangul written as separate jamo is composed into syllables before NFKC: NFD jamo
 *    ("공" = U+1100 U+1169 U+11BC) and compatibility jamo typed one by one ("ㄱㅗㅇㅇㅣㄹ" → "공일").
 *    `String.normalize("NFC")` alone does not compose compatibility jamo, so the composition is done
 *    here (initial + vowel, plus a final consonant when no vowel follows it), one syllable spanning
 *    the jamo it came from.
 * 3. Each unit is NFKC-normalised (full-width ０-９ ＠ ＋, NBSP, ideographic space, circled and
 *    super/subscript digits, mathematical digits, ㈜ …).
 * 4. Digits: every Unicode decimal digit (`\p{Nd}`: Arabic-Indic ٠-٩, Persian ۰-۹, Devanagari ०-९,
 *    Thai ๐-๙ …) becomes its ASCII digit; Han numerals 零〇一二三四五六七八九 become digits (a "一"
 *    standing between two other digits reads as a dash: "010一1234"); a digit's combining marks are
 *    dropped, so keycap emoji ("0️⃣" = 0 + U+FE0F + U+20E3) read as the digit.
 */
const IGNORABLE = /[\p{Cf}\p{Default_Ignorable_Code_Point}]/gu;
const UNIT = /\P{M}\p{M}*|\p{M}+/gsu;
const DECIMAL_DIGIT = /\p{Nd}/u;
const MARKS_ONLY = /^\p{M}*$/u;
const HAN_DIGITS: Readonly<Record<string, string>> = {
  零: "0",
  〇: "0",
  一: "1",
  二: "2",
  三: "3",
  四: "4",
  五: "5",
  六: "6",
  七: "7",
  八: "8",
  九: "9",
};

type Piece = { text: string; start: number; end: number; han?: boolean };
type Normalized = { text: string; startOf: number[]; endOf: number[] };

/** ASCII value of a `\p{Nd}` character (Nd digits come in contiguous runs of ten, 0 → 9). */
function decimalValue(ch: string): string {
  let cp = ch.codePointAt(0) as number;
  let steps = 0;
  while (DECIMAL_DIGIT.test(String.fromCodePoint(cp - 1))) {
    cp -= 1;
    steps += 1;
  }
  return String(steps % 10);
}

// ── Hangul jamo composition ──
const COMPAT_INITIALS = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
const COMPAT_FINALS = "ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ";
function initialIndex(ch: string): number {
  const cp = ch.codePointAt(0) as number;
  if (cp >= 0x1100 && cp <= 0x1112) return cp - 0x1100;
  return ch.length === 1 ? COMPAT_INITIALS.indexOf(ch) : -1;
}
function vowelIndex(ch: string | undefined): number {
  if (ch === undefined || ch.length !== 1) return -1;
  const cp = ch.charCodeAt(0);
  if (cp >= 0x1161 && cp <= 0x1175) return cp - 0x1161;
  if (cp >= 0x314f && cp <= 0x3163) return cp - 0x314f;
  return -1;
}
/** 1–27 for a final consonant; conjoining finals always, compatibility ones only before a non-vowel. */
function finalIndex(ch: string | undefined, next: string | undefined): number {
  if (ch === undefined || ch.length !== 1) return 0;
  const cp = ch.charCodeAt(0);
  if (cp >= 0x11a8 && cp <= 0x11c2) return cp - 0x11a7;
  const i = COMPAT_FINALS.indexOf(ch);
  return i >= 0 && vowelIndex(next) < 0 ? i + 1 : 0;
}

function composeHangul(pieces: Piece[]): Piece[] {
  const out: Piece[] = [];
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    const l = p.text.length === 1 ? initialIndex(p.text) : -1;
    const v = vowelIndex(pieces[i + 1]?.text);
    if (l >= 0 && v >= 0) {
      let j = i + 1;
      const t = finalIndex(pieces[j + 1]?.text, pieces[j + 2]?.text);
      if (t > 0) j += 1;
      const syllable = String.fromCharCode(0xac00 + (l * 21 + v) * 28 + t);
      out.push({ text: syllable, start: p.start, end: pieces[j].end });
      i = j;
      continue;
    }
    // a precomposed syllable without a final, followed by a conjoining final (partial NFD)
    const cp = p.text.length === 1 ? p.text.charCodeAt(0) : 0;
    if (cp >= 0xac00 && cp <= 0xd7a3 && (cp - 0xac00) % 28 === 0) {
      const nextCp = pieces[i + 1]?.text.length === 1 ? pieces[i + 1].text.charCodeAt(0) : 0;
      if (nextCp >= 0x11a8 && nextCp <= 0x11c2) {
        out.push({
          text: String.fromCharCode(cp + nextCp - 0x11a7),
          start: p.start,
          end: pieces[i + 1].end,
        });
        i += 1;
        continue;
      }
    }
    out.push(p);
  }
  return out;
}

function normalizeDigits(text: string): { text: string; han: boolean } {
  const chars = [...text];
  let han = false;
  const mapped = chars.map((c) => {
    if (HAN_DIGITS[c]) {
      han = true;
      return HAN_DIGITS[c];
    }
    if (c.length === 1 && c >= "0" && c <= "9") return c;
    return DECIMAL_DIGIT.test(c) ? decimalValue(c) : c;
  });
  // a digit with combining marks (keycap "0⃣", "1̲") is just the digit
  if (/^[0-9]$/.test(mapped[0] ?? "") && MARKS_ONLY.test(mapped.slice(1).join(""))) {
    return { text: mapped[0], han };
  }
  return { text: mapped.join(""), han };
}

function normalizeForDetection(text: string): Normalized {
  const units: Piece[] = [];
  for (const m of text.matchAll(UNIT)) {
    const unit = m[0].replace(IGNORABLE, "");
    if (unit) units.push({ text: unit, start: m.index, end: m.index + m[0].length });
  }
  const pieces = composeHangul(units).map((p) => {
    const digits = normalizeDigits(p.text.normalize("NFKC").replace(IGNORABLE, ""));
    return { ...p, ...digits };
  });
  const isPlainDigit = (p: Piece | undefined) => p !== undefined && !p.han && /[0-9]$/.test(p.text);
  let out = "";
  const startOf: number[] = [];
  const endOf: number[] = [];
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i];
    let norm = p.text;
    // "010一1234一5678": a Han "one" between other digits is a dash, not a digit
    if (
      p.han &&
      norm === "1" &&
      isPlainDigit(pieces[i - 1]) &&
      /^[0-9]/.test(pieces[i + 1]?.text ?? "") &&
      !pieces[i + 1]?.han
    ) {
      norm = "-";
    }
    for (let k = 0; k < norm.length; k++) {
      startOf.push(p.start);
      endOf.push(p.end);
    }
    out += norm;
  }
  return { text: out, startOf, endOf };
}

// ── Phone numbers ────────────────────────────────────────────────────────────
// A digit run: digits with at most 3 separator characters between them.
// P2a QA D-3: separators are defined by Unicode category, not by a list (a list always misses one:
// "ㅡ", "•", "・", "●", "→" …). On the normalised text a separator is
//   - white space,
//   - any punctuation (`\p{P}`: - . / _ ( ) • ・ · … ) or symbol (`\p{S}`: ~ * + = | → ● ★ …),
//   - a combining mark left on its own (`\p{M}`, e.g. a stray keycap U+20E3),
//   - Hangul ㅡ (U+3161, typed as a dash; NFKC turns it into U+1173) and Katakana ー (U+30FC).
// Kept exceptions (amount / time false positives, unchanged since P0c):
//   - the comma "," is never a separator: "2,500,000원" and "1,500,2,000" are amounts;
//   - the colon ":" is never a separator: "09:00~18:00", "2026-11-16 09:00" are times;
//   - at most 3 separator characters join two groups, so dot leaders and long rules
//     ("1층 ..... 2층", "010 -_ 1234 -_ 5678") do not join numbers.
// Design limit (QA O-3): 4 or more separator characters between groups, commas, colons and letters
// between groups ("010번 1234번 5678") are not read as one number — widening those would turn
// amounts, times and numbered lists into phone numbers.
const SEP = "(?:(?![,:])[\\s\\p{P}\\p{S}\\p{M}\\u3161\\u1173\\u30FC])";
// P2a run 6: a run of U+E000 (the 년 / 월 inside a 년월일 date, see `joinKoreanDates`) joins too.
const DIGIT_RUN = new RegExp(`(?:\\+${SEP}{0,2})?\\d(?:(?:${SEP}{0,3}|\\uE000+)\\d)+`, "gu");
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
// P0c QA P-4: particles between the groups ("공일공에 일이삼사 오육칠팔") are allowed.
const KSEP = `(?:${SEP}|[에은는])`;
const KOREAN_SPELLED_MOBILE = new RegExp(
  `[공영]${KSEP}{0,3}일${KSEP}{0,3}[공영일육칠팔구](?:${KSEP}{0,3}[0-9공영일이삼사오육칠팔구]){7,8}(?![0-9])`,
  "gu",
);
// P0c QA P-4: "제로원제로 1234 5678" / "zero one zero 1234 5678" — the 010 prefix spelled out.
const SPELLED_PREFIX_MOBILE = new RegExp(
  `(?:제로|zero)${SEP}{0,2}(?:원|one)${SEP}{0,2}(?:제로|zero)(?:${SEP}{0,3}\\d){7,8}(?!\\d)`,
  "giu",
);
// P2a QA O-1: a number spelled (wholly or partly) with English digit words —
// "zero one zero one two three four five six seven eight". Read as digits, then classified.
const EN_DIGIT_WORDS: Readonly<Record<string, string>> = {
  zero: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9",
};
const EN_DIGIT = "(?:zero|one|two|three|four|five|six|seven|eight|nine|\\d)";
const ENGLISH_SPELLED_NUMBER = new RegExp(
  `(?<![A-Za-z0-9])${EN_DIGIT}(?:${SEP}{0,3}${EN_DIGIT}){7,}(?![A-Za-z0-9])`,
  "giu",
);
// P0c QA P-3: a representative number without separators ("15881234") counts only after a phone
// keyword, so plain 8-digit amounts and codes stay negative.
const PHONE_KEYWORD_REPRESENTATIVE =
  /(?:대표\s*번호|전화(?:\s*번호)?|연락처|문의|tel|phone|hotline)\s*[:：.]?\s*(\d{8})(?!\d)/gi;

/**
 * P0c QA P-4: look-alike characters inside a digit run ("o1o-I234-5678", "공1공-1234-5678") are read
 * as digits. A character is replaced only when a digit is directly next to it (or next to another
 * replaced character that touches a digit), one character for one character so offsets stay valid.
 */
const LOOKALIKE_DIGITS: Readonly<Record<string, string>> = {
  o: "0",
  O: "0",
  공: "0",
  영: "0",
  I: "1",
  l: "1",
};
function normalizeLookalikeDigits(text: string): string {
  const chars = [...text];
  if (chars.length !== text.length) {
    // astral characters would shift offsets — fall back to the text as it is
    return text;
  }
  const isDigit = (c: string | undefined) => c !== undefined && c >= "0" && c <= "9";
  const out = chars.slice();
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < out.length; i++) {
      const sub = LOOKALIKE_DIGITS[out[i]];
      if (sub && (isDigit(out[i - 1]) || isDigit(out[i + 1]))) {
        out[i] = sub;
        changed = true;
      }
    }
  }
  return out.join("");
}
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

// ── Dates and amount ranges inside a digit run (P2a QA run 3 D-4, O-1; run 6 Q-20) ───────────
// D-4: "2026.12.01~2027.01.31" was read as 01 + 2027 + 01 + 31 = "0120270131" (a 10-digit number
// starting with 0). Run 6 (Q-20) rule, one rule for every date form:
//   - a digit run (groups joined by 1–3 separator characters, see DIGIT_RUN) is the window;
//   - when EVERY digit of the window belongs to a real date token (dates joined by range or
//     separator signs: "2026.12.01~2027.01.31", "12/1~1/31"), the window is not a phone;
//   - when ANY digit of the window is outside a date token, the window is checked strictly, the
//     dates read as plain digits like any other group ("02 2026.12.01" = 02-2026-1201,
//     "0101234 2026.12" = 0101234-2026, "01~2027.01.31" after an invalid date "2026.13.01").
// Only one thing may stand next to a date without making the window strict: a group that is
// clearly not part of a number — a time ("17:00 (2026.12.01": the minutes after a colon, or the hour
// before one), a count with a unit right after it ("2026.12.01 / 3명", "(2개월)") or a list marker
// without a leading 0 ("1) 2026.12.01 2) 2027.01.31"). Such a group is cut out of the window only
// when the rest of the window is then dates alone; it is still checked on its own.
// A date is recognised only when its values are real: year 1900–2099, month 1–12, day 1–31.
// Forms: YYYY.MM.DD (same separator . - / twice, spaces allowed: "2026. 12. 01"), YYYY MM DD
// (spaces), YYYY년 MM월 [DD일], YYYY.MM (. - /), MM/DD (slash only: "12/1~1/31"). "MM.DD" is not a
// date form — "010.12.01.5678" stays one phone number. In "YYYY년 MM월 DD일" the 년 / 월 between the
// numbers join them into one run, so "02 2026년 12월 01일" is read as 02-2026-12-01 (run 5 O-3).
const YEAR = "(?:19|20)\\d{2}";
const MONTH = "(?:0?[1-9]|1[0-2])";
const DAY = "(?:0?[1-9]|[12]\\d|3[01])";
const DATE_TOKEN = new RegExp(
  "(?<!\\d)(?:" +
    [
      `${YEAR}\\s*년\\s*${MONTH}\\s*월(?:\\s*${DAY}\\s*일)?`,
      `${YEAR}\\s*([./-])\\s*${MONTH}\\s*\\1\\s*${DAY}`,
      `${YEAR}\\s+${MONTH}\\s+${DAY}`,
      `${YEAR}\\s*[./-]\\s*${MONTH}`,
      `${MONTH}\\s*\\/\\s*${DAY}`,
    ].join("|") +
    ")(?!\\d)",
  "gu",
);
// "년" / "월" (with the spaces around them) between two numbers of a 년월일 date
const KOREAN_DATE_JOIN = /\s*[년월]\s*(?=\d)/gu;
// a private-use character joins digit groups like a separator, at any length (DIGIT_RUN)
const DATE_JOIN = "";

function findDateSpans(text: string): Array<[number, number]> {
  return [...text.matchAll(DATE_TOKEN)].map((m) => [m.index, m.index + m[0].length]);
}

/** The text with the 년 / 월 inside 년월일 dates replaced by DATE_JOIN, same length (offsets kept). */
function joinKoreanDates(text: string, dates: Array<[number, number]>): string {
  let out = "";
  let cursor = 0;
  for (const [s, e] of dates) {
    const token = text.slice(s, e);
    if (!/[년월]/u.test(token)) continue;
    out +=
      text.slice(cursor, s) + token.replace(KOREAN_DATE_JOIN, (j) => DATE_JOIN.repeat(j.length));
    cursor = e;
  }
  return out + text.slice(cursor);
}

// A group that is a time or a count, not a digit of a number (see the rule above).
const TIME_MINUTES_BEFORE = /\d{1,2}:$/u;
const TIME_HOUR_AFTER = /^:\d{2}(?!\d)/u;
const UNIT_AFTER =
  /^\s?(?:명|인|교대|시간|시|분|초|일|주|개월|달|년|월|원|만|천|억|회|차|층|호|세|살|개|건|박|대|톤|평|조|kg|cm|mm|km|%|㎏|㎝|㎡)/iu;

function isTimeOrCount(text: string, start: number, end: number): boolean {
  const len = end - start;
  if (len === 2 && TIME_MINUTES_BEFORE.test(text.slice(Math.max(0, start - 3), start))) return true;
  if (len <= 2 && TIME_HOUR_AFTER.test(text.slice(end, end + 4))) return true;
  // a list marker without a leading 0: "1) 2026.12.01 2) 2027.01.31" ("02)" stays a digit group)
  if (len <= 2 && text[start] !== "0" && text[end] === ")") return true;
  return UNIT_AFTER.test(text.slice(end, end + 3));
}

// O-1: "일당 820000 ~ 950000" was read as 82 + 0000950000 (an international number). Two complete
// numbers (5+ digits, no leading 0) joined by a range sign are a range, not one number, when
//   - the sign is ~ 〜 → ⟶ and both numbers end in 0 (won amounts are rounded), or
//   - an amount cue is next to them (일당·일급·월급·시급·주급·연봉·급여·임금·수당·₩·KRW before,
//     원·만원·₩·KRW right after, or ₩ inside the separator) — then also for - – —.
// Both amounts of a range stand alone: neither starts nor ends a phone window, so a number right
// after a range ("일당 820000~950000 010-1234-5678") is read from its own first digit (run 5 O-2).
// Real international numbers keep short groups ("+82 10 1234 5678", "0082 10 …") and are not split.
const RANGE_STRONG = /[~〜→⟶⇒]/u;
const RANGE_DASH = /[-‐-―−]/u;
const COMPLETE_NUMBER = /^[1-9]\d{4,}$/;
const AMOUNT_CUE_BEFORE =
  /(?:일당|일급|월급|시급|주급|연봉|급여|임금|수당|보수|₩|KRW)[^\d]{0,6}$/iu;
const AMOUNT_CUE_AFTER = /^\s*(?:만\s*)?(?:원|₩|KRW)/iu;

type Group = {
  start: number;
  end: number;
  digits: string;
  /** inside a date token */
  date: boolean;
  /** a time or a count with a unit (may be cut out of a window of dates) */
  aside: boolean;
};

function isAmountRange(
  left: Group,
  right: Group,
  run: string,
  offset: number,
  text: string,
): boolean {
  if (left.date || right.date) return false;
  if (!COMPLETE_NUMBER.test(left.digits) || !COMPLETE_NUMBER.test(right.digits)) return false;
  const sep = run.slice(left.end, right.start);
  const strong = RANGE_STRONG.test(sep);
  if (!strong && !RANGE_DASH.test(sep)) return false;
  const before = text.slice(Math.max(0, offset + left.start - 12), offset + left.start);
  const after = text.slice(offset + right.end, offset + right.end + 6);
  const cue = AMOUNT_CUE_BEFORE.test(before) || AMOUNT_CUE_AFTER.test(after) || sep.includes("₩");
  if (cue) return true;
  return strong && left.digits.endsWith("0") && right.digits.endsWith("0");
}

// A mobile number with one extra digit glued in front, written in mobile grouping
// ("2010.1234.5678" = 2 + 010-1234-5678). Year lists ("2019-2020-2021") are not numbers.
function isPrefixedMobile(groups: Group[]): boolean {
  if (groups.length !== 3) return false;
  const [a, b, c] = groups.map((g) => g.digits);
  const year = /^(?:19|20)\d{2}$/;
  if (year.test(b) && year.test(c)) return false;
  return /^\d01[016789]$/.test(a) && /^\d{3,4}$/.test(b) && /^\d{4}$/.test(c);
}

/**
 * A run may join neighbouring numbers ("06236 / 02-123-4567"). Amount ranges cut the run into
 * windows first; each window is then either all dates (skipped) or checked strictly.
 */
function findPhonesInRun(
  run: string,
  offset: number,
  text: string,
  dates: Array<[number, number]>,
  out: ContactMatch[],
): void {
  const groups: Group[] = [...run.matchAll(/\d+/g)].map((g) => {
    const start = g.index;
    const end = start + g[0].length;
    const date = dates.some(([s, e]) => offset + start >= s && offset + end <= e);
    const aside = !date && isTimeOrCount(text, offset + start, offset + end);
    return { start, end, digits: g[0], date, aside };
  });
  const amount = groups.map(
    (g, k) =>
      (k > 0 && isAmountRange(groups[k - 1], g, run, offset, text)) ||
      (k < groups.length - 1 && isAmountRange(g, groups[k + 1], run, offset, text)),
  );
  let from = 0;
  for (let k = 0; k <= groups.length; k++) {
    if (k < groups.length && !amount[k]) continue;
    if (k > from) checkWindow(run, offset, groups.slice(from, k), from === 0, out);
    if (k < groups.length) checkWindow(run, offset, [groups[k]], k === 0, out);
    from = k + 1;
  }
}

function checkWindow(
  run: string,
  offset: number,
  groups: Group[],
  first: boolean,
  out: ContactMatch[],
): void {
  const datesOnly = groups.some((g) => g.date) && groups.every((g) => g.date || g.aside);
  if (!datesOnly) {
    scanGroups(run, offset, groups, first, out);
    return;
  }
  // dates with a time / count beside them: only the time / count is checked, on its own
  groups.forEach((g, k) => {
    if (!g.date) scanGroups(run, offset, [g], first && k === 0, out);
  });
}

/** Strict check: windows of consecutive groups, left to right, longest first. */
function scanGroups(
  run: string,
  offset: number,
  groups: Group[],
  first: boolean,
  out: ContactMatch[],
): void {
  let i = 0;
  while (i < groups.length) {
    let next = i + 1;
    for (let j = groups.length - 1; j >= i; j--) {
      // keep a leading "+" only for the first group of the run
      const from = i === 0 && first ? 0 : groups[i].start;
      const value = run.slice(from, groups[j].end);
      const type =
        classifyDigits(value) ?? (isPrefixedMobile(groups.slice(i, j + 1)) ? "PHONE_LOCAL" : null);
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
  const lookalike = normalizeLookalikeDigits(text);
  const dates = findDateSpans(lookalike);
  const joined = joinKoreanDates(lookalike, dates);
  for (const m of joined.matchAll(DIGIT_RUN)) {
    const found: ContactMatch[] = [];
    findPhonesInRun(m[0], m.index, joined, dates, found);
    // report the original characters ("o1o-…"), not the normalised digits
    for (const f of found) out.push({ ...f, value: text.slice(f.start, f.end) });
  }
  for (const m of text.matchAll(SPELLED_PREFIX_MOBILE)) {
    out.push({ type: "PHONE_LOCAL", value: m[0], start: m.index, end: m.index + m[0].length });
  }
  for (const m of text.matchAll(ENGLISH_SPELLED_NUMBER)) {
    if (!/[a-z]/i.test(m[0])) continue; // plain digit runs are handled above
    const digits = m[0].replace(/[a-z]+/gi, (w) => EN_DIGIT_WORDS[w.toLowerCase()] ?? w);
    const type = classifyDigits(digits.replace(/\D/g, ""));
    if (type) out.push({ type, value: m[0], start: m.index, end: m.index + m[0].length });
  }
  for (const m of text.matchAll(PHONE_KEYWORD_REPRESENTATIVE)) {
    if (!REPRESENTATIVE.test(m[1])) continue;
    const start = m.index + m[0].length - m[1].length;
    out.push({ type: "PHONE_LOCAL", value: m[1], start, end: start + m[1].length });
  }
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
  // P0c QA P-2: "naver dot com", "hong 점 naver 점 com" — a well-known mail host spelled out
  new RegExp(
    `(?<![A-Za-z0-9@._-])${MAIL_HOSTS}\\s*(?:\\(dot\\)|\\[dot\\]|\\{dot\\}|\\bdot\\b|점|닷)\\s*${TLD}\\b`,
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

// P0c QA P-5: letters spaced out ("k a k a o") and other SNS / messengers. "line" counts only
// together with "id" — "생산 라인", "line work" are ordinary job text.
const LATIN_MESSENGERS = [
  "k\\s*a\\s*k\\s*a\\s*o\\s*t\\s*a\\s*l\\s*k",
  "k\\s*a\\s*k\\s*a\\s*o",
  "katalk",
  "ka\\s*talk",
  "z\\s*a\\s*l\\s*o",
  "telegram",
  "wechat",
  "we\\s*chat",
  "weixin",
  "viber",
  "whats\\s*app",
  "instagram",
  "insta",
  "facebook",
  "fb",
  "skype",
  "discord",
  "line\\s*id",
].join("|");
const OTHER_MESSENGERS = [
  "카\\s*카\\s*오\\s*톡",
  "카\\s*카\\s*오",
  "카\\s*톡",
  "잘로",
  "텔레그램",
  "위챗",
  "微信",
  "바이버",
  "왓츠\\s*앱",
  "왓챕",
  "인스타그램",
  "인스타",
  "페이스북",
  "스카이프",
  "디스코드",
  "телеграм",
  "вайбер",
  "ватсап",
  "아이디",
].join("|");
// Latin names must be whole words ("settings", "zalora", "kakaopay" are not keywords).
const MESSENGER_KEYWORDS = `(?<![A-Za-z])(?:${LATIN_MESSENGERS})(?![A-Za-z])|${OTHER_MESSENGERS}`;

// An id token: ASCII with at least one letter, or a long digit string (phone-like ids).
// P0c QA P-1: a token must end at a word end. In "Zalo: Nguyễn" the name is not the id "Nguy" — a
// token followed by a Latin letter with diacritics (or a combining mark) is not an id.
const ID_END = "(?![A-Za-z0-9_.\\-\\u00C0-\\u024F\\u0300-\\u036F\\u1E00-\\u1EFF])";
const ID_TOKEN = `(?:(?=[A-Za-z0-9_.\\-]*[A-Za-z])[A-Za-z0-9_.\\-]{3,}${ID_END}|\\d[\\d\\s\\-]{6,}\\d)`;

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

/** All contact-like spans in `text`, ordered by position (offsets refer to `text` as given). */
export function detectContacts(text: string): ContactMatch[] {
  if (!text) return [];
  const { text: normalized, startOf, endOf } = normalizeForDetection(text);
  if (!normalized) return [];
  const found: ContactMatch[] = [];
  collect(normalized, EMAIL_PATTERNS, "EMAIL", found);
  collect(normalized, MESSENGER_PATTERNS, "MESSENGER_ID", found);
  findPhones(normalized, found);
  collect(normalized, URL_PATTERNS, "URL", found);
  collect(normalized, [HANDLE], "HANDLE", found);
  const mapped = found
    .filter((m) => m.end > m.start)
    .map((m) => {
      const start = startOf[m.start];
      const end = endOf[m.end - 1];
      return { ...m, start, end, value: text.slice(start, end) };
    });
  return mergeOverlaps(mapped, text);
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
