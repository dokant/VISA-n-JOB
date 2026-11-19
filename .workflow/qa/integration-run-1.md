# QA 보고서 — 통합 / run 1 (5단계, 전체 PRD)

- 대상 커밋: 51e0dfb (HEAD, P2e run 3)
  - 저장소 작업 트리의 src·tests·scripts·prisma·messages·content·README·package.json은 HEAD와 같다.
  - 복사본의 src·tests·scripts를 `git show 51e0dfb:<file>`과 `cmp`로 전부 비교했고 같다.
- 기준 문서:
  - PRD v1.1(R-001~R-131, R-201~R-218, N-01~N-06, §6 출시 기준)
  - WO §2 BR-01~15, §7.4, §15 1~11, §16
  - PLAN P2e·"사람의 승인이 필요한 지점", DECISIONS, STATE, README
  - Phase별 마지막 QA 보고서
- 일시: 2026-11-18 13:49 ~ 14:45 (KST)
- 환경:
  - 저장소에서 `corepack pnpm`을 순차로 실행했다: lint, typecheck, test, i18n:check, qa:static.
  - build·E2E·Lighthouse·직접 시험은 스크래치패드 `wt`에서 했다(`git archive 51e0dfb`).
    - `node_modules`는 저장소 것을 junction으로 연결해 읽기만 했다.
    - pnpm과 corepack은 쓰지 않았고, CLI는 node로 직접 실행했다. Playwright 실행 때는 `wt/node_modules/.bin`을 PATH 앞에 두었다.
  - **클린 실행용 임시 클러스터:** `PG_DATA_DIR=<스크래치>/pgint`, 127.0.0.1:54329, DB `visanjob_integ`. `DATABASE_URL`은 환경 변수로 덮어썼다.
    - 처음에는 포트 54339를 시도했다. `db.ts reset` 가드(A-9: 54320·54329만 허용)가 거부해서 54329로 옮겼다. 가드가 정상 동작함을 확인한 셈이다.
    - Postgres 출력은 로그 파일로만 받았다.
    - `test:coverage` 동안에는 임시 클러스터를 멈췄다. Vitest 테스트 클러스터 `PG_TEST_DATA_DIR=<스크래치>/pgtest`가 같은 54329를 쓰기 때문이다.
  - 개발 DB(54320)는 시작할 때 꺼져 있었고, 이번에 켜지 않았다.
  - 포트:
    - E2E 3350~3353
    - Lighthouse 3360, 실패 경로 시험 3361
  - 포트 3000은 건드리지 않았다.
  - 외부 전송 없음. `.env` 값은 출력하지 않았다.

## 결과 요약
- **PRD 요구 전체(R 64 + N 6 = 70): Pass 70 / 70 (100%)**, Fail 0, 판정불가 0
- **필수(R 63, 선택 R-131 제외): 63/63 (100%)**. 비기능 N-01~N-06도 6/6이다.
- **출시 기준(PRD §6) 5항목: 4 Pass / 1 Fail**
  - Fail 항목: `pnpm test:e2e` 성공. 클린 실행 1회차에서 1건이 실패했다.
  - 원인은 실제 제품 결함 **I-1**(관리자 로그아웃이 진행 중인 요청 때문에 되살아남, 간헐)이다. 테스트 하네스 문제가 아니다.
  - 같은 커밋으로 다시 돌린 2회차는 295 passed / 0 failed였다. 그래도 실패 원인이 제품 결함이라 Fail로 판정했다.
  - 결함 I-1은 R-118 합격 기준("2FA 미완료 시 `/admin/*` 접근 거부")을 깨지 않는다. 되살아난 세션은 이미 2FA를 마친 세션이다. 그래서 R-118은 Pass로 두었다.
- **BR-01~BR-15 위반: 0건**(항목 표 B 참조)
- WO §15 1~11: 11/11 통과. 플래그 4종: false.
- 판정 의견: 아래 "출시 판정 의견" 참조.

## 클린 실행 (PLAN P2e 검증 명령 순서, 같은 임시 DB)
| 순서 | 명령 | 위치 | 종료 코드 | 결과 |
|---|---|---|---|---|
| 0 | `db.ts start` | 복사본, 임시 54329 | 0 | 새 클러스터 `initialising cluster` → `ready on 127.0.0.1:54329` |
| 1 | `db.ts reset` | 복사본, 임시 | 0 | 마이그레이션 전부 적용("All migrations have been successfully applied"). 시드 `{"regions":246,"industries":21,"visaTypes":19,"sampleRules":2,"sampleScoreTables":1,"admin":"skipped","sampleSeekers":"skipped"}`. 직후 DB 조회 결과는 다음과 같다:<br>• 구직자·추천·감사·사용자·기업·면접 요청 모두 0<br>• VisaRule은 `isSample=true, DRAFT` 2행뿐, ScoreTable은 `isSample=true, DRAFT` 1행뿐<br>• rrn/passport/resident/alien 이름의 열 0개<br>• 트리거는 `AuditLog`·`Recommendation`에 UPDATE·DELETE<br>• VisaType.defaultTrack이 WO §7.4와 일치(F-2·F-4·F-5·F-6·H-2·D-10·E-7 = JOB_MATCH, E-9·E-10 = FUTURE_POOL, C-4·G-1·D-2·D-4·OTHER = CONSULT_ONLY, B-1·B-2·C-3·NONE·UNKNOWN = null 등록 불가) |
| 2 | `corepack pnpm lint` | 저장소 | **0** | 출력 없음(오류·경고 0). 복사본 eslint는 junction 경로에서 `eslint-plugin-react-hooks`를 찾지 못해 2로 끝났다. QA 환경 문제이며 run 2 O-6과 같다. 소스는 저장소와 같다 |
| 3 | `corepack pnpm typecheck` | 저장소 | 2 | 사용자 `.next/types`의 옛 경로 `(public)/employer/candidates`에서 TS2307 3건이 났다(기존 O-4) |
| 3' | `tsc --noEmit` | 복사본 | **0** | 오류 없음 |
| 4 | `corepack pnpm test --reporter=dot` | 저장소 | **0** | 84 files / **622 tests** 통과 |
| 4' | `vitest run --coverage` | 복사본(임시 클러스터 정지) | **0** | 84 / 622 통과. 커버리지(라인): `audit.ts` 100, `crypto.ts` 100, `rbac.ts` 100, `pii-guard.ts` 98.55 |
| 5 | `i18n-check` | 저장소·복사본 | 0 · 0 | `source ko: 1183 key(s), locales: 6, errors: 0` |
| 6 | `qa-static` | 저장소·복사본 | 0 · 0 | `errors: 0, warnings: 21`. 경고는 S-23 문구 검토 14건과 S-45 console 7건으로, 모두 의도된 것이다(run 2와 같은 21건) |
| 7 | `next build` | 복사본 | **0** | 170 static pages. `Compiled with warnings`(jose `CompressionStream` Edge 경고, run 2 O-3과 같음) |
| 8 | `playwright test` 전체, **1회차** | 복사본, 임시 DB, E2E_PORT 3350 | **1** | **294 passed / 1 failed / 17 skipped** (4.1m). skip 17은 mobile-375 스펙을 desktop 프로젝트에서 건너뛴 것이다(설계). 실패: `[desktop-chromium] auth.spec.ts:48` 99행 "로그아웃 후 `/admin` → `/admin/login` 기대, 실제 `/admin`(대시보드)" → 결함 I-1 |
| 8' | `playwright test auth.spec.ts:48 --repeat-each 8` | 같음(서버 직접 기동) | 0 | 16/16 통과. 부하가 없을 때는 드러나지 않는다 |
| 8'' | `playwright test` 전체, **2회차** | 같음(원복 후 다시 빌드) | **0** | **295 passed / 0 failed / 17 skipped** (3.5m). 같은 커밋, 같은 임시 DB(누적 데이터 위). 결함 I-1은 간헐이므로 이 통과가 해소를 뜻하지는 않는다 |
| 9 | `tsx scripts/lighthouse.ts --skip-build` (LH_PORT 3360, CHROME_PATH 없음 → headless shell) | 복사본, 임시 DB | **1** | **/ko 84**(84·83·89), about 92, fees 94, terms 95. 접근성은 모두 100. "BELOW THRESHOLD"로 끝났다. LCP 요소는 히어로 리드 `<p class="mt-6 max-w-155 text-lead text-white/66">`(Q-28로 reveal 없음) |
| 9' | 같은 명령 2회 더(다른 부하 없음, 10초 CPU 확인) | 같음 | 0 · 0 | /ko 86(86·90·81) / 86(86·81·89). about 95·93, fees 93·92, terms 93·94. 접근성 100 |

- Lighthouse /ko 9회 값: 81·81·83·84·86·86·89·89·90. 중앙값은 86이고, 3회 묶음 중앙값은 84·86·86이다.
- 기준 85에 걸쳐 있다. P2e run 1은 84, run 2는 88, 빌더 run 3은 86이었다. 아래 R-103과 위험 R-1을 참조한다.

## 출시 기준 (PRD §6)
| 기준 | 판정 | 증거 |
|---|---|---|
| 필수 요구사항 100% 통과 | Pass | 63/63(아래 표 A) |
| 전체 통과율 95% 이상 | Pass | 70/70 = 100% |
| WO §15 필수 테스트 11개 통과 | Pass | 표 C. 테스트 이름 태그 수는 WO15-01 2, 02 2, 03 5, 04 4, 05 9, 06 7, 07 8, 08 5, 09 5, 10 2, 11 1. Vitest 622 ×2 통과(skip·only 0). E2E 매핑 테스트(jobs-apply·employer-candidates·consent-revoke·home·employer-intake·integration)는 1회차에 두 프로젝트 모두 ok |
| `pnpm lint`·`pnpm test`·`pnpm test:e2e`·`pnpm build` 성공 | **Fail** | lint 0, test 0, build 0. **test:e2e는 클린 1회차 1 failed(결함 I-1)**, 2회차 295 passed / 0 failed |
| 기능 플래그 4종 기본 false | Pass | `src/config/flags.ts`는 값이 정확히 "true"일 때만 켠다. `.env.example` 4줄 모두 `=false`. 로컬 `.env`의 FEATURE_ 4줄은 모두 `=false`(값이 false가 아닌 줄 0개). E2E 기본 서버의 SC-07 회귀(ComingSoon·API 404)는 통과 |

## 표 A — PRD 요구 전체 판정
> "근거 보고서"는 해당 Phase의 마지막 QA run이다. "이번 재확인"은 이번 클린 실행에서 직접 다시 확인한 내용이다.

| 번호 | 우선 | 최종 | 입증 테스트 | 근거 보고서 | 이번 재확인 |
|---|---|---|---|---|---|
| R-001 | 필수 | Pass | build | P0a run 2 | build 0, `tsconfig "strict": true`, git 56 커밋 |
| R-002 | 필수 | Pass | lint·test, `.husky/pre-commit`=`lint-staged` | P0a run 2 | lint 0, test 622 |
| R-003 | 필수 | Pass | `.github/workflows/ci.yml` | P0a run 2 | Install → Lint → Typecheck → Test(+i18n·qa:static) 단계 존재 |
| R-004 | 필수 | Pass | `scripts/db.ts` | P0b run 1 | 임시 클러스터 start·reset(migrate deploy + seed) 성공. README 절차 기재 |
| R-005 | 필수 | Pass | `unit/db/schema.test.ts` | P0b run 1 | 테이블 24개, 주민·여권 열 0 |
| R-006 | 필수 | Pass | `unit/db/ledger-trigger.test.ts` | P0b run 1, P1d run 3 | 트리거 존재, 테스트 통과 |
| R-007 | 필수 | Pass | `unit/db/seed.test.ts` | P0b run 1 | 규칙 2·점수표 1 전부 isSample·DRAFT, defaultTrack §7.4 일치, 시드 파일 SAMPLE·TODO 주석 |
| R-008 | 필수 | Pass | `unit/lib/crypto.test.ts` | P0c run 1 | 통과, 커버리지 100 |
| R-009 | 필수 | Pass | `unit/lib/db.test.ts` | P0c run 1 | 통과 |
| R-010 | 필수 | Pass | `unit/lib/rbac.test.ts` | P0c run 1 (Q-08 반영 P1b) | 통과, 100 |
| R-011 | 필수 | Pass | `unit/lib/audit.test.ts` | P0c run 1 | 통과, 100 |
| R-012 | 필수 | Pass | `unit/lib/pii-guard.test.ts` | P0c run 1, P2a run 8 | 통과, 98.55. 직접 확인: 국내 전화·이메일·URL·카톡 ID·@handle·+84·telegram 양성, 금액·날짜 기간 음성. 알려진 한계 D-10·D-11은 여전히 미탐(Q-23, 한계 L-1) |
| R-013 | 필수 | Pass | coverage | P0c run 1 | 4종 모두 90% 이상(100·100·100·98.55) |
| R-014 | 필수 | Pass | `e2e/smoke.spec.ts`, `unit/scripts/i18n.test.ts` | P0a run 2 | 6개 파일 모두 `_review: native review required` 1개, i18n errors 0, 언어 전환 E2E ok |
| R-015 | 필수 | Pass | `unit/config/flags.test.ts`, 기본 서버 E2E | P0a run 2, P1a, P2a | 플래그 표 참조 |
| R-101 | 필수 | Pass | `e2e/home.spec.ts` | P1a run 1 | E2E ok |
| R-102 | 필수 | Pass | `e2e/static-pages.spec.ts` | P1a run 1 | 6개 언어 200·푸터·[전문가 검토 필요] ok |
| R-103 | 필수 | Pass(경계) | `scripts/lighthouse.ts` | P1a run 1, P2e run 2 | 9회 중앙값 86, 접근성 100, about·fees·terms 92~95. **클린 1회차 묶음은 84로 미달**(위험 R-1) |
| R-104 | 필수 | Pass | `unit/app/api/seeker/otp/route.test.ts`, `e2e/auth.spec.ts` | P1b run 1, P1c run 3 | 통과 |
| R-105 | 필수 | Pass | `e2e/quick-register.spec.ts`, `unit/lib/seeker/account.test.ts` | P1c run 3 | 통과, R-217 E2E에서 `isQuickSignup:true, grade:"B"` 확인 |
| R-106 | 필수 | Pass | `unit/schemas/seeker/register/stepKeys.test.ts`, `e2e/wizard-resume.spec.ts` | P1c run 3 | 통과 |
| R-107 | 필수 | Pass | `e2e/wizard-resume.spec.ts` "Step 0~3 saved → new session → resumes at Step 4" | P1c run 3 | 두 프로젝트 ok |
| R-108 | 필수 | Pass | `unit/lib/visa-engine/classifyTrack.test.ts` | P1c run 3 | 통과. `src`에 비자 코드 매핑 상수 grep 0건 |
| R-109 | 필수 | Pass | WO15-05 테스트 9개 | P1c run 3 | 통과 |
| R-110 | 필수 | Pass | `unit/lib/seeker/consent.test.ts` | P1c run 1·2 | 통과, 동의서 37개 파일 [전문가 검토 필요] |
| R-111 | 필수 | Pass | `e2e/referral.spec.ts` | P1c run 3 | ok |
| R-112 | 필수 | Pass | `e2e/complete-screen.spec.ts` | P1c run 3 | ok |
| R-113 | 필수 | Pass | `e2e/consent-revoke.spec.ts`(WO15-08) | P1c run 3 | 두 프로젝트 ok |
| R-114 | 필수 | Pass | `unit/app/api/ingest/job-leads/route.test.ts` | P1d run 3 | 통과 |
| R-115 | 필수 | Pass | `unit/lib/leads/ingest.test.ts` | P1d run 3, P1e run 3 | 통과 |
| R-116 | 필수 | Pass | `unit/lib/jobs/archiveLeads.test.ts` | P1d run 3 | 통과 |
| R-117 | 필수 | Pass | `unit/lib/demand/aggregate.test.ts`(WO15-10), `e2e/demand.spec.ts` | P1a run 1, P1d, P2e run 1 | 통과, ok |
| R-118 | 필수 | Pass | `e2e/auth.spec.ts:48`, 단위 authGuard | P1b run 1, P2d run 2 | 2FA 미완료 거부 부분은 1회차에서도 통과(실패 지점은 2FA 완료 후 로그아웃 99행). 단독 ×16 통과. **결함 I-1 별도** |
| R-119 | 필수 | Pass | `unit/lib/admin/dashboard.test.ts`, `e2e/admin-core.spec.ts` | P1e run 3 | 통과 |
| R-120 | 필수 | Pass | `unit/lib/admin/seekerReview.test.ts` | P1e run 3 | 통과, R-217 E2E에서 A 승격 |
| R-121 | 필수 | Pass | `unit/lib/leads/priority.test.ts`, `leadDesk.test.ts` | P1e run 3 | 통과 |
| R-122 | 필수 | Pass | `unit/lib/admin/piiView.test.ts` | P1e run 3 | 통과 |
| R-123 | 필수 | Pass | `unit/lib/employerAccount.test.ts` | P1b run 1 | 통과 |
| R-124 | 필수 | Pass | WO15-09 테스트 | P1d run 3 | 통과, E2E ok |
| R-125 | 필수 | Pass | `unit/lib/employer/jobRequest.test.ts` | P1d run 3, P2a run 8 | 통과. 우회 D-10·D-11은 한계 L-1 |
| R-126 | 필수 | Pass | `unit/lib/visa-engine/evaluate.test.ts`, `e2e/home.spec.ts` | P1a run 1 | 통과 |
| R-127 | 필수 | Pass | `e2e/score.spec.ts` | P1a run 1 | ok |
| R-128 | 필수 | Pass | qa:static + 코드 리뷰 | P1a run 1 | qa:static errors 0, `"E-9"` 등 비자 코드 상수 grep 0, 규칙·점수표는 DB(SAMPLE·DRAFT)뿐 |
| R-129 | 필수 | Pass | `route.test.ts`(OTP·auth·ingest) | P1b, P1d run 3 | 통과 |
| R-130 | 필수 | Pass | `e2e/seo.spec.ts` | P1a run 1 | ok |
| R-131 | 선택 | Pass | `e2e/seo.spec.ts` R-131 | P1a run 1 | 6개 언어 가이드 FAQPage·Breadcrumb, /cases ok |
| R-201 | 필수 | Pass | `unit/lib/postings/manage.test.ts`(WO15-04) | P2a run 8 | 통과 |
| R-202 | 필수 | Pass | WO15-03 테스트, `e2e/jobs-apply.spec.ts` | P2a run 8 | 통과, ok |
| R-203 | 필수 | Pass | `e2e/jobs-apply.spec.ts`, `unit/lib/postings/interest.test.ts` | P2a run 8 | ok |
| R-204 | 필수 | Pass | `unit/lib/serializers/blindSeeker.test.ts`(WO15-01, 스냅샷) | P2b run 2 | 통과 |
| R-205 | 필수 | Pass | `e2e/employer-candidates.spec.ts`(WO15-06) | P2b run 2 | ok |
| R-206 | 필수 | Pass | `unit/lib/employer/employerApiLeak.test.ts`(WO15-02) | P2b run 2, P2c run 3 | 통과 |
| R-207 | 필수 | Pass | `unit/lib/candidates/browse.test.ts`, E2E | P2b run 2 | 통과 |
| R-208 | 필수 | Pass | `unit/lib/employer/contract.test.ts` | P2b run 2 | 통과. 계약 화면 375 넘침 0(P2e run 3) |
| R-209 | 필수 | Pass | `unit/lib/recommendations/ledger.test.ts`(WO15-07) | P2c run 3 | 통과, R-217에서 원장 1행 + `RECOMMENDATION_CREATE` |
| R-210 | 필수 | Pass | `unit/lib/files/signedUrl.test.ts` | P2c run 3 | 통과 |
| R-211 | 필수 | Pass | `unit/lib/consent/thirdParty.test.ts` | P2c run 3 | 통과 |
| R-212 | 필수 | Pass | `e2e/employer-requests.spec.ts`, `seeker-recommended.spec.ts` | P2c run 3 | ok |
| R-213 | 필수 | Pass | `unit/lib/jobs/*`, `e2e/still-searching.spec.ts` | P2d run 2 | 통과 |
| R-214 | 필수 | Pass | `unit/lib/notifications/*` | P2d run 2, P2e run 2 | 통과. E2E 서버 로그 `"smtp":"disabled","reason":"SMTP_HOST_UNSET"` |
| R-215 | 필수 | Pass | `e2e/admin-rules.spec.ts` | P2d run 2 | ok |
| R-216 | 필수 | Pass | `unit/lib/admin/visaCases.test.ts` | P2c run 3 | 통과 |
| R-217 | 필수 | Pass | `e2e/integration.spec.ts:114` | P2e run 2 | 클린 DB에서 두 프로젝트 ok |
| R-218 | 필수 | Pass | `unit/lib/admin/companies.test.ts` | P2b run 2 | 통과 |
| N-01 | 비기능 | Pass | qa:static, WO15-02, README 체크리스트 | P2e run 2 | grep: `tel:`·`mailto:`는 운영자 연락처(site.config)뿐. 공유는 본인 추천 링크(PC-9)뿐. 채팅·웹소켓 0. 기업 API는 `api/employer/{candidates,requests}`이고 blindSeeker를 거친다 |
| N-02 | 비기능 | Pass | i18n:check | P2e run 2 | errors 0 |
| N-03 | 비기능 | Pass | static-pages E2E, 동의서 grep | P2e run 2 | content 42개 중 37개 표시. 빠진 5개는 비법률 가이드 번역본(`how-to-use.*.mdx`) |
| N-04 | 비기능 | Pass | `e2e/mobile-375.spec.ts` | P2e run 3 | 17/17 ok. 변이 시험에서 2건을 잡았다 |
| N-05 | 비기능 | Pass | `unit/lib/auditCoverage.test.ts` | P2e run 2 | 통과 |
| N-06 | 비기능 | Pass | git | P2e run 2 | 추적 `.env*`는 `.env.example`뿐, `.env`는 이력 0회, `.gitignore:30 .env*` |

## 표 B — BR-01~BR-15 위반 점검
| BR | 결과 | 근거 |
|---|---|---|
| 01 | 위반 0 | N-01 행 |
| 02 | 위반 0 | WO15-01, 스냅샷, 기업 API는 blindSeeker·interviewDisclosure만 거침 |
| 03 | 위반 0 | R-202 E2E "no company data" ok |
| 04 | 위반 0 | WO15-03, 수요 지도 고지 E2E |
| 05 | 위반 0 | WO15-04, DB CHECK 제약 |
| 06 | 위반 0 | eligible 테스트, R-217(A 승격 전 `isEligibleCandidate=false`) |
| 07 | 위반 0 | WO15-06, defaultTrack E-9·E-10 = FUTURE_POOL(DB 확인) |
| 08 | 위반 0 | WO15-05, B-1·B-2·C-3·NONE·UNKNOWN defaultTrack null |
| 09 | 위반 0 | 트리거(DB 확인), WO15-07 |
| 10 | 위반 0 | static-pages "/fees shows 구직자 이용료 없음" ok |
| 11 | 위반 0 | WO15-09, R-126 |
| 12 | 위반 0 | 규칙·점수표 SAMPLE·DRAFT뿐, R-128 |
| 13 | 위반 0 | 주민·여권 열 0(DB), qa:static |
| 14 | 위반 0(한계 있음) | pii-guard 테스트 통과. 우회 D-10·D-11은 사람 결정 Q-23으로 한계(L-1) |
| 15 | 위반 0 | N-05 테스트 |

## 표 C — WO §15 1~11
| # | 판정 | 테스트(README 매핑과 일치) | 이번 실행 |
|---|---|---|---|
| 1 | Pass | blindSeeker.test.ts | Vitest ×2 |
| 2 | Pass | employerApiLeak.test.ts | Vitest ×2 |
| 3 | Pass | public.test.ts, jobs route, interest, jobs-apply E2E | Vitest, E2E ok |
| 4 | Pass | manage.test.ts, public, publicPosting | Vitest |
| 5 | Pass | account, saveStep, classifyTrack | Vitest |
| 6 | Pass | classifyTrack, eligible, browse, interest, employer-candidates E2E | Vitest, E2E ok |
| 7 | Pass | ledger-trigger, ledger | Vitest, DB 트리거 확인 |
| 8 | Pass | eligible, interest, consent-revoke E2E | Vitest, E2E ok |
| 9 | Pass | evaluate, diagnosis, home·employer-intake E2E | Vitest, E2E ok |
| 10 | Pass | aggregate.test.ts | Vitest |
| 11 | Pass | integration.spec.ts | E2E 두 프로젝트 ok(클린 DB) |

## Phase 간 연결
- R-217 E2E가 다음 흐름을 한 번에 지나가며 끊김 없이 통과했다.
  - 간편 등록(P1c)
  - 위저드 완성(P1c)
  - 관리자 2FA·A 승격(P1b·P1e)
  - 기업 후보 노출(P2b)
  - 면접 요청(P2b)
  - 추천 원장(P2c)
- 임시 DB에 남은 행 수: 구직자 84, 추천 16, 감사 108, 사용자 216, 기업 79, 면접 요청 10.
- 빠진 화면은 찾지 못했다.
  - mobile-375 스펙이 공개 19경로 × 6개 언어, 구직자 5경로, 기업 4경로를 모두 200 미만 상태 코드로 열었다.
  - 관리자 메뉴 10개 링크가 모두 렌더된다(trace의 RSC 프리페치 200).

## 결함 목록 (Fail만)
| 번호 | 심각도 | 위치 | 재현 | 기대 | 실제 |
|---|---|---|---|---|---|
| I-1 | 중간(보안·출시 명령) | `src/server/actions/admin/auth.ts:57` `signOutStaff`(`signOut({redirect:false})`, 쿠키만 삭제), `src/lib/authConfig.ts:46` `strategy:"jwt"`, `src/middleware.ts:47` 매 응답 세션 갱신 | ① 클린 E2E 전체(부하 있음): `auth.spec.ts:48` desktop 실패. trace에서 로그아웃 POST 303이 `authjs.session-token`을 비운 뒤, 늦게 도착한 `/admin/{placements,visa-cases,rules,score-tables}?_rsc` 응답 4건이 `Set-Cookie: authjs.session-token=<값>`을 다시 보낸다. 그다음 `GET /admin`은 200(대시보드)이다. ② 결정적 재현: 직원 로그인(2FA) → 쿠키 저장 → 로그아웃(쿠키 0, `/admin`→`/admin/login`) → 저장한 쿠키를 다시 넣으면 `/admin` 대시보드가 열린다. ③ 관리자 RSC 요청 27건과 로그아웃을 동시에 6회 → 1회 `/admin`이 열렸다 | 로그아웃 후에는 어떤 경로로도 관리자 세션이 살아나지 않는다. `test:e2e`가 안정적으로 통과한다 | 로그아웃이 간헐로 무효가 된다. 로그아웃한 토큰은 만료(직원 8시간)까지 서버가 받아 준다. 출시 명령 `test:e2e`가 클린 실행에서 실패했다(STATE P2c run 2의 "auth.spec:48 mobile 간헐"과 같은 테스트) |

## 판정불가
- 없음.
  - P1e run 3의 판정불가 1건(INVALID_TRANSITION 방어 코드)은 단위 테스트로 확인됐고, 요구 판정에는 영향이 없다.
  - P2e run 2의 판정불가 1건(Lighthouse 실패 원인 출력)은 P2e run 3 항목 7에서 확인했다.

## 위험·관찰 (결함 아님)
| 번호 | 내용 | 근거 | 제안 |
|---|---|---|---|
| R-1 | R-103 /ko 성능이 기준 85에 걸쳐 있다. 9회 81~90, 중앙값 86, 3회 묶음 84·86·86. 클린 1회차 `pnpm lighthouse`는 종료 코드 1이었다 | 명령 표 9·9' | 운영 환경(배포 서버·CDN)에서 다시 측정한다. 여유를 확보하려면 히어로 LCP(리드 문단, 글꼴) 개선을 검토한다 |
| O-1 | 저장소 `pnpm typecheck`가 사용자 `.next/types`의 옛 경로 때문에 실패한다(작업 트리 tsc는 0) | 명령 표 3 | 사용자가 `.next`를 정리하면 해소된다. CI에는 영향 없음 |
| O-2 | build 경고 jose `CompressionStream`(Edge) | 명령 표 7 | 기록 |
| O-3 | README N-04 설명에 로그인 기업 화면·탭 단어 분리 검사가 빠졌다 | P2e run 3 O-2 | 한 줄 보충 |

## 알려진 한계·사람 승인 사항 (결함과 구분)
> 출처: DECISIONS, STATE, README "출시 점검". 아래는 사람 결정이나 범위 결정으로 받아들인 것이며, 결함으로 세지 않았다.

**사람 승인 필요(PLAN A-x, README 일치)**
- A-3: 실제 SMTP·SMS 자격 증명과 첫 외부 발송
- A-4: git 원격·push·CI 원격 실행(범위 밖)
- A-5: 기능 플래그 4종 켜기(법무 확인 후)
- A-6: 규칙·점수표 실제 값 입력·PUBLISHED(행정사)
- A-7: 약관·동의서·고지 확정, 실제 규칙 문구, 번역 원어민 검수
- A-8: 실서버·도메인·서울 리전 운영 DB
- A-9: db:reset 가드(이번에 54339 거부로 동작 확인)
- Gate 4 판정 자체

**알려진 한계**
- L-1: pii-guard 우회 D-10(앞자리 덧붙인 번호)·D-11(+ 없는 외국 번호)과 수용 오탐(날짜 옆 시간·단위, 쉼표 없는 금액 범위)(Q-20~Q-23).
  - 이번에도 `문의 902-123-4567`, `문의 84912345678`은 미탐이다.
  - 운영 점검: "공고 검증 시 숫자 나열 직접 확인"
- L-2: 규칙·점수표가 SAMPLE 초안이라 공개 진단은 전부 "행정사 확인 필요"(BR-12)
- L-3: 시·군·구·인구감소지역은 에이전트 초안(PC-6). 전공 분야 코드는 운영자 검토 대기(Q-24). KSIC 중분류는 null(Q-12 ②)
- L-4: SMS 실제 채널 없음. 이메일은 SMTP 설정 전 콘솔뿐. 콘솔 확인은 14일 비활성화·강등 근거가 아니다 → 이메일 없는 구직자는 자동 비활성화 대상이 아님(Q-27)
- L-5: 카카오·Zalo 공유(PC-9)·CSV 내보내기(PC-14)·직원 계정 관리 화면(PC-15)은 범위 밖. WO Phase 3 전체도 범위 밖
- L-6: native-select 사용 확대(Q-09, cmdk 미도입)
- L-7: 로그인 실패 한도. 계정+IP 키를 쓰고, IP를 모를 때는 계정 상한(50/15분)만 적용(Q-11, P1c)

**Gate 4 법무 확인**
- Q-12 ③: 구인 의뢰 담당자 수집 동의 체크박스
- Q-25: 면접 실명 동의 기간 해석
- THIRD_PARTY_INTERVIEW 동의서에 수령자 미기재(P2c)
- 기업 가입 화면에 수집 고지·약관 동의 없음(P2e O-7)
- 약관·동의서 전반 [전문가 검토 필요]

**Gate 4 운영·배포 확인**
- OTP 5회 오류 시 번호 잠금(R-104 규정, P1c O-7)
- `/admin` 리디렉트 localhost. `TRUST_PROXY`·`SITE_URL`·x-forwarded-for·trustHost(P1b·P1c O-9)
- MAJOR_FIELDS 검토(Q-24)
- 수집 리드 공고의 중복 Company 병합(Q-17 ①)
- rawJson의 숫자형 전화·메신저 ID 잔존(직원 전용, P1d O-9·O-10)
- 개발 DB 누적 E2E 데이터 초기화 여부(P2a)
- Q-27 SMS 채널
- 오케스트레이터 판단(사람이 바꿀 수 있음): Q-09~Q-17, Q-24~Q-28

## 출시 판정 의견
- 기능 요구는 PRD 70/70(필수 63/63)을 충족한다. BR 위반 0, WO §15 11/11, 플래그 false도 충족한다.
- 다만 PRD §6의 "`pnpm test:e2e` 성공"이 클린 실행 1회차에서 실패했다. 원인은 실제 결함 I-1(관리자 로그아웃 무효화 경합, JWT 세션 미폐기)이다. 2회차 결과와 관계없이, 실패의 원인이 제품 동작이므로 간헐 실패로 넘기지 않았다.
- **의견: I-1을 수정하고 `test:e2e` 클린 재실행이 통과하면 출시 가능(Gate 4 승인 대상).** 그 전에는 출시 기준 1항목 미충족이다.
- 함께 볼 것: Lighthouse /ko 경계(R-1), 위 한계·법무·운영 목록.

## 정리
- E2E·Lighthouse·스크래치 서버(3350~3353, 3360, 3361)를 종료했다. 직접 띄운 `next start` 4개는 Windows PID로 `taskkill`했다. 3350~3369 LISTEN 0.
- 임시 클러스터를 `db.ts stop`으로 멈췄다(54329 LISTEN 0). `pgint`·`pgtest`를 삭제했다. 개발 DB(54320)는 켜지 않았고 행도 건드리지 않았다.
- junction을 PowerShell `(Get-Item …).Delete()`로 끊었다(`Test-Path` False). 저장소 `node_modules`를 확인했다: `.pnpm` 916, `.bin` 42, `next`·`@playwright/test`·`vitest` 존재.
- 작업 트리(스크래치 스펙 `zz-qa-int`·`zz-qa-logout`, 변이 파일 포함), 보조 스크립트(`bin/`), trace 압축 해제 폴더를 삭제했다. `%TEMP%\lighthouse.m36Dq8`(이번 실패 경로 시험)를 삭제했다.
- 남긴 것: 로그는 스크래치패드 `logs/`(c1~c15), 스크린샷은 `shots/int_*.png`.
- 끝에 저장소에서 `corepack pnpm test --reporter=dot`를 실행했다: **84 files / 622 tests 통과**.
- `git status`: `.workflow/` 기존 변경 4개, 미추적 `.claude/`·`.workflow/qa/`. `.claude/`는 건드리지 않았다.
