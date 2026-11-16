import { getTranslations } from "next-intl/server";

import { getSiteConfig } from "@/config/site.config";

/**
 * Operator registration details (R-102, WO §13) from site.config only. Empty values are hidden.
 * The representative's mobile number and bank details are never shown (Q-06).
 */
export async function RegistrationInfo() {
  const t = await getTranslations("footer.labels");
  const site = getSiteConfig();
  const placement = site.jobPlacementAgency;
  const office = site.adminScrivenerOffice;

  const blocks = [
    {
      key: "placement",
      title: placement.name || t("jobPlacement"),
      rows: [
        { label: t("representative"), value: placement.representative },
        { label: t("jobPlacementRegNo"), value: placement.jobPlacementRegNo },
        { label: t("address"), value: placement.address },
        { label: t("phone"), value: placement.phone },
      ],
    },
    {
      key: "office",
      title: office.name || t("adminOffice"),
      rows: [
        { label: t("representative"), value: office.representative },
        { label: t("adminScrivenerRegNo"), value: office.adminScrivenerRegNo },
        { label: t("businessRegNo"), value: office.businessRegNo },
        { label: t("address"), value: office.address },
        { label: t("phone"), value: office.phone },
      ],
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="registration-info">
      {blocks.map((b) => (
        <section key={b.key} className="rounded-md border border-border bg-white p-6 shadow-1">
          <h3 className="text-h3 text-navy">{b.title}</h3>
          <dl className="mt-4 grid gap-2.5">
            {b.rows
              .filter((r) => r.value)
              .map((r) => (
                <div key={r.label} className="grid gap-0.5 text-dense sm:grid-cols-3 sm:gap-3">
                  <dt className="font-semibold text-n700">{r.label}</dt>
                  <dd className="text-navy sm:col-span-2">{r.value}</dd>
                </div>
              ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
