/**
 * pnpm db:seed — R-007.
 * Seeds reference data. Existing rows are never overwritten (admins may have edited them):
 * every seed uses upsert with an empty update.
 *   regions (PC-6 draft, isSample + needsReview), industries (KSIC 대분류),
 *   visaTypes (WO §7.4 operating map), sampleRules / sampleScoreTable (SAMPLE, DRAFT, BR-12),
 *   dev admin account only when SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are set (PC-15).
 */
import path from "node:path";

import { hash } from "@node-rs/argon2";
import { PrismaClient } from "@prisma/client";

import { seedIndustries } from "./industries";
import { seedRegions } from "./regions";
import { seedSampleRules } from "./sampleRules";
import { seedSampleScoreTable } from "./sampleScoreTable";
import { seedVisaTypes } from "./visaTypes";

export type SeedSummary = {
  regions: number;
  industries: number;
  visaTypes: number;
  sampleRules: number;
  sampleScoreTables: number;
  admin: "created" | "exists" | "skipped";
};

async function seedAdmin(prisma: PrismaClient): Promise<SeedSummary["admin"]> {
  const email = process.env.SEED_ADMIN_EMAIL?.trim();
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) return "skipped";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return "exists";
  await prisma.user.create({
    data: { role: "ADMIN", email, password: await hash(password), displayName: "관리자" },
  });
  return "created";
}

export async function runSeed(prisma: PrismaClient): Promise<SeedSummary> {
  return {
    regions: await seedRegions(prisma),
    industries: await seedIndustries(prisma),
    visaTypes: await seedVisaTypes(prisma),
    sampleRules: await seedSampleRules(prisma),
    sampleScoreTables: await seedSampleScoreTable(prisma),
    admin: await seedAdmin(prisma),
  };
}

async function main(): Promise<void> {
  const envFile = path.resolve(process.cwd(), ".env");
  try {
    process.loadEnvFile(envFile);
  } catch {
    // no .env: rely on the process environment
  }
  const prisma = new PrismaClient();
  try {
    const summary = await runSeed(prisma);
    console.log("[seed]", JSON.stringify(summary));
  } finally {
    await prisma.$disconnect();
  }
}

// Run only when executed directly (tsx prisma/seed/index.ts), not when imported by tests.
if (/prisma[\\/]seed[\\/]index\.ts$/.test(process.argv[1] ?? "")) {
  main().catch((e: unknown) => {
    console.error("[seed] failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
