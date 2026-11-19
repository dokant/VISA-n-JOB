# QA 보고서 — Phase P2b / run 2 (재확인·회귀)

- 대상: 커밋 2644efa(F-1~F-5 기준 불일치 수정, PC-11 통계 합계 마스킹, Q-24 전공 분야 코드). HEAD 2644efa
- 기준 문서: PRD R-204·R-205·R-206·R-207·R-208·R-218; PLAN `### P2b`; WO §7.3(체류 공개 3구간)·§7.5·§9.3·§15-1·§15-2·§15-6·§15-8·§15-10; DECISIONS PC-11·PC-12·Q-08·Q-24; `phase-P2b-run-1.md`(O-2·O-3), `phase-P2b-standard-run-1.md`(F-1~F-5, O-1); STANDARD 3.1 form·S-16·S-27·S-32 H-3
- 일시: 2026-11-17 16:34 ~ 16:52 (KST)
- 환경: Windows 11, 개발 DB. 포트 3000은 시작·끝 모두 LISTEN 없음(건드리지 않음). lint·typecheck·test·i18n:check·qa:static은 저장소에서 `corepack pnpm` 순차. build·E2E·직접 시험은 `git archive 2644efa`를 스크래치패드에 풀어(`node_modules`는 저장소 것을 junction으로 읽기만, `.env` 복사) **pnpm/corepack 없이** `node node_modules/next/dist/bin/next build`, `node node_modules/@playwright/test/cli.js test`(복사본 `node_modules/.bin`을 PATH 앞에), 작업 트리 typecheck는 `node node_modules/typescript/bin/tsc --noEmit`.
- 직접 시험 환경: E2E(`E2E_PORT=3840`, 3840~3843)를 먼저 단독 실행·종료한 뒤 같은 빌드로 `next start` 네 개 — 3850(플래그 기본), 3851(`FEATURE_DEMAND_MAP`), 3852(`FEATURE_PUBLIC_JOBS`), 3853(`FEATURE_EMPLOYER_CANDIDATES`+`FEATURE_DEMAND_MAP`), 모두 `TRUST_PROXY=true`. 복사본 안 스크래치 Playwright 스펙(desktop-chromium, workers 1, `E2E_PORT=3850`으로 위 서버 재사용). 기업은 실제 이메일 로그인, 직원은 실제 로그인 → TOTP, 구직자는 실제 OTP 로그인(`loginUi`). 위저드 저장 액션 직접 호출은 브라우저가 실제로 보낸 요청(`Next-Action` 헤더·본문)을 잡아 `majorField` 값만 바꿔 같은 페이지의 `fetch`로 재전송. 개발 DB 전체 직렬화와 마스킹 전수 대입은 `tsx` 스크립트(DB는 읽기 전용).
- 저장소 node_modules 상태: 시작 `corepack pnpm test` **66 files / 521 tests** 통과(16:35). 정리 때 junction을 PowerShell `(Get-Item …).Delete()`로 먼저 끊고(`Test-Path` False) 확인: `.pnpm` 916개, `next`·`@playwright/test`·`vitest`·`tsx` 있음. 그 뒤 작업 트리 삭제. 끝 `corepack pnpm test` 66 files / 521 tests 통과.
- 정리: 서버 네 개 종료(3840~3843·3850~3853 LISTEN 0), junction 해제 후 작업 트리·`.env` 복사본·스크립트·로그 삭제. `.env` 값 출력 없음, 외부 전송 없음, 개발 DB 행 삭제 없음(시험 행은 상태 변경으로 원상 복귀 — O-6), `.claude/` 건드리지 않음. `git status`: `.workflow/` 기존 변경 4개, 미추적 `.claude/`·`.workflow/qa/`.

## 결과 요약
- 통과: 24 / 전체: 24 (통과율 100%), 판정불가 0
- 필수 항목 실패: 0개
- 결함: 없음
- run 1 관찰 해소: O-2(합계 차감으로 마스킹 값 복원) → 해소(항목 3·4), O-3(`majorField` 항상 null) → 해소(항목 7~11). 기준 검토 F-1~F-5 → 모두 실제 동작으로 해소 확인(항목 1·2·12~15)
- 관찰: O-1 ~ O-6 (O-1 저장소 typecheck는 run 1과 같은 사용자 `.next/types` 옛 경로 문제)

## 검증 명령 (순차 실행)
| 명령 | 위치 | 종료 코드 | 결과 |
|---|---|---|---|
| `corepack pnpm lint` | 저장소 | 0 | 오류·경고 없음 |
| `corepack pnpm typecheck` | 저장소 | **2** | 오류 3건 모두 `.next/types/app/[locale]/(public)/employer/candidates/page.ts`·`.next/types/validator.ts`가 7e18f8d 전 옛 경로를 찾음 — run 1 O-1과 같음(사용자 `.next` 생성물, 지우지 않음) |
| `tsc --noEmit` | 작업 트리(2644efa, `.next` 없는 상태) | 0 | 오류 없음 → 코드 자체는 타입 통과 |
| `corepack pnpm test` | 저장소 | 0 | **66 files / 521 tests** 통과(23.7s). run 1 대비 +1 file(`statsMasking.test.ts`), +5 tests |
| `corepack pnpm i18n:check` | 저장소 | 0 | ko 1085 keys(run 1 1069 → +16), 6 locales, errors 0 |
| `corepack pnpm qa:static` | 저장소 | 0 | errors 0, warnings 17(run 1과 같은 수) |
| `next build` | 작업 트리 | 0 | 빌드 성공. `ƒ /admin/companies`, `ƒ /api/employer/candidates` 등 |
| `E2E_PORT=3840 playwright test --reporter=line` | 작업 트리 | 0 | **244 passed (2.9m)**, 실패 0 (employer-candidates의 새 단언 — GradeBadge·합계 마스킹·전공 분야·원문 코드 미표시, wizard-resume의 `majorField` 저장·복원 포함) |

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| 1 | F-1 / WO §7.3 체류 공개 3구간, 경계 직렬화 | 같은 태그의 후보 7명(만료 이번 달·+5·+6·+11·+12·+30개월·지난달)을 만들고 LIST 기업(검증+계약)으로 `/api/employer/candidates?convertible=태그` | Pass | `bandOf {m0:"M0_6", m5:"M0_6", m6:"M6_12", m11:"M6_12", m12:"M12_PLUS", m30:"M12_PLUS", mPast:null}` — 이번 달 만료는 M0_6, 지난달 만료는 제외(6명). 카드 문구 "6개월 미만"·"6~12개월"·"12개월 이상". 개발 DB 전체 직렬화 구간 분포 `UNKNOWN 1453, M12_PLUS 847, M0_6 22, M6_12 2` — 옛 코드 0 |
| 2 | F-1 필터 3구간, 옛 코드 요청 무시 | 같은 태그로 `stay=` 7가지(API), 화면 `?stay=M24_PLUS`·`?stay=M6_12`, 필터 select 옵션 | Pass | `M0_6→[m0,m5]`, `M6_12→[m6,m11]`, `M12_PLUS→[m12,m30]`; `M24_PLUS`·`M12_24`·`UNKNOWN`·`m0_6` → 모두 200, 필터 없이 6명(무시). 화면 select 옵션 `["", M0_6, M6_12, M12_PLUS]`, `?stay=M24_PLUS`면 선택값 ""·카드 6, `?stay=M6_12`면 카드 2·선택 유지. 후보 화면 HTML에 `M12_24`·`M24_PLUS` 문자열 0 |
| 3 | PC-11 가린 칸이 있으면 합계 숨김(실제 API·HTML) | 미검증·미계약 기업으로 API와 화면을 5단계로 시험, 매 단계 `eligibleCandidateWhere` groupBy(독립 집계)와 대조: P0 기존(BUSAN·S 1) → P1 모든 칸 ≥5 → P2 새 소표본 칸 3개 → P3 하나만 5로 → P4 가린 칸 1개 → P5 원상 복귀 | Pass | P0 `total:null, totalMask:"HAS_MASKED_CELL"`, 화면 `stats-total` "—"·`data-total-mask="HAS_MASKED_CELL"`·안내문 표시. P1(가린 칸 0) `total:288` = 독립 합계 288, 화면 "288명"·`data-total-mask="none"`. P2·P3·P4 모두 `total:null`(가린 칸 3·2·1개), P5는 P0와 같음. 모든 단계에서 칸 값 = 독립 집계(5 미만 null), 칸 수 일치, 응답 키 `access, stats`, 칸 키 `sido, grade, count`뿐 |
| 4 | PC-11 공개값 조합으로 가린 값 역산 불가 | ① 실제 서버: 가린 칸이 있는 단계마다 진짜 합계(284·295·296·299)가 `main` 본문·HTML·RSC에 나오는지 검색 ② `maskCandidateStats` 전수 대입: 칸 4개(BUSAN·S, SEOUL·A, DAEGU·S, 지역 없음·A) × 값 0~9 = 10,000표의 공개 결과를 묶어, 가린 칸마다 같은 공개 결과를 내는 숨은 값 집합 확인 | Pass | ① `main` 본문 0회. HTML·RSC 일치는 P2의 295 한 번뿐이며 위치는 lucide 별 아이콘 SVG path `M11.525 2.295a…`(숫자 우연 일치), P0·P3·P4·P5는 0회. P1(가린 칸 없음)에서만 합계가 `stats-total`에 나옴. ② 공개 결과 2,401종 중 가린 칸 있는 1,105종 모두 `total` 숨김(`totalShownWithMasked:0`), 가린 칸마다 숨은 값 후보가 1·2·3·4 네 개 그대로(`leakingSlotViews:0`). 행·열 소계 없음(합계는 하나뿐) |
| 5 | PC-11 사유·정렬로 정보 새지 않음 | P2에서 가린 칸을 DAEGU·S 1명, JEJU·S 4명, GWANGJU·A 2명으로 만들어 순서 확인; 전수 대입에서 입력 순서를 섞어 결과 비교; 사유 값 종류; 필터 쿼리를 붙인 통계 요청 | Pass | 가린 칸 순서 `DAEGU/S, JEJU/S, GWANGJU/A` = 등급 → 지역 코드 순(숨은 값 1·4가 순서에 반영되지 않음, 공개 칸 뒤에 위치). 입력 순서를 섞어도 출력 동일(10,000표). `totalMask`는 `HAS_MASKED_CELL`이 먼저 정해지고, `SMALL`은 가린 칸이 없을 때만(=칸이 비었을 때만) 나옴. `?convertible=XYZ&stay=M0_6&visa=H-2`를 붙여도 응답이 같음(`apiSameWithParams:true`) → 필터 차분 공격 불가 |
| 6 | PC-11 "수요 지도와 동일 규칙" — /demand(플래그 on)와 그 API의 지역 합계·칸 역산 | 지난 30일 리드가 없는 시·도 2곳에 리드 삽입: DAEGU 제조업(C) 5건(급여 200·210·220·230·240만), 건설업(F) 2건(900만), INCHEON 제조업 3건 → 3853 `/ko/demand` 표, 홈 `/ko` 지도 노드, RSC; `/api/demand`; `aggregateDemand` 전수 비교(가린 칸 값만 1~4로 바꾼 3,000쌍) | Pass | 표: 대구·제조업 "5건 ₩2,200,000 ~ ₩2,300,000", 대구·건설업 "자료 부족 / 자료 부족", 인천·제조업 "자료 부족". 지도 노드 대구 "5건"(가린 2건을 더한 7이 아님), 급여 구간도 공개 칸만으로 계산(가린 칸을 넣으면 중앙값 230만 → 다른 구간), 인천 "자료 부족". RSC에 `"count":7`·`"count":3` 없음, 900만 값 0. 수요 지도 전용 API는 없음(`/api/demand` 404, `src/app/api`에 demand 라우트 없음) — 데이터는 페이지 HTML·RSC로만 나감. 전수 비교 3,000쌍에서 가린 칸 값에 따라 출력이 달라진 경우 0 → 역산 불가, 결함 없음 |
| 7 | Q-24 위저드 3a 전공 분야 선택·저장·재로그인 복원 | `createWizardSeeker(…,"2")` 구직자 → 실제 OTP 로그인 → `/ko/seeker/register?step=3&sub=a`에서 학력 "대학교", 전공 분야 "보건·복지", 전공명 자유 입력 → 다음 → DB; 새 브라우저 컨텍스트로 다시 로그인 → 3a | Pass | 저장 요청 본문 `{"step":"3a",…,"values":{"educationLevel":"BACHELOR","majorField":"HEALTH_WELFARE","major":"QAR2 secret major …",…}}`, DB `majorField:"HEALTH_WELFARE"`, 화면 3b로 이동. 재로그인 후 3a select 값 `HEALTH_WELFARE`, 전공명도 유지. E2E wizard-resume(ENGINEERING 저장·복원)도 통과 |
| 8 | Q-24 잘못된 코드 거부 | 잡은 저장 액션을 `majorField`만 바꿔 재전송: `HACKER`, `engineering`, `<script>`, `"ENGINEERING "`, `M24_PLUS`, `""`, 키 생략, `UNKNOWN` | Pass | 앞 5가지 모두 `{"ok":false,"code":"VALIDATION","fieldErrors":{"majorField":"Invalid input"}}`, DB 값 `HEALTH_WELFARE` 그대로. `""`·키 생략은 선택 문항이라 `ok:true`로 null 저장(O-4), `UNKNOWN`은 목록 값이라 저장. 개발 DB 전체 `majorField` 저장값 69개 모두 목록 안(`rawMajorFieldInvalid:0`) |
| 9 | Q-24 기업 카드·API에 코드 라벨만, 자유 입력 전공명 미노출 | 위 구직자의 나머지 단계를 서버 함수로 완료(completedStep 7)하고 A등급·태그 지정 → LIST 기업 화면 카드·API·HTML·RSC | Pass | 카드 "전공 분야 보건·복지" 표시, API `majorField:["HEALTH_WELFARE"]`(코드). 자유 입력 전공명(`QAR2 secret major …`, 전화번호 모양 포함)은 API·HTML·RSC 모두 0회, 연락처 탐지 0. 직렬화기는 `oneOf(MAJOR_FIELDS, …)`로 목록 밖 값을 null로 돌림, `major`는 select에 없음 |
| 10 | Q-24 화면당 문항 ≤7(SC-01) | 3a 화면의 질문 라벨·입력 이름 | Pass | 질문 5개(최종 학력(필수), 전공 분야, 전공명, 학교명, 졸업(예정)일), 입력 이름 6개(졸업일 연·월 2개가 한 문항). 전공 분야 옵션 = 빈 값 + 13개(ISCED-F 대분류 11 + OTHER·UNKNOWN), 공개 요약에 "전공 분야"는 기업 공개, "전공명"은 비공개로 표시(E2E 확인) |
| 11 | Q-24 6개 언어 | 6개 언어 `/{l}/seeker/register?step=3&sub=a`의 전공 분야 select | Pass | 6개 언어 모두 옵션 14개, 메시지 키 노출 0. 예: ENGINEERING = 공학·제조·건설 / Engineering, manufacturing and construction / Kỹ thuật, sản xuất và xây dựng / 工程、制造与建筑 / Инженерия, производство и строительство / Muhandislik, ishlab chiqarish va qurilish |
| 12 | F-3 VisaType에 없는 전환 비자는 표시 안 함 | 전환 비자에 태그 코드(VisaType 밖)를 가진 후보와 `F-2`(VisaType 안)를 가진 후보를 LIST 기업 화면으로 | Pass | 태그 후보 카드: 태그 문자열 0회, "전환 가능 비자" 블록 자체가 없음. F-2 후보 카드: "전환 가능 비자 · 행정사 판정" + VisaLabel `F-2` 표시 |
| 13 | F-4 통계 표 등급 GradeBadge | 항목 3의 모든 단계에서 통계 표 각 행의 `grade-badge` | Pass | 모든 행에 `data-testid="grade-badge"`가 있고 `data-grade`가 API 칸 등급과 같은 순서로 일치(S행은 "S등급 우선 추천" 배지) |
| 14 | F-2 폼 간격(필드 간 22px, 필드 내부 7px) | 브라우저 `getComputedStyle` 측정: 계약 폼, 후보 필터, 관리자 공고 작성 폼(`/admin/postings/new?leadId=`A 리드) | Pass | 계약 폼 `row-gap 22px`, 필드 묶음 2개 `7px`(세 번째 8px는 제출 버튼 줄, 필드 아님). 후보 필터 폼·그리드 `22px/22px`, 필드 8개 `7px`. 공고 작성 폼 `22px`, 그룹 그리드 3개 `22px/22px`, 필드 12개 `7px` |
| 15 | F-5 관리자 "가입 계정 수" 단위 없음 | ADMIN 실제 로그인 → `/admin/companies` | Pass | 새 기업 행 "가입 계정 수 1", 표 100행 중 "가입 계정 …개" 0행 |
| 16 | 회귀 R-204 / WO §15-1 직렬화 키 ⊆ 화이트리스트 — 개발 DB 전체 | `BLIND_SEEKER_SELECT`로 개발 DB 구직자 전부 읽어 `serializeBlindSeeker`(시험 전·후 2회); 각 행의 이름·이메일·메신저 ID·학교명·전공명·추천 코드·DB id·userId·원본 publicId·이전 회사명 문자열 검색, 연락처 정규식 | Pass | 마지막 실행 `{"total":2324,"keyNotSubset":0,"keySetVariants":1,"keyCount":[30],"errors":0,"leaks":0,"contactHits":0,"majorNonNull":69,"majorOutOfList":0}`(시작 2,226명도 같은 결과). 스냅샷 단위 시험 통과 |
| 17 | 회귀 R-206 / WO §15-2 기업 응답 누출 0 | 레지스트리 하네스(`employerApiLeak.test.ts`) 통과 확인; 직접: 항목 1·2·9·12의 API 응답·카드 본문·HTML·RSC | Pass | 단위 하네스 통과(521 tests). 직접 시험 API 연락처 탐지 0, 숨김 값(자유 전공명·`free text major`·이름·이메일) 0. E2E `noContacts`(main 본문 연락처·숨김 값·"지원하기" 0) 통과 |
| 18 | 회귀 R-207 101번째 열람 429 + 감사 | LIST 기업: 화면 1회 + API 99회 → API 100번째 요청(=101번째 열람) → 한 번 더 → 화면 | Pass | API 200 ×99, 101번째 **429** `{"error":{"code":"RATE_LIMITED",…}}`, `Retry-After: 26193`(한국 자정까지). 화면 `candidates-limited` 표시. CANDIDATE_BULK_VIEW 103행 = 성공 100 + 거부 3(`refused`) |
| 19 | 회귀 R-208 위임 동의 선택 | 새 기업이 계약 화면에서 약관+위임 둘 다 체크 → 제출; 위임 없이 계약은 E2E | Pass | `contract-signed`, 회사 `contractVersion:"v1", visaMandateAgreed:true`, Consent `EMPLOYER_TERMS` v1 + `EMPLOYER_VISA_MANDATE` v1. E2E: 약관 없이 제출 → 오류·포커스, 약관만 → 계약 완료 `visaMandateAgreed:false`, 약관 PDF 200 |
| 20 | 회귀 R-218 COMPANY_VERIFY 감사·권한 | ADMIN 실제 로그인으로 새 기업 검증 → 계약 등록 → 검증 해제; STAFF_VISA 거부는 E2E | Pass | 감사 3행 `VERIFY, CONTRACT_SET, UNVERIFY`(entity = 그 회사). E2E: STAFF_PLACEMENT 검증·계약 `["VERIFY","CONTRACT_SET"]`, STAFF_VISA 표 0·"매칭 담당 직원과 관리자만" |
| 21 | 회귀 R-205 / SC-07 플래그 off·접근 단계 | E2E(플래그 off 서버: ComingSoon 200·noindex·API 404·링크 0; on 서버: 로그인 필요, 미검증 통계만, LIST 목록·E-9 제외·면접 요청·감사, 필터) | Pass | E2E employer-candidates 전부 통과(데스크톱·375 두 프로젝트) |
| 22 | 회귀 P1c 동의 철회 즉시 제외 | 항목 9의 구직자(기업에 보이는 상태)가 `/ko/seeker/me`에서 BLIND_PROFILE 철회 → 같은 기업 세션 API·화면 | Pass | 철회 전 API 1명·카드 표시 → 철회 후 Consent `revokedAt` 있음, API `candidates:[]`, 화면 카드 0. E2E consent-revoke도 통과 |
| 23 | 회귀 P2a 및 E2E 전체 | E2E 전체 | Pass | 244/244 통과(jobs-apply·admin-core·quick-register·demand·wizard-resume·consent-revoke 포함) |
| 24 | 검증 명령 7종 | 위 표 | Pass | lint·test·i18n:check·qa:static·build·E2E 종료 코드 0. typecheck는 저장소에서 사용자 `.next/types` 옛 경로로 2, 같은 커밋 작업 트리(생성물 없음)에서 0 → 코드 결함 아님(O-1) |

## 판정불가 / 사람 확인 필요
없음.

## 결함 목록 (Fail만)
없음.

## 관찰 / 기준 외 발견
| 번호 | 내용 | 재현·증거 | 영향 | 제안 |
|---|---|---|---|---|
| O-1 | 저장소 `pnpm typecheck` 실패(run 1 O-1과 같음): `.next/types`가 7e18f8d 전 경로 `(public)/employer/candidates`를 참조 | 오류 3건 모두 `.next/types/...`; 작업 트리 tsc 0 | 사용자 개발 환경에서 typecheck가 빨갛게 보임 | 사용자가 `.next`를 지우거나 `next build`/`next dev`를 한 번 돌리면 해소(QA는 지우지 않음) |
| O-2 | 통계 합계는 가린 칸이 하나라도 있으면 숨겨지므로, 실제 운영에서는 거의 항상 "—"로 보일 수 있음 | 현재 개발 DB도 run 1이 남긴 BUSAN·S 1명 때문에 합계가 숨겨진 상태(P0·P5). 소표본 지역이 하나라도 생기면 숨김 | 보안상 맞는 선택(차감 노출 차단, 결정 근거는 `stats.ts` 주석). 기업 쪽에서는 전체 규모를 못 봄 | 기록만. 전체 규모를 보여 주려면 범위 표시("200명 이상" 등) 같은 대안은 사람 판단 |
| O-3 | 칸이 가려졌다는 사실 자체로 그 칸이 1~4명임은 드러남(수요 지도도 같음) | 통계 행 "부산광역시 S등급 5명 미만", 수요 지도 "자료 부족" | PC-11·WO §15-10이 정한 방식 그대로이며 정확한 값은 나오지 않음(항목 4·6). 시점을 달리한 비교도 범위 이상은 알 수 없음 | 기록만 |
| O-4 | 3a 저장에서 `majorField`가 빈 값이거나 키가 없으면 기존 값이 null로 덮임 | 재전송 `""`·키 생략 → `ok:true`, DB `HEALTH_WELFARE` → null | 선택 문항이라 의도된 동작(스키마 주석: 옛 화면은 "답 안 함"으로 저장). 다만 배포 직후 옛 화면을 열어 둔 구직자가 3a를 다시 저장하면 이미 고른 값이 지워짐 | 기록만(새 화면은 항상 키를 보냄) |
| O-5 | API의 `convertibleVisa`는 코드 모양이면 VisaType 밖 값도 그대로 나감 | 시험 태그 `QAR2V-…`가 API 응답에는 있고 카드에는 없음(F-3 수정은 화면 기준) | WO §7.5 화이트리스트 키이고 코드 정규식만 통과하므로 개인정보는 아님. 실제 데이터에서는 VisaType 코드만 들어감 | 기록만. 원하면 직렬화기에서도 VisaType 목록으로 거르는 방안 |
| O-6 | 시험 행이 개발 DB에 남음(삭제하지 않음) | 체류 구간 후보 7명(QAR2S, 6명 후보 조건 통과)·전환 비자 후보 2명(QAR2V·QAR2K)·전공 분야 구직자 3명(1명 완료 후 BLIND 철회)·기업·직원 계정·감사 행. 통계용 후보 15명은 시험 뒤 `status: INACTIVE`로 바꿔 통계를 시작 상태로 되돌림(P5 = P0 확인). 수요 지도 리드 10건은 `postedAt`을 90일 전으로 옮겨 집계 밖으로 뺌 | 개발 서버의 후보 수(CHUNGNAM·A 등)가 늘어남 | 정리 스크립트 또는 E2E 전용 DB(이전 관찰과 같음) |
