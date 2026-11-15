/**
 * Industry seed — 한국표준산업분류(KSIC) 대분류 21개 (A~U).
 * Section names follow KSIC 10th revision as recalled by the agent.
 * TODO(operator): confirm against the current Statistics Korea revision (11차 개정 반영 여부) and edit
 * names in the admin screen if they differ. Codes A~U are used as Industry.code.
 */
import type { PrismaClient } from "@prisma/client";

export const INDUSTRIES: { code: string; nameKo: string }[] = [
  { code: "A", nameKo: "농업, 임업 및 어업" },
  { code: "B", nameKo: "광업" },
  { code: "C", nameKo: "제조업" },
  { code: "D", nameKo: "전기, 가스, 증기 및 공기 조절 공급업" },
  { code: "E", nameKo: "수도, 하수 및 폐기물 처리, 원료 재생업" },
  { code: "F", nameKo: "건설업" },
  { code: "G", nameKo: "도매 및 소매업" },
  { code: "H", nameKo: "운수 및 창고업" },
  { code: "I", nameKo: "숙박 및 음식점업" },
  { code: "J", nameKo: "정보통신업" },
  { code: "K", nameKo: "금융 및 보험업" },
  { code: "L", nameKo: "부동산업" },
  { code: "M", nameKo: "전문, 과학 및 기술 서비스업" },
  { code: "N", nameKo: "사업시설 관리, 사업 지원 및 임대 서비스업" },
  { code: "O", nameKo: "공공 행정, 국방 및 사회보장 행정" },
  { code: "P", nameKo: "교육 서비스업" },
  { code: "Q", nameKo: "보건업 및 사회복지 서비스업" },
  { code: "R", nameKo: "예술, 스포츠 및 여가관련 서비스업" },
  { code: "S", nameKo: "협회 및 단체, 수리 및 기타 개인 서비스업" },
  { code: "T", nameKo: "가구 내 고용활동 및 달리 분류되지 않은 자가 소비 생산활동" },
  { code: "U", nameKo: "국제 및 외국기관" },
];

export async function seedIndustries(prisma: PrismaClient): Promise<number> {
  for (const [i, ind] of INDUSTRIES.entries()) {
    const data = {
      nameKo: ind.nameKo,
      nameKey: `common.industry.${ind.code.toLowerCase()}`,
      sortOrder: i + 1,
    };
    await prisma.industry.upsert({
      where: { code: ind.code },
      create: { code: ind.code, ...data },
      update: {},
    });
  }
  return INDUSTRIES.length;
}
