# QA 보고서 — Phase P1b / run 1

- 대상: Phase P1b — 인증 기반(Auth.js·OTP·직원 2FA·기업 가입). 커밋 624001f + 615abef
- 기준 문서: PRD v1.1 (R-104, R-118, R-123, R-129 OTP·로그인 부분, N-02, N-04, N-06), PLAN `### P1b`, DECISIONS Q-08·PC-15, WORK_ORDER §3·§11
- 일시: 2026-11-16 11:55 ~ 12:08 (KST)
- 환경: Windows 11, 개발 DB 54320(`db:start` 실행 중 확인), 테스트 DB 54329(Vitest 자동). 프로덕션 서버 `next start --hostname 127.0.0.1 --port 3105`, 개발 서버 `next dev --port 3107`(OTP 콘솔 코드 확인용). 시험 뒤 두 서버 모두 종료, dev 서버가 덮어쓴 `.next`는 `pnpm build`로 다시 만듦(exit 0). 키 값은 출력·기록하지 않음.

## 결과 요약
- 통과: 9 / 전체: 9 (통과율 100%)
- 필수 항목 실패: 0개
- 기준 외 발견: 8건(O-1~O-8, 아래). 합격 기준 위반은 아니나 운영 전 판단 필요.

## 검증 명령 (순차 실행, PLAN P1b 검증 명령)
| 명령 | 종료 코드 | 결과 |
|---|---|---|
| `corepack pnpm lint` | 0 | 경고·오류 없음 |
| `corepack pnpm typecheck` | 0 | 오류 없음 |
| `corepack pnpm test` | 0 | 26 files / 215 tests passed |
| `corepack pnpm i18n:check` | 0 | ko 440 keys, 6 locales, errors 0 |
| `corepack pnpm qa:static` | 0 | errors 0, warnings 17 (S-23 문구 검토 14, S-45 console 3 — `authConfig.ts:85,88` JSON 로거, `notifications/console.ts:19` 콘솔 어댑터. 모두 PII 없는 의도된 출력) |
| `corepack pnpm build` | 0 | `/[locale]/seeker/login`, `/[locale]/employer/{signup,login}` SSG, `/admin`, `/admin/2fa/{setup,verify}`, `/admin/login`, `/api/auth/[...nextauth]`, `/api/seeker/otp` 생성 |
| `corepack pnpm test:e2e` | 0 | 160 passed (2.0m). auth.spec.ts 8건 × 2 프로젝트(desktop, mobile-375) 모두 통과 |

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| R-104 | 60초 내 재전송 거부, 시간당 5회 초과 거부, 오입력 5회 잠금 — 테스트 (+개발 모드 콘솔 출력) | (1) 프로덕션 서버에 같은 번호로 `POST /api/seeker/otp` 3회 + 하이픈 표기(010-xxxx-xxxx) 1회. (2) **실시간** 62초 간격으로 같은 번호 6회 요청(약 5분). (3) Auth.js `POST /api/auth/callback/seeker-otp`에 틀린 코드 6회 → 이어서 OTP 재요청. (4) dev 서버에서 콘솔 로그로 코드 확인 → 시드 구직자 A: 오입력 4회 후 정답 → 로그인 성공 / 구직자 B: 오입력 5회 후 **정답** → 거부. (5) raw SQL로 User·OtpChallenge·RateLimitBucket·AuditLog 행 텍스트에서 번호 검색. (6) 단위 테스트(시계 주입) 확인 | Pass | (1) 1회차 200 `{resendAvailableAt, expiresAt}`, 2·3회차 및 하이픈 표기 `429`, `retry-after: 60`, `{"error":{"code":"RESEND_TOO_SOON"}}`. 잘못된 번호 `400 VALIDATION`. (2) req1~5(12:00:37~12:04:46) 모두 200, req6(12:05:48) `429 retry-after: 3289 HOURLY_LIMIT`. (3) 1~4회 `code=OTP_INVALID`, 5회째 `code=OTP_LOCKED`, 6회째 `OTP_LOCKED`; 이후 OTP 요청 `429 retry-after: 1793 OTP_LOCKED`; DB 최신 challenge `attempts=5, locked=true, expired=true`. (4) dev 로그 `{"event":"notification.send",...,"to":"***51",...,"params":{"code":"<6자리>"}}`(받는 사람은 끝 2자리만). A: 4회 `OTP_INVALID` 후 정답 → `302 location: http://localhost:3107`, 세션 `role: SEEKER`. B: 5회째 `OTP_LOCKED`, 정답도 `OTP_LOCKED`, 세션 `null`. 프로덕션 로그에는 `params` 없음(코드 미출력, 의도대로). (5) OtpChallenge 컬럼 = id, phoneHash, codeHash, purpose, attempts, expiresAt, consumedAt, lockedAt, createdAt(번호 컬럼 없음). User A: `phoneEnc` 접두 `v1:`, 길이 58, `phoneHash` 길이 64, 번호 8자리 평문 포함 0. User/OtpChallenge/RateLimitBucket/AuditLog 평문 일치 0건, 서버 로그 평문 0건. (6) `otp.test.ts` 8건 통과(60초·시간당 5회·5회째 잠금·정답도 잠금·잠금 해제·병렬 요청 advisory lock) |
| R-118 | 2FA 미완료 시 `/admin/*` 접근 거부 테스트 (직원 이메일·비번 + TOTP, `/admin` 한국어 전용) | Playwright 스크립트(localhost:3105, 스크래치). 직원은 PC-15대로 시드 env가 로컬에서 비어 있어(SEED_ADMIN_PASSWORD 값 없음) 시험용 ADMIN·STAFF_PLACEMENT를 argon2 해시로 개발 DB에 직접 생성. (1) 세션 없음·위조 쿠키로 /admin/* 접근. (2) ADMIN 비번만 로그인 → /admin, /admin/2fa/verify, /admin/anything. (3) **세션 조작 시도**: `POST /api/auth/session` `{csrfToken, data:{twoFactorVerified:true, totpEnrolled:true, totpProof:"forged...", role:"ADMIN"}}` 후 세션·/admin 재확인. (4) setup 화면 수동 키 읽기 → 틀린 코드 → otplib 코드. (5) 재로그인 → verify 화면. (6) STAFF_PLACEMENT 비번만. (7) 기업 계정 세션으로 /admin, /admin/2fa/setup. (8) 틀린 비번 | Pass | (1) `/admin`, `/admin/2fa/setup`, `/admin/2fa/verify`, `/admin/x/y` → `/admin/login`; 위조 쿠키 → `/admin/login`(서버 로그 `JWTSessionError`). (2) 로그인 직후 `/admin/2fa/setup`, 세 경로 모두 `/admin/2fa/setup`; 세션 `{"role":"ADMIN","twoFactorVerified":false,"totpEnrolled":false}`. (3) POST 200이지만 반환·재조회 세션 `twoFactorVerified:false` 유지, `/admin` → `/admin/2fa/setup`. (4) 키 16자, URI `otpauth://totp/...`; 틀린 코드 → "인증 코드가 맞지 않습니다…", 화면 유지; otplib 코드 → `/admin`, h1 "대시보드", 세션 `twoFactorVerified:true`, `<html lang="ko">`. (5) 재로그인 후 `/admin` → `/admin/2fa/verify`. (6) `/admin` → `/admin/2fa/setup`. (7) 기업 세션 `/admin` → `/admin/login`, `/admin/2fa/setup` → `/admin/login`. (8) "이메일 또는 비밀번호가 맞지 않습니다.", `/admin/login` 유지. 코드 근거: `src/auth.ts` jwt 콜백은 `verifyTotpProof`(AUTH_SECRET HMAC, userId 고정, 60초) 통과 시에만 승급; `src/lib/admin/session.ts`가 DB로 재확인. e2e `auth.spec.ts:48` 같은 위조 시도 포함 통과 |
| R-123 | 같은 사업자번호 재가입 거부 테스트 (암호화·해시 중복 확인, 이메일·비번 가입·로그인) | Playwright로 `/ko/employer/signup` 가입(번호 `xxx-xx-xxxxx` 하이픈 형식) → 다른 이메일로 같은 번호 3가지 변형(숫자만, 공백 구분, 하이픈 일부) 재가입 → 대문자 이메일로 `/ko/employer/login`. raw SQL로 Company·User 확인 | Pass | 1차 가입 → `/ko`, 세션 `role: EMPLOYER`. 재가입 3변형 모두 화면 유지 + "이미 가입된 사업자등록번호입니다.", 재가입용 User 생성 0건. 로그인(대문자 이메일) → `/ko`, 같은 user id. DB: 사업자번호 컬럼은 `bizRegNoEnc`, `bizRegNoHash`뿐; `bizRegNoEnc` 접두 `v1:`·길이 54, `bizRegNoHash` 길이 64; Company·User 행 텍스트에 10자리·하이픈 형식 평문 0건; `nameEnc`에 회사명 평문 없음; `User.password` 접두 `$argon2id$`. 단위 `employerAccount.test.ts` 5건 통과(형식 무관 중복 거부, 병렬 가입 1건만) |
| R-129 (OTP·로그인 부분) | 한도 초과 시 429 테스트 | (1) 같은 이메일로 `POST /api/auth/callback/employer-password` 틀린 비번 12회(매번 다른 XFF) 후 정답. (2) 같은 XFF로 서로 다른 번호 21회 OTP 요청. (3) 단위·e2e 확인 | Pass | (1) 1~8회 302 `INVALID_CREDENTIALS`, 9회째부터 `429 retry-after: 676 {"error":{"code":"RATE_LIMITED","message":"too many sign-in attempts"}}`, 정답 비번도 429 (가입 시 자동 로그인 1 + 로그인 1 + 8 = 식별자당 한도 10/15분과 일치). (2) 20회 200, 21회째 429(IP당 20/시간). (3) `route.test.ts`(callback 429), `authCredentials.test.ts`(11번째 429, IP 기준 제한, TOTP 시도 제한), e2e `auth.spec.ts:176` 통과. 수집 API 적용·최종 테스트는 PLAN대로 P1d |
| Q-08 | seeker:review는 STAFF_VISA·ADMIN만, STAFF_PLACEMENT는 조회만, company:verify는 STAFF_PLACEMENT·ADMIN | tsx로 `src/lib/rbac.ts` 실행해 역할별 `can()` 출력, 624001f diff 확인 | Pass | `STAFF_PLACEMENT seeker:review=false seeker:view=true company:verify=true` / `STAFF_VISA seeker:review=true company:verify=false` / `ADMIN seeker:review=true company:verify=true` / 포털 역할 전부 false. diff: `STAFF_COMMON`에서 `seeker:review` 제거, `VISA_ONLY`에 추가. `rbac.test.ts` Q-08 2건 통과 |
| N-02 | 사용자 노출 문자열 6개 언어 키 (관리자 제외), `i18n:check` 누락 0 | `pnpm i18n:check` | Pass | "source ko: 440 key(s), locales: 6, errors: 0", 각 언어 `[OK] 0 error(s)`. 615abef에서 messages/*.json 6개 각 +123줄. 관리자 화면은 한국어 고정(`admin-messages.ts`) |
| N-04 | 375px 가로 스크롤 없음 (새 화면) | Playwright 375×812 isMobile로 6개 언어 × 3화면 scrollWidth/clientWidth, ko 화면 컨트롤 높이 측정(구직자 코드 입력 단계, 기업 가입 오류 표시 상태 포함) | Pass | 18개 페이지 모두 `375/375`, 뷰포트 밖 요소 0. 입력·select 높이 48px(STANDARD 3.1), 제출 버튼 52px, 코드 단계의 재전송·번호 변경 버튼 44px(B-10 ≥44). e2e mobile-375 프로젝트 auth 8건 통과 |
| N-06 | 키·비밀번호는 `.env`(git 제외), `.env.example`만 커밋 | `git ls-files`, `git check-ignore -v .env`, `git log -p --all`에서 키 줄 검사(값은 마스킹), 로컬 .env 값 앞 24자를 이력에서 고정 문자열 검색(값 미출력) | Pass | 추적 파일 중 env는 `.env.example`뿐, `.gitignore:30:.env*` 로 `.env` 제외. 이력의 `ENCRYPTION_KEYS=`/`HASH_KEY=`/`AUTH_SECRET=`/`SEED_ADMIN_PASSWORD=` 줄은 각 1건(.env.example)이며 값 길이 0. base64형 값 패턴 0건, 로컬 실제 값 일치 ENCRYPTION_KEYS 0·HASH_KEY 0·AUTH_SECRET 0 |
| 검증 명령 | PLAN P1b 검증 명령 7개 통과 | 위 표대로 순차 실행 | Pass | 7개 모두 exit 0 (위 "검증 명령" 표) |

## 결함 목록 (Fail만)
없음.

## 기준 외 발견 (합격 기준 밖, 운영 전 판단 필요)
| 번호 | 내용 | 재현·증거 | 영향 | 수정 제안 |
|---|---|---|---|---|
| O-1 | `x-forwarded-for` 첫 값을 그대로 신뢰 (`src/lib/rateLimit.ts:87-90` `clientIp`) | 같은 XFF로 21회째 429 → XFF만 바꾸면 즉시 200. XFF가 없으면 모든 요청이 `"unknown"` 한 버킷 공유 | IP당 한도(OTP 20/h, 로그인 30/15m, 가입 10/h)를 헤더 위조로 무력화. 프록시 없이 배포하면 전체 사용자가 한 버킷을 공유해 서로 막힘. 번호·이메일별 한도는 유지됨 | 배포 구조 확정 시 신뢰 프록시 수(hop)만큼 오른쪽에서 고르거나 플랫폼 제공 IP 사용. `TRUSTED_PROXY_HOPS` 같은 설정 |
| O-2 | `trustHost: true` 고정 (`src/lib/authConfig.ts` `authConfig`) | 주석상 로컬·E2E용. `AUTH_URL` 미설정 | 운영에서 Host 헤더로 Auth.js 리다이렉트·콜백 URL이 정해짐 | 운영은 `AUTH_URL` 설정 + `trustHost`를 env로 제어 |
| O-3 | TOTP 코드 같은 구간 재사용 허용 (`authCredentials.ts` `verifyStaffTotp`, `window: 1`) | setup에서 쓴 코드 그대로 새 세션 verify에 입력 → `/admin` 통과 | 탈취된 코드가 ±30초(최대 90초) 동안 재사용 가능 | `User.totpLastStep` 저장 후 같은/이전 step 거부 |
| O-4 | 사업자등록번호 체크섬 미검증 (`schemas/auth/auth.ts` `normalizeBizRegNo`는 10자리만 확인) | 체크섬이 맞지 않는 `461-08-98661`(계산 검증값 5, 실제 끝자리 1)로 가입 성공 | 오타 번호로 가입 후 진짜 번호 소유자가 "이미 가입" 거부를 받을 수 있음(R-218 직원 검증 전까지) | 국세청 가중치(1,3,7,1,3,7,1,3,5) 체크섬 검사 추가 |
| O-5 | e2e가 개발 DB(54320)에 행을 계속 추가 (`tests/e2e/support/authDb.ts` "nothing is deleted") | e2e 1회 전후 User 역할별 8→10, Company 8→10, OtpChallenge 8→10, RateLimitBucket 98→124 | 실행할수록 개발 DB에 `@example.test` 계정 누적, 개발 데이터 오염 | e2e 전용 DB(서버도 같은 DB로 기동) 또는 e2e 접두 행 정리 스크립트(`db:reset`처럼 로컬 DB 가드 포함) |
| O-6 | `next start --hostname 127.0.0.1`에서 미들웨어·Auth.js 리다이렉트가 `http://localhost:<port>`로 나감 | `curl http://127.0.0.1:3105/admin` → `location: http://localhost:3105/admin/login`. 127.0.0.1 origin으로 로그인하면 쿠키가 따라가지 않아 2FA 화면 대신 `/admin/login`으로 돌아감. e2e는 baseURL을 localhost로 바꿔 우회(`auth.spec.ts:19-22` 주석) | 로컬 환경 한정 가능성 높음. 운영 도메인에서는 재확인 필요 | 운영 배포 시 `AUTH_URL`·Host 기준 리다이렉트 확인을 통합 QA에 포함 |
| O-7 | 식별자별 로그인 한도는 정답 비밀번호도 막음 | 틀린 비번 연속 후 정답도 `429 retry-after 675` | 이메일을 아는 제3자가 해당 기업·직원 계정을 15분 단위로 계속 잠글 수 있음(설계상 의도일 수 있음) | 운영 정책으로 수용 여부 결정, 필요 시 IP+식별자 조합 키 |
| O-8 | qa:static 경고 S-45 3건(console) | `authConfig.ts:85,88`, `notifications/console.ts:19` | PII 없는 JSON 로그로 확인(프로덕션 로그에 번호·이메일·코드 0건) | 사람 확인 후 허용 목록 등록 |

## 판정불가 / 사람 확인 필요
- 없음(범위 항목은 모두 직접 실행해 판정).
- 참고: 시드 직원 계정(PC-15)은 로컬 `.env`의 `SEED_ADMIN_PASSWORD` 값이 비어 있어 사용하지 않고, 같은 해시 방식으로 시험용 직원을 만들어 시험함. 시드 경로 자체는 이번 Phase 완료 조건이 아님.
- 이번 QA가 개발 DB에 남긴 행: 직원 4(qa-p1b-*), 기업 1+회사 1, 구직자 2, OtpChallenge·RateLimitBucket 다수(모두 `@example.test`·시험 번호). 삭제하지 않음(쓰기 권한 범위 밖).
