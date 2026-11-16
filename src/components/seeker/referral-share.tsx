"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * 내 추천 코드 + 공유 (R-112, R-113 /me/referral, DECISIONS PC-9): Web Share API, link copy and
 * messenger share URLs (WhatsApp / Telegram / Viber) — no SDK, no app key. Only the seeker's own
 * referral link (quick signup + ?ref) is shared with friends; this is not a contact channel to
 * employers (BR-01). Kakao / Zalo come in Phase 3.
 */
export function ReferralShare({ code, shareUrl }: { code: string; shareUrl: string }) {
  const t = useTranslations("seeker.referral");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const text = t("shareText", { code });
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(`${text} ${shareUrl}`);
  const messengers = [
    { id: "whatsapp", label: t("whatsapp"), href: `https://wa.me/?text=${encodedText}` },
    {
      id: "telegram",
      label: t("telegram"),
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(text)}`,
    },
    { id: "viber", label: t("viber"), href: `viber://forward?text=${encodedText}` },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="grid gap-4" data-testid="referral-share">
      <div className="grid gap-1">
        <p className="text-label text-n500">{t("codeLabel")}</p>
        <p
          className="font-mono text-h3 tracking-widest text-navy tabular-nums"
          data-testid="referral-code"
        >
          {code}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {canShare ? (
          <Button
            type="button"
            variant="seeker"
            size="sm"
            onClick={() => navigator.share({ title: t("shareTitle"), text, url: shareUrl })}
            data-testid="share-native"
          >
            <Share2 aria-hidden="true" strokeWidth={1.5} />
            {t("share")}
          </Button>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={copy} data-testid="share-copy">
          {copied ? (
            <Check aria-hidden="true" strokeWidth={2} />
          ) : (
            <Copy aria-hidden="true" strokeWidth={1.5} />
          )}
          {copied ? t("copied") : t("copyLink")}
        </Button>
        {messengers.map((m) => (
          <Button key={m.id} asChild variant="outline" size="sm">
            <a
              href={m.href}
              target="_blank"
              rel="noopener noreferrer"
              data-testid={`share-${m.id}`}
            >
              {m.label}
            </a>
          </Button>
        ))}
      </div>
      <p className="text-caption text-n500" aria-live="polite">
        {copied ? t("copiedHelp") : t("help")}
      </p>
    </div>
  );
}
