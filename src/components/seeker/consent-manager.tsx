"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { REVOCABLE_CONSENTS, type RevocableConsent } from "@/lib/seeker/options";
import { changeConsent } from "@/server/actions/seeker/me";

export type ConsentItem = { type: string; active: boolean; agreedAt: string | null };

/**
 * 마이페이지 동의 목록 (R-113). BLIND_PROFILE and MARKETING can be revoked (with a confirmation
 * dialog) and given again; required consents are shown with a note (철회는 상담 신청으로).
 * Revoking BLIND_PROFILE removes the seeker from employer candidate queries at once (WO §15-8).
 */
export function ConsentManager({ items }: { items: ConsentItem[] }) {
  const t = useTranslations("seeker.me.consents");
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  const change = (type: RevocableConsent, action: "revoke" | "grant") =>
    startTransition(async () => {
      setError(false);
      const r = await changeConsent({ type, action, locale });
      if (r.ok) window.location.reload();
      else setError(true);
    });

  return (
    <ul className="grid gap-3" data-testid="consent-list">
      {items.map((item) => {
        const revocable = (REVOCABLE_CONSENTS as readonly string[]).includes(item.type);
        const type = item.type as RevocableConsent;
        return (
          <li
            key={item.type}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-n200 bg-white p-4"
            data-testid={`consent-item-${item.type}`}
            data-active={item.active}
          >
            <div className="grid gap-1">
              <p className="text-body font-semibold text-navy">{t(`type.${item.type}`)}</p>
              <Badge variant={item.active ? "blue" : "neutral"}>
                {item.active ? t("agreed") : t("notAgreed")}
              </Badge>
            </div>
            {revocable && item.active ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" data-testid={`revoke-${item.type}`}>
                    {t("revoke")}
                  </Button>
                </DialogTrigger>
                <DialogContent closeLabel={t("close")}>
                  <DialogTitle>{t("confirmTitle")}</DialogTitle>
                  <DialogDescription>{t(`confirm.${item.type}`)}</DialogDescription>
                  <div className="flex flex-wrap justify-end gap-2">
                    <DialogClose asChild>
                      <Button variant="outline">{t("cancel")}</Button>
                    </DialogClose>
                    <Button
                      variant="destructive"
                      disabled={pending}
                      onClick={() => change(type, "revoke")}
                      data-testid={`confirm-revoke-${item.type}`}
                    >
                      {t("revokeConfirm")}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : null}
            {revocable && !item.active ? (
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => change(type, "grant")}
                data-testid={`grant-${item.type}`}
              >
                {t("grant")}
              </Button>
            ) : null}
            {!revocable ? <p className="text-caption text-n500">{t("requiredNote")}</p> : null}
          </li>
        );
      })}
      {error ? (
        <li role="alert" className="text-caption text-error-text">
          {t("error")}
        </li>
      ) : null}
    </ul>
  );
}
