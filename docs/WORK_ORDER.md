# 비자앤잡(Visa&Job) 홈페이지 구축 작업지시서

> **문서 버전:** v1.0
> **운영 주체:** 코리아비자 행정사사무소 + 비자앤잡 유료직업소개소
> **대상 실행자:** Claude Code
> **작업 원칙:** 이 문서의 비즈니스 규칙(§2)은 기술적 편의보다 우선한다. 규칙과 구현이 충돌하면 구현을 멈추고 질문한다.

---

## 1. 프로젝트 개요

### 1.1 목적
외국인 구직자, 구인기업, 지역 직업소개소를 대상으로 하는 **폐쇄형 중개 플랫폼**을 만든다. 홈페이지는 사람들이 서로 만나는 장소가 아니다. **운영자(행정사와 직업소개소)에게 의뢰를 접수하는 창구**다. 실제 매칭, 면접 주선, 체류자격 변경은 운영자가 내부 관리 시스템에서 처리한다.

### 1.2 사업 흐름
```
비자 진단·상담(유입) → 구직 등록 → 운영자 검증(등급) → 블라인드 추천
→ 면접 주선(직업소개소) → 근로계약 → 체류자격 변경 수임(행정사) → 체류 관리
```

### 1.3 사용자 유형
| 코드 | 사용자 | 주요 행동 |
|---|---|---|
| `SEEKER` | 구직 외국인 | 비자 진단, 구직 등록, 추천 일자리 열람, 면접 신청 |
| `EMPLOYER` | 구인기업 | 채용 진단, 구인 의뢰, 블라인드 후보 열람, 면접 요청 |
| `AGENCY` | 지역 직업소개소 | 비자 업무 의뢰만 가능 (인재·구인 정보 열람 불가) |
| `STAFF_PLACEMENT` | 직업소개 담당자 | 구인 리드 관리, 전화 확인, 추천, 면접 주선 |
| `STAFF_VISA` | 행정사·직원 | 구직자 검증, 전환 가능성 판정, 체류 사건 관리, 규칙 DB 관리 |
| `ADMIN` | 관리자 | 전체 권한, 감사 로그 열람 |

---

## 2. 핵심 비즈니스 규칙 (절대 위반 금지)

| ID | 규칙 |
|---|---|
| **BR-01** | 구직자와 기업 사이에는 **직접 연락 수단을 일절 제공하지 않는다.** 채팅, 연락처 열람, 이메일 전달, 외부 링크 공유 기능 모두 금지 |
| **BR-02** | 기업에게 보여 주는 구직자 정보는 **§7.3 블라인드 화이트리스트 필드만** 내보낸다. 이 제한은 서버 직렬화 단계에서 강제한다 (프론트에서 숨기는 방식 금지) |
| **BR-03** | 구직자에게 보여 주는 구인 정보에는 회사명, 상세 주소, 담당자, 연락처, 사업자번호를 넣지 않는다 |
| **BR-04** | 구인 리드 C·B등급은 **개별 공고로 공개하지 않는다.** 시·도 × 업종 단위 집계(수요 지도)로만 쓰고, 고지 문구를 반드시 함께 표시한다 |
| **BR-05** | 개별 블라인드 공고(`JobPosting`)는 **A등급(구인신청 접수와 직원 검증 완료)** 리드에서만 생성할 수 있다. `verifiedBy`와 `verifiedAt`이 없으면 공개할 수 없다 |
| **BR-06** | 기업 화면에는 등급 **S·A**이고 트랙이 `JOB_MATCH`이며 구직 상태가 활성인 구직자만 노출한다 |
| **BR-07** | E-9·E-10 구직자는 `FUTURE_POOL` 트랙으로 분류하고 기업에 노출하지 않는다 (비자 상담 고객으로 관리) |
| **BR-08** | 유효한 체류자격이 없거나 취업이 불가능한 체류자격(B-1, B-2, C-3 등)이면 구직 등록을 완료할 수 없다. 대신 상담 신청으로 안내한다 |
| **BR-09** | 추천 이력(`Recommendation`)은 **수정·삭제가 불가능한 원장**이다. 앱 계층과 DB 권한 양쪽에서 막는다 |
| **BR-10** | 구직자에게 소개요금을 받지 않는다. 화면에 "구직자 이용료 없음"을 표시한다 |
| **BR-11** | 비자 판정이나 점수 결과는 **규칙 DB와 점수표 DB**에서만 계산한다. LLM이 법적 판단을 생성하게 하지 않는다. 모든 결과에 "참고용, 행정사 확인 필요" 문구를 붙인다 |
| **BR-12** | 법령 요건, 점수 배점, 체류자격별 허용 업종을 **Claude Code가 임의로 만들어 넣지 않는다.** 시드 데이터에는 `SAMPLE` 표시를 붙이고 `status=DRAFT`로 넣는다 |
| **BR-13** | 외국인등록번호와 여권번호는 **구직 등록 단계에서 수집하지 않는다.** 체류 사건 위임 단계에서만 별도 동의를 받고 수집한다 (Phase 3) |
| **BR-14** | 기업 측 자유 입력란(구인 의뢰 상세 등)은 연락처 패턴(전화, 이메일, URL, 메신저 ID)을 탐지해 저장 전에 거부하거나 마스킹한다. 구직자 자유 입력란은 기업에 노출하지 않는다 |
| **BR-15** | 개인정보 열람, 내보내기, 등급 변경, 추천, 공고 공개는 모두 감사 로그(`AuditLog`)에 기록한다 |

---

## 3. 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | Next.js 15 (App Router), TypeScript strict | |
| UI | Tailwind CSS, shadcn/ui, lucide-react | 모바일 우선 |
| 폼 | react-hook-form + zod | 스키마를 서버와 클라이언트가 공유 |
| 다국어 | next-intl | `/[locale]/...` 라우팅, hreflang 출력 |
| DB | PostgreSQL + Prisma | **서울 리전 호스팅 전제** (개인정보 국외이전 회피) |
| 인증 | Auth.js | 구직자는 휴대폰 OTP, 기업·직원은 이메일과 비밀번호. 직원은 2FA(TOTP) |
| 암호화 | 앱 레벨 AES-256-GCM (`lib/crypto.ts`) | 키는 환경변수. 이름·연락처·메신저 ID·사업자번호 암호화 |
| 알림 | `NotificationProvider` 인터페이스 | MVP: 이메일과 콘솔. 이후 카카오 알림톡, WhatsApp, Zalo, Telegram 어댑터 |
| 작업 큐 | pg-boss (Postgres 기반) | 만료 알림, 상태 갱신 알림, 리드 자동 보관 |
| 테스트 | Vitest (단위), Playwright (E2E) | |
| 품질 | ESLint, Prettier, Husky pre-commit | |

---

## 4. 디렉터리 구조

```
/
├─ CLAUDE.md
├─ docs/WORK_ORDER.md
├─ prisma/
│  ├─ schema.prisma
│  └─ seed/ (visaTypes.ts, industries.ts, regions.ts, sampleRules.ts, sampleScoreTable.ts)
├─ messages/ (ko.json, en.json, vi.json, ru.json, zh.json, uz.json)
├─ src/
│  ├─ app/
│  │  ├─ [locale]/
│  │  │  ├─ (public)/            # 메인, 비자 정보센터, 수요 지도, 회사 소개, 수수료
│  │  │  ├─ seeker/              # 등록 위저드, 마이페이지, 추천 일자리
│  │  │  ├─ employer/            # 채용 진단, 구인 의뢰, 후보 열람
│  │  │  └─ agency/              # 비자 업무 의뢰
│  │  ├─ admin/                  # 내부 관리 시스템 (한국어 전용)
│  │  └─ api/
│  │     ├─ ingest/job-leads/    # 수집 에이전트용 엔드포인트
│  │     └─ ...
│  ├─ components/ (ui/, forms/, seeker/, employer/, admin/)
│  ├─ lib/
│  │  ├─ crypto.ts
│  │  ├─ rbac.ts
│  │  ├─ audit.ts
│  │  ├─ pii-guard.ts            # 연락처 패턴 탐지
│  │  ├─ serializers/            # 블라인드 직렬화 (화이트리스트)
│  │  ├─ visa-engine/            # 규칙 엔진, 트랙 분류
│  │  ├─ score/                  # E-7-4 점수 계산기 (DB 점수표 기반)
│  │  └─ notifications/
│  └─ schemas/                   # zod 스키마 (등록 위저드 단계별)
└─ tests/ (unit/, e2e/)
```

---

## 5. 데이터 모델 (Prisma 초안)

> Claude Code는 아래 초안을 기준으로 구현한다. 필드를 추가해도 되지만 §2 규칙을 깨는 변경은 하지 않는다. `Enc` 접미사가 붙은 필드는 암호화한 값을 저장한다.

```prisma
enum Role { SEEKER EMPLOYER AGENCY STAFF_PLACEMENT STAFF_VISA ADMIN }
enum SeekerTrack { JOB_MATCH FUTURE_POOL CONSULT_ONLY }
enum SeekerGrade { B A S }
enum JobSearchStatus { IMMEDIATE WITHIN_1M EMPLOYED_OPEN NOT_SEARCHING }
enum SeekerStatus { ACTIVE INACTIVE EMPLOYED BLOCKED }
enum LeadGrade { C B A ARCHIVED DO_NOT_CONTACT }
enum PostingStatus { DRAFT PUBLISHED CLOSED }
enum RuleStatus { DRAFT PUBLISHED RETIRED }
enum Outcome { GREEN YELLOW RED }

model User {
  id         String   @id @default(cuid())
  role       Role
  phoneEnc   String?
  phoneHash  String?  @unique      // 조회용 HMAC
  email      String?  @unique
  password   String?
  totpSecret String?
  locale     String   @default("ko")
  createdAt  DateTime @default(now())
  seeker     SeekerProfile?
  consents   Consent[]
}

model SeekerProfile {
  id               String   @id @default(cuid())
  userId           String   @unique
  user             User     @relation(fields: [userId], references: [id])
  // 기본
  legalNameEnc     String
  messengerType    String?            // KAKAO|ZALO|WHATSAPP|TELEGRAM|WECHAT|VIBER|NONE
  messengerIdEnc   String?
  emailEnc         String?
  birthYear        Int?               // 내부 전용
  gender           String?            // 내부 전용(숙소 배정), 선택
  nationality      String             // ISO 3166-1 alpha-2
  sido             String
  sigungu          String?
  // 체류
  visaCode         String             // 예: F-4, E-7-4, D-10
  visaSubType      String?
  stayExpiry       DateTime?
  entryYear        Int?
  hasArc           Boolean
  pendingApplication Boolean @default(false)
  // 학력
  educationLevel   String?
  major            String?
  schoolNameEnc    String?
  graduationDate   DateTime?
  // 언어
  topikLevel       Int?               // 0=없음, 1~6
  kiipStage        Int?               // 0~5, 이수 단계
  koreanSpeaking   Int                // 1~4 자가평가
  otherLanguages   Json?
  // 역량
  skills           String[]
  licenses         String[]
  // 희망
  desiredIndustries String[]
  desiredRegions   String[]           // "ANY" 허용
  needDormitory    Boolean
  shiftOk          Boolean
  desiredPayMin    Int?
  availableFrom    DateTime?
  jobSearchStatus  JobSearchStatus
  groupApply       Boolean @default(false)
  groupFriendCode  String?
  // 비자 목표
  nextVisaGoal     String?            // 예: E-7-4, F-2-R, F-5, UNKNOWN
  wantsConsult     Boolean @default(false)
  // 운영 판정
  track            SeekerTrack
  grade            SeekerGrade @default(B)
  verifiedVisa     Boolean @default(false)
  verifiedKorean   Boolean @default(false)
  consultedAt      DateTime?
  convertibleVisa  String?            // 행정사 판정
  convertibleAt    DateTime?          // 전환 가능 예상 시점
  status           SeekerStatus @default(ACTIVE)
  lastActiveConfirmedAt DateTime @default(now())
  noShowCount      Int @default(0)
  // 유입
  referralCode     String   @unique
  referredByCode   String?
  sourceChannel    String?            // QR_xxx, FB_VN, UNIV_xxx, LEGACY_CLIENT 등
  isQuickSignup    Boolean @default(false)
  completedStep    Int @default(0)
  experiences      WorkExperience[]
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

model WorkExperience {
  id            String @id @default(cuid())
  seekerId      String
  seeker        SeekerProfile @relation(fields: [seekerId], references: [id])
  country       String           // KR 또는 본국
  industryCode  String
  role          String
  months        Int
  employerNameEnc String?        // 내부 전용
}

model Consent {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  type      String   // PRIVACY_REQUIRED|BLIND_PROFILE|MARKETING|THIRD_PARTY_INTERVIEW|...
  version   String
  locale    String
  agreedAt  DateTime @default(now())
  revokedAt DateTime?
  ipHash    String?
}

model Company {
  id            String  @id @default(cuid())
  nameEnc       String
  bizRegNoEnc   String?
  bizRegNoHash  String? @unique
  industryCode  String
  sido          String
  sigungu       String?
  employeeCount Int?
  verified      Boolean @default(false)
  contractSignedAt DateTime?     // 구인 서비스 계약
  visaMandateAgreed Boolean @default(false)
}

model JobLead {
  id            String    @id @default(cuid())
  source        String    // WORK24_API|AGENT|MANUAL
  sourceRef     String    @unique
  companyName   String
  bizRegNo      String?
  industryCode  String?
  sido          String
  sigungu       String?
  title         String
  payMin        Int?
  payMax        Int?
  postedAt      DateTime?
  closesAt      DateTime?
  depopulationArea Boolean @default(false)
  grade         LeadGrade @default(C)
  foreignIntent Boolean?
  nextActionAt  DateTime?
  companyId     String?
  rawJson       Json
  createdAt     DateTime  @default(now())
  archivedAt    DateTime?
  callLogs      CallLog[]
}

model CallLog {
  id       String   @id @default(cuid())
  leadId   String
  lead     JobLead  @relation(fields: [leadId], references: [id])
  staffId  String
  outcome  String   // NO_ANSWER|NO_INTENT|INTERESTED|REQUEST_RECEIVED|DNC
  note     String?
  at       DateTime @default(now())
}

model JobPosting {
  id            String  @id @default(cuid())
  companyId     String
  leadId        String?
  blindTitle    String
  industryCode  String
  sido          String
  sigungu       String?
  role          String
  payMin        Int
  payMax        Int?
  overtimeNote  String?
  dormitory     String   // NONE|FREE|PAID
  meals         String?
  shift         String?
  headcount     Int
  eligibleVisas String[]
  status        PostingStatus @default(DRAFT)
  verifiedBy    String?
  verifiedAt    DateTime?
  publishedAt   DateTime?
}

model InterestRequest {          // 구직자 "면접 신청" / 기업 "면접 요청" 접수
  id         String   @id @default(cuid())
  initiator  String   // SEEKER|EMPLOYER
  seekerId   String
  postingId  String?
  companyId  String?
  status     String   @default("RECEIVED")
  createdAt  DateTime @default(now())
}

model Recommendation {           // 수정·삭제 불가 원장 (BR-09)
  id            String   @id @default(cuid())
  seekerId      String
  companyId     String
  postingId     String?
  staffId       String
  recommendedAt DateTime @default(now())
  note          String?
}

model Interview {
  id               String   @id @default(cuid())
  recommendationId String
  scheduledAt      DateTime
  place            String
  interpreter      String?
  attended         Boolean?
  result           String?  // HIRED|REJECTED|PENDING|NO_SHOW
  introConfirmFile String?  // 소개 확인서 서명본
}

model Placement {
  id               String   @id @default(cuid())
  recommendationId String   @unique
  contractDate     DateTime
  monthlyWage      Int
  feeAmount        Int
  feeStatus        String
}

model VisaCase {
  id            String   @id @default(cuid())
  seekerId      String
  companyId     String?
  caseType      String   // CHANGE|EXTEND|REPORT|OTHER
  targetVisa    String?
  status        String
  mandateSignedAt DateTime?
  fee           Int?
  createdAt     DateTime @default(now())
}

model VisaRule {
  id           String     @id @default(cuid())
  visaCode     String
  industryCode String?
  conditions   Json
  outcome      Outcome
  messageKey   String
  version      Int
  status       RuleStatus @default(DRAFT)
  isSample     Boolean    @default(true)
  reviewedBy   String?
  reviewedAt   DateTime?
}

model ScoreTable {
  id          String     @id @default(cuid())
  name        String     // E-7-4
  version     Int
  items       Json       // 항목·구간·배점 (행정사 입력)
  passScore   Int?
  status      RuleStatus @default(DRAFT)
  isSample    Boolean    @default(true)
}

model AgencyRequest {
  id        String   @id @default(cuid())
  agencyId  String
  summary   String
  visaCode  String?
  status    String   @default("RECEIVED")
  createdAt DateTime @default(now())
}

model AuditLog {
  id       String   @id @default(cuid())
  actorId  String
  action   String
  entity   String
  entityId String
  meta     Json?
  at       DateTime @default(now())
}
```

**추가 지시**
- `Recommendation`과 `AuditLog`는 DB 마이그레이션에서 UPDATE·DELETE를 금지한다. 트리거를 만들거나 앱 계정 권한을 제한한다.
- `phoneHash`와 `bizRegNoHash`는 HMAC-SHA256으로 만든다. 중복 가입 확인용이다.

---

## 6. 사이트맵과 라우트

### 6.1 공개 영역 (`/[locale]`)
| 경로 | 내용 |
|---|---|
| `/` | 메인: 대상 선택 3버튼, 즉시 비자 진단 위젯, 실적 지표, 수요 지도 미리보기, 수수료 공개 링크 |
| `/visa-check` | 비자 진단 (규칙 엔진) |
| `/score/e74` | E-7-4 점수 계산기 (결과 저장과 상세 해석은 등록 후 이용) |
| `/demand` | 지역 × 업종 구인 수요 지도 (C·B 집계, BR-04) |
| `/jobs` | 비자앤잡 추천 일자리 (A등급 블라인드 공고만) |
| `/guide/[slug]` | 비자 정보센터 (MDX, FAQ 스키마) |
| `/cases` | 체류자격 변경 사례 (비식별) |
| `/about`, `/fees`, `/privacy`, `/terms` | 회사 소개, 등록번호 공시, 수수료표, 약관 |

### 6.2 구직자 (`/[locale]/seeker`)
`/register` (위저드), `/register/quick` (간편 등록), `/me` (프로필, 등급, 진행 현황), `/me/recommended` (추천 일자리), `/me/stay` (체류 만료 알림 설정), `/me/referral` (내 추천 코드)

### 6.3 기업 (`/[locale]/employer`)
`/diagnosis` (무료 채용 진단), `/signup`, `/request` (구인 의뢰서), `/candidates` (블라인드 후보, 계약 기업 전용), `/requests` (면접 요청 현황), `/staff-visa` (재직 외국인 체류 현황, Phase 2)

### 6.4 협력 소개소 (`/[locale]/agency`)
`/signup` (직업소개사업 등록증 업로드, 승인제), `/request` (비자 업무 의뢰)

### 6.5 관리자 (`/admin`, 한국어 전용, 직원 2FA 필수)
| 화면 | 기능 |
|---|---|
| 대시보드 | 오늘 처리할 일: 신규 구직자, 전화 대상 리드, 면접 일정, 만료 임박 |
| 구직자 검토 큐 | 등급 B→A→S 승격, 트랙 변경, 전환 가능성 판정 입력 |
| 구인 리드 파이프라인 | 칸반(C/B/A/보관/재접촉금지), 통화 기록, 관심 구직자 수 표시 |
| 공고 관리 | A등급 리드에서 블라인드 공고 생성, 검증, 공개 |
| 매칭 | 공고별 적합 구직자 목록, 추천 실행(원장 기록), 면접 일정 |
| 계약·체류 사건 | Placement, VisaCase 관리 |
| 규칙 DB / 점수표 | 버전 관리, DRAFT→PUBLISHED (STAFF_VISA 이상, 검수자 기록) |
| 콘텐츠 | 사례, 가이드 메타 관리 |
| 감사 로그 | ADMIN 전용 |

---

## 7. 구직자 등록 화면 설계 (핵심)

### 7.1 UX 원칙
- 모바일 우선이다. 한 화면에 질문은 최대 7개, 전체 7단계에 소요 시간은 약 5분을 목표로 한다.
- 상단에 진행률 표시줄을 둔다. 단계마다 서버에 **자동 저장**한다(`completedStep`). 이탈 후 다시 들어오면 이어서 작성한다.
- 모든 선택형 질문에 "모름" 선택지를 제공한다. 비자 이름은 코드와 쉬운 설명을 함께 보여 준다(예: "F-4 재외동포").
- 아이콘과 짧은 문장을 쓰고, 한 번 고른 언어는 모든 단계에 적용한다.
- 각 단계 하단에 "이 정보는 기업에 공개되지 않습니다" 또는 "블라인드로 공개됩니다" 배지를 붙여 공개 여부를 투명하게 알린다.

### 7.2 진입 경로 두 가지
| 경로 | 용도 | 질문 |
|---|---|---|
| **간편 등록** `/register/quick` | QR 포스터, 현장 상담회, SNS 링크 | ① 언어 ② 현재 비자 ③ 거주 시·도 ④ 휴대폰(OTP) ⑤ 필수 동의 → `isQuickSignup=true`, 등급 B, 이후 "프로필 완성" 알림 발송 |
| **정식 등록** `/register` | 일반 | 아래 Step 0~7 |

URL 파라미터 `?ref=코드&src=채널`은 자동으로 `referredByCode`와 `sourceChannel`에 저장한다.

### 7.3 단계별 문항

**Step 0. 시작**
| 키 | 문항 | 유형 | 필수 | 기업 공개 |
|---|---|---|---|---|
| locale | 사용 언어 | 선택 | ✔ | - |
| phone | 휴대폰 번호 (국가코드) + OTP 인증 | 입력 | ✔ | ✘ |
| referralCode | 추천 코드 (있으면) | 입력 | - | ✘ |

**Step 1. 기본 정보**
| 키 | 문항 | 유형 | 필수 | 기업 공개 | 비고 |
|---|---|---|---|---|---|
| legalName | 이름 (여권 영문 표기) | 텍스트 | ✔ | ✘ | 암호화 |
| nationality | 국적 | 검색 선택 | ✔ | ✔ | |
| sido / sigungu | 현재 거주지 | 2단 선택 | ✔ / - | 시·도만 | |
| messengerType / messengerId | 연락받을 메신저 | 선택+입력 | - | ✘ | 카카오, Zalo, WhatsApp, Telegram, WeChat, Viber |
| email | 이메일 | 입력 | - | ✘ | |
| birthYear | 출생 연도 | 선택 | - | ✘ | 내부 전용 |
| gender | 성별 (숙소 배정용) | 선택 | - | ✘ | "응답 안 함" 포함, 내부 전용 |

**Step 2. 체류자격** (트랙 분기의 핵심)
| 키 | 문항 | 유형 | 필수 | 기업 공개 | 비고 |
|---|---|---|---|---|---|
| visaCode | 현재 비자 | 선택 | ✔ | ✔ | §7.4 분기 |
| visaSubType | 세부 유형 | 조건부 선택 | - | ✔ | E-7-x, F-2-x 등 |
| stayExpiry | 체류 만료일 (연·월) | 월 선택 | ✔ | 구간만 | 6개월 미만 / 6~12개월 / 1년 이상 |
| hasArc | 외국인등록증 보유 여부 | 예/아니오 | ✔ | ✘ | **번호 수집 금지** (BR-13) |
| entryYear | 한국 입국 연도 | 선택 | - | 체류 연수만 | |
| pendingApplication | 진행 중인 비자 신청 여부 | 예/아니오 | - | ✘ | |
| visaConfirm | "입력한 체류 정보가 사실임을 확인합니다" | 체크 | ✔ | - | |

**Step 3. 학력과 언어**
| 키 | 문항 | 유형 | 필수 | 기업 공개 |
|---|---|---|---|---|
| educationLevel | 최종 학력 | 선택 | ✔ | ✔ |
| major | 전공 | 텍스트 | - | ✔ (분야) |
| schoolName | 학교명 (한국 대학) | 텍스트 | - | ✘ |
| graduationDate | 졸업(예정)일 | 월 선택 | D-2·D-10은 필수 | ✔ |
| topikLevel | TOPIK 등급 | 선택 (없음~6급) | ✔ | ✔ |
| kiipStage | 사회통합프로그램 이수 단계 | 선택 (없음~5단계) | ✔ | ✔ |
| koreanSpeaking | 한국어 회화 수준 (4단계 예시 문장 제공) | 선택 | ✔ | ✔ |
| otherLanguages | 기타 가능 언어 | 다중 선택 | - | ✔ |

**Step 4. 경력과 기술**
| 키 | 문항 | 유형 | 필수 | 기업 공개 |
|---|---|---|---|---|
| experiences[] | 경력 (국가, 업종, 직무, 기간). 여러 개 추가 가능 | 반복 그룹 | - | 업종·직무·기간만 |
| experiences[].employerName | 회사명 | 텍스트 | - | ✘ |
| skills | 보유 기술 (지게차 운전, 용접, CNC, 전기, 도장, 조립, 포장, 요양, 조리, 운전, 컴퓨터 등) | 다중 선택 | - | ✔ |
| licenses | 자격증 (한국 운전면허, 지게차 면허, 용접 자격, 요양보호사 등) | 다중 선택+기타 | - | ✔ |

**Step 5. 희망 근무 조건**
| 키 | 문항 | 유형 | 필수 | 기업 공개 |
|---|---|---|---|---|
| jobSearchStatus | 구직 상태 (즉시 가능 / 1개월 내 / 재직 중 이직 고려 / 지금은 아님) | 선택 | ✔ | ✔ |
| availableFrom | 근무 시작 가능일 | 날짜 | 조건부 | ✔ |
| desiredIndustries | 희망 업종 (최대 3개) | 다중 선택 | ✔ | ✔ |
| desiredRegions | 희망 지역 (최대 3개, "어디든 가능") | 다중 선택 | ✔ | ✔ |
| needDormitory | 숙소 필요 여부 | 예/아니오 | ✔ | ✔ |
| shiftOk | 교대·야간 근무 가능 | 예/아니오/조건부 | ✔ | ✔ |
| desiredPayMin | 희망 최소 월급 (세전, 구간 선택) | 선택 | - | ✔ |
| groupApply | 친구와 함께 지원 희망 | 예/아니오 | - | ✔ ("동반 지원 희망 n명") |
| groupFriendCode | 친구 추천 코드 | 입력 | 조건부 | ✘ |

**Step 6. 비자 목표**
| 키 | 문항 | 유형 | 필수 | 기업 공개 |
|---|---|---|---|---|
| nextVisaGoal | 다음에 원하는 비자 (E-7-4, E-7-4R, F-2-R, F-5, F-4 전환, 모름 등) | 선택 | - | ✘ |
| wantsConsult | 무료 비자 경로 상담 신청 | 예/아니오 | - | ✘ |
| consultTime | 상담 가능 시간대 | 다중 선택 | 조건부 | ✘ |

**Step 7. 동의와 완료**
| 키 | 내용 | 필수 |
|---|---|---|
| PRIVACY_REQUIRED | 개인정보 수집·이용 (목적: 직업소개와 체류 상담, 보유기간 명시) | ✔ |
| BLIND_PROFILE | 실명·연락처를 제외한 블라인드 프로필을 기업에 제공하는 것에 동의 | ✔ (JOB_MATCH 트랙만) |
| MARKETING | 일자리·비자 소식 수신 (메신저, SMS) | - |
| NOTICE | "구직자 이용료 없음", "기업과의 연락은 비자앤잡을 통해서만 진행" 안내 확인 | ✔ |
| (참고) THIRD_PARTY_INTERVIEW | 면접이 확정되면 **건별로** 해당 기업에 실명과 연락처를 제공하는 데 대한 별도 동의 (면접 확정 시점에 받음) | - |

동의서 본문은 `messages/*.json`에 넣지 않는다. `content/consents/{type}/{version}/{locale}.md`로 관리하고, 동의할 때 `version`을 기록한다. 본문은 **[전문가 검토 필요]** 표시가 붙은 초안으로 작성한다.

**완료 화면**
- 현재 등급(B)을 보여 주고, 등급을 올리는 방법을 안내한다: "상담 예약을 하면 A등급, 체류와 한국어 확인까지 마치면 S등급이 되어 기업 추천 우선 대상이 됩니다."
- 내 추천 코드와 공유 버튼(메신저별)을 제공한다.
- 트랙에 맞는 다음 행동 버튼을 보여 준다: 추천 일자리 보기 / 상담 예약 / 체류 만료 알림 설정

### 7.4 트랙 분류 로직 (`lib/visa-engine/classifyTrack.ts`)
| 체류자격 | 트랙 | 등록 후 안내 |
|---|---|---|
| F-2, F-4, F-5, F-6, H-2 | `JOB_MATCH` | 추천 일자리 안내. 업종 제한 여부는 규칙 DB로 확인 |
| D-10, D-2 (졸업 예정 6개월 이내) | `JOB_MATCH` + 상담 자동 생성 | "취업과 E-7 전환을 함께 설계합니다" |
| D-2 (그 외), D-4 | `CONSULT_ONLY` | 시간제 취업 허가와 진로 상담 안내 |
| E-7 계열 | `JOB_MATCH` + `needsVisaReview=true` | "이직 시 절차가 필요합니다. 행정사가 확인합니다" |
| E-9, E-10 | `FUTURE_POOL` | "사업장 변경은 고용센터 절차로 진행됩니다. 비자앤잡은 장기 체류 전환(E-7-4 등)을 설계해 드립니다" + 점수 계산기 + 상담 |
| C-4, G-1, 기타 | `CONSULT_ONLY` | 상담 신청 |
| B-1, B-2, C-3, 만료·없음 | 등록 불가 (BR-08) | "구직 등록은 취업 가능한 체류자격이 있는 분만 가능합니다" + 체류 상담 신청 링크 |

이 매핑표는 코드에 하드코딩하지 않는다. `VisaType` 시드 테이블의 `defaultTrack` 필드로 관리해서 관리자가 수정할 수 있게 한다.

### 7.5 기업 노출용 블라인드 화이트리스트 (`lib/serializers/blindSeeker.ts`)
```ts
export const BLIND_SEEKER_FIELDS = [
  'publicId',            // 랜덤 공개 ID (DB id 아님)
  'nationality', 'sido', 'visaCode', 'visaSubType',
  'stayRemainingBand',   // 계산값
  'yearsInKorea',        // 계산값
  'educationLevel', 'majorField', 'graduationDate',
  'topikLevel', 'kiipStage', 'koreanSpeaking', 'otherLanguages',
  'experienceSummary',   // [{industry, role, months}] 회사명 제외
  'skills', 'licenses',
  'jobSearchStatus', 'availableFrom',
  'desiredIndustries', 'desiredRegions', 'needDormitory', 'shiftOk', 'desiredPayMin',
  'groupApplySize',
  'grade', 'verifiedVisa', 'verifiedKorean',
  'convertibleVisa', 'convertibleAt',   // 행정사 판정
] as const;
```
- 화이트리스트에 없는 필드는 직렬화 결과에 절대 포함하지 않는다. 테스트로 보장한다(§11).
- 사진, 이름 이니셜, 출생 연도, 성별, 학교명, 자유 텍스트는 노출 금지다.

### 7.6 등급 기준
| 등급 | 조건 | 기업 노출 |
|---|---|---|
| B | 온라인 등록만 함 (간편 등록 포함) | ✘ |
| A | 직원 전화·화상 상담 완료 + 체류자격 확인(`verifiedVisa`) | ✔ |
| S | A + 한국어 확인(`verifiedKorean`) + 구직 상태 활성 + 최근 30일 내 상태 확인 | ✔ (우선 추천, 배지) |

### 7.7 활성 상태 유지 작업 (pg-boss)
- **30일 주기 상태 확인:** "아직 구직 중이세요?" 원클릭 응답 링크를 보낸다. 14일 동안 응답이 없으면 `INACTIVE`로 바꾸고, S등급은 A로 내린다.
- **체류 만료 알림:** D-90, D-60, D-30에 구직자에게 알림을 보내고 담당 행정사에게 업무를 생성한다.
- **노쇼 처리:** `noShowCount` 2회 이상이면 추천 우선순위를 낮춘다(내부 표시만).

---

## 8. 구인 데이터 파이프라인

### 8.1 수집 엔드포인트
- `POST /api/ingest/job-leads`. 헤더 `x-api-key`로 인증하고, 요청 본문은 배열(최대 200건)이다.
- `sourceRef` 기준으로 멱등 처리한다(upsert). `closesAt`이 지난 리드는 받지 않는다.
- 업종 매핑(KSIC)과 인구감소지역 플래그는 시드 테이블로 자동 태깅한다.
- 원문 전체는 `rawJson`에만 저장한다. 공개 화면에 다시 게시하지 않는다.

### 8.2 등급 전이
```
C(수집) ──전화──▶ B(관심 확인) ──구인신청·검증──▶ A(공고 가능)
   │                 │
   └─30일 미접촉/마감─▶ ARCHIVED     └─의사 없음─▶ DO_NOT_CONTACT (재수집 시에도 C로 복귀 금지)
```

### 8.3 전화 우선순위 계산
`priority = 관심 구직자 수(희망 지역·업종 일치, S·A 가중) × 2 + 인구감소지역 가점 + 신규성 가점`. 리드 목록 기본 정렬로 쓰고, "이 기업 조건에 맞는 대기 인력 n명"을 통화 화면에 표시한다.

### 8.4 수요 지도 (`/demand`)
- C·B·A 리드를 시·도 × 업종으로 집계한다. 최근 30일 건수와 제시 급여 범위(중앙값 구간)를 보여 준다.
- 표본이 5건 미만인 셀은 "자료 부족"으로 표시한다(개별 기업 추정 방지).
- **고지 문구 (필수, 모든 언어):** "공공 채용정보를 바탕으로 비자앤잡이 분석한 지역·업종별 구인 수요입니다. 개별 채용이 확정된 정보가 아닙니다."
- 버튼은 "지원하기" 대신 **"이 지역·업종 일자리 알림 받기"**와 **"내 비자로 가능한지 확인"** 두 가지만 둔다.

### 8.5 블라인드 공고 (`/jobs`)
- `status=PUBLISHED`이고 `verifiedAt`이 있는 공고만 노출한다.
- 표시 항목: 블라인드 제목, 시·도(·시군구), 업종, 직무, 급여, 잔업 안내, 숙소, 식사, 교대, 채용 인원, 채용 가능 비자, "검증 완료" 배지, 직업소개사업 등록번호.
- 버튼: **"면접 신청"**을 누르면 `InterestRequest`가 생성되고 담당자에게 알림이 간다. 비로그인 사용자는 간편 등록으로 이동한다.
- 공고를 연 구직자의 비자가 `eligibleVisas`에 없으면 버튼 대신 "상담 신청"을 보여 준다.

---

## 9. 기업과 협력 소개소 기능

### 9.1 무료 채용 진단 (`/employer/diagnosis`)
입력: 업종(KSIC), 시·군·구, 상시근로자 수, 내국인 피보험자 수, 현재 외국인 고용 현황(비자별 인원). 출력: 규칙 DB에 따른 채용 가능 체류자격 목록(GREEN, YELLOW, RED)과 "행정사 확인 필요" 표시, 상담 신청 버튼. 결과는 리드로 저장한다.

### 9.2 구인 의뢰서 (`/employer/request`)
회사 정보(암호화), 직무, 급여, 근무시간, 잔업, 숙소, 식사, 채용 인원, 시기, 희망 조건. 자유 입력란에는 `pii-guard`를 적용한다(BR-14). 제출하면 해당 리드를 B로 올리고 담당자 검증 큐에 넣는다.

### 9.3 블라인드 후보 열람 (`/employer/candidates`)
- **열람 조건:** 기업 `verified=true`이고 `contractSignedAt`이 있어야 한다. 아니면 요약 통계만 보여 준다(예: "충남 · 제조 · 즉시 가능 S등급 12명").
- 필터: 체류자격, 잔여기간 구간, 한국어, 경력 업종, 기술, 숙소, 교대, 전환 가능 비자.
- 버튼은 **"면접 요청"**만 둔다. `InterestRequest(initiator=EMPLOYER)`를 생성한다.
- 기업별 열람 횟수에 상한(일 100건)을 두고, 대량 조회는 감사 로그에 남긴다.

### 9.4 계약 동의
- MVP에서는 "구인 서비스 이용약관" 체크와 PDF 다운로드로 처리한다. 약관 초안에는 다음 항목을 넣고 **[전문가 검토 필요]** 표시를 붙인다: 소개요금(법정 한도 이내), 추천 후 12개월 이내 직접 채용 시 소개요금 지급, 채용자의 체류 업무를 코리아비자 행정사사무소에 위임할 때의 보증(불허 시 재신청, 3개월 내 퇴사 시 재소개).
- 체류 업무 위임 동의(`visaMandateAgreed`)는 **별도 체크박스**로 받는다. 소개 계약과 묶어 강제하지 않는다.

### 9.5 협력 소개소
승인제로 운영한다(등록증 확인). 비자 업무 의뢰서만 제출할 수 있다. 인재 DB, 공고 관리, 수요 지도 원자료에는 접근할 수 없다.

---

## 10. 비자 진단과 E-7-4 점수 계산기

- `lib/visa-engine/evaluate.ts`: 입력(비자, 업종, 지역, 학력, 한국어, 체류 연수 등)을 `PUBLISHED` 상태의 `VisaRule`과 대조해 `Outcome`과 메시지 키를 반환한다. 일치하는 규칙이 없으면 `YELLOW`와 "행정사 확인 필요"를 반환한다.
- `lib/score/e74.ts`: `PUBLISHED` 상태 `ScoreTable(name='E-7-4')`의 `items` JSON(항목, 구간, 배점)으로 계산한다. 결과에는 총점, 항목별 점수, 부족 항목, "참고용" 문구를 담는다.
- 시드에는 구조만 보여 주는 **샘플 데이터**를 넣는다(`isSample=true`, `status=DRAFT`). 실제 배점과 요건은 행정사가 관리자 화면에서 입력하고 게시한다. **Claude Code가 실제 법령 수치를 추정해 넣지 않는다** (BR-12).
- `PUBLISHED` 점수표가 없으면 계산기 페이지는 "준비 중"을 보여 주고 상담 신청으로 안내한다.
- LLM은 Phase 3에서 **결과를 쉬운 말로 풀어 설명하는 용도로만** 선택 적용한다. 판정 값을 바꾸지 못하게 한다.

---

## 11. 보안, 개인정보, 감사

| 항목 | 구현 |
|---|---|
| 암호화 | `lib/crypto.ts`(AES-256-GCM, 키 버전 관리). `*Enc` 필드는 저장할 때 자동 암호화(Prisma extension) |
| 접근 제어 | `lib/rbac.ts`. 라우트와 서버 액션마다 역할 검사. 관리자 영역은 직원 역할과 2FA를 모두 확인 |
| 직원 권한 분리 | STAFF_PLACEMENT는 연락처를 볼 수 있지만 체류 사건 상세는 볼 수 없다. STAFF_VISA는 반대로 둔다. ADMIN은 둘 다 볼 수 있다 |
| 개인정보 열람 로그 | 복호화 필드를 열람하면 `AuditLog(action='PII_VIEW')`에 기록 |
| PII 가드 | 전화번호(국내·국제), 이메일, URL, `@아이디`, "kakao/zalo/telegram id" 패턴을 탐지 |
| 속도 제한 | OTP 발송, 로그인, 수집 API, 후보 열람 |
| 파일 | 소개 확인서 등은 비공개 버킷에 저장하고 서명 URL은 5분 만료 |
| 동의 철회 | `/me`에서 철회하면 해당 노출을 즉시 중단 (BLIND_PROFILE 철회 시 기업 노출 차단) |
| 탈퇴 | 개인정보는 파기하되, 법정 보존 대상(소개 기록 등)은 분리 보관 정책에 따른다 **[전문가 검토 필요]** |

---

## 12. 다국어

- 1차 언어: `ko`, `en`, `vi`, `ru`(고려인·중앙아시아), `zh`, `uz`
- 2차 언어: `ne`, `mn`, `km`, `my`, `th`, `id`, `si`, `tl`
- 관리자 화면은 한국어만 지원한다.
- 번역 키 네이밍 예: `seeker.register.step2.visaCode.label`
- 1차 번역 초안은 기계번역으로 만들고, 파일 상단에 `"_review": "native review required"`를 표시한다.
- 비자 코드, 금액, 날짜는 로케일 포맷을 따른다(`Intl`).

---

## 13. SEO와 콘텐츠

- 가이드와 사례는 MDX로 작성하고 frontmatter에 `reviewedBy`(행정사명)와 `updatedAt`을 넣어 화면에 표시한다.
- schema.org `Organization`, `FAQPage`, `BreadcrumbList`를 적용한다. 공고에는 `JobPosting` 스키마를 **적용하지 않는다** (회사명 비공개 공고이기 때문).
- `sitemap.xml`, `robots.txt`, hreflang을 넣는다. `/demand`는 색인을 허용하고, `/employer/candidates`와 `/admin`은 색인을 금지한다.
- 푸터: 행정사 사무소명·등록번호, 직업소개사업 등록번호, 대표자, 주소, 수수료표 링크. 값은 환경변수나 설정 파일에서 읽는다(`site.config.ts`, 플레이스홀더).

---

## 14. 단계별 작업과 완료 기준

### Phase 0. 기반 (1주)
| 작업 | 완료 기준 |
|---|---|
| 프로젝트 초기화, 린트, 테스트, CI | `pnpm test`, `pnpm lint` 통과 |
| Prisma 스키마, 마이그레이션, 시드 (지역, KSIC 대분류, 비자 유형, 샘플 규칙) | 샘플 규칙은 모두 `isSample=true`, `DRAFT` |
| crypto, rbac, audit, pii-guard 유틸 | 단위 테스트 커버리지 90% 이상 |
| next-intl 6개 언어 골격 | 언어 전환 시 모든 공개 페이지 키 누락 0 |

### Phase 1. MVP: 구직자 풀 형성 (3~4주)
| 작업 | 완료 기준 |
|---|---|
| 메인, 회사 소개, 수수료, 약관 페이지 | 모바일 Lighthouse 성능 85 이상, 접근성 90 이상 |
| 구직자 간편 등록과 정식 위저드(Step 0~7) | 단계별 자동 저장, 재진입 이어쓰기, 트랙 분류 정확(§7.4 테스트 케이스 전부 통과) |
| OTP 인증 (개발 모드는 콘솔 출력) | 재전송 제한 동작 |
| 동의 기록 | 유형, 버전, 언어, 시각 저장 |
| 추천 코드와 유입 채널 기록 | `?ref`, `?src` 저장 확인 |
| 수집 API와 리드 C등급 저장, 자동 보관 작업 | 멱등성 테스트, 마감 리드 거부 |
| 수요 지도 | 5건 미만 셀 마스킹, 고지 문구 전 언어 출력 |
| 관리자: 구직자 검토 큐, 리드 칸반, 통화 기록 | 등급 변경과 리드 등급 전이가 감사 로그에 기록됨 |
| 기업 무료 진단과 구인 의뢰서 | PII 가드 동작, 의뢰 시 리드 B 전이 |
| 비자 진단 위젯과 점수 계산기 (DB 기반, 미게시 시 "준비 중") | 하드코딩된 법령 수치 0건 (코드 리뷰 체크) |

### Phase 2. 폐쇄형 매칭 (4주)
| 작업 | 완료 기준 |
|---|---|
| A등급 리드에서 블라인드 공고 생성, 검증, 공개 | 검증 없는 공개 시도 시 서버 에러 |
| `/jobs` 공개 목록, 면접 신청 | 비자 부적합 시 상담 버튼으로 대체 |
| 기업 블라인드 후보 열람, 면접 요청 | 화이트리스트 스냅샷 테스트 통과 |
| 추천 원장, 면접 일정, 소개 확인서 업로드 | Recommendation UPDATE·DELETE 시도 실패 테스트 |
| 면접 확정 시 THIRD_PARTY_INTERVIEW 건별 동의 | 동의 전에는 기업에 실명·연락처 비공개 |
| 상태 확인과 만료 알림 작업, 알림 어댑터(이메일) | 시간 조작 테스트로 D-90/60/30 발송 확인 |
| 규칙 DB, 점수표 관리자 화면(버전, 게시, 검수자) | DRAFT는 공개 계산에 사용되지 않음 |

### Phase 3. 확장 (이후)
카카오 알림톡과 메신저 어댑터, 기업 재직 외국인 체류 대시보드, VisaCase 위임 시 고유식별정보 수집(별도 동의, 강화 암호화), 협력 소개소 포털, 2차 언어, LLM 설명 레이어(판정값 불변), 지자체 계절근로 모듈.

---

## 15. 필수 테스트 목록

1. `blindSeeker` 직렬화 결과의 키 집합이 `BLIND_SEEKER_FIELDS`의 부분집합인지 확인 (모든 시드 프로필 대상)
2. 기업 API 응답 전체를 대상으로 전화·이메일 정규식 탐지 결과가 0건
3. C·B 리드가 `/jobs`와 공고 API에 노출되지 않음
4. `verifiedAt`이 없는 공고는 공개 불가
5. B-1, C-3, 만료 비자로는 등록을 완료할 수 없음
6. E-9 등록자는 `FUTURE_POOL`로 분류되고 기업 후보 목록에서 제외됨
7. Recommendation과 AuditLog는 수정·삭제 불가
8. 동의 철회 즉시 기업 노출 차단
9. `PUBLISHED` 규칙이 없을 때 진단 결과가 "행정사 확인 필요"
10. 수요 지도 5건 미만 셀 마스킹
11. E2E: 간편 등록 → 프로필 완성 → 관리자 A등급 승격 → 기업 후보 목록 노출 → 면접 요청 → 추천 원장 생성

---

## 16. 법무 확인 대기 항목 (구현은 하되 플래그로 제어)

| 플래그 | 대상 | 기본값 |
|---|---|---|
| `FEATURE_DEMAND_MAP` | 수요 지도 공개 (직업정보제공사업 신고 필요 여부 확인 후) | `false` |
| `FEATURE_PUBLIC_JOBS` | 블라인드 공고 공개 | `false` |
| `FEATURE_REFERRAL_REWARD` | 추천 보상 (서비스 보상만, 현금 금지) | `false` |
| `FEATURE_EMPLOYER_CANDIDATES` | 기업 후보 열람 | `false` |

모든 약관, 동의서, 고지 문구 초안에는 **[전문가 검토 필요]** 표시를 붙이고, 운영자가 승인한 뒤 플래그를 켠다.

---

## 17. CLAUDE.md (루트에 별도 저장)

```markdown
# CLAUDE.md – 비자앤잡

## 최우선 원칙
- docs/WORK_ORDER.md §2 비즈니스 규칙(BR-01~15)을 위반하는 코드를 작성하지 않는다.
- 구직자와 기업 간 직접 연락 수단을 만들지 않는다.
- 기업에 나가는 구직자 데이터는 반드시 lib/serializers/blindSeeker.ts를 거친다.
- 법령 요건, 비자 점수 배점, 허용 업종 등 법적 수치를 추정해 하드코딩하지 않는다. 필요하면 DB 시드에 isSample=true, DRAFT로 넣고 TODO를 남긴다.
- 외국인등록번호와 여권번호 필드를 Phase 3 이전에 만들지 않는다.

## 작업 방식
- 작업 시작 전에 해당 Phase의 완료 기준을 확인하고, 끝나면 테스트를 실행해 결과를 보고한다.
- 스키마를 바꾸면 마이그레이션과 시드를 함께 갱신한다.
- 새 화면을 만들면 6개 언어 키를 모두 추가한다 (번역 미검수 표시).
- 개인정보 필드를 추가하면 암호화, 감사 로그, 블라인드 화이트리스트 영향도를 함께 검토한다.
- 규칙과 요구가 충돌하거나 불명확하면 구현을 멈추고 질문한다.

## 명령어
- pnpm dev / pnpm test / pnpm test:e2e / pnpm lint / pnpm db:migrate / pnpm db:seed
```

---

몇 가지 덧붙입니다. 개정 직업안정법이 12월 10일 시행되면 직업정보제공사업자에게 구인자 신원 검증 의무가 생깁니다 [Source](https://lawl.co.kr/brand/columnView.html?idx=1241). 그래서 수요 지도와 공고 공개는 기능 플래그로 꺼 둔 채 개발하고, 관할 노동청 확인 뒤에 켜도록 설계했습니다. 동의서와 약관 문구는 초안으로만 생성되니, 노무사나 변호사 검토를 거쳐 확정하시길 권합니다.

다음 단계로 6개 언어 등록 화면 문구(번역 키 JSON 초안)나 관리자 화면 와이어프레임을 이어서 작성해 드릴 수 있습니다.