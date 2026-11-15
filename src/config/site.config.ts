// Operator information shown in the footer (WO §13, R-015).
// Values come from env vars; the bracketed defaults are placeholders until the operator provides real values.
type Env = Readonly<Record<string, string | undefined>>;

export type SiteConfig = {
  /** Service brand */
  serviceName: string;
  /** 행정사 사무소명 */
  adminScrivenerOfficeName: string;
  /** 행정사 등록번호 */
  adminScrivenerRegNo: string;
  /** 유료직업소개사업 등록번호 */
  jobPlacementRegNo: string;
  /** 대표자 */
  representative: string;
  /** 사무소 주소 */
  address: string;
  /** 수수료표 경로 (locale prefix is added by the router) */
  feesPath: string;
};

const PLACEHOLDER = {
  serviceName: "비자앤잡",
  adminScrivenerOfficeName: "[행정사 사무소명 미정]",
  adminScrivenerRegNo: "[행정사 등록번호 미정]",
  jobPlacementRegNo: "[직업소개사업 등록번호 미정]",
  representative: "[대표자 미정]",
  address: "[주소 미정]",
} as const;

function pick(env: Env, key: string, fallback: string): string {
  const value = env[key]?.trim();
  return value ? value : fallback;
}

export function getSiteConfig(env: Env = process.env): SiteConfig {
  return {
    serviceName: pick(env, "SITE_SERVICE_NAME", PLACEHOLDER.serviceName),
    adminScrivenerOfficeName: pick(
      env,
      "SITE_ADMIN_SCRIVENER_OFFICE_NAME",
      PLACEHOLDER.adminScrivenerOfficeName,
    ),
    adminScrivenerRegNo: pick(env, "SITE_ADMIN_SCRIVENER_REG_NO", PLACEHOLDER.adminScrivenerRegNo),
    jobPlacementRegNo: pick(env, "SITE_JOB_PLACEMENT_REG_NO", PLACEHOLDER.jobPlacementRegNo),
    representative: pick(env, "SITE_REPRESENTATIVE", PLACEHOLDER.representative),
    address: pick(env, "SITE_ADDRESS", PLACEHOLDER.address),
    feesPath: "/fees",
  };
}

export const siteConfig: SiteConfig = getSiteConfig();
