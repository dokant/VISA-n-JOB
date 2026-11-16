/** Browser steps shared by the P1c seeker E2E specs. */
import { expect, type Page } from "@playwright/test";

import { setLatestOtpCode, uniqueIp } from "./authDb";
import { msg } from "./messages";

export const OTP_CODE = "482913";

/** "+821012345678" → "010-1234-5678" (how a seeker types it). */
export function localPhone(e164: string): string {
  return `0${e164.slice(3, 5)}-${e164.slice(5, 9)}-${e164.slice(9)}`;
}

export function escapeRe(text: string): RegExp {
  return new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
}

/** Per-test client address (per-IP limits are isolated; the E2E server trusts X-Forwarded-For). */
export async function isolate(page: Page) {
  await page.setExtraHTTPHeaders({ "x-forwarded-for": uniqueIp() });
}

/** Phone + SIGNUP OTP inside a registration form (PhoneOtpFields). */
export async function verifyPhone(page: Page, locale: string, phone: string) {
  await page
    .getByLabel(escapeRe(msg(locale, "seeker.register.otp.phone.label")))
    .fill(localPhone(phone));
  await page.getByTestId("otp-send").click();
  await expect(page.getByTestId("otp-code")).toBeVisible();
  await setLatestOtpCode(phone, OTP_CODE);
  await page.getByTestId("otp-code").fill(OTP_CODE);
}

/** Ticks the consent checkbox of one type. */
export async function agree(page: Page, type: string) {
  await page.getByTestId(`consent-${type}`).getByRole("checkbox").click();
}

/** Quick signup through the UI; ends on the completion screen. */
export async function quickRegisterUi(
  page: Page,
  opts: { locale: string; phone: string; visaCode: string; path?: string; blind?: boolean },
) {
  await page.goto(opts.path ?? `/${opts.locale}/seeker/register/quick`);
  const form = page.getByTestId("quick-register-form");
  await form.locator('select[name="visaCode"]').selectOption(opts.visaCode);
  await form.locator('select[name="sido"]').selectOption({ index: 1 });
  await verifyPhone(page, opts.locale, opts.phone);
  await agree(page, "PRIVACY_REQUIRED");
  if (opts.blind !== false) await agree(page, "BLIND_PROFILE");
  await agree(page, "NOTICE");
  await page.getByTestId("quick-submit").click();
  await expect(page).toHaveURL(new RegExp(`/${opts.locale}/seeker/register/complete$`));
}

/** Seeker OTP login; ends on 마이페이지. */
export async function loginUi(page: Page, locale: string, phone: string) {
  await page.goto(`/${locale}/seeker/login`);
  await page.getByLabel(escapeRe(msg(locale, "seeker.login.phone.label"))).fill(localPhone(phone));
  await page.getByRole("button", { name: msg(locale, "seeker.login.sendCode") }).click();
  await expect(page.getByTestId("seeker-login-code")).toBeVisible();
  await setLatestOtpCode(phone, OTP_CODE);
  await page.getByLabel(escapeRe(msg(locale, "seeker.login.code.label"))).fill(OTP_CODE);
  await page.getByRole("button", { name: msg(locale, "seeker.login.submit") }).click();
  await expect(page).toHaveURL(new RegExp(`/${locale}/seeker/me$`));
}

/** Radio chip inside the chip group labelled by a wizard question. */
export function chip(page: Page, groupLabel: string, option: string) {
  return page
    .getByRole("radiogroup", { name: escapeRe(groupLabel) })
    .getByRole("radio", { name: option, exact: true });
}
