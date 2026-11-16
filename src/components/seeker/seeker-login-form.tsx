"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquare, LogIn } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { codeToKey } from "@/components/forms/error-key";
import { OTP_CODE_LENGTH } from "@/config/limits";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import {
  type SeekerOtpRequestInput,
  type SeekerOtpVerifyInput,
  seekerOtpRequestSchema,
  seekerOtpVerifySchema,
} from "@/schemas/auth/auth";
import { requestSeekerOtp, signInSeeker } from "@/server/actions/seeker/login";

type ServerError = { code: string; retryAfterSec?: number } | null;

/** Seconds left until `until` (ms), updated every second. */
function useCountdown(until: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [until]);
  return until === null ? 0 : Math.max(0, Math.ceil((until - now) / 1000));
}

/**
 * /[locale]/seeker/login (R-104): phone → OTP code → sign in. The resend button stays disabled
 * for the server's resend interval; every limit is enforced on the server.
 */
export function SeekerLoginForm({ next }: { next?: string }) {
  const t = useTranslations("seeker.login");
  const te = useTranslations("errors");
  const locale = useLocale();
  const id = useId();
  const [phone, setPhone] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const [serverError, setServerError] = useState<ServerError>(null);
  const [pending, startTransition] = useTransition();
  const resendIn = useCountdown(resendAt);

  const phoneForm = useForm<SeekerOtpRequestInput>({
    resolver: zodResolver(seekerOtpRequestSchema),
    defaultValues: { phone: "" },
  });
  const codeForm = useForm<SeekerOtpVerifyInput>({
    resolver: zodResolver(seekerOtpVerifySchema),
    defaultValues: { phone: "", code: "" },
  });

  const errorText = (e: ServerError) => {
    if (!e) return undefined;
    const key = `auth.${codeToKey(e.code)}`;
    return te.has(key) ? te(key, { seconds: e.retryAfterSec ?? 0 }) : te("auth.unknown");
  };
  const fieldError = (code: string | undefined) =>
    code ? te(`field.${code}`, { length: OTP_CODE_LENGTH }) : undefined;

  const send = (value: string) =>
    startTransition(async () => {
      setServerError(null);
      const r = await requestSeekerOtp({ phone: value, locale });
      if (r.ok) {
        setPhone(value);
        setResendAt(Date.now() + r.resendAfterSec * 1000);
        codeForm.reset({ phone: value, code: "" });
      } else {
        setServerError(r);
        if (r.code === "RESEND_TOO_SOON" && r.retryAfterSec) {
          setResendAt(Date.now() + r.retryAfterSec * 1000);
        }
      }
    });

  const verify = (values: SeekerOtpVerifyInput) =>
    startTransition(async () => {
      setServerError(null);
      const r = await signInSeeker({ ...values, locale, next });
      if (r && !r.ok) setServerError(r);
    });

  if (phone === null) {
    return (
      <form
        noValidate
        className="grid gap-5.5"
        data-testid="seeker-login-phone"
        onSubmit={phoneForm.handleSubmit((v) => send(v.phone))}
      >
        <FormField
          id={`${id}-phone`}
          label={t("phone.label")}
          required
          help={t("phone.help")}
          error={fieldError(phoneForm.formState.errors.phone?.message)}
        >
          {(a11y) => (
            <Input
              {...a11y}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={t("phone.placeholder")}
              {...phoneForm.register("phone")}
            />
          )}
        </FormField>
        {serverError ? (
          <p role="alert" className="text-caption text-error-text" data-testid="auth-error">
            {errorText(serverError)}
          </p>
        ) : null}
        <Button type="submit" variant="seeker" className="w-full" disabled={pending}>
          <MessageSquare aria-hidden="true" strokeWidth={1.5} />
          {pending ? t("sending") : t("sendCode")}
        </Button>
      </form>
    );
  }

  return (
    <form
      noValidate
      className="grid gap-5.5"
      data-testid="seeker-login-code"
      onSubmit={codeForm.handleSubmit(verify)}
    >
      <p className="text-dense text-n700" aria-live="polite">
        {t("codeSent")}
      </p>
      <input type="hidden" {...codeForm.register("phone")} />
      <FormField
        id={`${id}-code`}
        label={t("code.label")}
        required
        help={t("code.help", { length: OTP_CODE_LENGTH })}
        error={fieldError(codeForm.formState.errors.code?.message)}
      >
        {(a11y) => (
          <Input
            {...a11y}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={OTP_CODE_LENGTH}
            {...codeForm.register("code")}
          />
        )}
      </FormField>
      {serverError ? (
        <p role="alert" className="text-caption text-error-text" data-testid="auth-error">
          {errorText(serverError)}
        </p>
      ) : null}
      {serverError?.code === "NO_ACCOUNT" ? (
        <Button asChild variant="outline" className="w-full">
          <Link href="/seeker/register/quick" data-testid="no-account-quick">
            {t("quickRegister")}
          </Link>
        </Button>
      ) : null}
      <Button type="submit" variant="seeker" className="w-full" disabled={pending}>
        <LogIn aria-hidden="true" strokeWidth={1.5} />
        {pending ? t("submitting") : t("submit")}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending || resendIn > 0}
          onClick={() => send(phone)}
          data-testid="seeker-login-resend"
        >
          {resendIn > 0 ? t("resendIn", { seconds: resendIn }) : t("resend")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            setPhone(null);
            setServerError(null);
            setResendAt(null);
          }}
        >
          {t("changePhone")}
        </Button>
      </div>
    </form>
  );
}
