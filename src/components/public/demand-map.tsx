"use client";

import { useId, useState } from "react";

import { cn } from "@/lib/utils";

export type DemandMapNode = {
  code: string;
  label: string;
  /** Already formatted ("12건") or the "자료 부족" text. */
  countText: string;
  payText: string;
  hasData: boolean;
};

type Props = {
  title: string;
  rowCountLabel: string;
  rowPayLabel: string;
  nodes: DemandMapNode[];
};

// Stylized brand diagram from the handoff (viewBox 460×640, not a GIS map) [HO §8]. Province
// outlines and node positions are drawing data only; the numbers come from the aggregate.
const PROVINCES = [
  "150,152 238,142 248,196 240,232 200,250 166,238 146,200 142,172",
  "240,140 330,132 368,168 356,215 318,240 270,228 248,196",
  "248,196 270,228 318,240 306,286 268,300 238,272 240,232",
  "166,238 200,250 240,232 238,272 222,306 186,310 158,288 150,258",
  "318,240 356,215 382,250 392,320 368,360 330,352 306,300 306,286",
  "222,306 238,272 268,300 266,342 250,372 216,366 200,338",
  "330,352 368,360 392,320 404,392 392,442 352,458 316,432 306,392 306,360",
  "186,310 222,306 200,338 216,366 250,372 258,420 232,470 196,478 162,440 150,392 156,344",
  "178,556 218,552 234,570 222,592 188,596 170,578",
];

const POSITIONS: Record<string, readonly [number, number]> = {
  SEOUL: [200, 182],
  INCHEON: [146, 188],
  GYEONGGI: [218, 214],
  GANGWON: [300, 168],
  CHUNGBUK: [252, 262],
  CHUNGNAM: [196, 278],
  SEJONG: [220, 268],
  DAEJEON: [234, 296],
  JEONBUK: [214, 350],
  GWANGJU: [194, 416],
  JEONNAM: [160, 470],
  GYEONGBUK: [328, 288],
  DAEGU: [320, 352],
  ULSAN: [384, 408],
  GYEONGNAM: [344, 434],
  BUSAN: [392, 470],
  JEJU: [200, 576],
};
const ORIGIN = POSITIONS.SEOUL;

/**
 * Demand map (R-117 preview, STANDARD 3.7 #8): 시·도 nodes with a text tooltip on hover AND keyboard
 * focus (2.8). Each node's accessible name carries the same text, so nothing is tooltip-only.
 */
export function DemandMap({ title, rowCountLabel, rowPayLabel, nodes }: Props) {
  const titleId = useId();
  const [active, setActive] = useState<string | null>(null);
  const placed = nodes.filter((n) => POSITIONS[n.code]);
  const current = placed.find((n) => n.code === active) ?? null;
  const pos = current ? POSITIONS[current.code] : null;

  return (
    <div className="relative mx-auto w-full max-w-156.5" data-testid="demand-map">
      <svg
        viewBox="0 0 460 640"
        className="h-auto w-full overflow-visible"
        aria-labelledby={titleId}
      >
        <title id={titleId}>{title}</title>
        <g aria-hidden="true">
          {PROVINCES.map((points) => (
            <polygon key={points} points={points} className="vj-map-land" />
          ))}
          {placed
            .filter((n) => n.code !== "SEOUL")
            .map((n) => {
              const [x, y] = POSITIONS[n.code];
              return (
                <path
                  key={n.code}
                  d={`M${ORIGIN[0]},${ORIGIN[1]} Q${(ORIGIN[0] + x) / 2},${Math.min(ORIGIN[1], y) - 20} ${x},${y}`}
                  className="vj-map-link"
                />
              );
            })}
        </g>
        {placed.map((n) => {
          const [x, y] = POSITIONS[n.code];
          return (
            <g
              key={n.code}
              tabIndex={0}
              role="img"
              aria-label={`${n.label}: ${rowCountLabel} ${n.countText}, ${rowPayLabel} ${n.payText}`}
              className="vj-map-region cursor-pointer"
              onMouseEnter={() => setActive(n.code)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(n.code)}
              onBlur={() => setActive(null)}
              data-testid={`demand-node-${n.code}`}
            >
              <circle cx={x} cy={y} r={12} fill="transparent" className="vj-map-ring" />
              <circle
                cx={x}
                cy={y}
                r={n.hasData ? 4.4 : 3.2}
                className={cn("vj-map-node", n.hasData && "vj-map-node--data")}
              />
              <text x={x} y={y - 14} textAnchor="middle" className="vj-map-label">
                {n.label}
              </text>
            </g>
          );
        })}
      </svg>
      {current && pos ? (
        <div
          role="status"
          className="pointer-events-none absolute z-10 -mt-4 min-w-49 -translate-x-1/2 -translate-y-full rounded-md bg-white px-4 py-3 text-navy shadow-3"
          style={{ left: `${(pos[0] / 460) * 100}%`, top: `${(pos[1] / 640) * 100}%` }}
        >
          <strong className="block text-caption font-bold">{current.label}</strong>
          <span className="mt-2 grid gap-1 text-caption text-n700">
            <span className="flex justify-between gap-3.5">
              {rowCountLabel}
              <b className="font-semibold text-navy tabular-nums">{current.countText}</b>
            </span>
            <span className="flex justify-between gap-3.5">
              {rowPayLabel}
              <b className="font-semibold text-navy tabular-nums">{current.payText}</b>
            </span>
          </span>
        </div>
      ) : null}
    </div>
  );
}
