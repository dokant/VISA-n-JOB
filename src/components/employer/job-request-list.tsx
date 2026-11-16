import { BadgeCheck, CircleDashed, CircleMinus } from "lucide-react";

import { Badge } from "@/components/ui/badge";

export type JobRequestListItem = {
  id: string;
  title: string;
  requestedAt: string;
  status: string;
  tone: "reviewing" | "verified" | "closed";
};

const TONE = {
  reviewing: { variant: "outline", icon: CircleDashed },
  verified: { variant: "cyan", icon: BadgeCheck },
  closed: { variant: "neutral", icon: CircleMinus },
} as const;

/** The company's 구인 의뢰 with status (R-125 검증 큐). Icon + text, never color alone (S-09). */
export function JobRequestList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: JobRequestListItem[];
}) {
  return (
    <section className="grid gap-3" data-testid="job-request-list">
      <h2 className="text-h3 text-navy">{title}</h2>
      {items.length === 0 ? (
        <p className="text-dense text-n500">{empty}</p>
      ) : (
        <ul className="grid gap-2">
          {items.map((item) => {
            const tone = TONE[item.tone];
            const Icon = tone.icon;
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-n200 bg-white px-4 py-3"
              >
                <div className="grid gap-0.5">
                  <span className="text-dense font-semibold text-navy">{item.title}</span>
                  <span className="text-caption text-n500">{item.requestedAt}</span>
                </div>
                <Badge variant={tone.variant} data-testid="job-request-status">
                  <Icon aria-hidden="true" strokeWidth={1.5} />
                  {item.status}
                </Badge>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
