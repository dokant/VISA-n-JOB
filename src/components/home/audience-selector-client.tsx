"use client";

import { ArrowRight, Check, Clock, Factory, Network, User } from "lucide-react";
import { type KeyboardEvent, type MouseEvent, type ReactNode, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { AUDIENCES, type Audience, type AudienceCopy } from "./audience";

type Props = {
  /** Server-rendered SectionHeader; the tabs sit on its right (bottom aligned) [HO .aud__head]. */
  header: ReactNode;
  initial: Audience;
  tabsLabel: string;
  copy: Record<Audience, AudienceCopy>;
};

const ICONS = { employer: Factory, seeker: User, agency: Network } as const;
const ART = { employer: "vj-art--employer", seeker: "vj-art--seeker", agency: "vj-art--agency" };

/**
 * STANDARD v2 3.7 #3 / 3.3 audience selector [HO §3]. Three cards (role="button", aria-pressed,
 * Enter/Space) and three segmented tabs share one state (default employer). Each card is also a
 * link to `?for=<audience>` so the right panel renders without JavaScript (3.3 "JS 비활성").
 * The panel swap animates transform only (no opacity, 2.7 rule 2).
 */
export function AudienceSelectorClient({ header, initial, tabsLabel, copy }: Props) {
  const [audience, setAudience] = useState<Audience>(initial);

  const select = (next: Audience) => {
    setAudience(next);
    const url = new URL(window.location.href);
    url.searchParams.set("for", next);
    window.history.replaceState(window.history.state, "", url);
  };

  const onCardClick = (event: MouseEvent<HTMLAnchorElement>, next: Audience) => {
    event.preventDefault();
    select(next);
  };
  const onCardKey = (event: KeyboardEvent<HTMLAnchorElement>, next: Audience) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      select(next);
    }
  };

  return (
    <Tabs value={audience} onValueChange={(v) => select(v as Audience)}>
      <div className="mb-11 flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        {header}
        <TabsList aria-label={tabsLabel} className="reveal">
          {AUDIENCES.map((a) => (
            <TabsTrigger key={a} value={a} data-testid={`audience-tab-${a}`}>
              {copy[a].tab}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <div className="grid gap-5 lg:grid-cols-3" data-testid="audience-cards">
        {AUDIENCES.map((a, index) => {
          const Icon = ICONS[a];
          const pressed = audience === a;
          const c = copy[a];
          return (
            <a
              key={a}
              href={`?for=${a}#audience`}
              role="button"
              aria-pressed={pressed}
              onClick={(e) => onCardClick(e, a)}
              onKeyDown={(e) => onCardKey(e, a)}
              data-testid={`audience-card-${a}`}
              style={{ transitionDelay: `${index * 0.07}s` }}
              className={cn(
                "vj-acard reveal group relative isolate flex min-h-96 flex-col overflow-hidden rounded-lg border border-n200 bg-n50 p-6.5 pb-6 text-start lg:min-h-121.5",
                "transition-[transform,box-shadow,border-color] duration-550 ease-out",
                "hover:-translate-y-1.5 hover:border-brand-blue/35 hover:shadow-2",
              )}
            >
              <span className={cn("vj-art", ART[a])} aria-hidden="true">
                <span className="vj-art__lines" />
              </span>
              <span className="flex items-start justify-between gap-4">
                <span
                  className={cn(
                    "grid size-13 place-items-center rounded-md border transition-[background-color,border-color,color,transform] duration-600 ease-out group-hover:-translate-y-0.5 group-hover:-rotate-3",
                    pressed
                      ? "border-white/28 bg-white/14 text-white"
                      : "border-n200 bg-white text-navy group-hover:border-white/28 group-hover:bg-white/14 group-hover:text-white",
                  )}
                >
                  <Icon aria-hidden="true" strokeWidth={1.5} className="size-6" />
                </span>
                <span
                  className={cn(
                    "text-eyebrow tracking-[0.14em] transition-colors duration-400",
                    pressed ? "text-white/72" : "text-n500 group-hover:text-white/72",
                  )}
                >
                  {c.num}
                </span>
              </span>
              <span
                className={cn(
                  "mt-auto pt-16 text-eyebrow tracking-[0.14em] uppercase transition-colors duration-400 lg:pt-37.5",
                  pressed ? "text-white/72" : "text-n500 group-hover:text-white/72",
                )}
              >
                {c.kicker}
              </span>
              <span
                className={cn(
                  "mt-2.5 block text-h3 font-bold transition-colors duration-400",
                  pressed ? "text-white" : "text-navy group-hover:text-white",
                )}
              >
                {c.title}
                <span
                  className={cn(
                    "mt-1.5 block text-dense font-medium transition-colors duration-400",
                    pressed ? "text-white/72" : "text-n500 group-hover:text-white/72",
                  )}
                >
                  {c.subtitle}
                </span>
              </span>
              <span
                className={cn(
                  "mt-3 block max-w-75 text-dense transition-colors duration-400",
                  pressed ? "text-white/72" : "text-n500 group-hover:text-white/72",
                )}
              >
                {c.desc}
              </span>
              <span
                className={cn(
                  "mt-5.5 flex items-center justify-between gap-3 border-t pt-4 transition-colors duration-400",
                  pressed
                    ? "border-white/16 text-white"
                    : "border-n200 text-navy group-hover:border-white/16 group-hover:text-white",
                )}
              >
                <strong className="text-dense font-semibold">{c.action}</strong>
                <span
                  className={cn(
                    "grid size-9.5 flex-none place-items-center rounded-full border transition-[background-color,color,border-color,transform] duration-500 ease-out group-hover:translate-x-0.5",
                    pressed
                      ? "border-white bg-white text-navy"
                      : "border-n200 bg-white text-navy group-hover:border-white",
                  )}
                >
                  <ArrowRight aria-hidden="true" strokeWidth={1.5} className="size-4" />
                </span>
              </span>
            </a>
          );
        })}
      </div>

      {AUDIENCES.map((a) => (
        <TabsContent key={a} value={a} forceMount className="data-[state=inactive]:hidden">
          {a === audience ? <AudiencePanel audience={a} panel={copy[a].panel} /> : null}
        </TabsContent>
      ))}
    </Tabs>
  );
}

function AudiencePanel({ audience, panel }: { audience: Audience; panel: AudienceCopy["panel"] }) {
  return (
    <div
      data-testid="audience-panel"
      data-audience={audience}
      className="vj-aud-panel vj-panel-in mt-6 grid items-start gap-6 rounded-lg border border-n200 p-6.5 lg:grid-cols-3 lg:gap-8.5"
    >
      <div className="flex items-start gap-3.5">
        <ArrowRight
          aria-hidden="true"
          strokeWidth={1.5}
          className="mt-1 size-4 flex-none text-brand-blue-600"
        />
        <div>
          <h3 className="text-body font-semibold text-navy">{panel.title}</h3>
          <p className="mt-1.5 text-dense text-n500">{panel.body}</p>
        </div>
      </div>
      {panel.bullets.length > 0 ? (
        <ul className="grid gap-2.25">
          {panel.bullets.map((b) => (
            <li key={b} className="flex gap-2.25 text-dense text-n700">
              <Check
                aria-hidden="true"
                strokeWidth={2}
                className="mt-0.75 size-3.75 flex-none text-brand-blue-600"
              />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div>
          {panel.badge ? (
            <Badge variant="neutral" className="text-caption tracking-normal">
              <Clock aria-hidden="true" strokeWidth={1.5} />
              {panel.badge}
            </Badge>
          ) : null}
        </div>
      )}
      <div className="flex flex-col gap-2.5">
        <Button asChild variant={panel.cta.variant} className="w-full">
          <Link href={panel.cta.href}>
            {panel.cta.label}
            <ArrowRight aria-hidden="true" strokeWidth={1.5} data-icon="trailing" />
          </Link>
        </Button>
        {panel.secondary ? (
          <Button asChild variant="ghost" className="w-full">
            <Link href={panel.secondary.href}>{panel.secondary.label}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
