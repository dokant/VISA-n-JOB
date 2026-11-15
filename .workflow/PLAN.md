# PLAN — 작업 계획

- 근거: PRD v1.1 (Gate 3 결정 반영) / STANDARD(병행 작성 중, 확정본의 점검표를 각 Phase 완료 조건에 덧붙여 적용) / docs/WORK_ORDER.md v1.0(이하 WO) / DECISIONS Q-01~Q-04
- 갱신일: 2026-11-15
- 범위: WO Phase 0~2 (PRD R-001~R-015, R-101~R-131, R-201~R-217, N-01~N-06). 요구사항 63개(필수 62, 선택 1) + 비기능 6개
- 환경 전제: Windows 11, Node 24.15, pnpm은 corepack, DB는 npm `embedded-postgres`(로컬 실제 Postgres), Docker 없음, git은 P0a에서 로컬 init

---

## 승인된 도구·라이브러리·외부 서비스
> Gate 3에서 사람이 승인할 목록. 여기에 없는 것을 쓰려면 멈추고 물어야 한다. 버전은 "범위"이며 P0a에서 설치한 실제 버전을 lockfile로 고정한다. 유료·계정 필요 외부 서비스는 0개.

### 런타임 의존성
| 패키지 | 버전 범위 | 용도 | 왜 필요한가 |
|---|---|---|---|
| next | ^15.5 (16.x 금지) | 프레임워크 | WO §3 고정 스택(App Router) |
| react, react-dom | ^19.1 | UI | Next 15 필수 동반 |
| tailwindcss, @tailwindcss/postcss | ^4.1 | 스타일 | WO §3 |
| shadcn (CLI, 개발 시 `pnpm dlx`로만 실행) + radix-ui, class-variance-authority, clsx, tailwind-merge, tw-animate-css | CLI 최신 / 각 최신 안정 | UI 컴포넌트 | WO §3 shadcn/ui. CLI가 소스 복사 방식이므로 런타임에는 동반 패키지만 남음 |
| lucide-react | ^0.5 | 아이콘 | WO §3 |
| react-hook-form | ^7.5 | 폼 | WO §3 |
| zod | ^3.25 | 스키마(서버·클라 공유) | WO §3, R-106 |
| @hookform/resolvers | ^5 | RHF↔zod 연결 | R-106 공유 스키마를 클라이언트 폼에 연결 |
| next-intl | ^4 | 다국어 `/[locale]` 라우팅·hreflang | WO §3, R-014 |
| prisma (dev), @prisma/client | ^6 (7.x 금지) | ORM·마이그레이션 | WO §3. 7.x는 생성기·드라이버 어댑터 구조가 바뀌어 위험 |
| embedded-postgres (+ 자동 설치되는 @embedded-postgres/windows-x64) | PG 17 계열 (`17.x-beta.*`, 정확히 고정) | 개발·테스트 DB | Q-02 결정 |
| pg-boss | ^10 | 작업 큐·예약 작업 | WO §3, R-116, R-213 |
| next-auth (Auth.js v5) | 5.0.0-beta.x (정확히 고정) | 세션·Credentials 인증 | WO §3, R-104, R-118, R-123 |
| otplib | ^12 | 직원 TOTP 2FA | R-118 |
| @node-rs/argon2 | ^2 | 비밀번호 해시 | 기업·직원 비밀번호 저장(R-118, R-123). prebuilt 바이너리라 Windows 네이티브 빌드 불필요 |
| next-mdx-remote | ^5 | 가이드 MDX·동의서 md 렌더, frontmatter | R-131, R-110(동의 본문 md) |
| nodemailer | ^6 | SMTP 어댑터 | R-214. 환경변수 없으면 비활성 |

### 개발 의존성
| 패키지 | 버전 범위 | 용도 | 왜 필요한가 |
|---|---|---|---|
| typescript | ^5.8 | strict 타입 | R-001 |
| eslint, eslint-config-next(15.x) | ^9 / 15.x | 린트 | R-002 |
| prettier | ^3 | 포맷 | R-002 |
| husky, lint-staged | ^9 / ^16 | pre-commit 훅 | R-002 |
| vitest, @vitest/coverage-v8 | ^3 | 단위·통합 테스트, 커버리지 | R-002, R-013 |
| @playwright/test | ^1.5x | E2E, 그리고 약관 PDF 생성(page.pdf) | R-002, R-208 PDF(새 PDF 라이브러리 없이 처리) |
| lighthouse | ^12 | 모바일 성능·접근성 측정 CLI | R-103. Chrome은 Playwright가 받은 Chromium을 `CHROME_PATH`로 지정 |
| tsx | ^4 | 시드·스크립트 실행 | R-004 `db:*`, `i18n:check` |
| @types/node, @types/react, @types/nodemailer | 해당 버전 | 타입 | strict 모드 |

### 쓰지 않는 것 (명시)
- Docker, 클라우드 DB, Redis, SMS 게이트웨이, 카카오·Zalo SDK(앱 키 필요), 외부 번역 API, Sentry 등 SaaS. 속도 제한과 OTP 상태는 Postgres 테이블로 처리한다.
- 번역 초안은 에이전트가 직접 작성(외부 기계번역 서비스 호출 없음), `_review` 표시.

### 다운로드가 발생하는 항목 (승인 대상)
| 항목 | 출처 | 크기·위치 |
|---|---|---|
| npm 패키지 전부 | npm 레지스트리 | 프로젝트 `node_modules` |
| Postgres 바이너리 | npm `@embedded-postgres/windows-x64` | 프로젝트 `node_modules` |
| Playwright Chromium | Playwright CDN (`pnpm exec playwright install chromium`) | 사용자 캐시 폴더, 약 150~200MB |
| pnpm | corepack (Node 내장) | 아래 "승인 필요 지점" A-1 참조 |

---

## Phase 목록

| Phase | 이름 | 다루는 요구사항 | 수 | 선행 Phase | 병렬 가능 |
|---|---|---|---|---|---|
| P0a | 프로젝트 골격·도구·i18n·설정 | R-001, R-002, R-003, R-014, R-015, N-06 | 5+1 | - | 아니오 |
| P0b | DB·스키마·시드·원장 트리거 | R-004, R-005, R-006, R-007 | 4 | P0a | 아니오 |
| P0c | 보안 유틸·암호화 확장·알림 인터페이스 | R-008, R-009, R-010, R-011, R-012, R-013 | 6 | P0b | 아니오 |
| P1a | 공개 페이지·진단 엔진·수요 지도·SEO | R-101, R-102, R-103, R-117, R-126, R-127, R-128, R-130, R-131 (+N-03, N-04 1차) | 9 | P0c | 아니오 |
| P1b | 인증 기반(Auth.js·OTP·직원 2FA·기업 가입) | R-104, R-118, R-123 | 3 (위험 집중, 의도적으로 작게) | P1a | 아니오 |
| P1c | 구직자 등록(간편·위저드)·트랙 분류·마이페이지 | R-105, R-106, R-107, R-108, R-109, R-110, R-111, R-112, R-113 | 9 | P1b | P1e와 병렬 가능(조건부) |
| P1d | 구인 수집·리드 작업·기업 진단·구인 의뢰·속도 제한 | R-114, R-115, R-116, R-124, R-125, R-129 | 6 | P1c | P1e와 병렬 가능(조건부) |
| P1e | 관리자 MVP(대시보드·검토 큐·리드 칸반·PII 열람 로그) | R-119, R-120, R-121, R-122 | 4 | P1b | P1c 또는 P1d와 병렬 가능(조건부) |
| P2a | 블라인드 공고·`/jobs`·면접 신청 | R-201, R-202, R-203 | 3 | P1c, P1d, P1e | 아니오 |
| P2b | 블라인드 직렬화·기업 후보 열람·계약 동의·기업 검증 화면 | R-204, R-205, R-206, R-207, R-208, R-218 | 6 | P2a | 아니오 |
| P2c | 매칭·추천 원장·면접·소개 확인서·건별 동의·계약/체류 사건 | R-209, R-210, R-211, R-212, R-216 | 5 | P2b | 아니오 |
| P2d | 예약 작업·알림 어댑터·규칙/점수표 관리 | R-213, R-214, R-215 | 3 | P2c (R-215 부분은 P1e 이후 언제든) | 조건부(아래) |
| P2e | 통합 E2E·전체 BR 감사·출시 점검 | R-217, N-01, N-02, N-04, N-05 최종 | 1+4 | P2a~P2d 전부 | 아니오 |

**배정 검증:** P0 = 5+4+6 = 15 (R-001~R-015) / P1 = 9+3+9+6+4 = 31 (R-101~R-131) / P2 = 3+5+5+3+1 = 17 (R-201~R-217). 합계 63, 누락 0, 중복 0. N-01~N-06은 주 담당 Phase를 위 표에 적고, 모든 Phase에서 상시 점검(아래 "공통 규칙").

**의존 순서(직렬 경로):** P0a → P0b → P0c → P1a → P1b → P1c → P1d → P2a → P2b → P2c → P2d → P2e
**병렬 조건(P1e, P2d):**
- P1e는 `src/app/admin/**`, `src/lib/admin/**`, `src/lib/leads/priority.ts`, `tests/**/admin*`만 만든다. `messages/*.json`(관리자는 한국어 전용, 관리자 문구는 `src/app/admin/_i18n/ko.ts` 등 관리자 전용 파일), `prisma/schema.prisma`, `package.json`, `middleware.ts`를 건드리지 않는다. 이 조건이 지켜지면 P1c 또는 P1d와 동시에 돌릴 수 있다. 리드·구직자 데이터는 테스트 픽스처로 만든다.
- P2d 중 R-215(규칙/점수표 관리 화면)와 R-214(어댑터)는 `src/app/admin/rules/**`, `src/lib/notifications/**`만 건드리므로 P2a~P2c와 병렬 가능. R-213(예약 작업)은 Interview·Recommendation(P2c)에 의존하고 알림 문구를 `messages/*.json`에 추가하므로 P2c 이후 순차 실행.
- 병렬 실행 중에는 스키마 변경 금지. 스키마 변경이 필요하면 해당 Phase를 멈추고 직렬로 돌린다.

---

## 공통 규칙 (모든 Phase)

1. **스키마는 P0b에서 최대한 확정**한다. 이후 Phase가 스키마를 바꾸면 새 마이그레이션 파일 + 시드 갱신을 같은 Phase에서 한다(WO §17).
2. **사용자 노출 문자열**(관리자 제외)은 같은 Phase에서 6개 언어 키를 모두 추가하고 `_review` 표시를 유지한다(N-02). 번역 초안은 에이전트 작성.
3. **법령 수치 금지**(BR-12, R-128): 비자 배점·요건·허용 업종 값을 코드나 시드에 실제값으로 넣지 않는다. 시드는 `SAMPLE` 주석 + `isSample=true` + `DRAFT`.
4. **BR 상시 점검**: 매 Phase 끝에 `pnpm qa:static`(P0a에서 만드는 정적 점검 스크립트: 외국인등록번호·여권번호 필드명, 기업·구직자 화면의 `tel:`/`mailto:`/채팅 컴포넌트, 비자→트랙 매핑 상수 패턴 등 grep) 실행, 결과를 QA 보고에 첨부. 판정은 사람/QA 코드 리뷰가 최종.
5. **비밀 정보**: `.env`는 git 제외, `.env.example`만 커밋(N-06). 테스트 키는 테스트 설정에서 생성.
6. **감사 로그 대상 행위**(BR-15)를 새로 만드는 Phase는 그 행위의 AuditLog 테스트를 함께 넣는다(N-05).
7. **기능 플래그 4종 기본 false 유지.** 테스트는 테스트 환경 변수로만 켠다.
8. **package.json 변경은 직렬 Phase에서만.** 승인 목록 밖의 패키지 추가 금지.

### 표준 검증 명령 (P0a에서 스크립트 등록, 이후 Phase는 해당 스크립트 추가 시점 명시)
| 명령 | 내용 | 등록 Phase |
|---|---|---|
| `pnpm lint` | ESLint | P0a |
| `pnpm typecheck` | `tsc --noEmit` | P0a |
| `pnpm test` | Vitest 단위·통합(테스트 DB 자동 기동) | P0a (DB 연동은 P0b) |
| `pnpm test:coverage` | Vitest + v8 커버리지 | P0a |
| `pnpm test:e2e` | Playwright (프로덕션 빌드 서버 대상) | P0a |
| `pnpm build` | `next build` | P0a |
| `pnpm i18n:check` | ko 대비 키 누락 검사, `_review` 존재 검사 | P0a |
| `pnpm qa:static` | BR 정적 점검 | P0a |
| `pnpm db:start` / `db:stop` / `db:migrate` / `db:seed` / `db:reset` | 임베디드 Postgres와 Prisma | P0b |
| `pnpm worker` | pg-boss 워커 실행 | P1d |
| `pnpm lighthouse` | 프로덕션 빌드 기동 후 4개 페이지 모바일 측정, 임계값 미달 시 비0 종료 | P1a |

---

## Phase 상세

### P0a — 프로젝트 골격·도구·i18n·설정
- 목표: 빈 폴더에서 빌드·린트·테스트·E2E·i18n 검사가 돌아가는 Next.js 15 저장소를 만든다.
- 요구사항: R-001, R-002, R-003, R-014, R-015, N-06
- 작업:
  1. 환경 점검: `node -v`, corepack로 pnpm 활성화(승인 지점 A-1 방식), `git init`(로컬). 경로에 공백이 있으므로 이 단계에서 `pnpm dlx create-next-app`이 동작하는지 먼저 확인.
  2. Next.js 15 App Router + TS strict + Tailwind 4 + ESLint 초기화(`src/` 디렉터리, import alias `@/*`). shadcn init(제안 토큰은 STANDARD 기준), lucide-react.
  3. 승인 목록의 런타임·개발 의존성 일괄 설치(이후 Phase의 lockfile 충돌 방지). Playwright Chromium 설치.
  4. Prettier, Husky(`.husky/pre-commit` → `lint-staged`), lint-staged 설정.
  5. Vitest 설정(`vitest.config.ts`, 커버리지 v8, `tests/unit`), Playwright 설정(`playwright.config.ts`, webServer = `pnpm build && pnpm start` 대상, 375px 모바일 프로젝트 포함).
  6. `.github/workflows/ci.yml`: checkout → corepack → `pnpm install --frozen-lockfile` → lint → typecheck → test (원격 실행 안 함).
  7. next-intl: `src/i18n/routing.ts`(ko,en,vi,ru,zh,uz, 기본 ko), `src/i18n/request.ts`, `src/middleware.ts`(`/admin`, `/api` 제외 매처), `src/app/[locale]/layout.tsx`, 언어 전환 컴포넌트, `messages/{ko,en,vi,ru,zh,uz}.json` 각각 `"_review": "native review required"`.
  8. `scripts/i18n-check.ts`(ko 기준 누락 키·`_review` 검사, 누락 시 비0 종료), `scripts/qa-static.ts`.
  9. `site.config.ts`(사무소명·행정사 등록번호·직업소개사업 등록번호·대표자·주소 플레이스홀더), `src/lib/flags.ts`(FEATURE_DEMAND_MAP, FEATURE_PUBLIC_JOBS, FEATURE_REFERRAL_REWARD, FEATURE_EMPLOYER_CANDIDATES, 미설정·"false"면 false).
  10. `.gitignore`(`.env*` 제외, `!.env.example`, pg 데이터 디렉터리, 업로드 저장소), `.env.example`, `README.md` 골격, 루트 `CLAUDE.md`(WO §17 내용).
- 만들거나 고칠 파일: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `.prettierrc`, `.husky/pre-commit`, `vitest.config.ts`, `playwright.config.ts`, `.github/workflows/ci.yml`, `src/i18n/*`, `src/middleware.ts`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`(임시), `src/components/LocaleSwitcher.tsx`, `src/components/ui/*`, `messages/*.json`, `scripts/i18n-check.ts`, `scripts/qa-static.ts`, `site.config.ts`, `src/lib/flags.ts`, `.gitignore`, `.env.example`, `README.md`, `CLAUDE.md`, `tests/unit/flags.test.ts`, `tests/e2e/smoke.spec.ts`
- 완료 조건(PRD 인용):
  - R-001 "`pnpm build` 성공, `tsconfig` `strict: true`, git 저장소 존재"
  - R-002 "`pnpm lint`, `pnpm test` 0 에러 종료. pre-commit 훅이 lint-staged 실행"
  - R-003 "`.github/workflows/ci.yml`에 install→lint→typecheck→test 단계 존재 (원격 실행은 범위 밖)"
  - R-014 "각 언어 메시지 파일에 `"_review": "native review required"`. 키 비교 스크립트(`pnpm i18n:check`)가 ko 대비 누락 키 0"
  - R-015 "플래그 미설정 시 수요 지도·공고·추천 보상·후보 열람이 비활성" (P0a에서는 `flags.ts` 단위 테스트로 확인, 실제 화면 비활성은 P1a·P2a·P2b에서 재확인)
  - N-06 "키·비밀번호는 `.env`(git 제외), `.env.example`만 커밋"
- QA 방법: 아래 명령 실행 + `git status`에서 `.env` 미추적 확인 + 임시 파일로 커밋 시도해 lint-staged 실행 로그 확인 + `ci.yml` 단계 열람. 일부러 en.json 키 하나를 지워 `i18n:check`가 실패하는지 확인 후 복원.
- 검증 명령: `pnpm lint && pnpm typecheck && pnpm test && pnpm i18n:check && pnpm build && pnpm test:e2e`
- 위험: corepack 권한(A-1), 공백 경로에서 도구 오작동, next-intl 4 + Next 15 미들웨어 매처 설정.
- 사람 승인 지점: A-1(corepack 방식), A-2(Playwright Chromium 다운로드).

### P0b — DB·스키마·시드·원장 트리거
- 목표: 임베디드 Postgres 위에 WO §5 + PRD §3 추가 테이블을 마이그레이션하고 샘플 시드와 원장 트리거를 넣는다.
- 요구사항: R-004, R-005, R-006, R-007
- 작업:
  1. **스파이크 먼저**: `scripts/db.ts start`로 embedded-postgres 기동(개발 포트 54320, 데이터 디렉터리는 `PG_DATA_DIR` 환경변수, 기본 `./.pgdata`; 공백 경로 실패 시 `%LOCALAPPDATA%\visanjob\pgdata`로 전환). Prisma `migrate dev`가 shadow DB 포함해 동작하는지 확인.
  2. `prisma/schema.prisma`: WO §5 전 모델·enum + `VisaType`(code, nameKey, defaultTrack, registrable, autoConsult, needsVisaReview, graduationWindowMonths 등 트랙 분류 파라미터), `Industry`(KSIC 대분류), `Region`(시·도/시·군·구, depopulationArea), `OtpChallenge`, `RateLimitBucket`, 진단 결과 저장 필드(JobLead.source 값 확장·`diagnosisJson`), SeekerProfile 보조 필드(publicId, needsVisaReview, consultTime, stayAlertOptIn) — 단 "확인 필요" C-3·C-4 결정 반영. 주민·여권번호 필드 0개.
  3. 원장 트리거 마이그레이션(`--create-only` 후 SQL 추가): `Recommendation`·`AuditLog`에 BEFORE UPDATE/DELETE 행 트리거 + BEFORE TRUNCATE 문장 트리거, 예외 발생.
  4. 시드(`prisma/seed/*.ts`): regions, industries(KSIC 대분류 21개), visaTypes(WO §7.4 표 그대로 defaultTrack), sampleRules, sampleScoreTable(구조만, 숫자는 명백한 더미, 파일 상단 `// SAMPLE` 주석, `isSample=true`, `DRAFT`), 개발용 관리자 계정(환경변수 값이 있을 때만).
  5. 테스트 DB 인프라: Vitest globalSetup이 테스트 전용 포트(54329)로 embedded-postgres를 띄우고 새 DB 생성 → `migrate deploy` → 시드. 원장 테이블 때문에 정리는 "실행마다 DB 새로 생성" 방식(DELETE/TRUNCATE 정리 금지).
  6. `package.json`에 `db:*` 스크립트, README에 DB 절차.
- 만들거나 고칠 파일: `scripts/db.ts`, `prisma/schema.prisma`, `prisma/migrations/**`, `prisma/seed/{index,regions,industries,visaTypes,sampleRules,sampleScoreTable}.ts`, `src/lib/db.ts`(Prisma 싱글턴), `tests/setup/global-db.ts`, `tests/unit/db/{schema,ledger-trigger,seed}.test.ts`, `package.json`, `README.md`, `.env.example`
- 완료 조건(PRD 인용):
  - R-004 "`pnpm db:start`로 Postgres 기동, `pnpm db:migrate`, `pnpm db:seed` 성공. README에 절차 기재"
  - R-005 "마이그레이션 적용 후 WO §5의 모든 모델·enum이 DB에 존재. 주민·여권번호 필드 0개(BR-13)" — 테스트가 `information_schema`로 테이블·enum 목록 대조, 컬럼명에 `arc|alien|passport|rrn|registrationNo` 패턴 0개
  - R-006 "마이그레이션에 BEFORE UPDATE/DELETE 트리거. 테스트: raw SQL UPDATE·DELETE 시 에러 (WO §15-7)"
  - R-007 "시드 후 VisaRule·ScoreTable 전 행 `isSample=true`, `status=DRAFT`. 시드 파일에 `SAMPLE` 주석. VisaType.defaultTrack이 WO §7.4 표와 일치"
- QA 방법: 새 셸에서 `pnpm db:start → db:migrate → db:seed` 순서 재현, `psql` 대신 테스트 결과와 `prisma studio` 열람으로 확인, 트리거 테스트 출력 확인.
- 검증 명령: `pnpm db:start && pnpm db:migrate && pnpm db:seed && pnpm lint && pnpm typecheck && pnpm test && pnpm build`
- 위험: Windows·공백 경로 initdb 실패, 관리자 권한 셸에서 Postgres 기동 거부, Prisma가 트리거 SQL을 drift로 인식, 인구감소지역 목록 출처(C-6).
- 사람 승인 지점: 없음(로컬 데이터 디렉터리만 생성). 단 C-3·C-4·C-6 결정이 이 Phase 시작 전에 필요.

### P0c — 보안 유틸·암호화 확장·알림 인터페이스
- 목표: 모든 기능이 쓸 보안 기반을 테스트와 함께 만든다.
- 요구사항: R-008, R-009, R-010, R-011, R-012, R-013
- 작업:
  1. `src/lib/crypto.ts`: AES-256-GCM, `v{n}:` 키 버전 접두, 키는 `ENCRYPTION_KEYS`(버전→키) 환경변수, HMAC-SHA256 `hmacHash()`(`HASH_KEY`).
  2. `src/lib/db.ts` 확장: 모델 필드명이 `Enc`로 끝나면 쓰기 시 암호화·읽기 시 복호화하는 Prisma `$extends`(create/update/upsert/createMany/find*, 중첩 쓰기 포함). User.totpSecret도 암호화 대상에 명시 포함.
  3. `src/lib/rbac.ts`: 역할×권한 매트릭스(WO §1.3, §11), `can(role, permission)`, `assertCan()`. 권한 예: `contact:view`, `visaCase:view`, `audit:view`, `rules:publish`, `candidates:view`, `agency:visaRequestOnly`.
  4. `src/lib/audit.ts`: `writeAudit({actorId, action, entity, entityId, meta})`, 액션 상수(PII_VIEW, EXPORT, GRADE_CHANGE, LEAD_GRADE_CHANGE, RECOMMEND, POSTING_PUBLISH, BULK_VIEW 등).
  5. `src/lib/pii-guard.ts`: `detectContacts(text)`, `maskContacts(text)`, `assertNoContacts()` — 국내·국제 전화, 이메일, URL, `@아이디`, kakao/zalo/telegram id 패턴(한·영 표기 변형 포함).
  6. 지원 작업(요구사항 번호 없음, R-105·R-203 선행 조건): `src/lib/notifications/{types,console}.ts` — `NotificationProvider` 인터페이스와 콘솔 어댑터 최소 구현. SMTP와 정식 테스트는 P2d(R-214).
  7. 커버리지 임계값 설정: 4개 파일 각각 라인 90% 미만이면 실패.
- 만들거나 고칠 파일: `src/lib/{crypto,rbac,audit,pii-guard}.ts`, `src/lib/db.ts`, `src/lib/notifications/{types,console,index}.ts`, `tests/unit/lib/{crypto,rbac,audit,pii-guard,enc-extension}.test.ts`, `vitest.config.ts`(threshold), `.env.example`
- 완료 조건(PRD 인용):
  - R-008 "암·복호 왕복, 변조 시 실패, 키 버전 교체 후 구버전 복호 성공 테스트"
  - R-009 "DB raw 조회 시 `*Enc` 컬럼에 평문 없음, 앱 조회 시 복호 테스트"
  - R-010 "STAFF_PLACEMENT는 연락처 허용·체류 사건 거부, STAFF_VISA는 반대, ADMIN 둘 다 — 테스트"
  - R-011 "기록 함수 호출 시 AuditLog 행 생성 테스트"
  - R-012 "국내·국제 전화, 이메일, URL, `@아이디`, kakao/zalo/telegram id 패턴 각 양성·음성 케이스 테스트"
  - R-013 "crypto·rbac·audit·pii-guard 라인 커버리지 각 90% 이상(`vitest --coverage` 보고서)"
- QA 방법: 커버리지 보고서(`coverage/`) 파일별 수치 확인, raw SQL로 `legalNameEnc` 조회해 평문 부재 확인하는 테스트 출력 열람.
- 검증 명령: `pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm build`
- 위험: Prisma extension이 중첩 쓰기·`createMany`를 놓침 → 테스트에 중첩 케이스 포함. pii-guard 오탐(급여 숫자 등이 전화로 탐지) → 음성 케이스에 금액·날짜 포함.
- 사람 승인 지점: 없음.

### P1a — 공개 페이지·진단 엔진·수요 지도·SEO
- 목표: 비로그인 공개 영역 전체와 DB 기반 진단·점수 엔진, 수요 지도(플래그)를 만든다.
- 요구사항: R-101, R-102, R-103, R-117, R-126, R-127, R-128, R-130, R-131 (+N-03, N-04 1차 점검)
- 작업:
  1. 공개 레이아웃·헤더·푸터(`site.config` 값: 사무소명·등록번호 2종·대표자·주소·수수료 링크), "구직자 이용료 없음" 고정 표기.
  2. `src/lib/visa-engine/evaluate.ts`(PUBLISHED VisaRule만, 불일치 시 YELLOW + 확인 필요 키), `src/lib/score/e74.ts`(PUBLISHED ScoreTable만, 총점·항목별·부족 항목·참고 문구; 없으면 `NOT_READY`). 규칙 조건 JSON의 zod 스키마(구조만).
  3. `/[locale]/visa-check`, 진단 위젯 컴포넌트, `/[locale]/score/e74`(시드 상태 "준비 중" + 상담 안내). 모든 결과에 "참고용, 행정사 확인 필요".
  4. `/[locale]`(메인): 대상 선택 3버튼, 진단 위젯, 실적 지표(C-7), 수요 지도 미리보기(플래그), 수수료 링크.
  5. `/about`, `/fees`, `/privacy`, `/terms`: 초안 + [전문가 검토 필요].
  6. `src/lib/demand/aggregate.ts`: 최근 30일 C·B·A 리드 시·도×업종 집계, 급여 중앙값 구간, n<5 "자료 부족". `/[locale]/demand`(플래그 off → 404), 고지 문구 6개 언어, 버튼 2개만(C-8).
  7. SEO: `app/sitemap.ts`, `app/robots.ts`, `generateMetadata` hreflang alternates, Organization JSON-LD, `/admin`·`/employer/candidates` noindex(메타 + robots).
  8. `/[locale]/guide/[slug]`(MDX 샘플 1편, reviewedBy·updatedAt, FAQPage·BreadcrumbList JSON-LD), `/[locale]/cases` 골격.
  9. `scripts/lighthouse.ts` + `pnpm lighthouse`: `pnpm build && pnpm start`(테스트 DB) 후 `/ko`, `/ko/about`, `/ko/fees`, `/ko/terms` 모바일 프리셋 각 3회 중앙값.
- 만들거나 고칠 파일: `src/app/[locale]/(public)/**`, `src/app/sitemap.ts`, `src/app/robots.ts`, `src/components/public/**`, `src/lib/visa-engine/evaluate.ts`, `src/lib/score/e74.ts`, `src/lib/demand/aggregate.ts`, `src/lib/seo/jsonld.ts`, `content/guide/*.mdx`, `messages/*.json`, `scripts/lighthouse.ts`, `package.json`(lighthouse 스크립트), `tests/unit/{evaluate,e74,demand}.test.ts`, `tests/e2e/{home,static-pages,seo,demand,score}.spec.ts`
- 완료 조건(PRD 인용):
  - R-101 "6개 언어에서 요소 존재 E2E"
  - R-102 "페이지 200 응답, 약관·개인정보 문서에 [전문가 검토 필요] 표시"
  - R-103 "메인·about·fees·terms 모바일 성능 ≥85, 접근성 ≥90 (프로덕션 빌드 기준)"
  - R-117 "마스킹 테스트(WO §15-10), 고지 문구 6개 언어 출력, "지원하기" 버튼 없음" + R-015 재확인(플래그 off 시 비활성)
  - R-126 "모든 결과에 "참고용, 행정사 확인 필요" 문구(BR-11)"
  - R-127 "시드 상태에서 "준비 중" 표시 E2E. 결과에 총점·항목별·부족 항목·참고 문구" (결과 형식은 테스트 전용 PUBLISHED 더미 점수표로 단위 테스트)
  - R-128 "`src/`에서 비자 배점·요건 상수 0건 — QA 코드 리뷰 체크리스트"
  - R-130 "응답에서 각 요소 확인"
  - R-131(선택) "페이지 렌더, 스키마 출력"
  - N-03(이 Phase 문서분), N-04 "375px 폭에서 가로 스크롤 없음"(공개 페이지)
- QA 방법: E2E(6개 언어 루프, 375px 뷰포트에서 `scrollWidth <= clientWidth`), Lighthouse JSON 보고서 점수 확인, `curl`로 sitemap·robots·hreflang·JSON-LD 확인, `qa:static` + 사람 코드 리뷰(R-128).
- 검증 명령: `pnpm lint && pnpm typecheck && pnpm test && pnpm i18n:check && pnpm qa:static && pnpm build && pnpm test:e2e && pnpm lighthouse`
- 위험: Lighthouse 점수 변동, 6개 언어 문구 분량, 메인 실적 지표 데이터 출처 미정(C-7).
- 사람 승인 지점: 없음(약관·개인정보 초안의 법률 확정은 범위 밖, 인도 시 표시).

### P1b — 인증 기반(Auth.js·OTP·직원 2FA·기업 가입)
- 목표: 세 종류 로그인(구직자 OTP, 기업 이메일·비번, 직원 이메일·비번+TOTP)과 미들웨어 보호를 한 번에 안정화한다. 위험이 몰린 Phase라 범위를 작게 잡았다.
- 요구사항: R-104, R-118, R-123
- 작업:
  1. Auth.js v5 설정(`src/auth.ts`): JWT 세션, Credentials 프로바이더 3개(`seeker-otp`, `employer-password`, `staff-password`), 세션에 role·`twoFactorVerified` 포함.
  2. OTP: `src/lib/otp.ts` — OtpChallenge 테이블(코드 해시 저장, phoneHash 키), 재전송 60초, 시간당 5회, 오입력 5회 잠금, 개발 모드 콘솔 출력(콘솔 알림 어댑터 재사용). 시계 주입(`now`)으로 테스트.
  3. `src/lib/rate-limit.ts`(Postgres `RateLimitBucket`, 고정 창) — OTP 발송·로그인에 적용(수집 API 적용과 R-129 최종 테스트는 P1d).
  4. 직원: `/admin/login`, `/admin/2fa/setup`(otplib, QR 대신 otpauth 문자열·수동 키 표시 — 추가 패키지 없음), `/admin/2fa/verify`. 미들웨어를 next-intl + Auth 체인으로 합쳐 `/admin/*`는 직원 역할 + `twoFactorVerified` 없으면 거부. `/admin`은 한국어 전용.
  5. 기업: `/[locale]/employer/signup`, `/[locale]/employer/login`, 사업자번호 `bizRegNoEnc` + `bizRegNoHash` 중복 거부, argon2 해시.
  6. 구직자 OTP 로그인 화면(`/[locale]/seeker/login`) — 등록 흐름은 P1c.
- 만들거나 고칠 파일: `src/auth.ts`, `src/app/api/auth/[...nextauth]/route.ts`, `src/middleware.ts`, `src/lib/{otp,rate-limit,password}.ts`, `src/app/admin/{login,2fa}/**`, `src/app/[locale]/employer/{signup,login}/**`, `src/app/[locale]/seeker/login/**`, `src/schemas/auth.ts`, `messages/*.json`, `tests/unit/{otp,rate-limit,admin-auth,employer-signup}.test.ts`, `tests/e2e/auth.spec.ts`
- 완료 조건(PRD 인용):
  - R-104 "60초 내 재전송 거부, 시간당 5회 초과 거부, 오입력 5회 잠금 — 테스트"
  - R-118 "2FA 미완료 시 `/admin/*` 접근 거부 테스트"
  - R-123 "같은 사업자번호 재가입 거부 테스트"
- QA 방법: 단위 테스트(시계 주입) + E2E(직원 비번만 로그인 후 `/admin` 접근 시 2FA 화면으로 리다이렉트·거부, otplib로 생성한 코드로 통과), 로그 출력에 OTP 외 PII 없음 확인.
- 검증 명령: `pnpm lint && pnpm typecheck && pnpm test && pnpm i18n:check && pnpm qa:static && pnpm build && pnpm test:e2e`
- 위험: Auth.js v5 베타 API 변경, 미들웨어 체인(next-intl + Auth) 충돌, Edge 런타임에서 Prisma 사용 불가.
- 사람 승인 지점: 없음(실제 SMS 발송 없음).

### P1c — 구직자 등록(간편·위저드)·트랙 분류·마이페이지
- 목표: 구직자 풀 형성의 핵심 흐름을 완성한다.
- 요구사항: R-105, R-106, R-107, R-108, R-109, R-110, R-111, R-112, R-113
- 작업:
  1. `src/lib/visa-engine/classifyTrack.ts`: VisaType 행(defaultTrack, registrable, autoConsult, needsVisaReview, graduationWindowMonths)만으로 판정. 만료일 과거·비자 없음 → 등록 불가. 코드에 비자 코드 문자열 매핑 없음.
  2. `src/schemas/seeker/step{0..7}.ts` + `quick.ts`: WO §7.3 키 그대로, 서버 액션과 RHF가 같은 스키마 사용. 문항 키 체크리스트 테스트(WO §7.3 키 목록 상수는 테스트 파일에만).
  3. 간편 등록 `/[locale]/seeker/register/quick`: 언어·비자·시도·OTP·필수 동의 → `isQuickSignup=true`, grade B, "프로필 완성" 알림 작업 생성(콘솔 어댑터; 작업 기록 방식은 pg-boss 큐 적재 또는 C-4 결정 테이블).
  4. 정식 위저드 `/[locale]/seeker/register`: Step 0~7, 화면당 ≤7문항, 진행률, 공개 여부 배지, "모름" 선택지, 비자 코드+쉬운 설명. 단계 저장 서버 액션(`completedStep` 갱신, PII는 `*Enc`).
  5. 재진입: 로그인 시 `completedStep + 1` 단계로 이동, 입력값 복원.
  6. BR-08 차단: 서버 액션에서 registrable=false·만료·없음이면 완료 거부, 상담 안내 화면.
  7. 동의: `content/consents/{type}/{version}/{locale}.md` 초안([전문가 검토 필요]), Consent 저장(type·version·locale·agreedAt·ipHash). BLIND_PROFILE은 JOB_MATCH만 필수.
  8. `?ref`·`?src` 쿠키 보존 → `referredByCode`·`sourceChannel`, 고유 referralCode 발급.
  9. 완료 화면: 등급 B·승급 안내, 추천 코드·공유(Web Share API, 링크 복사, URL 스킴 공유 — SDK 없음, C-9), 트랙별 다음 행동 버튼.
  10. `/[locale]/seeker/me`, `/me/stay`, `/me/referral`, 동의 철회(revokedAt). 기업 후보 쿼리 함수 `src/lib/candidates/eligible.ts`의 동의 조건(BLIND_PROFILE 미철회)을 이 Phase에서 만들고 R-113 테스트에 사용(P2b가 재사용).
- 만들거나 고칠 파일: `src/lib/visa-engine/classifyTrack.ts`, `src/schemas/seeker/**`, `src/app/[locale]/seeker/{register,me}/**`, `src/components/seeker/**`, `src/components/forms/**`, `src/lib/seeker/{save-step,referral,consent}.ts`, `src/lib/candidates/eligible.ts`, `content/consents/**`, `messages/*.json`, `tests/unit/{classifyTrack,register-block,consent,step-keys}.test.ts`, `tests/e2e/{quick-register,wizard-resume,referral,complete-screen,consent-revoke}.spec.ts`
- 완료 조건(PRD 인용):
  - R-105 "완료 시 `isQuickSignup=true`, grade B, "프로필 완성" 알림 작업 생성(콘솔 어댑터)"
  - R-106 "각 단계 문항 키가 WO §7.3과 일치(체크리스트), zod 스키마를 서버·클라이언트 공유"
  - R-107 "E2E: Step 3까지 작성 후 새 세션 재로그인 → Step 4에서 재개, 입력값 유지"
  - R-108 "WO §7.4 표 전 행 테스트 통과. 코드에 비자→트랙 매핑 상수 없음"
  - R-109 "B-1, B-2, C-3, 만료일 과거, 비자 없음 → 서버에서 등록 완료 거부 + 상담 안내 (WO §15-5)"
  - R-110 "Consent 행에 4개 값 저장 테스트. BLIND_PROFILE은 JOB_MATCH만 필수"
  - R-111 "E2E: 파라미터로 진입·등록 시 `referredByCode`, `sourceChannel` 저장"
  - R-112 "화면 요소 존재 E2E"
  - R-113 "BLIND_PROFILE 철회 즉시 기업 후보 쿼리에서 제외 (WO §15-8)"
  - N-03(동의서 초안), N-04(구직자 화면 375px)
- QA 방법: 단위·E2E 결과, 위저드를 375px로 수동 1회 통과해 스크린샷, 동의서 파일마다 [전문가 검토 필요] grep.
- 검증 명령: `pnpm lint && pnpm typecheck && pnpm test && pnpm i18n:check && pnpm qa:static && pnpm build && pnpm test:e2e`
- 위험: 번역 분량 최대 Phase(위저드 문항 6개 언어), 부분 저장과 NOT NULL 충돌(C-3), E2E에서 OTP 코드 획득(테스트 모드에서 콘솔 어댑터 대신 테스트 전용 인메모리 수신함 사용).
- 사람 승인 지점: 없음.

### P1d — 구인 수집·리드 작업·기업 진단·구인 의뢰·속도 제한
- 목표: 리드가 들어오고(C) 기업이 스스로 의뢰해(B) 관리자 큐로 가는 경로를 만든다.
- 요구사항: R-114, R-115, R-116, R-124, R-125, R-129
- 작업:
  1. `POST /api/ingest/job-leads`: `x-api-key`(환경변수, 상수시간 비교), zod 배열 ≤200, `sourceRef` upsert, closesAt 과거 거부, Industry·Region 시드로 KSIC·인구감소지역 태깅, `rawJson` 저장, 속도 제한.
  2. DO_NOT_CONTACT 리드는 upsert 시 grade 유지(C 복귀 금지). ARCHIVED 처리 규칙도 명시.
  3. pg-boss 설정(`src/lib/jobs/boss.ts`, 별도 스키마 `pgboss`), 워커 엔트리 `scripts/worker.ts` + `pnpm worker`. 작업 핸들러는 `(now: Date) => Promise<Result>` 순수 함수로 분리: `archiveStaleLeads`(30일 미접촉·마감 → ARCHIVED).
  4. `/[locale]/employer/diagnosis`: 업종·시군구·상시근로자·내국인 피보험자·외국인 현황 입력 → evaluate.ts → GREEN/YELLOW/RED + "행정사 확인 필요", 결과를 리드로 저장(source=DIAGNOSIS 계열).
  5. `/[locale]/employer/request`(로그인 기업): 회사정보 암호화(Company `*Enc`), 자유 입력란 pii-guard(거부 + 사유 표시), 제출 시 해당 리드 생성/연결 후 B 전이 + AuditLog + 검증 큐 표시.
  6. R-129 마무리: OTP·로그인(P1b 적용분)·수집 API 각각 한도 초과 429 통합 테스트.
- 만들거나 고칠 파일: `src/app/api/ingest/job-leads/route.ts`, `src/lib/leads/{ingest,tagging,transitions}.ts`, `src/lib/jobs/{boss,archive-leads}.ts`, `scripts/worker.ts`, `src/app/[locale]/employer/{diagnosis,request}/**`, `src/components/employer/**`, `src/schemas/employer/**`, `messages/*.json`, `package.json`(worker 스크립트), `tests/unit/{ingest,dnc,archive-job,diagnosis,employer-request,rate-limit-429}.test.ts`, `tests/e2e/employer-intake.spec.ts`
- 완료 조건(PRD 인용):
  - R-114 "테스트: 같은 배치 2회 → 행 수 동일, closesAt 과거 거부, 201건 거부, 키 없음 401"
  - R-115 "테스트" (DO_NOT_CONTACT 리드 재수집 후 grade가 DO_NOT_CONTACT 유지)
  - R-116 "시간 조작 테스트로 보관 전이 확인"
  - R-124 "PUBLISHED 규칙 없음 → YELLOW+확인 필요 (WO §15-9)"
  - R-125 "연락처 포함 입력 거부/마스킹 테스트, B 전이 테스트"
  - R-129 "한도 초과 시 429 테스트" (OTP, 로그인, 수집 API 3종)
- QA 방법: 테스트 출력, `curl`로 수집 API 수동 호출 1회(키 없음 401, 정상 201/200), 워커 기동 로그 확인.
- 검증 명령: `pnpm lint && pnpm typecheck && pnpm test && pnpm i18n:check && pnpm qa:static && pnpm build && pnpm test:e2e`
- 위험: pg-boss 시간 조작, 진단 결과→리드 저장 시 JobLead 필수 필드(companyName 등) 부재.
- 사람 승인 지점: 없음(외부 수집 에이전트 연결·실제 Work24 API 호출 없음).

### P1e — 관리자 MVP (병렬 후보)
- 목표: 직원이 구직자를 검증하고 리드를 전화로 다루는 화면을 만든다. 한국어 전용.
- 요구사항: R-119, R-120, R-121, R-122
- 작업:
  1. `/admin` 대시보드: 신규 구직자, 전화 대상 리드, 면접 일정, 만료 임박(C-10) 카운트 쿼리 `src/lib/admin/dashboard.ts`.
  2. 구직자 검토 큐 `/admin/seekers`: 상세(복호 필드 열람 시 PII_VIEW), 등급 B→A(consultedAt + verifiedVisa), A→S(verifiedKorean + ACTIVE + 30일 내 확인) 조건 검사 서버 액션, 트랙 변경, 전환 가능성(convertibleVisa/At) 입력, 모두 AuditLog.
  3. 리드 칸반 `/admin/leads`: C/B/A/보관/재접촉금지 열, 통화 기록(CallLog) → 결과별 전이(INTERESTED→B, DNC→DO_NOT_CONTACT, 구인신청·검증→A), 전이마다 AuditLog.
  4. `src/lib/leads/priority.ts`: WO §8.3 식, 가중치는 설정값(C-5), 기본 정렬 priority 내림차순, "대기 인력 n명".
  5. 모든 관리자 서버 액션에 rbac 검사(STAFF_PLACEMENT/STAFF_VISA 분리).
- 만들거나 고칠 파일: `src/app/admin/(staff)/{page,seekers,leads}/**`, `src/app/admin/_i18n/ko.ts`, `src/components/admin/**`, `src/lib/admin/**`, `src/lib/leads/priority.ts`, `tests/unit/admin/{dashboard,promote,lead-transition,priority,pii-view}.test.ts`, `tests/e2e/admin-core.spec.ts`
- 완료 조건(PRD 인용):
  - R-119 "각 카운트가 DB 상태와 일치"
  - R-120 "조건 미충족 승격 거부, 등급 변경 시 AuditLog 생성 테스트"
  - R-121 "등급 전이 시 AuditLog, 기본 정렬이 priority 내림차순 테스트"
  - R-122 "복호 필드를 관리자 화면에서 열람 시 `PII_VIEW` 기록 테스트"
- QA 방법: 픽스처 데이터로 카운트 대조 테스트, E2E(직원 로그인+2FA → 승격 → AuditLog 확인).
- 검증 명령: `pnpm lint && pnpm typecheck && pnpm test && pnpm qa:static && pnpm build && pnpm test:e2e`
- 위험: 병렬 실행 시 공유 파일 충돌 → 병렬 조건(위) 위반 시 직렬로 전환.
- 사람 승인 지점: 없음.

### P2a — 블라인드 공고·`/jobs`·면접 신청
- 요구사항: R-201, R-202, R-203
- 작업:
  1. `/admin/postings`: A등급 리드에서만 생성(서버 검증), 검증(verifiedBy/At 기록), 공개(verifiedAt 없으면 서버 에러), 공개 시 AuditLog(POSTING_PUBLISH).
  2. `src/lib/serializers/publicPosting.ts`: WO §8.5 표시 항목만 화이트리스트 직렬화(회사명·주소·담당자·연락처·사업자번호 제외).
  3. `/[locale]/jobs`, `/[locale]/jobs/[id]`(FEATURE_PUBLIC_JOBS, off면 404): PUBLISHED + verifiedAt만. JobPosting JSON-LD 미출력.
  4. "면접 신청": 로그인 구직자 → InterestRequest(SEEKER) + 담당자 알림(콘솔 어댑터), 비로그인 → 간편 등록(`?next=`), 비자가 eligibleVisas에 없으면 "상담 신청" 버튼.
- 만들거나 고칠 파일: `src/app/admin/(staff)/postings/**`, `src/lib/postings/**`, `src/lib/serializers/publicPosting.ts`, `src/app/[locale]/(public)/jobs/**`, `src/app/api/jobs/**`(필요 시), `messages/*.json`, `tests/unit/{posting-guard,public-posting}.test.ts`, `tests/e2e/jobs-apply.spec.ts`
- 완료 조건(PRD 인용):
  - R-201 "C·B 리드로 생성 시 서버 에러, verifiedBy/At 없이 공개 시 서버 에러 (WO §15-4), 공개 시 AuditLog"
  - R-202 "C·B 리드 노출 0 (WO §15-3), 응답에 금지 필드 없음 테스트" + 플래그 off 시 비활성(R-015 재확인)
  - R-203 "E2E 3가지 경우"
- QA 방법: 테스트 출력, `/jobs` HTML에 `JobPosting` 문자열 없음 확인.
- 검증 명령: `pnpm lint && pnpm typecheck && pnpm test && pnpm i18n:check && pnpm qa:static && pnpm build && pnpm test:e2e`
- 위험: 공고 공개 화면이 플래그 off 기본이라 E2E는 테스트 환경 변수로 켬 — 기본값 회귀 테스트를 별도로 유지.
- 사람 승인 지점: 없음(플래그 켜기는 운영자 법무 확인 후, A-5).

### P2b — 블라인드 직렬화·기업 후보 열람·계약 동의
- 요구사항: R-204, R-205, R-206, R-207, R-208
- 작업:
  1. `src/lib/serializers/blindSeeker.ts`: `BLIND_SEEKER_FIELDS`(WO §7.5 그대로), publicId, 계산값(stayRemainingBand, yearsInKorea, experienceSummary, groupApplySize, majorField). 화이트리스트 외 키는 구조적으로 생성 불가(명시적 매핑).
  2. 후보 쿼리: P1c `eligible.ts` 확장 — grade S·A, track JOB_MATCH, status ACTIVE, jobSearchStatus 활성, BLIND_PROFILE 미철회. 필터 8종.
  3. `/[locale]/employer/candidates`(FEATURE_EMPLOYER_CANDIDATES): verified + contractSignedAt 기업만 목록, 아니면 요약 통계(소표본 마스킹 방식은 수요 지도와 동일 규칙 적용 여부 C-11). noindex 유지.
  4. "면접 요청" → InterestRequest(EMPLOYER). 일 100건 열람 상한(RateLimitBucket), 101번째 429, 대량 조회 AuditLog(C-12).
  5. 계약 동의 `/[locale]/employer/contract`: 이용약관 체크 → contractSignedAt, 약관 PDF 다운로드(빌드 시 `scripts/build-terms-pdf.ts`가 Playwright로 md→PDF 생성, [전문가 검토 필요]), visaMandateAgreed 별도 체크(선택).
  6. 기업 API 누출 테스트 하네스 `tests/unit/employer-api-leak.test.ts`: 기업용 라우트 목록을 레지스트리로 관리하고 전수 호출 → 전화·이메일 정규식 0건(C-1 결정에 따라 R-211 예외 처리).
- 만들거나 고칠 파일: `src/lib/serializers/blindSeeker.ts`, `src/lib/candidates/**`, `src/app/[locale]/employer/{candidates,contract}/**`, `src/app/api/employer/**`, `content/terms/employer/**`, `scripts/build-terms-pdf.ts`, `public/docs/`(생성물), `messages/*.json`, `tests/unit/{blind-seeker,candidates-eligibility,employer-api-leak,view-cap,contract}.test.ts`, `tests/unit/__snapshots__/**`, `tests/e2e/employer-candidates.spec.ts`
- 완료 조건(PRD 인용):
  - R-204 "모든 시드 프로필 직렬화 키 ⊆ BLIND_SEEKER_FIELDS (WO §15-1), 스냅샷 테스트" (시드에 테스트용 구직자 프로필 픽스처 포함)
  - R-205 "E-9 등록자 제외 (WO §15-6), 미계약 기업은 통계만" + 플래그 off 시 비활성
  - R-206 "기업용 모든 API 응답 전수에 전화·이메일 정규식 탐지 0건 (WO §15-2)"
  - R-207 "101번째 열람 429, 로그 기록 테스트"
  - R-208 "위임 미동의로도 계약 완료 가능 테스트"
- QA 방법: 테스트 출력, 스냅샷 파일 열람(키 목록), PDF 파일 열어 [전문가 검토 필요] 확인.
- 검증 명령: `pnpm lint && pnpm typecheck && pnpm test && pnpm i18n:check && pnpm qa:static && pnpm build && pnpm test:e2e`
- 위험: "기업용 API 전수"의 범위가 누락될 수 있음 → 라우트 레지스트리 + 레지스트리 밖 `/api/employer/**` 파일 존재 시 테스트 실패.
- 사람 승인 지점: 없음.

### P2c — 매칭·추천 원장·면접·소개 확인서·건별 동의·계약/체류 사건
- 요구사항: R-209, R-210, R-211, R-212, R-216
- 작업:
  1. `/admin/matching`: 공고별 적합 구직자(eligible + 공고 조건), 추천 실행 → Recommendation insert + AuditLog(RECOMMEND), 면접 일정(Interview). 리포지토리 계층은 Recommendation에 create/find만 노출(update/delete 함수 없음, `qa:static`이 `recommendation.update|delete|upsert` 검출).
  2. 소개 확인서 업로드: `storage/private/`(git 제외, 웹 루트 밖), HMAC 서명 URL 5분 만료, `/api/files/[token]` 만료·변조 403.
  3. THIRD_PARTY_INTERVIEW: 면접 확정 시 구직자에게 건별 동의 요청(구직자 `/me`에서 동의), 동의 전 기업 화면·API에 실명·연락처 없음, 동의 후 해당 기업·해당 건에만 제공(C-1 결정 방식).
  4. `/[locale]/employer/requests`(면접 요청 현황), `/[locale]/seeker/me/recommended`(C-13).
  5. `/admin/placements`, `/admin/visa-cases`: 기본 CRUD, 고유식별정보 필드 없음, STAFF_PLACEMENT는 VisaCase 상세 거부(rbac).
- 만들거나 고칠 파일: `src/app/admin/(staff)/{matching,placements,visa-cases}/**`, `src/lib/recommendations/**`, `src/lib/files/{storage,signed-url}.ts`, `src/app/api/files/[token]/route.ts`, `src/lib/consent/third-party.ts`, `src/app/[locale]/employer/requests/**`, `src/app/[locale]/seeker/me/recommended/**`, `messages/*.json`, `.gitignore`, `tests/unit/{recommendation-ledger,signed-url,third-party-consent,visa-case-rbac}.test.ts`, `tests/e2e/{employer-requests,seeker-recommended}.spec.ts`
- 완료 조건(PRD 인용):
  - R-209 "앱 계층에 Recommendation update/delete 경로 없음 + DB 트리거 테스트"
  - R-210 "만료 후 접근 403 테스트"
  - R-211 "동의 전 기업 화면·API에 실명·연락처 없음, 동의 후 해당 기업에만 제공 테스트"
  - R-212 "페이지 동작 E2E"
  - R-216 "STAFF_PLACEMENT는 VisaCase 상세 접근 거부"
- QA 방법: 테스트 출력, 업로드 파일이 `public/` 아래 없음 확인, 서명 URL 시계 주입 테스트.
- 검증 명령: `pnpm lint && pnpm typecheck && pnpm test && pnpm i18n:check && pnpm qa:static && pnpm build && pnpm test:e2e`
- 위험: R-206과 R-211의 충돌(C-1) — 결정 전에는 이 Phase의 작업 3을 시작하지 않는다.
- 사람 승인 지점: C-1 결정.

### P2d — 예약 작업·알림 어댑터·규칙/점수표 관리
- 요구사항: R-213, R-214, R-215
- 작업:
  1. R-214: `NotificationProvider` 정식화, 콘솔 어댑터 테스트, SMTP 어댑터(nodemailer, `SMTP_HOST` 등 미설정 시 비활성·발송 시도 없음). 실제 SMTP 접속 테스트 없음(모의 transport).
  2. R-213 작업 핸들러(`now` 주입): 30일 상태 확인(원클릭 토큰 링크 `/[locale]/seeker/still-searching/[token]`), 14일 무응답 → INACTIVE + S→A 강등(AuditLog), 체류 만료 D-90/60/30 알림 + 행정사 업무 생성(C-4), 노쇼 2회 이상 우선순위 하향(내부 표시). pg-boss 스케줄 등록은 워커에서.
  3. R-215: `/admin/rules`, `/admin/score-tables` — 버전 생성, DRAFT→PUBLISHED(STAFF_VISA 이상, reviewedBy/At 기록), RETIRED. 게시 시 이전 PUBLISHED 버전 RETIRED 처리. 값 입력은 사람(행정사)이 함.
- 만들거나 고칠 파일: `src/lib/notifications/{smtp,index}.ts`, `src/lib/jobs/{status-check,stay-expiry,no-show}.ts`, `scripts/worker.ts`, `src/app/[locale]/seeker/still-searching/**`, `src/app/admin/(staff)/{rules,score-tables}/**`, `src/lib/rules/**`, `messages/*.json`, `.env.example`, `tests/unit/jobs/{status-check,stay-expiry,no-show}.test.ts`, `tests/unit/{notifications,rules-publish}.test.ts`
- 완료 조건(PRD 인용):
  - R-213 "시간 조작 테스트로 각 발송·전이 확인"
  - R-214 "콘솔 어댑터 테스트, SMTP는 설정 없으면 비활성"
  - R-215 "DRAFT는 공개 계산에 미사용 테스트, 게시 시 reviewedBy/At 기록"
- QA 방법: 테스트 출력(D-91/D-90/D-89 경계 케이스 포함), 관리자 화면 수동 게시 1회 후 `/visa-check` 결과 변화 확인(로컬 테스트 DB, 더미 규칙).
- 검증 명령: `pnpm lint && pnpm typecheck && pnpm test && pnpm i18n:check && pnpm qa:static && pnpm build && pnpm test:e2e`
- 위험: 실제 SMTP로 잘못 발송 → 테스트·개발에서 SMTP 환경변수 비움, 어댑터 선택 로그 확인.
- 사람 승인 지점: A-3(실제 SMTP 자격 증명 설정과 첫 발송은 범위 밖, 사람 승인 필요).

### P2e — 통합 E2E·전체 BR 감사·출시 점검
- 요구사항: R-217 (+ N-01, N-02, N-04, N-05 최종)
- 작업:
  1. Playwright 통합 시나리오: 간편 등록 → 프로필 완성(위저드) → 관리자 A 승격(2FA 포함) → 기업(verified·계약 픽스처) 후보 노출 → 면접 요청 → 관리자 추천 → Recommendation 행 확인.
  2. N-05 묶음 테스트: PII 열람, 내보내기(C-14), 등급 변경, 추천, 공고 공개 각각 AuditLog.
  3. N-01 전수 코드 리뷰 체크리스트(채팅·연락처 열람·이메일 전달·외부 링크 공유 UI/API 0건), N-04 주요 화면 375px 일괄 E2E, `i18n:check`.
  4. WO §15 1~11 매핑표를 README/QA 보고에 정리(어떤 테스트 파일이 어떤 항목인지).
  5. 기능 플래그 4종 기본 false 확인, 전체 명령 1회 클린 실행(`db:reset` 후).
- 만들거나 고칠 파일: `tests/e2e/integration.spec.ts`, `tests/unit/audit-coverage.test.ts`, `tests/e2e/mobile-375.spec.ts`, `README.md`
- 완료 조건(PRD 인용):
  - R-217 "간편 등록 → 프로필 완성 → 관리자 A 승격 → 기업 후보 노출 → 면접 요청 → 추천 원장 생성 Playwright 통과"
  - N-01 "채팅·연락처 열람·이메일 전달·외부 링크 공유 UI/API 0건 (QA 코드 리뷰)"
  - N-02 "`pnpm i18n:check` 누락 0" / N-04 "375px 폭에서 가로 스크롤 없음" / N-05 "PII 열람, 내보내기, 등급 변경, 추천, 공고 공개 각각 로그 생성 테스트"
  - PRD §6: WO §15 11개 통과, `pnpm lint`·`pnpm test`·`pnpm test:e2e`·`pnpm build` 성공, 플래그 4종 false
- 검증 명령: `pnpm db:reset && pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm i18n:check && pnpm qa:static && pnpm build && pnpm test:e2e && pnpm lighthouse`
- 사람 승인 지점: Gate 4(완료·출시 판정).

---

## 위험과 대응
| 위험 | 가능성 | 영향 | 대응 |
|---|---|---|---|
| embedded-postgres가 Windows에서 실패(공백 포함 경로 "VISA n JOB _HomePage", 관리자 권한 셸에서 initdb 거부, 방화벽 팝업) | 중 | 상 | P0b 첫 작업을 스파이크로 둔다. 데이터 디렉터리를 `PG_DATA_DIR`로 분리(공백 없는 `%LOCALAPPDATA%` 경로로 전환 가능), 일반 권한 셸 사용, 127.0.0.1 바인딩. 실패 시 멈추고 보고(대안: 로컬 PostgreSQL 설치 — 사람 결정) |
| Prisma 6 + 임베디드 PG의 shadow DB·엔진 바이너리 다운로드 | 중 | 중 | 슈퍼유저로 shadow DB 생성 허용, `prisma generate`를 postinstall에서 실행. 7.x 업그레이드 금지 |
| DB 트리거와 Prisma 마이그레이션 결합(트리거가 drift로 보임, `migrate reset`·테스트 정리 시 TRUNCATE/DELETE가 막힘) | 상 | 중 | 트리거는 `--create-only` 마이그레이션 SQL에만 둔다(스키마 diff 대상 아님). 테스트는 실행마다 DB를 새로 만들고 행 삭제 정리를 하지 않음. 개발 리셋은 `db:reset`(DB drop/create) |
| Auth.js v5가 베타이며 Credentials 3종 + 2FA 상태 + next-intl 미들웨어 체인이 복잡 | 상 | 상 | 정확한 베타 버전 고정, JWT 세션, 미들웨어에서는 Prisma 미사용(세션 클레임만 검사), DB 검사는 서버 컴포넌트·액션에서. P1b를 3개 요구사항으로 작게 분리 |
| next-intl 4 + Next 15 App Router: `/admin`·`/api` 제외 매처, 정적 렌더링(`setRequestLocale`) 누락 시 성능 저하 | 중 | 중 | P0a에서 매처·정적 파라미터 패턴 확정, E2E로 6개 언어 라우팅과 `/admin` 비로케일 확인 |
| Lighthouse 점수 변동·측정 환경(개발 서버, 로컬 PC 부하) | 중 | 중 | 프로덕션 빌드 + 3회 중앙값, Playwright Chromium을 `CHROME_PATH`로 사용, 공개 페이지는 정적 렌더·폰트 최소화·이미지 없음 우선. 측정 조건을 보고서에 기록 |
| 6개 언어 번역 분량(특히 위저드·동의서·고지) | 상 | 중 | 각 Phase에서 ko 먼저 확정 후 5개 언어 동시 추가, `i18n:check`를 Phase 게이트로. 번역 품질은 `_review` 표시로 인도(원어민 검수는 범위 밖) |
| pg-boss 시간 조작 테스트 | 중 | 중 | 비즈니스 로직을 `now` 주입 순수 핸들러로 분리해 직접 호출. pg-boss는 스케줄 등록·큐 적재만 별도 통합 테스트(실시간 대기 없음) |
| 블라인드·연락처 누출(BR-01~03) 회귀 | 중 | 상 | 화이트리스트 직렬화 + 기업 API 레지스트리 전수 누출 테스트 + `qa:static`, 매 Phase 실행 |
| 법령 수치 하드코딩(BR-12) 혼입 | 중 | 상 | 시드 SAMPLE 규칙, 테스트용 PUBLISHED 규칙은 테스트 파일 안의 명백한 더미 값만, 사람 코드 리뷰 체크리스트 |
| corepack enable이 Node 설치 폴더(Program Files) 쓰기 권한 필요 | 상 | 하 | A-1 참조. 권한 없으면 `corepack pnpm ...` 호출 또는 사용자 폴더 설치 디렉터리 사용 |

## 사람의 승인이 필요한 지점
되돌리기 어렵거나 시스템·외부에 영향이 있는 작업. 계획에는 포함하지 않았고, 해당 시점에 멈추고 묻는다.

| 번호 | 지점 | 시점 | 비고 |
|---|---|---|---|
| A-1 | corepack 방식 선택: `corepack enable`(관리자 권한 필요할 수 있음) vs 권한 없이 `corepack pnpm` 사용 | P0a 시작 | 시스템 폴더 변경이 필요하면 사람 승인 |
| A-2 | Playwright Chromium 다운로드(약 150~200MB, 사용자 캐시) | P0a | Gate 3 승인으로 갈음 가능 |
| A-3 | 실제 SMTP·SMS 자격 증명 설정과 첫 외부 발송 | 범위 밖 | 계획에 없음 |
| A-4 | git 원격 저장소 연결·push, GitHub Actions 원격 실행 | 범위 밖 | 계획에 없음(로컬 init만) |
| A-5 | 기능 플래그 4종 켜기 | 범위 밖 | 운영자 법무 확인 후 |
| A-6 | 규칙·점수표 실제 값 입력과 PUBLISHED 게시 | 범위 밖 | 행정사가 관리자 화면에서 |
| A-7 | 약관·동의서·고지 문구 확정, 번역 원어민 검수 | 범위 밖 | 초안에 표시만 |
| A-8 | 실서버 배포·도메인·운영 DB(서울 리전) | 범위 밖 | 계획에 없음 |
| A-9 | 데이터 삭제가 포함된 명령(`db:reset`)은 로컬 개발·테스트 DB에만 사용, 다른 DB를 가리키는 연결 문자열이면 거부하도록 스크립트에 가드 | 상시 | |

---

## 확인 필요 (PRD 모순·누락 — 임의로 해결하지 않음)

| 번호 | 내용 | 관련 | 영향 Phase | 제안(결정은 사람) |
|---|---|---|---|---|
| C-1 | **R-206 vs R-211 모순.** R-206은 "기업용 모든 API 응답 전수에 전화·이메일 0건", R-211은 THIRD_PARTY_INTERVIEW 동의 후 "해당 기업에만 실명·연락처 제공". 또 BR-01은 "연락처 열람" 기능 금지 | R-206, R-211, BR-01 | P2b, P2c | (가) 동의 후에도 연락처는 앱으로 제공하지 않고 직원이 면접 안내 시 전달, 앱은 실명만 제공 / (나) 동의 후 면접 상세 API 1개만 R-206 검사 예외로 지정 / (다) 기타 |
| C-2 | 기업 `verified=true`를 누가 어디서 설정하는지 화면이 PRD에 없음(R-205는 verified+계약 기업만 열람) | R-205, R-217 | P2b, P2e | 관리자 "기업 검증" 토글을 범위에 추가할지, 이번 범위는 시드·픽스처로만 처리할지 |
| C-3 | WO §5 SeekerProfile의 NOT NULL 필드(legalNameEnc, nationality, koreanSpeaking, needDormitory, shiftOk, jobSearchStatus, hasArc 등)는 간편 등록(언어·비자·시도·휴대폰만)과 단계별 부분 저장(R-105, R-107)으로 채울 수 없음 | R-005, R-105, R-107 | P0b, P1c | (가) 해당 필드를 nullable로 완화(BR 영향 없음, "프로필 완성" 판정은 completedStep으로) / (나) 별도 암호화 초안 테이블 |
| C-4 | "알림 작업"(R-105), "상담 자동 생성"(WO §7.4 D-2/D-10), "행정사 업무 생성"(R-213)을 저장할 모델이 WO §5와 PRD §3 추가 목록에 없음 | R-105, R-108, R-213 | P0b, P1c, P2d | `StaffTask`(유형·대상·담당 역할·기한·상태) 테이블 1개 추가 승인 여부 |
| C-5 | 전화 우선순위 식(WO §8.3)의 S·A 가중치, 인구감소지역 가점, 신규성 가점 값이 없음 | R-121 | P1e | 설정 파일 값(초기값 사람이 지정)으로 두고 테스트는 정렬만 검증 |
| C-6 | 시·군·구 전체 목록과 인구감소지역(행안부 지정) 목록의 출처가 없음. 에이전트가 기억으로 넣으면 BR-12 취지(추정 금지)에 걸릴 수 있음 | R-007, R-114 | P0b | (가) 사람이 공식 파일 제공 / (나) 에이전트 초안 + `isSample`·검토 표시 + 관리자 수정 가능 |
| C-7 | 메인 "실적 지표"의 항목과 데이터 출처 미정(지어낸 숫자 금지) | R-101 | P1a | site.config 플레이스홀더("집계 준비 중") 또는 DB 집계(등록 구직자 수 등) 중 선택 |
| C-8 | 수요 지도 "이 지역·업종 일자리 알림 받기" 버튼의 동작(구독 저장 모델 없음) | R-117 | P1a | 간편 등록으로 이동(지역·업종을 `src`/쿼리로 전달) 또는 범위 밖 처리 |
| C-9 | 완료 화면 "메신저별 공유": 카카오·Zalo 공유는 SDK 앱 키(계정) 필요 → 승인 목록에서 제외함 | R-112 | P1c | Web Share API + 링크 복사 + WhatsApp/Telegram/Viber URL 스킴으로 충족으로 볼지 |
| C-10 | 대시보드 "만료 임박" 기준일 미정 | R-119 | P1e | D-90(R-213과 일치) 제안 |
| C-11 | 미계약 기업용 "요약 통계"의 소표본 마스킹 기준 미정(개별 구직자 추정 위험) | R-205 | P2b | 수요 지도와 같은 5건 미만 마스킹 적용 |
| C-12 | "대량 조회" 감사 로그의 기준(건수·시간) 미정 | R-207 | P2b | 후보 목록 조회마다 기록(상위 집합) 또는 임계값 지정 |
| C-13 | `/seeker/me/recommended` "추천 일자리"의 정의 미정(본인 Recommendation 기반 vs 조건 일치 공개 공고) | R-212 | P2c | 공개 공고 중 비자·지역·업종 일치 목록 + 본인 추천 건 표시 |
| C-14 | N-05의 "내보내기"(EXPORT) 감사 로그 대상인데 PRD에 내보내기 기능 자체가 없음 | N-05, BR-15 | P2e | 이번 범위에서 내보내기 기능 없음 → 감사 함수·액션 상수만 두고 테스트는 함수 단위로 할지, 관리자 CSV 내보내기를 추가할지 |
| C-15 | 직원 계정 생성·관리 화면이 PRD에 없음(R-118은 로그인만) | R-118 | P1b | 개발은 시드(환경변수)로 생성, 관리 화면은 범위 밖 유지 |

"제안" 칸은 참고용이며 PLAN에 반영하지 않았다. C-1(P2c 작업 3), C-3·C-4·C-6(P0b 스키마·시드)은 해당 Phase 시작 전에 결정이 필요하다. 나머지는 해당 Phase 시작 전까지 결정하면 된다.

---

## Gate 3 승인 (2026-11-16)
- 사람이 Phase 구성, 승인 도구 목록, A-1(corepack, 실패 시 `corepack pnpm`), A-2(Chromium 다운로드)를 승인했다.
- 위 "확인 필요" C-1~C-15와 STANDARD §7 C-01~C-12는 모두 결정됨 → `.workflow/DECISIONS.md`의 PC-x / SC-xx 행을 따른다. 요약:
  - C-1: 동의 후 기업에는 **실명만** 앱으로, 연락처는 앱에 없음(직원 전달) → PRD R-211 개정.
  - C-2: 관리자 기업 검증·계약 등록 화면 추가 → **R-218 신설, P2b에 배정**.
  - C-3: SeekerProfile 위저드 필드 nullable, 완성 판정은 completedStep. C-4: `StaffTask` 테이블 추가. (P0b 스키마에 반영)
  - C-6: 시·군·구·인구감소지역은 에이전트 초안 + isSample·검토 필요 표시 + 관리자 수정 가능.
  - 나머지는 DECISIONS.md 권장안대로.
