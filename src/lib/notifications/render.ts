/**
 * Renders a notification template (messages/*.json, STANDARD 3.6 v2.5 `common.{주제}.{채널}`) into text.
 * Used by adapters that deliver real text (SMTP). The console adapter logs the template key only.
 *
 * - SMS / STAFF: the key itself is the text (`common.otp.sms`).
 * - EMAIL: the key is a group with `subject` and `body` (`common.statusCheck.email.subject` …).
 * Values come from `params` (ICU arguments); a missing key throws (a template must exist in all six
 * locales — `pnpm i18n:check`).
 */
import { createTranslator } from "next-intl";

import { type Locale, defaultLocale, locales } from "@/i18n/locales";

import en from "../../../messages/en.json";
import ko from "../../../messages/ko.json";
import ru from "../../../messages/ru.json";
import uz from "../../../messages/uz.json";
import vi from "../../../messages/vi.json";
import zh from "../../../messages/zh.json";

import type { NotificationMessage } from "./types";

type Messages = Record<string, unknown>;

const MESSAGES: Readonly<Record<Locale, Messages>> = { ko, en, vi, ru, zh, uz };

export class TemplateMissingError extends Error {
  constructor(key: string, locale: string) {
    super(`notification template ${key} missing for ${locale}`);
    this.name = "TemplateMissingError";
  }
}

function messagesOf(locale: string): { locale: Locale; messages: Messages } {
  const l = (locales as readonly string[]).includes(locale) ? (locale as Locale) : defaultLocale;
  return { locale: l, messages: MESSAGES[l] };
}

function lookup(messages: Messages, key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => {
    if (node !== null && typeof node === "object") return (node as Messages)[part];
    return undefined;
  }, messages);
}

function translate(locale: string, key: string, params: NotificationMessage["params"]): string {
  const { locale: l, messages } = messagesOf(locale);
  if (typeof lookup(messages, key) !== "string") throw new TemplateMissingError(key, l);
  const t = createTranslator({ locale: l, messages });
  // The key was checked above; createTranslator's typed keys do not apply to runtime keys.
  return (t as unknown as (k: string, v?: Record<string, string | number>) => string)(key, {
    ...params,
  });
}

export type RenderedText = { text: string };
export type RenderedEmail = { subject: string; text: string };

export function renderText(message: NotificationMessage): RenderedText {
  return { text: translate(message.locale, message.templateKey, message.params) };
}

export function renderEmail(message: NotificationMessage): RenderedEmail {
  return {
    subject: translate(message.locale, `${message.templateKey}.subject`, message.params),
    text: translate(message.locale, `${message.templateKey}.body`, message.params),
  };
}
