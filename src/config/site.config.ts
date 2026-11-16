// Operator information (WO §13, R-015, STANDARD v2 4.2 / 3.2 SiteFooter, DECISIONS Q-06 / Q-07 / PC-7).
// Source of the defaults: .workflow/SITE_INFO.md (provided by the operator, 2026-11-16).
// Every value can be overridden by an env var (SITE_*); an empty env var falls back to the default.
//
// Not stored here on purpose (DECISIONS Q-06):
// - Bank account details: never shown publicly and never kept in the repository.
// - The representative's mobile number: not for public screens. If needed internally, set
//   SITE_OPERATOR_MOBILE in .env (read only through getInternalContact(), never rendered publicly).
type Env = Readonly<Record<string, string | undefined>>;

export type Brand = {
  /** Latin wordmark shown next to the logo mark (Q-07). */
  wordmark: string;
  /** Korean brand name used in Korean copy (Q-07). */
  nameKo: string;
  /** Optional small label next to the wordmark (handoff "GLOBAL TALENT" slot). Empty = hidden. */
  tagline: string;
};

/** 행정사 사무소 */
export type AdminScrivenerOffice = {
  /** 상호 */
  name: string;
  /** 대표자 */
  representative: string;
  /** 사업자등록번호 */
  businessRegNo: string;
  /** 행정사 등록번호 */
  adminScrivenerRegNo: string;
  /** 주소 */
  address: string;
  /** 대표전화 */
  phone: string;
};

/** 유료직업소개소 */
export type JobPlacementAgency = {
  /** 상호 */
  name: string;
  /** 대표자 */
  representative: string;
  /** 직업소개사업 등록번호 */
  jobPlacementRegNo: string;
  /** 주소 */
  address: string;
  /** 대표전화 */
  phone: string;
};

/** Operator-entered performance metric for the home "trust metrics" section (PC-7). */
export type OperatorMetric = {
  /** messages key segment for the label, e.g. "placements" -> public.home.metrics.placements.label */
  key: string;
  value: number;
  /** Optional unit suffix (e.g. "+", "%"); rendered as-is. */
  suffix?: string;
};

export type SiteConfig = {
  brand: Brand;
  adminScrivenerOffice: AdminScrivenerOffice;
  jobPlacementAgency: JobPlacementAgency;
  /** Public operator contact (BR-01 allows contacting the operator). Empty = not shown. */
  contact: { phone: string; email: string };
  /**
   * PC-7: performance numbers come only from the operator. Empty list = the metrics area is not
   * rendered. Never put example or estimated numbers here.
   */
  metrics: readonly OperatorMetric[];
  /** 수수료표 경로 (locale prefix is added by the router) */
  feesPath: string;
  /**
   * Absolute origin used for canonical URLs, hreflang, sitemap and JSON-LD (R-130).
   * Set SITE_URL in production. Default is the local production server.
   */
  siteUrl: string;
};

export const SITE_DEFAULTS = {
  brandWordmark: "VISA n JOB",
  brandNameKo: "비자앤잡",
  brandTagline: "",
  representative: "정충교",
  address: "서울특별시 송파구 법원로9길 26 에이치비즈니스파크 C동 1층 128호",
  phone: "02-6281-8901",
  email: "",
  adminScrivenerOfficeName: "코리아비자행정사사무소",
  businessRegNo: "748-39-01213",
  adminScrivenerRegNo: "24-SU-RG-042",
  jobPlacementName: "비자앤잡 유료직업소개소",
  jobPlacementRegNo: "제2026-3230291-14-5-00014호",
  siteUrl: "http://localhost:3000",
} as const;

/** PC-7: no operator-entered metrics yet. */
const OPERATOR_METRICS: readonly OperatorMetric[] = [];

function pick(env: Env, key: string, fallback: string): string {
  const value = env[key]?.trim();
  return value ? value : fallback;
}

export function getSiteConfig(env: Env = process.env): SiteConfig {
  const representative = pick(env, "SITE_REPRESENTATIVE", SITE_DEFAULTS.representative);
  const address = pick(env, "SITE_ADDRESS", SITE_DEFAULTS.address);
  const phone = pick(env, "SITE_PHONE", SITE_DEFAULTS.phone);

  return {
    brand: {
      wordmark: pick(env, "SITE_BRAND_WORDMARK", SITE_DEFAULTS.brandWordmark),
      nameKo: pick(env, "SITE_BRAND_NAME_KO", SITE_DEFAULTS.brandNameKo),
      tagline: pick(env, "SITE_BRAND_TAGLINE", SITE_DEFAULTS.brandTagline),
    },
    adminScrivenerOffice: {
      name: pick(env, "SITE_ADMIN_SCRIVENER_OFFICE_NAME", SITE_DEFAULTS.adminScrivenerOfficeName),
      representative,
      businessRegNo: pick(env, "SITE_BUSINESS_REG_NO", SITE_DEFAULTS.businessRegNo),
      adminScrivenerRegNo: pick(
        env,
        "SITE_ADMIN_SCRIVENER_REG_NO",
        SITE_DEFAULTS.adminScrivenerRegNo,
      ),
      address,
      phone,
    },
    jobPlacementAgency: {
      name: pick(env, "SITE_JOB_PLACEMENT_NAME", SITE_DEFAULTS.jobPlacementName),
      representative,
      jobPlacementRegNo: pick(env, "SITE_JOB_PLACEMENT_REG_NO", SITE_DEFAULTS.jobPlacementRegNo),
      address,
      phone,
    },
    contact: {
      phone,
      email: pick(env, "SITE_EMAIL", SITE_DEFAULTS.email),
    },
    metrics: OPERATOR_METRICS,
    feesPath: "/fees",
    siteUrl: pick(env, "SITE_URL", SITE_DEFAULTS.siteUrl).replace(/\/+$/, ""),
  };
}

/** Internal-only operator contact (Q-06). Never render this on public screens. */
export function getInternalContact(env: Env = process.env): { mobilePhone: string } {
  return { mobilePhone: pick(env, "SITE_OPERATOR_MOBILE", "") };
}

export const siteConfig: SiteConfig = getSiteConfig();
