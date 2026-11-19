# Phase P0b — 기준 일치 검토 (run 1)

- 대상 커밋: `361162e`(P0a S-11 경미 수정), `8c36dd3`(P0b DB·스키마·시드·원장 트리거·테스트 DB)
- 기준: `.workflow/STANDARD.md` v2.1 → 검토 중 **v2.2로 보완**(4절). 판정은 v2.2 기준. v2.2는 기준 공백을 메운 것이며, 산출물에 새 요구를 더하지 않았다.
- 검토자: wf-standard (모드 B), 2026-11-16
- 실행한 확인: S-43·S-44·S-45·S-47·S-50·S-53의 `rg` 명령(`src`, 필요 시 `prisma`·`scripts`·`tests`까지), `corepack pnpm qa:static`(18개 규칙, 오류 0·경고 0), `corepack pnpm typecheck`(통과), `corepack pnpm test`(8개 파일·65개 테스트 통과, 임베디드 테스트 클러스터 54329에서 마이그레이션·시드·트리거 실제 실행). 화면 없는 Phase라 렌더링은 하지 않음.

## 1. 결과 요약

**일치 13 / 14**, 불일치 1 (4.3 Region 시·군·구 코드 형식), 해당 없음 3 (S-40, S-46, S-52), 기준 보완 3건(v2.2 반영으로 해소).

## 2. 항목별 판정

### 2.1 점검표

| 번호 | 판정 | 근거 (파일:줄) |
|---|---|---|
| S-11 (P0a 재확인) | 일치 | `src/components/ui/dropdown-menu.tsx:124` `CircleIcon strokeWidth={1.5}`, `:195` `ChevronRightIcon strokeWidth={1.5}`, `:94` `CheckIcon`은 체크라 2 허용. `src/` 안 lucide 아이콘 전수(`<…Icon` 3건 + `locale-switcher.tsx` 2건) 확인. P0a 관찰 1도 반영: `src/components/common/locale-switcher.tsx:49` `tracking-[0.04em]`(3.2 LocaleSwitcher 0.04em, 2.4 허용 범위) |
| S-40 | 해당 없음 | 서버 액션(`"use server"`)·Route Handler(`route.ts`) 0개. 첫 대상은 P0c 이후 |
| S-43 | 일치 | `rg -i "passport\|arcNo\|alienReg\|residentNo\|registrationNumber" prisma src` 0건. 개인 식별 값은 `…Enc`(`schema.prisma:125,161,163,164,182,252,278,279,335,336,338`)·조회는 `…Hash`(`:126,280,337,609,610`, `Consent.ipHash` `:266`). ARC는 보유 여부 `hasArc Boolean?`(`:175`)뿐. 평문으로 남은 `User.email`(`:127`), `JobLead.companyName`·`bizRegNo`(`:311-312`)는 WO §5 원안 필드(공개 수집 데이터·로그인 식별자)라 4.3 "WO §5 이름 그대로"에 해당. `tests/unit/db/schema.test.ts:265-277`이 DB 컬럼 기준으로 0건을 검증하고 통과 |
| S-44 | 일치 | `rg "encrypt\(\|decrypt\(" src …` 0건(암·복호 자체가 P0c). `src/lib/db.ts:1-12`는 확장 없는 싱글턴, P0c 확장 위치 주석 있음 |
| S-45 | 일치 | `rg "console\.(log\|info\|warn\|error)" src` 0건. 범위 밖이지만 함께 본 `scripts/db.ts:50,82,90,95,120,126,133,138,161,183`·`prisma/seed/index.ts:62,71`은 포트·DB 이름·데이터 경로·건수 요약만 출력, 비밀번호·`DATABASE_URL` 전체·PII 없음(시드 관리자 이메일·비밀번호도 출력 안 함) |
| S-46 | 해당 없음 | `src/lib/audit.ts`·`AuditAction` 미작성(PLAN P0c). DB 쪽 `AuditLog` 모델(`schema.prisma:536-547`)과 `action` 주석이 4.8을 가리킴은 확인 |
| S-47 | 일치 | `src`에서 `(recommendation\|auditLog)\.(update\|delete\|upsert)` 0건. 매치는 `tests/unit/db/ledger-trigger.test.ts:88-110`(실패를 기대하는 테스트)·`tests/unit/scripts/qa-rules.test.ts:33-34`(규칙 자체 테스트)뿐. DB 트리거: `prisma/migrations/20261115224531_ledger_triggers/migration.sql:7-29` 두 표에 행 단위 BEFORE UPDATE/DELETE + 문장 단위 BEFORE TRUNCATE. 원장 FK는 `ON DELETE/UPDATE RESTRICT`(`20261115224522_init/migration.sql:612-627`). `qa-rules.ts:355-370` 앱 코드 메서드·raw SQL 둘 다 차단 규칙. 트리거 테스트 8개 통과(`WO15-07` 태그) |
| S-49 | 일치 | `prisma/seed/sampleRules.ts:1`·`sampleScoreTable.ts:1` 첫 줄 `// SAMPLE — 실제 법령 수치 아님 (BR-12)`. 모든 행 `status: "DRAFT"`, `isSample: true`(`sampleRules.ts:60-61`, `sampleScoreTable.ts:46-47`). 값도 자리표시(`SAMPLE-*`, 배점 0, `passScore: null`). `qa-rules.ts:372-379,552-563` 비샘플 시드·머리 주석 검사, `tests/unit/db/seed.test.ts:41-66` DB 값 검증 통과. PC-6: `regions.ts:1-13` 초안 고지, 전 행 `isSample: true`·`needsReview: true`(`:438-439,456-457`) |
| S-50 | 일치 | `src/` 안 `.test/.spec` 0건. 새 테스트 위치 `tests/unit/db/`, `tests/unit/scripts/pg.test.ts`, `tests/setup/global-db.ts`는 v2.2 4.10 보완 규칙과 일치(3절 #2) |
| S-52 | 해당 없음 | Route Handler 0개 |
| S-53 | 일치 | `rg "\b(200\|100\|60\|30\|14)\b" src --glob '!src/config/**'` 결과 5건 모두 `src/app/globals.css`(그라디언트 %, 줄간격, `text-size-adjust`) — 운영 수치 아님. D-2 "졸업 6개월"은 `VisaType.graduationWindowMonths` 데이터(`prisma/seed/visaTypes.ts:90`, `schema.prisma:564`) — SC-05와 일치. `limits.ts`는 아직 없음(쓰는 운영 수치가 없음) |

### 2.2 4절 아키텍처·명명 규칙

| 번호 | 규칙 | 판정 | 근거 |
|---|---|---|---|
| A-1 | 4.2 디렉터리 | 일치(v2.2) | `prisma/{schema.prisma, migrations/, seed/{index,regions,industries,visaTypes,sampleRules,sampleScoreTable}.ts}` 트리·WO 시드 파일명 그대로. `src/lib/db.ts` 위치 일치. `scripts/db.ts`·`scripts/lib/pg.ts`·`tests/setup/`은 v2.1 트리와 달랐으나 PLAN P0b(`PLAN.md:150,156`)를 따른 것이라 기준을 정정(3절 #1) |
| A-2 | 4.3 Prisma 모델·필드 = WO §5 | 일치 | WO §5 모델 16개·enum 9개 이름·필드 유지(`tests/unit/db/schema.test.ts:240-263`이 DB 기준으로 검증). 추가 필드는 `/// [+]`와 근거 표시. PC-3: 위저드 필드 nullable(`schema.prisma:161,167,175,187,195,196,199`), 완성 판정 `completedStep`(`:229`, 주석 `:152-153`). SC-10: `enum ShiftOk { YES NO CONDITIONAL UNKNOWN }`(`:87-92`), `shiftOk ShiftOk?`(`:196`). PC-4: `StaffTask`·`StaffTaskType`·`StaffTaskStatus`(`:100-118,632-654`). 추가 테이블 PRD §3 목록과 같음(VisaType, Industry, Region, OtpChallenge, StaffTask + RateLimitBucket — R-129용) |
| A-3 | 4.3 enum 값·DB 문자열 코드 UPPER_SNAKE | **불일치** | enum 값 전부 UPPER_SNAKE. `Region` 시·도 코드 `SEOUL` 등 UPPER_SNAKE. 그러나 시·군·구 코드는 `"<SIDO>:<한글명>"`(`prisma/seed/regions.ts:419-421`, `schema.prisma:589` 주석, 예 `GYEONGBUK:의성군`). 이 값이 `SeekerProfile.sigungu`·`Company.sigungu`·`JobLead.sigungu`·`JobPosting.sigungu`에 저장될 코드다. (VisaType `F-4` 등 하이픈 코드는 WO §5·§7.4가 정한 비자 코드라 WO 우선으로 예외) |
| A-4 | 4.7 `…Enc`/`…Hash` 명명 | 일치 | S-43 근거와 같음. `schema.test.ts:297-` 검증 통과. `User.totpSecret`은 WO 원안 이름 유지(P0c 확장 대상 — PLAN P0c 2) |
| A-5 | 4.8 원장 불변 + DB 트리거 | 일치 | S-47 근거와 같음. `src/lib/db.ts:3` 주의 주석 |
| A-6 | 4.9 시드 규칙(SAMPLE·DRAFT, SC-05, PC-6, v2.2 registrable) | 일치 | S-49·S-53 근거. 비자→트랙 매핑은 `VisaType` 데이터(`visaTypes.ts:37-186`), `src/`에 매핑 상수 0건(`qa:static` BR-12 규칙 통과). SC-02: `OTHER`·`UNKNOWN`·`NONE` `registrable: false`(`:147,175,183`) |

## 3. 빌더 보고 판단과 STANDARD v2.2 보완

| # | 빌더 보고 | 판단 | STANDARD 변경 |
|---|---|---|---|
| 1 | STANDARD 4.2 `scripts/db-start.ts` ↔ 구현 `scripts/db.ts` | **수용.** PLAN P0b가 `scripts/db.ts start`와 파일 목록을 정했고, start/stop/status/reset을 한 파일로 둔 것이 package.json 스크립트(`db:start`…`db:reset`)와 맞음. 기준서의 이름은 v1 초안 그대로였던 공백 | 4.2 트리 `scripts/ (db.ts, i18n-check.ts, qa-static.ts, lib/ …)`, `tests/setup/` 추가. 4.10에 `src/` 밖 대상 테스트 위치 추가(`tests/unit/scripts/`, `tests/unit/db/`, `tests/setup/`) |
| 2 | VisaType `OTHER` = defaultTrack CONSULT_ONLY + registrable=false | **수용.** WO §7.4 표의 "기타 → CONSULT_ONLY"는 데이터로 보존하고, SC-02 "visaCode 모름/기타 → 등록 완료 대신 상담 신청 안내"는 `registrable=false`로 구현 — 둘이 충돌하지 않음. 다만 `schema.prisma:555` 주석 "null = registration not possible"만 보면 `defaultTrack` null이 등록 가부 기준처럼 읽혀 P1c `classifyTrack`에서 혼동 여지가 있음 | 4.9에 "등록 완료 가능 여부는 `VisaType.registrable`만으로 판정, `defaultTrack` null 여부로 판단 금지" 추가. (주석 정리는 5절 관찰 1) |
| 3 | Region·Industry·VisaType `nameKey` 메시지 키는 P1a에서 추가 | **수용.** P0b에는 이 키를 쓰는 화면이 없음. 단 3.6에 이 용도의 키 형식이 없었고(`.name` 속성 미등재), 키가 messages에 있는지 확인할 장치도 없었음. 현재 시드 키 `visaType.{f2…}.name`(`visaTypes.ts`), `common.region.{seoul…}`(`regions.ts:435`), `common.industry.{a…u}`(`industries.ts:37`)는 영역(`visaType`, `common`)이 3.6 목록 안 | 3.6에 참조 데이터 `nameKey` 형식(현 구현과 동일)과 "P1a부터 시드의 모든 nameKey가 6개 messages에 존재(테스트 또는 i18n:check)" 추가 → P1a 검토에서 S-29·S-30으로 확인 |

개정 이력에 v2.2 행 추가.

## 4. 불일치 목록과 수정 지시

| # | 항목 | 위치 | 기준 | 실제 | 수정 지시 |
|---|---|---|---|---|---|
| 1 | 4.3 (A-3) | `prisma/seed/regions.ts:419-421` `sigunguCode()`, `prisma/schema.prisma:589` 주석 | 4.3 "enum 값·DB 문자열 코드: UPPER_SNAKE" | 시·군·구 코드가 `"<SIDO>:<한글명>"`(콜론 + 한글) | 시·군·구 코드를 UPPER_SNAKE로 바꾼다: `{SIDO}_{로마자 표기}`(예 `GYEONGBUK_UISEONG_GUN`, `SEOUL_JUNG_GU`), 시·도 안에서 유일. 한글명은 `nameKo`에만 두고, 수집 API(R-114)·화면의 한글명 매칭은 `nameKo` 조회로 한다. 아직 실데이터가 없는 P0b에서 바꾸면 데이터 이전이 필요 없다. 로마자 표기 대신 공식 행정구역 코드(숫자)를 쓰고 싶다면 4.3 예외가 필요하므로 빌더가 고르지 말고 DECISIONS에 올린다 |

## 5. 점검표 밖 관찰 (판정에 넣지 않음)

1. `prisma/schema.prisma:555` `/// null = registration not possible (BR-08)` — v2.2 4.9에 맞춰 "등록 가부는 `registrable`; null은 트랙 없음"으로 주석을 고치면 P1c 혼동이 줄어든다.
2. 시·군·구는 `nameKey`가 null(`regions.ts:453`)이라 6개 로케일 모두 한국어 `nameKo`로 표시된다. 지명 고유명사라 허용 가능하다고 보지만, P1 화면(간편 등록·수요 지도)에서 비한국어 로케일 표시 방식(한국어 그대로 / 로마자 병기)을 P1 검토 때 확인할 것.
3. `regions.ts:9-10`이 2026-07 인천 행정구역 개편(제물포구·영종구·검단구)을 반영했다고 적었다. 검토일(2026-11-16) 기준 시행된 개편이며, 전 행 `needsReview`라 PC-6 처리와 맞다. 운영자 대조 때 함께 확인.
4. `.env.example`의 `postgres:postgres`는 로컬 임베디드 클러스터 전용 기본값이고 주석으로 명시(1.2-10 위반 아님). `tests/setup/global-db.ts:53`도 같음.
