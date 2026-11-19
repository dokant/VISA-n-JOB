# QA 보고서 — Phase P1c / run 2 (재확인·회귀)

- 대상: 커밋 2a875f1(D-1, O-1 — Q-11), b5924a5(기준 #1~#12, 마이그레이션 `20261116120000_pending_application_unknown_visa_status_code` — Q-10)
- 기준 문서: PRD v1.1 R-105~R-113, N-01·N-03·N-04; PLAN `### P1c`; DECISIONS Q-10·Q-11; run-1 보고서(D-1, O-1, O-3, O-5); STANDARD v2.7 3.2(VisaLabel B-3)·3.3(첫 오류 필드 포커스, 하단 고정 이전/다음, '모름' B-5)
- 일시: 2026-11-16 13:48 ~ 14:40 (KST)
- 환경: Windows 11, 개발 DB 54320(마이그레이션 5개 적용 상태 확인 `prisma migrate status` → up to date), 테스트 DB 54329(Vitest). 프로덕션 빌드 `next start` 127.0.0.1:3160(`TRUST_PROXY=true`), 127.0.0.1:3161(`TRUST_PROXY` 미설정 — .env에도 키 없음). E2E는 `E2E_PORT=3140`(+3141). 시험 스크립트(Playwright chromium + 앱 Prisma 클라이언트, `tsx`)는 스크래치 디렉터리에만 두었고 저장소에 파일을 만들지 않음. 끝난 뒤 3160·3161 종료 확인(LISTEN 없음). 키·.env 값은 출력·기록하지 않음. 외부 전송 없음(알림은 콘솔 어댑터).
- OTP 코드 획득: E2E 지원 함수 `setLatestOtpCode` / 앱 `requestOtp`(코드 지정, 무음 notifier) 사용.

## 결과 요약
- 통과: 11 / 전체: 12 (통과율 92%) — 재확인 대상 6(D-1, O-1, pendingApplication, VisaLabel, 포커스·sticky 바 2) + 회귀 5(R-105~R-113 묶음, R-109 우회, N-01·N-03·N-04, P1b 재확인 6건) + 검증 명령
- 필수 항목(PRD 합격 기준) 실패: 0개
- 결함: D-2 1건(기준서 STANDARD 3.3/Q-10 sticky 바 — 키보드 포커스가 바에 가려짐. PRD 필수 아님)
- run-1 D-1: **해결(Pass)**. run-1 O-1: **해결(Pass)**. run-1 O-3: pendingApplication '모름' 추가로 해소. P1b 재확인 #2: 이번에 **Pass**
- 기준 외 발견: O-7~O-10

## 검증 명령 (순차 실행)
| 명령 | 종료 코드 | 결과 |
|---|---|---|
| `corepack pnpm lint` | 0 | 오류·경고 없음 |
| `corepack pnpm typecheck` | 0 | 오류 없음 |
| `corepack pnpm test` | 0 | 32 files / 296 tests passed (run-1 289 → +7: D-1 계정+IP·계정 상한·TRUST_PROXY off, O-1 만료 제외 등) |
| `corepack pnpm i18n:check` | 0 | ko 792 keys, 6 locales, errors 0 |
| `corepack pnpm qa:static` | 0 | errors 0, warnings 17 (S-23 문구 검토 14, S-45 console 3 — run-1과 같은 항목) |
| `corepack pnpm build` | 1회차 134, **재실행 0** | 1회차: 정적 페이지 생성 중 빌드 워커가 `JavaScript heap out of memory`(힙 약 55MB 시점, 당시 시스템 여유 가상 메모리 약 3.7GB)로 중단 — 코드 오류 메시지 없음. 같은 명령 재실행 시 정상 완료(141/141 페이지). 환경 메모리 부족으로 판단(O-10) |
| `E2E_PORT=3140 corepack pnpm test:e2e` | 0 | 186 passed (2.6m). P1c 스펙 13건 × 2 프로젝트(desktop, mobile-375) 모두 통과 |

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| 1. D-1 (Q-11) | 실패 한도 키 (계정+IP) 10회, 계정 전체 상한 50회(limits.ts 운영 수치). 한 IP 남용이 소유자를 잠그지 않음, 계정 상한 도달 시 전 IP 거부, TRUST_PROXY off에서는 계정 상한만. 구직자 OTP 로그인 동일 | 실제 HTTP: `GET /api/auth/csrf` → `POST /api/auth/callback/{employer-password,seeker-otp}`(redirect manual). 성공 = 302 + 세션 쿠키 + error 없음, 실패 = 302 `error=CredentialsSignin`, 429 = 사전 차단. 기업(새 EMPLOYER 계정)과 구직자(새 SEEKER, 틀린 코드는 열린 challenge 없이 보내 R-104 5회 잠금과 분리, 소유자 정답 직전에 `requestOtp`로 코드 발급) 각각 3개 시나리오 | Pass | **3160(TRUST_PROXY=true) T1**: IP A 틀림 1~10 = FAIL×10, 11회째 `429`, A에서 정답도 `429`, **다른 IP B에서 소유자 정답 = 로그인 성공**, 성공 뒤에도 A는 `429`(A의 계정+IP 버킷 유지). 기업·구직자 동일. **T2 계정 상한**: IP 5개 × 10회 틀림 = FAIL×50 → 새 IP에서 정답 `429`, 새 IP 틀림 `429`. 기업·구직자 동일. **3161(TRUST_PROXY 미설정)**: XFF를 매번 바꿔 틀림 10회 = FAIL×10, 11회째도 FAIL(429 아님), 소유자 정답 = 성공(잠금 없음) → 초기화 후 틀림 50회 = FAIL×50 → 소유자 정답 `429`, 이후 요청 `429`. 기업·구직자 동일. 코드: `failureLimits()`가 IP null이면 계정 버킷만 반환(`src/lib/authCredentials.ts`), `RATE_LIMITS.loginPerIdentifierIp {10,900}`, `loginPerIdentifier {50,900}`(`src/config/limits.ts`, "운영자가 조정" 표시) |
| 2. O-1 (Q-11) | 등록 완료 후 `/me/stay`에서 만료월을 지난달로 저장 → `eligibleCandidateWhere`에서 즉시 제외, 이번 달이면 포함 | `createGradeASeeker`(완료·grade A·JOB_MATCH·BLIND_PROFILE) → 375px 브라우저로 OTP 로그인 → `/ko/seeker/me/stay` UI로 저장할 때마다 `isEligibleCandidate`·`eligibleCandidateIds` 조회 | Pass | 저장 전 `true`. 지난달 `2026-10` 저장("저장했습니다.", DB `stayExpiry 2026-10-01`, track JOB_MATCH·completedStep 7 그대로) → `isEligibleCandidate=false`, ids 미포함. 이번 달 `2026-11` → `true`, ids 포함. 다음 달 `2026-12` → `true`. 경계: 이번 달 만료는 `now=2026-12-01T00:00:01Z`에서 `false`. 쿼리 조건 `OR [{stayExpiry:null},{stayExpiry:{gte: notExpiredFrom(now)}}]`(`src/lib/candidates/eligible.ts`) |
| 3. pendingApplication 예/아니오/모름 (Q-10, B-5) | 저장·복원, 마이그레이션이 기존 값 보존(true→YES 등) | (1) 375px 위저드 Step 2 UI에서 예→저장→재진입, 아니오, 모름 순서로 저장·복원 확인. (2) **마이그레이션**: 개발 클러스터에 임시 DB를 만들어 앞의 4개 마이그레이션 적용 → SeekerProfile 4행(pending true/false × visaConfirmedAt 유/무) 삽입 → 새 마이그레이션 적용 → 값 조회 → 임시 DB 삭제 | Pass | (1) 최초 DB `null`, 칩 3개 모두 미선택(`예/아니오/모름`). 예 → Step 3 이동, DB `YES`, 재진입 시 "예" 선택 복원. 아니오 → `NO`, "아니오" 복원. 모름 → `UNKNOWN`, "모름" 복원. (2) 이전 `[A:true/미확인, B:true/확인, C:false/확인, D:false/미확인]` → 이후 `[A:YES, B:YES, C:NO, D:null]`. 컬럼 `YesNoUnknown`, nullable, 기본값 없음. VisaType 백필 `OTHER/NONE/UNKNOWN=false, F-4=true`. 임시 DB 잔존 0 |
| 4. 등록 불가 비자 이름만 표시 (B-3) | OTHER·NONE·UNKNOWN이 위저드·간편 등록에서 코드 없이 이름만, 판별은 `VisaType.isStatusCode` 데이터 기반(src에 코드 리터럴 목록 없음) | (1) 간편 등록·위저드 Step 2의 `<option>` 텍스트와 선택 후 VisaLabel(`p` 안 span 수) 수집. (2) **데이터 기반 확인**: 개발 DB에서 F-4 행 `isStatusCode=false`로 바꾼 뒤 두 화면 재조회 → 원복 → 재조회. (3) src grep | Pass | (1) 두 화면 옵션: `OTHER=>그 밖의 비자`, `NONE=>비자 없음`, `UNKNOWN=>모름`, 그 외 `F-4=>F-4 재외동포`, `B-1=>B-1 사증면제` 등. 선택 시 OTHER/NONE/UNKNOWN 라벨 = 이름만(span 1개, 코드 칩 없음) + 상담 안내(`registration-blocked`) 표시, F-4/E-9 = 코드 칩 포함(span 3개). (2) F-4 `false` → 간편 등록 옵션·라벨 "재외동포", 위저드 옵션·라벨 "재외동포"(코드 사라짐) → 원복 후 "F-4 재외동포", DB `isStatusCode=false` 행은 다시 OTHER·NONE·UNKNOWN 3개뿐. (3) `src`에서 비자 코드 문자열 리터럴 0건, `"OTHER"/"NONE"/"UNKNOWN"`는 국가·메신저·성별·'모름' 선택지 용도뿐(비자 판별 아님). 판별은 `v.isStatusCode`(`quick-register-form.tsx:137,145`, `wizard-steps-a.tsx:311,319`, `seeker/me/page.tsx:63`) |
| 5a. 첫 오류 필드 포커스 (칩·월 선택) | STANDARD 3.3 "첫 오류 필드로 포커스" — 칩·월 선택에도 적용 | 375px. Step 2(비자 F-4 미리 채움): 빈 상태로 "저장하고 다음" → activeElement 확인 → 만료월 채움 → 다시 제출. 서버 오류 경로: 클라이언트 검증 통과 후 서버 액션 본문의 `"hasArc":"YES"`를 `"MAYBE"`로 변조. Step 5a: 빈 상태 제출, 구직 상태만 고른 뒤 제출 | Pass | Step 2 빈 제출 → `SELECT name=stayExpiry-year`(월 선택의 연도) 포커스. 만료월 채운 뒤 → hasArc 그룹 첫 칩 `BUTTON role=radio "예"` 포커스(오류 "입력해 주세요."). 서버 변조 → 서버 fieldError로 hasArc 칩 "예" 포커스, 오류 "선택한 값을 다시 확인해 주세요.", URL `?step=2`, completedStep 1 유지. Step 5a 빈 제출 → jobSearchStatus 첫 칩 "즉시 가능", 그다음 → desiredIndustries 첫 MultiChip "농업, 임업 및 어업". 포커스된 요소는 모두 바 위쪽(예: bottom 670 < barTop 735) |
| 5b. 하단 sticky 버튼 바 375px 본문 가림 없음 | Q-10 sticky 하단 바, 본문을 가리지 않음 | 375×812 isMobile, Step 1~7 전 9화면: 바의 computed style, 끝까지 스크롤한 위치, 가로 폭. 폼 안 포커스 가능한 요소마다 `focus()` 후 바와 겹치는지. 추가로 Step 5a·3b에서 실제 **Tab 키** 80회 눌러 겹침 측정 | **Fail (부분)** | 바: `position: sticky; bottom: 0`, `backdrop-filter: blur(22px) saturate(1.6)`, 높이 77px, 9화면 모두 scrollWidth 375. 바는 폼의 마지막 자식이라 스크롤로는 모든 문항을 바 위로 올릴 수 있음(터치 사용 시 가림 없음). **그러나 키보드 Tab 이동 시 포커스된 칩이 바 아래에 가려짐**: Step 5a 52회 포커스 중 9회(예: "금융 및 보험업" bottom 789 > barTop 735 — 완전히 가려짐), Step 3b 50회 중 4회("프랑스어", "그 밖의 언어" 부분 가림). `focus()` 측정에서도 Step 1·2·3a·3b·4·5a·7에서 1~6개 요소가 겹침(5b·6은 0). → 결함 D-2 |
| 6a. 회귀 R-105·R-106·R-107·R-111·R-112·R-113 | run-1 Pass 유지 | E2E 결과 확인 + 이번 시험 중 직접 흐름(간편 등록 서버 함수, 위저드 1~7 저장, 완료 화면 이동, `/me/stay` 저장) | Pass | E2E desktop·mobile-375 모두 통과: `quick-register.spec.ts:13`(R-105), `wizard-resume.spec.ts:29`(R-106·R-107 새 세션 재개), `:132`(Step 4~7 완료), `referral.spec.ts:11,40`(R-111), `complete-screen.spec.ts:11,45`(R-112), `consent-revoke.spec.ts:11,46,53`(R-113). 직접: 만료월 정상화 후 Step 7 제출 → `/ko/seeker/register/complete`, completedStep 7, track JOB_MATCH |
| 6b. 회귀 R-108 | 비자→트랙 매핑 상수 없음, 데이터 기반 | src grep + 단위 테스트 | Pass | 비자 코드 리터럴 정규식 grep 0건. `classifyTrack.test.ts` 포함 296건 통과 |
| 6c. 회귀 R-109 서버 우회 거부 (+R-110) | 클라이언트 우회 시 서버 거부 | Playwright route로 서버 액션 본문 변조. (1) 간편 등록 F-4 → B-1/B-2/C-3/NONE/UNKNOWN/OTHER/ZZ-9. (2) 위저드 Step 2 F-4 → B-1/NONE/UNKNOWN, 미래 만료월 → `2025-01`. (3) Step 1~6 저장 후 Step 7을 연 상태에서 다른 탭 `/me/stay`로 만료월을 지난달로 저장 → Step 7 제출. (4) 만료월 정상화 후 `"blindProfile":true→false` 변조 제출, 이어서 정상 제출 | Pass | (1) 7개 모두 변조 적용 확인, `registration-blocked` 표시, URL `/ko/seeker/register/quick` 유지, **User 생성 0**. (2) 4개 모두 `registration-blocked`, URL `?step=2`, completedStep 1 유지(값은 저장되나 진행 불가 — run-1과 같음). (3) `registration-blocked`, URL `?step=7`, completedStep 6, Consent 3→3(추가 없음). (4) BLIND 변조 → URL `?step=7`, completedStep 6. 정상 제출 → 완료(7) |
| 6d. N-01·N-03·N-04 | 직접 연락 0, 동의서 표시, 375 가로 스크롤 없음 | 이번 변경 범위 확인: 동의서 파일 변경(#3·#7) 표시 줄, 위저드 9화면 scrollWidth, 연락 수단 신설 여부 diff 확인 | Pass | b5924a5의 동의서 변경은 "Visa&Job"→"VISA n JOB" 표기와 `ExpertReviewMark` 렌더뿐, `[전문가 검토 필요]` 줄 유지(커밋 설명·diff). 위저드 9화면 scrollWidth 375. 두 커밋에 연락 링크·채팅·연락처 전달 추가 없음(diff 확인) |
| 6e. P1b 재확인 6건 | run-1 표와 같음, 특히 #2 | 아래 표 | Pass | 6/6 Pass(#2 이번에 Pass) |
| 검증 명령 | 7개 통과 | 위 표대로 순차 실행 | Pass | 7개 모두 최종 exit 0(build는 1회차 메모리 부족 중단 후 재실행 성공, O-10) |

## P1b 선행 수정 재확인
| # | 항목 | 시험 방법 | 결과 | 증거 |
|---|---|---|---|---|
| 1 | TOTP 같은 시간 단계 코드 재사용 거부 | 새 ADMIN → 비번 로그인 → setup에서 otplib 코드(같은 30초 단계 안, 남은 시간 12초 이상 확인) → 로그아웃 → 재로그인 → verify에 **같은 코드** → 다음 단계 코드. (O-9 때문에 `http://localhost:3160`으로 진행) | Pass | 같은 코드(sameStep=true): `/admin/2fa/verify` 유지, "이미 사용한 코드입니다. 인증 앱에 새 코드가 나오면 입력해 주세요." 다음 단계 코드 → `/admin` |
| 2 | 타인이 잠금 남용 불가 | 위 항목 1(D-1) | **Pass** | 다른 IP의 소유자 정답 로그인 성공(기업·구직자 모두). 계정 상한 50회 도달 시에는 전 IP 거부(Q-11 설계대로) |
| 3 | 사업자등록번호 체크섬 | `/ko/employer/signup` UI, 체크 자리만 1 바꾼 번호 vs 정상 번호 | Pass | 무효: "올바른 사업자등록번호가 아닙니다. 번호를 다시 확인해 주세요.", URL 유지, User 0. 정상: `/ko` 이동, User 1 |
| 4 | TRUST_PROXY=false면 XFF 무시 | 같은 XFF로 다른 번호 21회 `POST /api/seeker/otp` | Pass | 3160: 1~20회 200, 21회째 429. 3161: 21회 모두 200 |
| 5 | OTP 문구 {length} | ko·en·vi 로그인 코드 단계 렌더링 | Pass | "문자로 받은 6자리 숫자를 입력해 주세요." / "Enter the 6-digit code from the text message." / "Nhập mã 6 chữ số trong tin nhắn.", `{length}` 리터럴 노출 0 |
| 6 | 관리자 라벨 "(필수)" | `/admin/login` 라벨 | Pass | `["이메일(필수)","비밀번호(필수)"]` |

## 결함 목록 (Fail만)
| 번호 | 항목 | 재현 방법 | 기대 | 실제 | 위치 |
|---|---|---|---|---|---|
| D-2 | 5b sticky 하단 바(STANDARD 3.3 / Q-10, PRD 필수 아님) | 375×812에서 Step 1~6을 저장한 구직자로 `/ko/seeker/register?step=5&sub=a` 열기 → 제목 클릭 후 Tab 키로 희망 업종 칩을 차례로 이동 | 포커스된 요소가 하단 바에 가려지지 않음(본문 가림 없음, WCAG 2.2 2.4.11 Focus Not Obscured) | 브라우저가 포커스 요소를 뷰포트 하단 끝까지만 스크롤해 77px 바 아래에 놓임. Step 5a 9/52회(예: "금융 및 보험업" bottom 789 > 바 top 735, 완전히 가려짐), Step 3b 4/50회. `focus()` 측정으로 Step 1·2·3a·3b·4·5a·7에서도 발생. 오류 포커스(5a)는 이번 시험에서 가려지지 않았으나 같은 원인으로 화면 하단 필드면 가려질 수 있음 | `src/components/seeker/wizard-shell.tsx:114`(sticky 바). `globals.css:308`에 `scroll-padding-top: 70px`만 있고 하단 바 높이만큼의 `scroll-padding-bottom`(또는 필드 `scroll-margin-bottom`)이 없음 |

## 기준 외 발견
| 번호 | 내용 | 재현·증거 | 영향 | 제안 |
|---|---|---|---|---|
| O-7 | 구직자 OTP는 challenge당 틀린 코드 5회면 **번호 전체가 30분 잠김**(R-104, `OTP_LOCK_SEC`). 다른 IP의 소유자도 새 코드를 못 받음 | 3160: 소유자가 코드 요청(200) → 제3자 IP에서 틀린 코드 5회(4회 `OTP_INVALID`, 5회째 `OTP_LOCKED`) → 소유자(다른 IP) 새 코드 요청 `429 {"code":"OTP_LOCKED"}` | D-1(로그인 실패 한도)과 별개 계층의 같은 성격: 전화번호만 알면 타인이 구직자를 30분 잠글 수 있음. R-104 합격 기준 자체는 충족 | Q-11과 같은 방식(번호+IP)으로 바꿀지 사람 판단 |
| O-8 | 체류 만료 판정이 UTC 월 경계(`monthStart`가 `Date.UTC`) | `isEligibleCandidate(이번 달 만료, 2026-12-01T00:00:01Z)` = false. KST 기준으로는 매월 1일 00:00~08:59 동안 지난달 만료자가 아직 후보로 남음 | 최대 9시간 지연(기존 `isStayExpired`와 같은 기준이라 일관성은 있음) | 필요 시 KST 기준 월 경계 검토 |
| O-9 | `/admin` 계열 미들웨어 리다이렉트의 Location이 항상 `http://localhost:<port>`(Host·X-Forwarded-Host 무시) | `curl -D - http://127.0.0.1:3160/admin` → `location: http://localhost:3160/admin/login`; `-H "Host: visanjob.example"`, `-H "X-Forwarded-Host: ..."`도 같음. 127.0.0.1로 로그인한 직원이 `/admin` 이동 시 localhost로 넘어가 세션 쿠키가 없어 로그인 화면으로 돌아감. 구직자 보호 경로(`/ko/seeker/me`)는 상대 Location이라 해당 없음. 같은 서버에서 e2e R-118은 통과(차이 원인 미확인). P1c 커밋에서 바뀐 파일 아님(`src/middleware.ts` `new URL(decision.to, request.url)`) | 운영(프록시 뒤)에서 관리자 리다이렉트가 내부 호스트로 갈 위험 — 판정불가(운영 구성 없음) | P1e/배포 전 `request.nextUrl` 기반 상대 리다이렉트 또는 AUTH_URL 구성 확인 |
| O-10 | `pnpm build` 1회차 메모리 부족 중단 | 빌드 워커 `FATAL ERROR: ... JavaScript heap out of memory`, exit 134. 재실행 exit 0 | 환경(여유 가상 메모리 약 3.7GB, 다른 에이전트 동시 작업) 요인으로 보임. 재현 안 됨 | 반복되면 `NODE_OPTIONS=--max-old-space-size` 또는 빌드 동시 실행 회피 |
| (run-1 O-6 지속) | 시험 행이 개발 DB에 남음 | 이번 QA: 구직자 약 30명, 기업 계정 약 8, 직원 1, 관련 Consent·StaffTask·OtpChallenge·RateLimitBucket. F-4 `isStatusCode` 임시 변경은 원복 확인(false 행 = OTHER·NONE·UNKNOWN). 마이그레이션 시험용 임시 DB는 삭제(잔존 0) | 개발 데이터 오염 | e2e 전용 DB 또는 정리 스크립트 |

## 판정불가 / 사람 확인 필요
- O-9의 운영 영향(프록시·도메인 구성이 없어 시험 불가).
- 번역 품질(6개 언어 '모름'·{max} 문구 등)과 동의서 본문 법률 내용은 사람 검토 대상.
