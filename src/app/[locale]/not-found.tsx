import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function LocaleNotFound() {
  const t = useTranslations("common.notFound");
  return (
    <main className="mx-auto flex max-w-xl flex-col items-start gap-4 px-4 py-16 md:px-6">
      <h1 className="text-2xl leading-8 font-bold md:text-3xl md:leading-9">{t("title")}</h1>
      <p className="text-muted-foreground">{t("description")}</p>
      <Button asChild>
        <Link href="/">{t("cta")}</Link>
      </Button>
    </main>
  );
}
