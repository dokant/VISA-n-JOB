"use client";

import { MessageSquare } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useState, useTransition } from "react";
import type { UseFormReturn } from "react-hook-form";

import { FormField } from "@/components/forms/form-field";
import { DisclosureIcon } from "@/components/forms/disclosure-badge";
import { useFieldError, useServerErrorText } from "@/components/seeker/wizard-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OTP_CODE_LENGTH } from "@/config/limits";
import { requestSignupOtp } from "@/server/actions/seeker/register";

type OtpForm = { phone: string; code: string; locale: string };

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
 * Phone + SIGNUP OTP inside a registration form (WO §7.2 ④ / §7.3 Step 0). The code field appears
 * once a code was sent; resend waits for the server interval (R-104). Counts as one question.
 */
export function PhoneOtpFields<T extends OtpForm>({ form }: { form: UseFormReturn<T> }) {
  // The generic form shares these three fields; narrow it once for the helpers below.
  const f = form as unknown as UseFormReturn<OtpForm>;
  const t = useTranslations("seeker.register.otp");
  const fieldError = useFieldError();
  const serverText = useServerErrorText();
  const id = useId();
  const [sent, setSent] = useState(false);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const [error, setError] = useState<{ code: string; retryAfterSec?: number } | null>(null);
  const [pending, startTransition] = useTransition();
  const resendIn = useCountdown(resendAt);

  const send = () =>
    startTransition(async () => {
      setError(null);
      if (!(await f.trigger("phone"))) return;
      const r = await requestSignupOtp({
        phone: f.getValues("phone"),
        locale: f.getValues("locale"),
      });
      if (r.ok) {
        setSent(true);
        setResendAt(Date.now() + r.resendAfterSec * 1000);
      } else {
        setError(r);
        if (r.code === "RESEND_TOO_SOON" && r.retryAfterSec) {
          setSent(true);
          setResendAt(Date.now() + r.retryAfterSec * 1000);
        }
      }
    });

  return (
    <div className="grid gap-4" data-testid="phone-otp">
      <FormField
        id={`${id}-phone`}
        label={t("phone.label")}
        labelSize="question"
        labelAddon={<DisclosureIcon variant="private" />}
        required
        help={t("phone.help")}
        error={fieldError(f.formState.errors.phone?.message)}
      >
        {(a11y) => (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              {...a11y}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={t("phone.placeholder")}
              {...f.register("phone")}
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              disabled={pending || resendIn > 0}
              onClick={send}
              data-testid="otp-send"
            >
              <MessageSquare aria-hidden="true" strokeWidth={1.5} />
              {resendIn > 0 ? t("resendIn", { seconds: resendIn }) : sent ? t("resend") : t("send")}
            </Button>
          </div>
        )}
      </FormField>
      {error ? (
        <p role="alert" className="text-caption text-error-text" data-testid="otp-error">
          {serverText(error.code, error.retryAfterSec)}
        </p>
      ) : null}
      {!sent && f.formState.errors.code ? (
        <p role="alert" className="text-caption text-error-text" data-testid="otp-send-first">
          {t("sendFirst")}
        </p>
      ) : null}
      {sent ? (
        <FormField
          id={`${id}-code`}
          label={t("code.label")}
          required
          help={t("code.help", { length: OTP_CODE_LENGTH })}
          error={fieldError(f.formState.errors.code?.message)}
        >
          {(a11y) => (
            <Input
              {...a11y}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={OTP_CODE_LENGTH}
              data-testid="otp-code"
              {...f.register("code")}
            />
          )}
        </FormField>
      ) : null}
    </div>
  );
}
