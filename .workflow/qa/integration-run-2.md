# QA 보고서 — 통합 / run 2 (5단계, I-1 재확인 + 출시 기준 재판정)

- 대상 커밋: 5e2ed93 (HEAD, fix(I-1))
  - 저장소 작업 트리의 src·tests·scripts·prisma·messages·content·package.json은 HEAD와 같다(`git diff --stat HEAD` 빈 출력). 변경은 `.workflow/` 4개 파일뿐.
  - 복사본은 `git archive 5e2ed93`로 풀었다.
- 기준 문서: PRD v1.1(R-001~R-131, R-201~R-218, N-01~N-06, §6), WO §2·§15, PLAN, DECISIONS(Q-29 포함), STATE, STANDARD v2.25 4.11, integration-run-1.md
- 일시: 2026-11-18 14:45 ~ 15:12 (KST)
- 환경:
  - 저장소에서 `corepack pnpm`을 순차 실행: lint, typecheck, test, i18n:check, qa:static. 끝에 test 한 번 더.
  - build·E2E·Lighthouse·I-1 직접 시험은 스크래치패드 `i2/wt`(복사본)에서 했다. `node_modules`는 저장소 것을 junction으로 읽기만 했고, pnpm·corepack은 쓰지 않았다. CLI는 `wt/node_modules/.bin`을 PATH 앞에 두고 직접 실행했다.
  - **임시 클러스터:** `PG_DATA_DIR=<스크래치>/i2/pgint`, 127.0.0.1:54329, DB `visanjob_integ2`. `DATABASE_URL`·`PG_DATA_DIR`·`PG_TEST_DATA_DIR`은 셸 환경 변수와 복사본 `.env` 둘 다에서 덮어썼다(아래 O-4 참조). Postgres 출력은 로그 파일로만 받았다.
  - `test:coverage` 동안에는 임시 클러스터를 멈췄다(Vitest 테스트 클러스터 `i2/pgtest`가 같은 54329를 씀).
  - 개발 DB(54320)는 시작할 때 꺼져 있었고 켜지 않았다. 행도 건드리지 않았다.
  - 포트: E2E 3450~3453(출시 명령 2회), I-1 직접 시험 3480~3483, Lighthouse 3470. 포트 3000은 건드리지 않았다.
  - 외부 전송 없음. `.env` 값은 출력하지 않았다(키 이름·false 여부만 확인).

## 결과 요약
- **결함 I-1: 해소 확인.** 독립 시험 7종 × 2개 프로젝트(desktop·mobile-375) 모두 통과. 로그아웃 경합 스트레스 50라운드(25 × 2)에서 세션 부활 0.
- **PRD 요구 전체(R 64 + N 6 = 70): Pass 70 / 70 (100%)**, Fail 0, 판정불가 0
- **필수(R 63, 선택 R-131 제외): 63/63 (100%)**. 비기능 N-01~N-06 6/6.
- **출시 기준(PRD §6) 5항목: 5 Pass / 0 Fail** (run 1에서 Fail이던 `test:e2e`가 클린 실행 2회 연속 303 passed / 0 failed)
- BR-01~BR-15 위반 0건. WO §15 1~11: 11/11. 플래그 4종 false.
- 판정 의견: **출시 가능(Gate 4 사람 승인 대상)**. 아래 "출시 판정 의견" 참조.

## 클린 실행 (PLAN P2e 검증 명령 순서, 같은 임시 DB)
| 순서 | 명령 | 위치 | 종료 코드 | 결과 |
|---|---|---|---|---|
| 0 | `db.ts start` | 복사본, 임시 54329 | 0 | 새 클러스터 → `ready on 127.0.0.1:54329, database visanjob_integ2` |
| 1 | `db.ts reset` | 복사본, 임시 | 0 | "All migrations have been successfully applied"(마지막 `20261121100000_i1_session_version` 포함). 시드 `{"regions":246,"industries":21,"visaTypes":19,"sampleRules":2,"sampleScoreTables":1,"admin":"skipped","sampleSeekers":"skipped"}`. 직후 DB 조회:<br>• 구직자·추천·감사·사용자·기업·면접 요청 모두 0<br>• VisaRule `isSample=true, DRAFT` 2행뿐, ScoreTable `isSample=true, DRAFT` 1행뿐<br>• rrn/passport/resident/alien 열 0개<br>• `User.sessionVersion` integer NOT NULL DEFAULT 0<br>• 트리거 `AuditLog`·`Recommendation` UPDATE·DELETE<br>• defaultTrack: JOB_MATCH = D-10·E-7·F-2·F-4·F-5·F-6·H-2, FUTURE_POOL = E-9·E-10, CONSULT_ONLY = C-4·D-2·D-4·G-1·OTHER, null = B-1·B-2·C-3·NONE·UNKNOWN(WO §7.4 일치) |
| 2 | `corepack pnpm lint` | 저장소 | **0** | 오류·경고 0 |
| 3 | `corepack pnpm typecheck` | 저장소 | 1 | 사용자 `.next/types`의 옛 경로 `(public)/employer/candidates` TS2307 3건(기존 O-1, run 1과 같음) |
| 3' | `tsc --noEmit` | 복사본 | **0** | 오류 없음 |
| 4 | `corepack pnpm test --reporter=dot` | 저장소 | **0** | **85 files / 633 tests** 통과(run 1 84/622 + `sessionVersion.test.ts` 등 I-1 단위 11건) |
| 4' | `vitest run --coverage` | 복사본(임시 클러스터 정지) | **0** | 85 / 633 통과. 라인 커버리지 `audit.ts` 100, `crypto.ts` 100, `rbac.ts` 100, `pii-guard.ts` 98.55. 참고: `authGuard.ts` 100 |
| 5 | `i18n-check` | 저장소·복사본 | 0 · 0 | `source ko: 1183 key(s), locales: 6, errors: 0` |
| 6 | `qa-static` | 저장소·복사본 | 0 · 0 | `errors: 0, warnings: 21`(S-23 14 + S-45 7, run 1과 같은 21건) |
| 7 | `next build` | 복사본 | **0** | 170 static pages, Middleware 58.9 kB. `Compiled with warnings` = jose `CompressionStream`·`DecompressionStream` Edge 경고. 이번에는 import 경로가 `src/lib/authConfig.ts`(`next-auth/jwt` getToken)다. run 1 O-2와 같은 종류 |
| 8 | `playwright test` 전체, **1회차** | 복사본, 임시 DB, E2E_PORT 3450 | **0** | `Running 320 tests using 4 workers` → **303 passed / 0 failed / 17 skipped** (3.6m). skip 17은 mobile-375 전용 스펙을 desktop에서 건너뜀(설계). `auth.spec.ts:48`·`session-revoke.spec.ts` 4건 두 프로젝트 모두 ok |
| 9 | `playwright test` 전체, **2회차**(연속, 같은 DB 누적 데이터 위, 다시 빌드) | 같음 | **0** | **303 passed / 0 failed / 17 skipped** (3.8m). 실패·flaky 줄 0 |
| 10 | `tsx scripts/lighthouse.ts --skip-build` (LH_PORT 3470, CHROME_PATH 없음 → headless shell 자동 감지), 다른 부하 없음 | 복사본, 임시 DB | **0** | **/ko 87**(81·90·87), about 92(92·93·92), fees 93(90·93·93), terms 93(92·97·93). 접근성 모두 100. "all pages meet the thresholds" |

- E2E 수: run 1의 295+17=312에서 320으로 늘었다(`session-revoke.spec.ts` 4건 × 2개 프로젝트).
- Lighthouse /ko: 이번 3회 81·90·87, 중앙값 87. run 1의 9회(81~90, 중앙 86)와 합친 12회 중앙값은 86.5다. 기준 85 위지만 낮은 단일 측정 81이 여전히 나온다(위험 R-1 유지).

## I-1 재확인 (독립 시험)
빌더 스펙(`session-revoke.spec.ts`)과 별개로 스크래치 스펙 `zz-qa-i1.spec.ts`(7개 시험)를 복사본에 넣어 실행했다. 서버는 같은 빌드(3480 기본 + 3483 후보 열람 플래그 서버)다. desktop-chromium 7/7(3.2m), mobile-375 7/7(2.9m). 시험 후 스펙은 지웠다.

| # | 시험 | 결과 | 증거(로그 `i2/logs/c13-i1.log`, `c14-i1-mobile.log`) |
|---|---|---|---|
| Q1 | **관리자** 로그인(2FA) → 쿠키 저장 → 로그아웃 → 저장 쿠키 재주입. 관리자 메뉴 10개 + `/admin/2fa/verify` + 리드 상세 화면, API, 서버 액션 | Pass | 12개 화면 모두 `/admin/login`, 대시보드 0. API `/api/files/<가짜 토큰>`: 로그아웃 전 403(인증 통과 후 토큰 거부) → 재주입 후 **401** `{"code":"UNAUTHENTICATED","message":"staff sign-in with 2FA required"}`. `/api/auth/session` user null. **서버 액션:** 로그아웃 전에 열어 둔 다른 탭의 통화 기록 폼을 재주입 쿠키로 제출 → 탭이 `/admin/login`으로 이동, DB `callCount=0`, 리드 등급 C 그대로 |
| Q2 | **구직자** OTP 로그인 → 쿠키 저장 → `/api/auth/signout` → 재주입 | Pass | `/ko/seeker/me`·`/me/stay`·`/me/referral`·`/me/recommended` 모두 `/ko/seeker/login?next=…`. **서버 액션:** 열어 둔 탭의 체류 설정 저장 → 화면 "다시 로그인해 주세요."(오류 스타일), DB `stayAlertOptIn` false→false(변경 없음). **다시 로그인 정상**(마이페이지 진입, 세션 user 있음). 옛 쿠키는 다른 컨텍스트에서도 계속 거부. **옛 쿠키로 로그아웃 요청(200)을 보내도 새 세션은 유지**(`/ko/seeker/me` 열림) |
| Q3 | **기업** 로그인 → 쿠키 저장 → `/api/auth/signout` → 재주입(후보 열람 플래그 서버) | Pass | 로그아웃 전 `GET /api/employer/requests` 200. 재주입 후 `/ko/employer/{request,requests,contract,candidates}` 모두 `/ko/employer/login?next=…`. `GET /api/employer/requests` **401** `sign-in required`, `GET /api/employer/candidates` **401**. **서버 액션:** 열어 둔 탭의 계약 동의 제출 → `data-code="UNAUTHENTICATED"`, DB `contractSignedAt` null |
| Q4 | **다른 기기**(다른 브라우저 컨텍스트) + TOTP 재사용 | Pass | 같은 직원으로 컨텍스트 B 로그인: **설정 때 쓴 TOTP 코드 재사용은 거부**(`/admin/2fa/verify`에 머묾), 다음 시간 단계 코드로 통과 → 대시보드. A에서 로그아웃 → B의 `/admin/seekers`는 `/admin/login`, B 세션 user null. DB `sessionVersion` 0→1. 구직자도 두 컨텍스트 로그인 후 한쪽 로그아웃 → 다른 쪽 `/ko/seeker/me`는 로그인으로 |
| Q5 | 무효 토큰으로 `/admin/login` ↔ `/admin` 무한 리다이렉트 | Pass | 문서 요청 체인 `200 /admin/login | 307 /admin | 200 /admin/login`(3건). `GET /admin/login`(maxRedirects 0) 200, `GET /admin/rules`(maxRedirects 10) 최종 `/admin/login` 200 |
| Q6 | **마이그레이션 전 형식 토큰(sv 없음)** | Pass | `next-auth/jwt` `encode`로 직접 만든 토큰. **대조군**(같은 클레임 + 현재 `sv`)은 `/admin` 대시보드가 열림 → 위조 방식이 유효함을 확인. **sv 없는 토큰**은 `/admin` → `/admin/login`, 세션 user null. 구직자도 sv 없는 토큰은 로그인으로, `sv:0` 대조군은 `/ko/seeker/me` 열림 |
| Q7 | **로그아웃 경합 스트레스 25라운드**(프로젝트당). 라운드마다 새 직원 2FA 로그인 → 탭 3개가 관리자 화면 10개를 끊임없이 이동 + 메뉴 링크 hover(라우터 프리페치) + RSC 프리페치 요청 30건(로그아웃 전·중·후) 동시에 로그아웃 | Pass | 25/25 × 2 = **50라운드 세션 부활 0**. 매 라운드 확인: 쿠키 저장소의 세션 쿠키 0(`jarAfter=0`), 메인 탭 `/admin` → 로그인, 다른 탭 3개 `/admin/seekers` → 로그인, 저장 쿠키 재주입 → 로그인 |

- 2FA 흐름 회귀: 출시 E2E 2회 × 2개 프로젝트에서 `auth.spec.ts:48`(비밀번호만 → `/admin/*` 거부, 클라이언트 세션 갱신 위조 거부, 잘못된 코드 거부, 설정 → 로그아웃 → 재로그인 시 verify 단계) 통과. Q4의 TOTP 재사용 거부도 통과.
- 비교: run 1에서는 RSC 요청 27건과 로그아웃을 동시에 6회 돌려 1회 세션이 되살아났고, 저장 쿠키 재주입은 항상 대시보드를 열었다. 이번에는 같은 종류의 시험 50라운드와 재주입 전부가 거부됐다.
- 원인 제거 확인(코드): 미들웨어는 `readSessionClaims`로 쿠키를 읽기만 하고 Auth.js 인스턴스를 쓰지 않는다(`src/middleware.ts`). 유효성은 Node 쪽 JWT 콜백의 `applySessionVersion`(`src/auth.ts`, `src/lib/authCredentials.ts`)이 매 `auth()`마다 DB와 비교한다. 위 Q1~Q7은 이 설계를 실제 동작으로 확인한 것이다.

## 출시 기준 (PRD §6)
| 기준 | 판정 | 증거 |
|---|---|---|
| 필수 요구사항 100% 통과 | Pass | 63/63(표 A) |
| 전체 통과율 95% 이상 | Pass | 70/70 = 100% |
| WO §15 필수 테스트 11개 통과 | Pass | 표 C. 테스트 이름 태그 수 WO15-01 2, 02 2, 03 5, 04 4, 05 9, 06 7, 07 8, 08 5, 09 5, 10 2, 11 1(run 1과 같음). Vitest 633 ×3(저장소 2, 복사본 coverage 1). E2E 매핑 테스트는 2회 모두 두 프로젝트 ok |
| `pnpm lint`·`pnpm test`·`pnpm test:e2e`·`pnpm build` 성공 | **Pass** | lint 0, test 0(×2), build 0, **test:e2e 클린 2회 연속 0**(303/0/17, 303/0/17) |
| 기능 플래그 4종 기본 false | Pass | `src/config/flags.ts:16`은 값이 정확히 "true"일 때만 켠다. `.env.example` 4줄 `=false`. 로컬 `.env` FEATURE_ 4줄 모두 false. 기본 서버의 SC-07 회귀(`demand.spec:7`, `employer-candidates.spec:52`, `jobs-apply.spec:27` 등) 2회 ok |

## 표 A — PRD 요구 전체 판정
> "근거 보고서"는 해당 Phase의 마지막 QA run이다. "이번 재확인"은 run 2 클린 실행에서 직접 다시 본 내용이다. 커밋 5e2ed93의 영향 범위(인증·세션·권한, 미들웨어 경로)에 드는 요구는 **굵게** 표시했다.

| 번호 | 우선 | 최종 | 입증 테스트 | 근거 보고서 | 이번 재확인 |
|---|---|---|---|---|---|
| R-001 | 필수 | Pass | build | P0a run 2 | build 0, strict |
| R-002 | 필수 | Pass | lint·test | P0a run 2 | lint 0, test 633 |
| R-003 | 필수 | Pass | `ci.yml` | P0a run 2 | 변경 없음(run 1 판정 유지) |
| R-004 | 필수 | Pass | `scripts/db.ts` | P0b run 1 | 임시 클러스터 start·reset·stop 성공 |
| R-005 | 필수 | Pass | `unit/db/schema.test.ts` | P0b run 1 | 새 마이그레이션 적용, 주민·여권 열 0. `sessionVersion`은 운영 카운터(개인정보 아님, STANDARD 4.11) |
| R-006 | 필수 | Pass | `ledger-trigger.test.ts` | P0b run 1, P1d run 3 | 트리거 존재, 테스트 통과 |
| R-007 | 필수 | Pass | `seed.test.ts` | P0b run 1 | 시드 직후 SAMPLE·DRAFT만, defaultTrack 일치 |
| R-008 | 필수 | Pass | `crypto.test.ts` | P0c run 1 | 통과, 100 |
| R-009 | 필수 | Pass | `db.test.ts` | P0c run 1 | 통과 |
| **R-010** | 필수 | Pass | `rbac.test.ts` | P0c run 1 | 통과, 100. 권한 판정은 Node 쪽 `requireStaff`·`requireStaffApi`가 계속 수행(Q1 API 401) |
| R-011 | 필수 | Pass | `audit.test.ts` | P0c run 1 | 통과, 100 |
| R-012 | 필수 | Pass | `pii-guard.test.ts` | P0c run 1, P2a run 8 | 통과, 98.55. 한계 L-1 그대로 |
| R-013 | 필수 | Pass | coverage | P0c run 1 | 100·100·100·98.55 |
| R-014 | 필수 | Pass | `smoke.spec.ts`, i18n | P0a run 2 | i18n errors 0, 언어 전환 E2E 2회 ok(미들웨어 변경 후 next-intl 라우팅 정상) |
| R-015 | 필수 | Pass | `flags.test.ts`, 기본 서버 E2E | P0a run 2, P2a | 플래그 false, SC-07 회귀 2회 ok |
| **R-101** | 필수 | Pass | `home.spec.ts` | P1a run 1 | E2E 2회 ok |
| **R-102** | 필수 | Pass | `static-pages.spec.ts` | P1a run 1 | E2E 2회 ok |
| **R-103** | 필수 | Pass(경계) | `scripts/lighthouse.ts` | P1a run 1, P2e run 2, 통합 run 1 | /ko 87(81·90·87), about 92, fees 93, terms 93, 접근성 100. 종료 코드 0. 미들웨어 변경 후에도 같은 수준. 위험 R-1 유지 |
| **R-104** | 필수 | Pass | `otp/route.test.ts`, `auth.spec.ts` | P1b run 1, P1c run 3 | 단위·E2E 통과. I-1 시험 중 60초 재전송 거부가 실제로 동작함을 봤다("인증번호는 56초 뒤에 다시 받을 수 있습니다.") |
| **R-105** | 필수 | Pass | `quick-register.spec.ts` | P1c run 3 | 2회 ok(가입 직후 세션 발급 `authorizeSeekerSignupProof` 경로에 `sv` 부여) |
| R-106 | 필수 | Pass | `stepKeys.test.ts`, `wizard-resume.spec.ts` | P1c run 3 | 통과 |
| **R-107** | 필수 | Pass | `wizard-resume.spec.ts` | P1c run 3 | "new session → resumes at Step 4" 2회 × 두 프로젝트 ok |
| R-108 | 필수 | Pass | `classifyTrack.test.ts` | P1c run 3 | 통과 |
| R-109 | 필수 | Pass | WO15-05 | P1c run 3 | 통과 |
| R-110 | 필수 | Pass | `consent.test.ts` | P1c run 1·2 | 통과 |
| **R-111** | 필수 | Pass | `referral.spec.ts` | P1c run 3 | 2회 ok(미들웨어 `?ref`/`?src` 쿠키 처리 유지) |
| R-112 | 필수 | Pass | `complete-screen.spec.ts` | P1c run 3 | ok |
| **R-113** | 필수 | Pass | `consent-revoke.spec.ts`(WO15-08) | P1c run 3 | 2회 ok. Q2에서 `/me`·`/me/stay`·`/me/referral` 로그아웃 후 거부 확인 |
| R-114 | 필수 | Pass | `job-leads/route.test.ts` | P1d run 3 | 통과 |
| R-115 | 필수 | Pass | `ingest.test.ts` | P1d run 3 | 통과 |
| R-116 | 필수 | Pass | `archiveLeads.test.ts` | P1d run 3 | 통과 |
| **R-117** | 필수 | Pass | `aggregate.test.ts`(WO15-10), `demand.spec.ts` | P2e run 1 | 단위 통과, 플래그 on 서버(3451) E2E 2회 ok, 기본 서버 ComingSoon ok |
| **R-118** | 필수 | Pass | `auth.spec.ts:48`, `authGuard.test.ts`, `sessionVersion.test.ts`, `session-revoke.spec.ts` | P1b run 1, P2d run 2 | 2FA 미완료 거부 2회 × 두 프로젝트 ok. **I-1 해소**: 독립 시험 Q1·Q4~Q7 통과(위 표) |
| **R-119** | 필수 | Pass | `dashboard.test.ts`, `admin-core.spec.ts` | P1e run 3 | 통과, ok |
| **R-120** | 필수 | Pass | `seekerReview.test.ts` | P1e run 3 | 통과, R-217에서 A 승격 |
| **R-121** | 필수 | Pass | `priority.test.ts`, `leadDesk.test.ts` | P1e run 3 | 통과. Q1에서 로그아웃 토큰으로는 통화 기록이 저장되지 않음 |
| **R-122** | 필수 | Pass | `piiView.test.ts` | P1e run 3 | 통과 |
| **R-123** | 필수 | Pass | `employerAccount.test.ts`, `auth.spec.ts` | P1b run 1 | 통과, E2E ok |
| R-124 | 필수 | Pass | WO15-09 | P1d run 3 | 통과, `employer-intake` ok |
| **R-125** | 필수 | Pass | `jobRequest.test.ts` | P1d run 3, P2a run 8 | 통과. Q3에서 로그아웃 토큰으로 `/employer/request` 거부 |
| R-126 | 필수 | Pass | `evaluate.test.ts`, `home.spec.ts` | P1a run 1 | 통과 |
| R-127 | 필수 | Pass | `score.spec.ts` | P1a run 1 | ok |
| R-128 | 필수 | Pass | qa:static + 코드 리뷰 | P1a run 1 | errors 0, 5e2ed93은 법령 수치 무관 |
| **R-129** | 필수 | Pass | route 테스트(OTP·auth·ingest) | P1b, P1d run 3 | 통과, `auth.spec` 로그인 429 ok |
| **R-130** | 필수 | Pass | `seo.spec.ts` | P1a run 1 | 2회 ok(미들웨어 `X-Robots-Tag` noindex 유지) |
| R-131 | 선택 | Pass | `seo.spec.ts` R-131 | P1a run 1 | ok |
| R-201 | 필수 | Pass | `manage.test.ts`(WO15-04) | P2a run 8 | 통과 |
| R-202 | 필수 | Pass | WO15-03, `jobs-apply.spec.ts` | P2a run 8 | 통과, ok |
| **R-203** | 필수 | Pass | `jobs-apply.spec.ts` | P2a run 8 | 비로그인·로그인·부적합 3경우 2회 ok |
| R-204 | 필수 | Pass | `blindSeeker.test.ts`(WO15-01) | P2b run 2 | 통과 |
| **R-205** | 필수 | Pass | `employer-candidates.spec.ts`(WO15-06) | P2b run 2 | 2회 ok. Q3 로그아웃 토큰으로 `/employer/candidates`·API 거부 |
| **R-206** | 필수 | Pass | `employerApiLeak.test.ts`(WO15-02) | P2b run 2, P2c run 3 | 통과 |
| **R-207** | 필수 | Pass | `browse.test.ts`, E2E | P2b run 2 | 통과, ok |
| **R-208** | 필수 | Pass | `contract.test.ts`, E2E | P2b run 2 | 통과, ok. Q3 로그아웃 토큰으로 계약 액션 거부 |
| R-209 | 필수 | Pass | `ledger.test.ts`(WO15-07) | P2c run 3 | 통과 |
| **R-210** | 필수 | Pass | `signedUrl.test.ts` | P2c run 3 | 통과. `/api/files/[token]`은 로그아웃 토큰에 401(Q1) |
| R-211 | 필수 | Pass | `thirdParty.test.ts` | P2c run 3 | 통과 |
| **R-212** | 필수 | Pass | `employer-requests.spec.ts`, `seeker-recommended.spec.ts` | P2c run 3 | 2회 ok |
| R-213 | 필수 | Pass | `unit/lib/jobs/*`, `still-searching.spec.ts` | P2d run 2 | 통과, ok |
| R-214 | 필수 | Pass | `unit/lib/notifications/*` | P2d run 2, P2e run 2 | 통과 |
| **R-215** | 필수 | Pass | `admin-rules.spec.ts` | P2d run 2 | 2회 ok(STAFF_VISA 이상 권한 포함) |
| **R-216** | 필수 | Pass | `visaCases.test.ts` | P2c run 3 | 통과 |
| **R-217** | 필수 | Pass | `integration.spec.ts` | P2e run 2 | 클린 DB 1회차·2회차 두 프로젝트 ok(관리자 2FA·기업 로그인 포함) |
| **R-218** | 필수 | Pass | `companies.test.ts` | P2b run 2 | 통과 |
| N-01 | 비기능 | Pass | qa:static, WO15-02 | P2e run 2 | 5e2ed93은 연락 수단 추가 없음. qa:static errors 0 |
| N-02 | 비기능 | Pass | i18n:check | P2e run 2 | errors 0. 새 사용자 문자열 없음 |
| N-03 | 비기능 | Pass | static-pages E2E | P2e run 2 | ok |
| N-04 | 비기능 | Pass | `mobile-375.spec.ts` | P2e run 3 | 17/17 × 2회 ok(로그인 구직자·기업 화면 포함) |
| N-05 | 비기능 | Pass | `auditCoverage.test.ts` | P2e run 2 | 통과. 로그인·로그아웃·버전 증가는 감사 대상 아님(STANDARD 4.8, BR-15 목록 밖) |
| N-06 | 비기능 | Pass | git | P2e run 2 | 추적 `.env*`는 `.env.example`뿐. 5e2ed93에 비밀 값 없음 |

## 표 B — BR-01~BR-15 위반 점검
| BR | 결과 | 근거 |
|---|---|---|
| 01 | 위반 0 | N-01 행 |
| 02 | 위반 0 | WO15-01·02 통과. 5e2ed93은 직렬화 경로 무변경 |
| 03 | 위반 0 | R-202 E2E ok |
| 04 | 위반 0 | WO15-03, 수요 지도 고지 E2E |
| 05 | 위반 0 | WO15-04 |
| 06 | 위반 0 | R-217(A 승격 전 후보 제외) |
| 07 | 위반 0 | WO15-06, defaultTrack E-9·E-10 = FUTURE_POOL(DB) |
| 08 | 위반 0 | WO15-05, 등록 불가 비자 defaultTrack null(DB) |
| 09 | 위반 0 | 트리거(DB), WO15-07 |
| 10 | 위반 0 | static-pages "/fees" ok |
| 11 | 위반 0 | WO15-09, R-126 |
| 12 | 위반 0 | 시드 직후 SAMPLE·DRAFT만 |
| 13 | 위반 0 | 주민·여권 열 0(DB), qa:static |
| 14 | 위반 0(한계 있음) | pii-guard 통과. L-1 그대로 |
| 15 | 위반 0 | N-05 |

## 표 C — WO §15 1~11
| # | 판정 | 테스트 | 이번 실행 |
|---|---|---|---|
| 1 | Pass | blindSeeker.test.ts | Vitest ×3 |
| 2 | Pass | employerApiLeak.test.ts | Vitest ×3 |
| 3 | Pass | public.test.ts, jobs route, interest, jobs-apply E2E | Vitest, E2E 2회 ok |
| 4 | Pass | manage.test.ts, public, publicPosting | Vitest |
| 5 | Pass | account, saveStep, classifyTrack | Vitest |
| 6 | Pass | classifyTrack, eligible, browse, interest, employer-candidates E2E | Vitest, E2E 2회 ok |
| 7 | Pass | ledger-trigger, ledger | Vitest, DB 트리거 |
| 8 | Pass | eligible, interest, consent-revoke E2E | Vitest, E2E 2회 ok |
| 9 | Pass | evaluate, diagnosis, home·employer-intake E2E | Vitest, E2E 2회 ok |
| 10 | Pass | aggregate.test.ts | Vitest |
| 11 | Pass | integration.spec.ts | E2E 2회 × 두 프로젝트 ok(클린 DB) |

## Phase 간 연결
- R-217 E2E가 간편 등록(P1c) → 위저드 완성(P1c) → 관리자 2FA·A 승격(P1b·P1e) → 기업 후보 노출(P2b) → 면접 요청(P2b) → 추천 원장(P2c)을 클린 DB에서 2회 연속 끊김 없이 지났다. 세션 관련 단계(구직자 OTP, 직원 2FA, 기업 로그인)가 모두 새 세션 버전 검사를 거친다.
- 임시 DB에 남은 행(전 실행 후): 구직자 174, 추천 32, 감사 299, 사용자 472(sessionVersion 0: 350, 1: 122), 기업 138, 면접 요청 20.
- 빠진 화면 없음. mobile-375가 공개 19경로 × 6개 언어, 구직자 5경로, 기업 4경로를 열었고, Q1이 관리자 메뉴 10개 화면을 직접 열었다.

## 결함 목록 (Fail만)
- 없음.
- **I-1(run 1): 해소.** 재현 방법 ①(클린 E2E `auth.spec.ts:48`) 2회 × 두 프로젝트 통과, ②(저장 쿠키 재주입) Q1~Q3 거부, ③(RSC 요청 + 로그아웃 동시) Q7 50라운드 부활 0.

## 판정불가
- 없음.

## 위험·관찰 (결함 아님)
| 번호 | 내용 | 근거 | 제안 |
|---|---|---|---|
| R-1 | R-103 /ko 성능이 여전히 기준 85 근처다. 이번 3회 81·90·87(중앙 87), run 1과 합친 12회 중앙 86.5 | 명령 표 10 | run 1과 같음: 운영 환경에서 다시 측정, 히어로 LCP 개선 검토 |
| R-2 | 구직자·기업 세션은 절대 만료가 검사되지 않는다. `/api/auth/session` 호출로 만료가 늘어날 수 있다(Q-29 D-2, 이미 기록됨). 오케스트레이터 판단으로 통합 후 수정 예정이다. 이번에는 다시 시험하지 않았다. PRD 합격 기준 밖이다 | DECISIONS Q-29, STATE | 결정대로 JWT 콜백에서 authTime + 역할별 수명 검사 |
| O-1 | 저장소 `pnpm typecheck`가 사용자 `.next/types`의 옛 경로 때문에 실패한다(작업 트리 tsc는 0) | 명령 표 3 | run 1과 같음. 사용자가 `.next`를 정리하면 해소 |
| O-2 | build 경고 jose `CompressionStream`(Edge). 이제 `authConfig.ts`의 `getToken` import 경로로 들어온다 | 명령 표 7 | 기록. 미들웨어는 압축 JWE를 쓰지 않으므로 동작 영향 없음(E2E·Q1~Q7 통과) |
| O-3 | 마이그레이션 `i1_session_version` 적용 시 기존 세션(sv 없음)은 전부 끊긴다. 직원·구직자·기업 모두 한 번 다시 로그인해야 한다 | Q6, 마이그레이션 주석 | 운영 반영 때 안내(현재는 실서버 없음) |
| O-4 | QA 환경 주의: junction으로 연결한 Prisma 클라이언트는 셸에 `DATABASE_URL`이 없으면 저장소 `.env`(개발 DB 54320)를 읽는다. 복사본 `.env`만 바꾸면 보조 스크립트가 개발 DB로 붙으려 한다. 이번에는 개발 DB가 꺼져 있어 연결 실패만 났고 쓰기는 없었다. 이후 셸 환경 변수로 덮어써서 진행했다 | 이번 실행 초기 | 앞으로 QA·빌더 복사본 실행 때 `DATABASE_URL`을 셸 환경 변수로 반드시 지정 |
| O-5 | 구직자·기업 화면에 로그아웃 버튼이 없다(빌더 스펙 주석). 로그아웃 경로는 Auth.js `/api/auth/signout`뿐이다. PRD 요구에 없어 결함으로 세지 않았다 | `session-revoke.spec.ts` 주석, Q2·Q3 | 출시 전 사람이 필요 여부 판단 |
| (run 1 O-3) | README N-04 설명 보충 | 5e2ed93은 README 무변경 | run 1과 같음 |

## 알려진 한계·사람 승인 사항 — run 1과 달라진 점만
- 해소: 결함 I-1(로그아웃 무효화 경합, 로그아웃 토큰 재사용). 출시 기준 `test:e2e` 항목이 Fail에서 Pass로 바뀌었다.
- 추가(이미 DECISIONS에 있음): Q-29 — D-1 결함 테스트 태그 규칙, D-2 구직자·기업 세션 절대 만료(위 R-2, 수정 예정).
- 추가(운영): 세션 버전 마이그레이션 후 전원 재로그인(O-3). 구직자·기업 로그아웃 UI 없음(O-5) → 사람 판단.
- 그 밖의 사람 승인 목록(A-3~A-9, Gate 4), 한계 L-1~L-7, Gate 4 법무·운영 확인 항목은 run 1과 같다.

## 출시 판정 의견
- PRD 70/70(필수 63/63), BR 위반 0, WO §15 11/11, 플래그 false. 출시 기준 5개를 모두 충족한다.
- run 1의 유일한 미충족 항목(`test:e2e`)은 I-1 수정 후 클린 DB에서 2회 연속 303/0으로 통과했다. I-1은 독립 시험(재주입·서버 액션·API·다른 기기·sv 없는 토큰·리다이렉트 반복·경합 50라운드)으로 해소를 확인했다.
- **의견: 출시 가능. Gate 4 사람 승인으로 넘긴다.** 승인 때 함께 볼 것:
  - Lighthouse /ko 경계(R-1)
  - Q-29 D-2 세션 절대 만료(R-2, 수정 예정)
  - 재로그인 안내(O-3)
  - 구직자·기업 로그아웃 UI(O-5)
  - run 1의 법무·운영 목록

## 정리
- E2E·Lighthouse·I-1 시험 서버(3450~3453, 3470, 3480~3483)는 Playwright·스크립트가 종료했다. 34xx LISTEN 0.
- 임시 클러스터를 `db.ts stop`으로 멈췄다(54329 LISTEN 0). `pgint`·`pgtest`를 삭제했다. 처음 잘못된 경로로 만든 클러스터(`scratchpad\i2pgint`, 셋업 중 경로 구분자 누락)도 멈추고 삭제했다. 개발 DB(54320)는 켜지 않았다.
- junction을 PowerShell `(Get-Item …).Delete()`로 끊었다(`Test-Path` False). 저장소 `node_modules` 확인: `.pnpm` 916, `.bin` 42, `next`·`@playwright/test`·`vitest` 존재.
- 작업 트리(스크래치 스펙 `zz-qa-i1.spec.ts`, 조회 스크립트, 복사본 `.env` 포함), `bin/`, `env.sh`를 삭제했다. 이번 Lighthouse는 `%TEMP%`에 새 폴더를 남기지 않았다(기존 `lighthouse.*` 7개는 이번 실행 전 것이라 두었다).
- 남긴 것: 로그 스크래치패드 `i2/logs/`(c0~c15).
- 끝에 저장소에서 `corepack pnpm test --reporter=dot`를 실행했다: **85 files / 633 tests 통과**.
- `git status`: `.workflow/` 기존 변경 4개, 미추적 `.claude/`·`.workflow/qa/`. `.claude/`는 건드리지 않았다.
