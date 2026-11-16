/** P1d employer fixtures: a company + EMPLOYER account, reference codes from the seed. */
import { db } from "@/lib/db";
import type { EmployerActor } from "@/lib/employer/session";

import { uniq } from "../../db/helpers";

export async function seededRefs() {
  const sigungu = await db.region.findFirstOrThrow({
    where: { level: "SIGUNGU", parentCode: { not: null } },
    orderBy: { code: "asc" },
    select: { code: true, parentCode: true, depopulationArea: true },
  });
  const industry = await db.industry.findFirstOrThrow({ select: { code: true } });
  return {
    sido: sigungu.parentCode as string,
    sigungu: sigungu.code,
    depopulationArea: sigungu.depopulationArea,
    industryCode: industry.code,
  };
}

export async function createEmployer(): Promise<EmployerActor> {
  const refs = await seededRefs();
  const user = await db.user.create({
    data: {
      role: "EMPLOYER",
      email: `${uniq("employer")}@example.test`,
      company: {
        create: { nameEnc: "원래 회사명", industryCode: refs.industryCode, sido: refs.sido },
      },
    },
    select: { id: true, companyId: true },
  });
  return { id: user.id, companyId: user.companyId as string };
}
