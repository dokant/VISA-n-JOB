import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function LocaleNotFound() {
  const t = useTranslations("common.notFound");
  return (
    <main className="mx-auto flex max-w-xl flex-col items-start gap-4 px-gutter py-section-tight">
      <h1 className="text-h1 text-navy">{t("title")}</h1>
      <p className="text-lead text-muted-foreground">{t("description")}</p>
      <Button asChild>
        <Link href="/">{t("cta")}</Link>
      </Button>
    </main>
  );
}
