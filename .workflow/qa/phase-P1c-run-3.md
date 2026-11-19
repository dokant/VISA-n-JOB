# QA 보고서 — Phase P1c / run 3 (최종 재확인·회귀)

- 대상: 커밋 601992f (R2-1 다이얼로그 진입 토큰, R2-2 필수 체크박스 포커스, R2-3 /visa-check 상태 코드 이름 표시, D-2 sticky 바 포커스, O-8 KST 월 경계, Step 2 등록 불가 버튼 라벨)
- 기준 문서: PRD v1.1 R-105~R-113, N-01·N-03·N-04; PLAN `### P1c`; DECISIONS Q-10·Q-11; run-2 보고서(D-2, O-7~O-10); STANDARD 3.1(다이얼로그 진입 translateY 18px)·3.2(VisaLabel B-3)·3.3(첫 오류 필드 포커스, 하단 고정 바)
- 일시: 2026-11-16 14:22 ~ 14:45 (KST)
- 환경: Windows 11, 개발 DB 54320, Vitest 테스트 DB. 프로덕션 빌드 `next start` 127.0.0.1:3160(`TRUST_PROXY=true`), 127.0.0.1:3161(`TRUST_PROXY` 미설정). E2E는 `E2E_PORT=3140`(+3141). 직접 시험은 Playwright chromium 375×812(isMobile, hasTouch)과 앱 Prisma 클라이언트(tsx). 스크립트는 스크래치 디렉터리에만 두고 끝난 뒤 지움. 3160·3161은 끝에 종료(LISTEN 없음 확인). .env 값은 출력하지 않았고 외부로 보낸 것도 없음(알림은 콘솔 어댑터와 무음 notifier).
- 정리 메모: 직접 시험 1회차에 Playwright 출력 폴더가 기본값(저장소 `test-results/`, gitignore 대상)으로 잡혀 E2E가 남긴 `.last-run.json`을 덮어썼음. 실패 산출물 폴더를 지우고 `.last-run.json`을 E2E 결과(186→194 passed)대로 `{"status":"passed","failedTests":[]}`로 되돌림. 이후 실행은 출력 폴더를 스크래치로 옮김. 추적 파일 변경 없음(`git status`에는 `.workflow/` 기존 변경과 `qa/`만 있음).

## 결과 요약
- 통과: 14 / 전체: 14 (통과율 100%) — 직접 시험 6(D-2, O-8, 다이얼로그 18px, 필수 체크박스 포커스, /visa-check 이름 표시, Step 2 버튼 라벨) + 회귀 7(R-105~R-113 묶음, R-108, R-109 우회, D-1, O-1, N-01·N-03·N-04, P1b 재확인 6건) + 검증 명령
- 필수 항목(PRD 합격 기준) 실패: 0개
- 결함: 없음. run-2 D-2는 **해결(Pass)**
- run-2 O-8: **해소**(KST 월 경계로 변경 확인). O-7·O-9·O-10·O-6: 이번 커밋 범위 밖이라 상태 변화 없음(아래 기준 외 발견)

## 검증 명령 (순차 실행)
| 명령 | 종료 코드 | 결과 |
|---|---|---|
| `corepack pnpm lint` | 0 | 오류·경고 없음 |
| `corepack pnpm typecheck` | 0 | 오류 없음 |
| `corepack pnpm test` | 0 | 32 files / 297 tests passed (run-2 296 → +1: `classifyTrack.test.ts` "O-8: the month boundary is Asia/Seoul") |
| `corepack pnpm i18n:check` | 0 | ko 792 keys, 6 locales, errors 0 |
| `corepack pnpm qa:static` | 0 | errors 0, warnings 17 (S-23 문구 검토 14, S-45 console 3 — run-2와 같은 항목) |
| `corepack pnpm build` | 0 (1회차) | 141/141 페이지 생성. 메모리 부족 중단 없음(NODE_OPTIONS 재시도 불필요) |
| `E2E_PORT=3140 corepack pnpm test:e2e` | 0 | 194 passed (2.6m). run-2 186 → +8: 새 `wizard-focus.spec.ts` 4건 × 2 프로젝트(desktop-chromium, mobile-375) 모두 통과 |

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| 1. D-2 재측정 | 375px에서 Tab 순회 시 포커스 요소가 sticky 하단 바에 가려지지 않음(STANDARD 3.3 / WCAG 2.4.11) | run-2와 같은 방법: Step 1~6 저장한 구직자로 로그인 → `?step=5&sub=a`, `?step=3&sub=b`에서 제목 클릭 후 **Tab 키** 최대 90회(바 안 요소에 닿으면 중단), 매 Tab 뒤 700ms 대기 후 `activeElement.bottom − bar.top` 측정. 추가로 9화면(Step 1·2·3a·3b·4·5a·5b·6·7) 폼 안 포커스 가능한 요소마다 맨 위로 스크롤 → `focus()` → 500ms 뒤 측정 | Pass | html 계산 스타일 `scroll-padding-bottom: 96px`, 바 높이 77px. **Tab**: 5a 포커스 40회 중 겹침 0, 최대값 −19px(바 위 19px). 3b 25회 중 겹침 0, 최대값 −19px. run-2(5a 9/52, 3b 4/50 가림) 대비 해소. **focus()**: Step 1 7개, 2 5개, 3a 4개, 3b 22개, 4 18개, 5a 39개, 5b 1개, 6 1개, 7 4개 — 겹침 모두 0. 9화면 scrollWidth 375. 원인 수정 위치: `globals.css` `:root:has([data-sticky-bottom-bar]) { scroll-padding-bottom: var(--spacing-wizard-bar) }`, `wizard-shell.tsx` 바에 `data-sticky-bottom-bar` |
| 2. O-8 KST 월 경계 | 체류 만료 판정의 "이번 달"이 Asia/Seoul 기준(매월 1일 00:00 KST에 지난달 만료자 제외) | (1) 단위 테스트 실행(verbose). (2) 시각 주입: `isStayExpired`·`notExpiredFrom`을 경계 전후 시각으로 직접 호출, 프로세스 TZ=UTC와 Asia/Seoul 두 번. (3) DB 쿼리: grade A 구직자 생성 → `stayExpiry=2026-11` 저장 → `isEligibleCandidate(seekerId, now)`를 경계 전후 `now`로 조회(실행 중 서버에는 시각 주입 수단이 없어 쿼리 계층 함수로 시험) | Pass | (1) `O-8: the month boundary is Asia/Seoul (00:00 KST on the 1st), not UTC` ✓ (파일 23/23). (2) TZ=UTC·Asia/Seoul 결과 동일: `2026-11-30T14:59:59.999Z`(11/30 23:59:59 KST) → 11월 만료 `expired=false`, `notExpiredFrom=2026-11-01`; `2026-11-30T15:00:00Z`(12/1 00:00 KST) → `expired=true`, `notExpiredFrom=2026-12-01`; 12월 만료는 두 시각 모두 `false`. 연 경계 `2026-12-31T14:59:59.999Z` → `2026-12-01`, `T15:00:00Z` → `2027-01-01`. (3) DB: 11월 만료자 `14:59:59.999Z → true`, `15:00:00Z → false`, `2026-12-01T00:00:01Z → false`, 현재 시각 → `true`. run-2의 9시간 지연(UTC 경계) 해소. 졸업 예정 창(`withinGraduationWindow`)도 같은 `currentMonthStart` 사용(코드 `src/lib/visa-engine/classifyTrack.ts:74-108`) |
| 3. 다이얼로그 진입 18px | 동의 철회 확인 다이얼로그 열림 시 진입 이동 translateY 18px(STANDARD 3.1) | 375px, grade A 구직자 `/ko/seeker/me` → `revoke-BLIND_PROFILE` 클릭 → `[data-slot=dialog-content]`의 `getAnimations()` 키프레임, 계산된 CSS 변수, 애니메이션을 `currentTime=0`에 멈춘 뒤 계산된 transform·위치, `finish()` 뒤 값 비교 | Pass | 클래스 `slide-in-from-bottom-dialog`, `--tw-enter-translate-y: 18px`, 루트 토큰 `--translate-dialog: 18px`. 애니메이션 `enter` 500ms, 시작 키프레임 `translate3d(0px, 18px, 0px) scale3d(0.98, …)`, opacity 0, easing `cubic-bezier(0.16, 1, 0.3, 1)`. t=0 계산 transform `matrix3d(0.98,…, 0, 18, 0, 1)`(y 이동 18), 끝 `none`. 박스 중심 위치 차이 **18.00px**. 요소의 `translate: 0px -50%`(가운데 정렬)는 별도 속성이라 영향 없음 |
| 4. 필수 체크박스 미체크 시 포커스 | STANDARD 3.3 "첫 오류 필드로 포커스" — Step 2 확인, Step 7 필수 동의, 간편 등록 동의 | 375px. 매번 제목을 클릭해 포커스를 옮긴 뒤 제출하고 `activeElement` 확인. Step 7: PRIVACY_REQUIRED·BLIND_PROFILE·NOTICE를 각각 하나씩 해제(구직자 새로 만들어), 그리고 PRIVACY+BLIND 동시 해제. Step 2: 다른 값은 채운 상태에서 확인 체크 해제. 간편 등록: 비자 F-4·시도·전화 인증까지 하고 동의 0개 → PRIVACY만 → PRIVACY+BLIND | Pass | Step 7: 각 경우 포커스 = 해제한 항목의 `BUTTON role=checkbox`(`consent-PRIVACY_REQUIRED`, `consent-BLIND_PROFILE`, `consent-NOTICE`), URL `?step=7` 유지, 포커스 요소 bottom이 바 top보다 176~487px 위. 두 개 해제 시 위쪽 `consent-PRIVACY_REQUIRED`. Step 2: 확인 체크박스 포커스 `true`, URL `?step=2`, 바 위 137px. 간편 등록: 동의 0 → `consent-PRIVACY_REQUIRED`, PRIVACY만 → `consent-BLIND_PROFILE`, +BLIND → `consent-NOTICE`, URL `/ko/seeker/register/quick` 유지. (참고: 선택 동의 MARKETING만 해제하면 정상 완료로 넘어감 — 기대대로) |
| 5. /visa-check 상태 코드 이름 표시 | UNKNOWN·NONE·OTHER는 옵션·결과 카드에 코드 없이 이름만, 일반 비자는 코드+이름(B-3) | 375px `/ko/visa-check`의 `<option>` 전부 수집. `?visaCode=`로 UNKNOWN·NONE·OTHER·F-4·E-9 결과 카드 텍스트. UI에서 OTHER 선택 후 제출. 홈 위젯 박스 목록 | Pass | 옵션: `OTHER=>그 밖의 비자`, `NONE=>비자 없음`, `UNKNOWN=>모름`, 그 외 16개 `F-2=>F-2 거주`, `F-4=>F-4 재외동포`, `G-1=>G-1 기타`, `B-1=>B-1 사증면제` 등 코드+이름. 결과 카드: UNKNOWN "확인 필요 **모름** …", NONE "… **비자 없음** …", OTHER "… **그 밖의 비자** …" — 코드 문자열 포함 `false`. F-4 "F-4 재외동포", E-9 "E-9 비전문취업" — 코드 포함 `true`. UI 제출(OTHER)도 "그 밖의 비자"만. 홈 위젯은 registrable 13개만(상태 코드 행 없음), 모두 코드+이름. 판별은 `VisaType.isStatusCode`(`referenceData.ts` select에 추가, `visa-check-form.tsx`, `outcome-card.tsx` `showCode`) |
| 6. Step 2 등록 불가 비자 버튼 라벨 | 등록 불가 비자 선택 시 다음 버튼이 비활성이되 라벨이 "저장 중…"이 아님 | 375px Step 2에서 UNKNOWN → NONE → OTHER → F-4 순서로 선택, 버튼 `innerText`·disabled·상담 안내 표시 확인 | Pass | UNKNOWN·NONE·OTHER: `registration-blocked` 표시, 버튼 "저장하고 다음", disabled `true`. F-4: 안내 없음, "저장하고 다음", disabled `false`. "저장 중…" 노출 0회(`WizardNav`가 `disabled`와 `pending`을 분리, `wizard-shell.tsx:131-136`) |
| 7a. 회귀 R-105·R-106·R-107·R-111·R-112·R-113 | run-2 Pass 유지 | E2E 결과 + 직접 흐름(간편 등록, Step 7 정상 완료, /me 동의 철회 다이얼로그, /me/stay 저장) | Pass | E2E desktop·mobile-375 모두 통과: `quick-register.spec.ts`(R-105), `wizard-resume.spec.ts:29`(R-106·R-107), `:132`(Step 4~7), `:204`(R-109 안내), `referral.spec.ts`(R-111), `complete-screen.spec.ts`(R-112), `consent-revoke.spec.ts`(R-113). 직접: Step 7 정상 제출 → `/ko/seeker/register/complete`, completedStep 7, track JOB_MATCH. /me 철회 버튼 → 다이얼로그 열림(3번) |
| 7b. 회귀 R-108 | 비자→트랙 매핑 상수 없음 | src grep(`["'\`][A-H]-\d{1,2}["'\`]`, messages 제외) + 단위 테스트 | Pass | grep 0건. `classifyTrack.test.ts` 23건 포함 297건 통과 |
| 7c. 회귀 R-109 서버 우회 거부 | 클라이언트 우회 시 서버 거부 | Playwright route로 서버 액션(`next-action` 헤더) 본문 변조. (1) 간편 등록 F-4 → B-1/NONE/UNKNOWN/OTHER/ZZ-9. (2) Step 2 F-4 → NONE/B-1/UNKNOWN, 만료월 2028-xx → 2025-xx. (3) Step 7 `"blindProfile":true→false`, 이어서 정상 제출 | Pass | 모든 경우 변조 적용 확인(hit=1). (1) 5개 모두 `registration-blocked`, URL `/ko/seeker/register/quick` 유지, **User 생성 false**. (2) 4개 모두 `registration-blocked`, URL `?step=2`, completedStep 1 유지. (3) URL `?step=7`, completedStep 6, Consent 3→3, 오류 "표시된 항목을 확인해 주세요." → 정상 제출 시 완료(7) |
| 7d. 회귀 D-1 (Q-11) | 계정+IP 10회, 계정 상한 50회, 한 IP 남용이 소유자를 잠그지 않음, TRUST_PROXY off에서는 계정 상한만. 구직자 OTP 동일 | 실제 HTTP `GET /api/auth/csrf` → `POST /api/auth/callback/{employer-password,seeker-otp}`(redirect manual). 성공=3xx+세션 쿠키+error 없음, 실패=`error=CredentialsSignin`, 429=사전 차단. 새 EMPLOYER·SEEKER 계정으로 각각 3개 시나리오 | Pass | **3160 T1**: IP A 틀림 FAIL×10, 11회째 429, A에서 정답 429, **다른 IP B 정답 OK**, 이후 A 429 — 기업·구직자 동일. **T2**: IP 5개×10회 FAIL×50 → 새 IP 정답 429, 새 IP 틀림 429 — 기업·구직자 동일. **3161(off)**: XFF 바꿔 틀림 FAIL×11(429 없음) → 정답 OK; 새 계정 틀림 FAIL×50 → 정답 429 — 기업·구직자 동일 |
| 7e. 회귀 O-1 | /me/stay에서 지난달 저장 → 후보 즉시 제외, 이번 달·다음 달은 포함 | grade A 구직자 375px 로그인 → `/ko/seeker/me/stay` UI로 2026-10 → 2026-11 → 2026-12 저장, 매번 `isEligibleCandidate` | Pass | 저장 전 `true`. 2026-10: "저장했습니다" 표시, DB `2026-10-01`, JOB_MATCH·completedStep 7 → `false`. 2026-11 → `true`. 2026-12 → `true` |
| 7f. N-01·N-03·N-04 | 직접 연락 0, 동의서 표시, 375 가로 스크롤 없음 | 601992f diff에서 연락 수단 추가 여부(tel/mailto/메신저/chat/phone) 확인, 위저드 9화면 scrollWidth, Step 7 동의서 본문 | Pass | diff의 해당 문자열은 테스트 코드의 `uniquePhone` 등뿐, 연락 링크·채팅 추가 없음. 9화면 scrollWidth 375. Step 7 동의서 본문 4개 모두 `[전문가 검토 필요]` 표시 유지 |
| 7g. P1b 재확인 6건 | run-2 표와 같음 | 아래 표 | Pass | 6/6 Pass |
| 검증 명령 | 7개 통과 | 위 표대로 순차 실행 | Pass | 7개 모두 exit 0 |

## P1b 선행 수정 재확인
| # | 항목 | 시험 방법 | 결과 | 증거 |
|---|---|---|---|---|
| 1 | TOTP 같은 시간 단계 코드 재사용 거부 | 새 ADMIN → 비번 로그인 → setup에서 otplib 코드(단계 남은 시간 15초 이상일 때) → 로그아웃 → 재로그인 → verify에 같은 코드 → 다음 단계 코드. `http://localhost:3160`(O-9 회피) | Pass | sameStep=true에서 `/admin/2fa/verify` 유지, "이미 사용한 코드입니다. 인증 앱에 새 코드가 나오면 입력해 주세요." 다음 단계 코드 → `/admin` |
| 2 | 타인이 잠금 남용 불가 | 항목 7d | Pass | 다른 IP 소유자 정답 OK(기업·구직자) |
| 3 | 사업자등록번호 체크섬 | `/ko/employer/signup` UI, 체크 자리만 +1 한 번호 vs 정상 번호 | Pass | 무효: "올바른 사업자등록번호가 아닙니다. 번호를 다시 확인해 주세요.", URL 유지, Company 0. 정상: `/ko` 이동, Company 1 |
| 4 | TRUST_PROXY=false면 XFF 무시 | 같은 XFF로 다른 번호 21회 `POST /api/seeker/otp` | Pass | 3160: 200×20, 21회째 429. 3161: 200×21 |
| 5 | OTP 문구 {length} | ko·en·vi 로그인 코드 단계 | Pass | "문자로 받은 6자리 숫자를 입력해 주세요." / "Enter the 6-digit code from the text message." / "Nhập mã 6 chữ số trong tin nhắn.", `{length}` 리터럴 0 |
| 6 | 관리자 라벨 "(필수)" | `/admin/login` 라벨 | Pass | `["이메일(필수)","비밀번호(필수)"]` |

## 결함 목록 (Fail만)
없음.

## 기준 외 발견
| 번호 | 내용 | 재현·증거 | 영향 | 제안 |
|---|---|---|---|---|
| (O-7 지속) | 구직자 OTP challenge당 틀린 코드 5회면 번호 전체 30분 잠김(제3자가 유발 가능) | run-2 그대로. 이번 커밋에서 바뀐 코드 아님(재시험 안 함) | R-104 합격 기준은 충족 | 사람 판단 대기 |
| (O-9 지속) | `/admin` 미들웨어 리다이렉트 Location이 `http://localhost:<port>` 고정 | run-2 그대로. 이번에도 관리자 시험은 `localhost`로 진행 | 운영 영향 판정불가 | P1e/배포 전 확인 |
| (O-10) | 빌드 메모리 부족 | 이번 build 1회차 exit 0, E2E 안의 빌드도 정상 — 재현 안 됨 | 없음 | — |
| (O-6 지속) | 시험 행이 개발 DB에 남음 | 이번 QA로 구직자 약 25명, 기업 계정 약 9(직접 생성 8 + 가입 1)·Company 1, 직원 1, 관련 Consent·OtpChallenge·RateLimitBucket 추가 | 개발 데이터 오염 | e2e 전용 DB 또는 정리 스크립트 |
| 참고 | O-8 시험 중 TZ 지정 | Windows에서 `TZ=America/Los_Angeles`는 프로세스에 반영되지 않아(Asia/Seoul로 실행) 호스트 TZ 독립성은 UTC·Asia/Seoul 두 값으로만 확인 | 구현은 `Intl.DateTimeFormat({timeZone:"Asia/Seoul"})`라 호스트 TZ와 무관한 구조 | — |

## 판정불가 / 사람 확인 필요
- 실행 중인 서버의 시계를 바꿀 수단이 없어 O-8은 화면이 아니라 쿼리 계층 함수(`isEligibleCandidate(seekerId, now)`)와 판정 함수에 시각을 주입해 확인함.
- O-9의 운영 영향(프록시·도메인 구성 없음).
- 번역 품질과 동의서 본문 법률 내용은 사람 검토 대상.
