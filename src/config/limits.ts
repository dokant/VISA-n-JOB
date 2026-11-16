// Operating numbers (STANDARD 4.2 / 4.9, DECISIONS SC-05). These are operator settings, not legal
// values (BR-12). Keep every tunable number of the app here so it can be found and reviewed in one
// place (S-53).

/** R-117 / WO §8.4: demand map looks back this many days. */
export const DEMAND_WINDOW_DAYS = 30;

/** R-117 / WO §8.4 / WO §15-10: cells with fewer samples than this are shown as "자료 부족". */
export const DEMAND_MIN_SAMPLE = 5;

/** R-117: the median offered pay is shown as a band of this width (KRW), never as an exact value. */
export const DEMAND_PAY_BAND_STEP_KRW = 100_000;

/** R-117 / BR-04: lead grades that feed the aggregate (ARCHIVED and DO_NOT_CONTACT are excluded). */
export const DEMAND_LEAD_GRADES = ["C", "B", "A"] as const;
