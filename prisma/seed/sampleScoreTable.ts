// SAMPLE — 실제 법령 수치 아님 (BR-12)
/**
 * ScoreTable SAMPLE row for the E-7-4 calculator (R-127). It shows the *structure* only:
 * items → bands → points. Item keys/labels are "SAMPLE" placeholders and every point value is 0,
 * passScore is null — nothing here is a real criterion or score.
 * isSample=true, status=DRAFT → /score/e74 shows "준비 중" until an admin publishes a real table.
 * TODO(행정사): enter the real table and PUBLISH it in the admin screen (R-215, PLAN A-6).
 */
import type { PrismaClient } from "@prisma/client";

export const SAMPLE_SCORE_TABLE = {
  id: "sample-score-e74-1",
  name: "E-7-4",
  version: 1,
  passScore: null,
  items: {
    __sample: true,
    items: [
      {
        key: "sampleItemA",
        label: "SAMPLE 항목 A",
        bands: [
          { key: "sampleBand1", label: "SAMPLE 구간 1", points: 0 },
          { key: "sampleBand2", label: "SAMPLE 구간 2", points: 0 },
        ],
      },
      {
        key: "sampleItemB",
        label: "SAMPLE 항목 B",
        bands: [{ key: "sampleBand1", label: "SAMPLE 구간 1", points: 0 }],
      },
    ],
  },
} as const;

export async function seedSampleScoreTable(prisma: PrismaClient): Promise<number> {
  const t = SAMPLE_SCORE_TABLE;
  await prisma.scoreTable.upsert({
    where: { id: t.id },
    create: {
      id: t.id,
      name: t.name,
      version: t.version,
      items: t.items,
      passScore: t.passScore,
      status: "DRAFT",
      isSample: true,
    },
    update: {},
  });
  return 1;
}
