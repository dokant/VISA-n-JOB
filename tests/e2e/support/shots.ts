import path from "node:path";

import type { Locator, Page, TestInfo } from "@playwright/test";

/**
 * QA evidence screenshots (N-04): only when `P2B_SHOTS=<dir>` is set, saved as
 * `p2b_r2_{name}_{1280|375}.png`. A locator saves just that element (readable at full size).
 */
export async function p2bShot(
  target: Page | Locator,
  info: TestInfo,
  name: string,
  only?: "desktop-chromium" | "mobile-375",
) {
  const dir = process.env.P2B_SHOTS;
  if (!dir || (only && info.project.name !== only)) return;
  const width = info.project.name === "mobile-375" ? "375" : "1280";
  const file = path.join(dir, `p2b_r2_${name}_${width}.png`);
  if ("goto" in target) await target.screenshot({ path: file, fullPage: true });
  else await target.screenshot({ path: file });
}
