# Phase P1b — 기준 일치 검토 (run 1)

- 대상 커밋: `624001f`(Q-08 rbac 축소·개발 키 안내), `615abef`(인증 기반). 비교 기준 `6ff9d15`. 작업 트리의 `src/`·`messages/`·`tests/`는 `615abef`와 같다(`git status`에서 바뀐 것은 `.workflow/`뿐).
- 기준: `.workflow/STANDARD.md` v2.4. 검토 중 **v2.5로 보완**했다(4절). v2.5는 대부분 기준 공백을 메운 것이다. 산출물에 새로 요구한 것은 S-53 구체화 1건뿐이다(불일치 #2 근거). 판정은 v2.5 기준으로 했다.
- 검토자: wf-standard (모드 B), 2026-11-16
- 실행한 확인: `corepack pnpm qa:static`(오류 0, 경고 17 = S-23 문맥 14건(기존) + S-45 console 3건(새 2건 authConfig.ts, 기존 1건 console.ts)), `typecheck` 통과, `i18n:check` 6개 로케일 오류 0(ko 키 440개). 점검표의 rg 명령(S-02·05·06·23·24·32·36·42~45·47·48·50·53·57·63·64·69·70)을 돌렸다. 새 코드는 `git diff 6ff9d15 615abef` 범위를 기준으로 봤다. build·test·e2e·lighthouse·서버는 지시에 따라 **실행하지 않았다**. 렌더링도 하지 않았다. S-07·S-08처럼 렌더가 필요한 항목은 코드로만 판정했다.

## 1. 결과 요약

- 점검표: **일치 33 / 34**, 불일치 1(S-53). 렌더 미확인 1(S-07, QA E2E에 맡김). 나머지는 해당 없음(이번 diff에 대상 없음).
- 3·4·5절 규칙·결정: **일치 15 / 17**, 불일치 2(3.1 select/command, 3.3 관리자 폼 "(필수)").
- **[후속] 불일치 #1은 DECISIONS Q-09로 기준을 개정해 해소했다(STANDARD v2.6).** 반영 후 규칙 16 / 17, 합계 49 / 51, 남은 불일치는 #2·#3 두 건이다.
- 합계 **48 / 51**. 불일치 3건은 모두 수정 범위가 작다.
- 빌더 판단 5건: 모두 기준에 맞다. 4건은 v2.5에 명시했다. 4번(스키마 길이)은 수용했다. 다만 같은 S-53 검토에서 messages의 OTP 자릿수 중복을 찾았다(불일치 #2).

## 2. 불일치 목록 (수정 지시)

| # | 기준 | 위치 | 실제 상태 | 수정 지시 |
|---|---|---|---|---|
| 1 (**해소 — Q-09로 기준 개정, v2.6**) | 3.1 select 행("짧은 목록(≤10). 긴 목록은 command + popover"), command 행("국적·**업종** 검색 선택"), native-select 행(v2.4: "공개 페이지 폼 — JS 없이 제출돼야 하는 GET/서버 액션 폼") | `src/components/employer/employer-signup-form.tsx:105`(업종), `:122`(시·도) | 업종 21개(`common.industry`), 시·도 17개를 `NativeSelect`로 받는다. 이 폼은 react-hook-form + `handleSubmit` 클라이언트 폼이라(`:66-70`, `noValidate`) native-select 허용 범위(JS 없이 동작하는 공개 폼)에 들지 않는다. 목록이 10개를 넘으므로 select도 아니고 command + popover여야 한다. 업종은 command 행에 이름까지 적혀 있다. | 업종·시·도 선택을 command + popover(검색 선택)로 바꾼다. 3.1 표에 따라 `src/components/ui/command.tsx`, `popover.tsx`를 추가하고 popover는 dropdown-menu 모양으로 만든다. 트리거는 input과 같은 모양(48px, `--input`, `ChevronDown`)이다. **대안(오케스트레이터 결정):** 네이티브 선택을 유지하려면 3.1 native-select 행의 사용처를 "기업·구직자 계정 폼의 긴 목록"까지 넓히는 기준 개정을 먼저 승인받는다. 승인 전까지는 불일치다. **→ Q-09(새 패키지 `cmdk` 미승인)로 native-select 허용 범위를 클라이언트 폼의 긴 목록까지 넓혔다. STANDARD v2.6 3.1 개정 — 해소. 산출물 수정 불필요.** |
| 2 | S-53(v2.5 구체화): 운영 수치는 `limits.ts` 한 곳. 화면 문구는 ICU 인자로 받는다 | `messages/*.json:622` `errors.field.invalidCode`, `:661` `seeker.login.code.help` (6개 로케일 × 2키) | ko "인증번호 **6**자리를 입력해 주세요.", "문자로 받은 **6**자리 숫자…", en "Enter the **6**-digit code" 등 OTP 길이를 숫자로 적었다. 같은 값이 `OTP_CODE_LENGTH = 6`(`src/config/limits.ts:34`)에도 있다. 같은 Phase의 비밀번호 문구는 `{min}` 인자를 쓴다(`errors.field.passwordTooShort`, `employer.signup.password.help`). 그래서 같은 종류의 값을 다루는 방식이 서로 다르다. | 두 키를 `{length}` 인자로 바꾼다(6개 로케일 모두). 호출부에서 `te("field.invalidCode", { length: OTP_CODE_LENGTH })`, `t("code.help", { length: OTP_CODE_LENGTH })`로 넘긴다(`seeker-login-form.tsx:64, 143`). `fieldError`는 employer 폼처럼 인자를 넘기는 형태로 맞춘다. TOTP "6자리"(관리자 한국어 리터럴)는 TOTP 규격 값이라 그대로 둔다. |
| 3 | 3.3 "모든 입력에 `<label>`, 필수 표시는 '(필수)' 글자 병기". 관리자 예외는 터치 타깃(32px)뿐이다 | `src/components/admin/staff-login-form.tsx:21, 25`, `src/components/admin/totp-form.tsx:24` | 라벨 "이메일", "비밀번호", "인증 앱의 6자리 코드"에 "(필수)"가 없다(`required` 속성만 있음). 공개 폼은 `FormField`가 `common.form.required`를 붙인다. | 관리자 폼 3개 라벨에 한국어 리터럴 "(필수)"를 붙인다. 모양은 `FormField`와 같게 `ms-1 font-normal text-n500` span으로 한다. 관리자는 한국어 리터럴이 허용된다(3.6). |

## 3. 항목별 판정

### 3.1 점검표

| 번호 | 판정 | 근거 |
|---|---|---|
| S-02 | 일치 | 새 코드에 hex·rgba·Tailwind 기본 팔레트가 0건이다. 색은 `text-error-text`, `border-error`, `ring-brand-blue/13`, `bg-n50`, `text-n700` 등 토큰만 쓴다. |
| S-03 | 일치 | `src/app/admin/layout.tsx:4,15`는 `fonts.ts`의 `notoSansKR`·`inter` 변수만 쓴다. CDN은 0건이다. |
| S-05 | 일치 | `text-[` 0건. 라벨 `text-label`, 도움말·오류 `text-caption`(13px, `form-field.tsx:47,52`), 입력 `text-control`(16px, `input.tsx:14`)이다. "(필수)"는 라벨 크기(3.1 컴팩트 라벨 12px)를 따른다. S-05의 "필수 문구"는 3.5 필수 고정 문구를 뜻하므로 이 표시는 대상이 아니다. |
| S-06 | 일치 | 간격·반경 대괄호 0건, 기본 그림자 0건이다. 새 대괄호 값은 `transition-[border-color,box-shadow]`(`input.tsx:15`)뿐이고 native-select와 같다. `max-w-110`, `gap-5.5`, `gap-1.75`, `px-3.5`는 척도 유틸이다. |
| S-07 | 렌더 미확인 | 렌더 금지. 코드상 폼은 `max-w-110 w-full`이고 `PageShell narrow` 안에 있어 넘칠 요소가 없다. QA E2E에 맡긴다. |
| S-08 | 일치(코드) | 버튼은 기본 52px, `sm` h-11=44px(`button.tsx`, P1a 확인)이고 입력은 h-12=48px다. 텍스트 링크 `min-h-11`(`employer/login/page.tsx:41`, `signup/page.tsx:45`). 관리자 화면은 같은 컴포넌트로 32px 이상이다. 측정은 QA가 한다. |
| S-10 | 일치 | 추가한 `input`, `label`은 3.1 목록에 있다. 3.1 모양(48px, `rounded-sm`, `px-3.5`, 16px/500 navy, `border-input`, hover `n500`, 포커스 `border-brand-blue` + `ring-4 ring-brand-blue/13`, 오류 `border-error` + `ring-error/10`, disabled `opacity-45`)과 같다. 라벨은 `text-label text-n700`이다. 사용처 문제는 불일치 #1(3.1 select 규칙)에서 다룬다. |
| S-11 | 일치 | `MessageSquare`, `LogIn`, `Building2`, `LogOut`은 모두 lucide이고 `strokeWidth={1.5}`, `aria-hidden`이다. |
| S-23 | 일치 | 새 messages·src에 금지 표현 0건이다. "가입하기", "회원가입"은 금지어가 아니다. "간편 등록"(`errors.auth.noAccount`)은 용어집과 같다. |
| S-24 | 일치 | 새 코드에 `tel:`/`mailto:`/메신저가 0건이다. |
| S-28 | 일치 | 6개 파일 첫 키는 `_review`로 바뀌지 않았다. |
| S-29 | 일치 | `i18n:check` 오류 0(440키). |
| S-30 | 일치(v2.5) | 표본 30개: `seeker.login.phone.{label,placeholder,help}`, `seeker.login.code.{label,help}`, `employer.signup.{companyName,bizRegNo,industryCode,sido,email,password,passwordConfirm}.label`, `employer.signup.bizRegNo.{placeholder,help}`, `meta.{seekerLogin,employerLogin,employerSignup}.{title,description}`, `common.form.required`, `common.otp.sms`, `errors.field.*`, `errors.auth.*`. 필드 세그먼트는 스키마·모델 필드명과 같다(`companyName`, `bizRegNo`, `industryCode`, `sido`). `errors.{그룹}.{코드}` 묶음과 UPPER_SNAKE→lowerCamelCase 변환(`error-key.ts`)은 v2.5 5절에 명시했다. |
| S-31 | 일치 | 비관리자 새 화면(`seeker-login-form.tsx`, `employer-*-form.tsx`, `form-field.tsx`, 로그인·가입 페이지)의 사용자 문자열은 전부 `t()`다. 리터럴은 `{" "}`뿐이다. |
| S-32 | 일치 | `toLocaleString`과 "원" 연결은 0건이다. 남은 초는 ICU 인자(`{seconds}`)로 넘긴다. |
| S-34 | 일치(v2.5) | 새 `src/` 최상위 폴더는 없다. `src/auth.ts`(파일), `lib/admin/`, 인증 lib 파일은 v2.5에서 4.2 트리에 추가했다. `agency/`는 없다. |
| S-35 | 일치 | components·app kebab-case(`seeker-login-form.tsx`, `admin-messages.ts`, `error-key.ts`, `scoped-intl-provider.tsx`, `site-chrome.tsx`). lib·schemas·server camelCase(`rateLimit.ts`, `authGuard.ts`, `employerAccount.ts`, `schemas/auth/auth.ts`). 서버 액션은 동사로 시작한다(`signInStaff`, `verifyStaffTotpCode`, `signOutStaff`, `signUpEmployer`, `signInEmployer`, `requestSeekerOtp`, `signInSeeker`). zod는 `…Schema`/`…Input`이다. |
| S-36 | 일치 | `any` 매치 1건은 주석 "any non-empty"(`auth.ts:41`)다. `typecheck` 통과. |
| S-40 | 일치(v2.5) | 전수 열람. 공개 주석: `signInStaff:20`, `signOutStaff:58`, `signUpEmployer:45`, `signInEmployer:75`, `requestSeekerOtp:29`, `signInSeeker:54`, `api/auth GET:16, POST:21`, `api/seeker/otp POST:25`. 직원 가드: `verifyStaffTotpCode:47` `requireStaff("pending2fa")`(내부 `assertCan(user.role,"admin:access")`, `lib/admin/session.ts:42`). 로그인·가입·로그아웃·Auth.js 엔드포인트와 `requireStaff` 첫 문장은 v2.5 4.5에 명시했다. |
| S-41 | 일치 | 미들웨어 `decideAdminAccess`(`middleware.ts:22-28`, `authGuard.ts:57-77`: 직원 역할 + 직원 세션 만료 + `twoFactorVerified`, 아니면 setup/verify로 보냄). 페이지·액션은 DB를 다시 확인한다(`admin/page.tsx:19`, `2fa/setup:23`, `2fa/verify:14`, `requireStaff`). `twoFactorVerified`는 서버가 서명한 증명으로만 올라간다(`auth.ts:77-83`, `authCredentials.ts:269-286`). |
| S-42 | 일치 | `src/schemas/**` 밖 `z.object(` 0건. 클라이언트 폼과 액션·`authorize`가 같은 스키마를 import한다(`seekerOtp*Schema`, `employer*Schema`, `staffLoginSchema`). |
| S-43 | 일치 | 사업자등록번호 `bizRegNoEnc` + `bizRegNoHash`(`employerAccount.ts:57-59`), 회사명 `nameEnc`, 전화는 `phoneHash`만(`otp.ts`, `authCredentials.ts:108-126`), OTP는 `codeHash`만이다. `User.email`은 WO §5의 평문 필드(`schema.prisma:127`, 이번 diff에서 스키마 변경 없음)다. `totpSecret`은 db.ts 예외 목록으로 암호화된다(P0c). 주민·여권 필드 0건. |
| S-44 | 일치 | 직접 `encrypt(`/`decrypt(` 0건. 해시는 `hmacHash`만 쓴다. |
| S-45 | 일치(v2.5) | 매치 3건: `authConfig.ts:85` 오류 `type`만, `:88` Auth.js 경고 `code`만(둘 다 JSON 한 줄, `CredentialsSignin`은 기록 안 함, PII·비밀값·IP 없음), `console.ts:19`(4.7 예외, 기존). OTP는 `NotificationProvider` 경유(`otp.ts:162-168`)로 콘솔 어댑터만 찍는다. 레이트리밋 키의 IP·식별자는 sha256 절단값이다(`rateLimit.ts:34-36`). → **빌더 판단 2 수용**, v2.5 4.7에 허용 위치를 적었다. |
| S-47 | 일치 | 0건. |
| S-48 | 일치 | 4.9 검사 1: 0건. 검사 2: 주석 속 `BR-12`, `WO §15-9` 등만 있다(기존). |
| S-50 | 일치(v2.5) | `src/` 안 테스트 0건. 미러: `tests/unit/lib/{authCredentials,authGuard,employerAccount,otp,phone,rateLimit,rbac}.test.ts`, `tests/unit/app/api/auth/[...nextauth]/route.test.ts`, `tests/unit/app/api/seeker/otp/route.test.ts`. E2E `tests/e2e/auth.spec.ts`. 도우미 `tests/unit/lib/authFixtures.ts`, `tests/e2e/support/authDb.ts`는 v2.5 4.10에 위치를 적었다. R 태그(`R-104`, `R-118`, `R-123`, `R-129`)와 `now` 주입 가짜 시계를 쓴다. → **빌더 판단 1 수용**: STANDARD 4.3(lib camelCase)·4.10(미러)이 PLAN 파일명보다 앞선다. PLAN 표기는 오케스트레이터가 고칠 것. |
| S-52 | 일치 | `api/seeker/otp/route.ts:17-50`: `{ error: { code, message } }`, 400 `VALIDATION`, 429 `RATE_LIMITED`/`RESEND_TOO_SOON`/`HOURLY_LIMIT`/`OTP_LOCKED` + `Retry-After`. `api/auth/[...nextauth]/route.ts:35-38` 429 `RATE_LIMITED`. 코드는 UPPER_SNAKE다. `AuthzError.toBody()`도 같은 형식이다. |
| S-53 | **불일치** | src 쪽은 맞다: OTP·레이트리밋·비밀번호·세션 수치가 모두 `limits.ts:17-57`에 있다. 스키마 리터럴(`.max(32)` 전화 입력, `.max(254)` 이메일 RFC, `.max(100)` 회사명 저장 보호, `.max(40)` 코드, `.max(8)` 로케일, TOTP `{6}`)은 입력 형식 상한이라 v2.5에서 허용 범위로 적었다(**빌더 판단 4 수용**, P1a `visaCheck.ts` `.max(40)` 선례). `authCredentials.ts:184` "30-second"는 주석이다. **그러나 messages가 OTP 길이 6을 숫자로 중복한다 → 불일치 #2.** |
| S-56 | 일치 | `.env.example`에 키 이름과 생성 명령만 있고 값은 없다(Q-08). `.env`는 `.gitignore:30`에 있다. |
| S-57 | 일치 | 새 `opacity-0`·`opacity: 0`은 0건이다(`disabled:opacity-45`뿐). |
| S-63 | 일치 | 링크 `text-brand-blue-600`(B-03 흰 바탕 파랑 글자). `n400` 글자와 `white/1x~4x`는 0건이다. |
| S-64 | 일치 | `variant="seeker"`(오렌지)는 구직자 로그인 버튼 2개뿐이다(`seeker-login-form.tsx:120,161`). 기업 가입·로그인 주 버튼은 `default`(navy)다. |
| S-69 | 일치 | `input.tsx:16` `focus-visible:outline-none`에 `focus-visible:border-brand-blue ring-4 ring-brand-blue/13`이 함께 있다(2.8 입력 포커스 글로). |
| S-70 | 일치 | 매치는 `phone.ts:4` 주석의 정규화 예시 "010-1234-5678"과 `pii-guard.ts`(기존)다. 화면·messages에 플레이스홀더 값은 없다. |

해당 없음(이번 diff에 대상 없음): S-01, S-04, S-09, S-12~S-22, S-25~S-27, S-33, S-37~S-39(P2), S-46(4.8 감사 대상 행위 없음 — 로그인·2FA·가입은 목록 밖, `AuditAction` 변경 없음), S-49, S-51(P2), S-54, S-55, S-58~S-62, S-65~S-68, S-71, S-72.

### 3.2 규칙·결정

| # | 기준 | 판정 | 근거 |
|---|---|---|---|
| R-1 | 3.1 input·label 모양 | 일치 | S-10 근거 |
| R-2 | 3.1 form 간격(필드 간 22px, 내부 7px) | 일치 | `gap-5.5`(22px), `gap-1.75`(7px): `form-field.tsx:35`, 모든 폼 `grid gap-5.5`, 관리자 폼도 같다 |
| R-3 | 3.1 select / command / native-select 사용처 | 일치(v2.6) | #1은 Q-09로 기준 개정 — 해소 |
| R-4 | 3.3 라벨·"(필수)" | 공개 일치 / **관리자 불일치** | 공개는 `FormField`가 `common.form.required`를 붙이고 오류 `role="alert"`·`aria-describedby`가 있다. 관리자는 #3 |
| R-5 | 3.3 터치 타깃(공개 44, 관리자 32) | 일치 | S-08 |
| R-6 | 3.6 키 영역 — `common.otp.sms` | 일치(v2.5) | **빌더 판단 3 수용.** SMS 템플릿은 P1b 로그인과 P1c 등록(`OTP_PURPOSES` SIGNUP)이 함께 쓰므로 `seeker.*`보다 `common`이 맞다. `{code}`는 ICU 인자다. 형식 `common.{주제}.{채널}`을 v2.5 3.6에 적었다 |
| R-7 | 3.6 관리자 한국어 리터럴 | 일치 | **빌더 판단 5 수용.** 리터럴은 `src/app/admin/**`(layout·page·login·2fa)와 `src/components/admin/**`(`admin-messages.ts` 포함)에만 있다. 서버 액션 `server/actions/admin/auth.ts`는 코드만 돌려준다 |
| R-8 | 4.3 파일·식별자 명명 | 일치 | S-35 |
| R-9 | 4.5 rbac 첫 문장 | 일치(v2.5) | S-40 |
| R-10 | 4.5 `/admin/**` 역할 + 2FA | 일치 | S-41 |
| R-11 | 4.6 zod 위치·공유·명명 | 일치 | S-42. `employerSignupSchema`의 비밀번호 확인 refine도 스키마 안에 있다 |
| R-12 | 4.7 `*Enc`/`*Hash`, 로그 | 일치 | S-43~S-45 |
| R-13 | 4.10 테스트 위치·태그·가짜 시계 | 일치(v2.5) | S-50 |
| R-14 | 5 API 오류 형식·상태 코드·`errors.{code}` | 일치(v2.5) | S-52, S-30 |
| R-15 | Q-08 권한·키 | 일치 | `rbac.ts:63`(STAFF_COMMON에서 `seeker:review` 제거), `:76`(VISA_ONLY에 추가). `company:verify`는 PLACEMENT_ONLY에 그대로 있다(`:68`). ADMIN은 둘 다 가진다. 테스트 `tests/unit/lib/rbac.test.ts`(+14줄). 개발 키는 `.env.example` 안내만 있다(값 없음) |
| R-16 | PC-15 직원 계정 = 환경변수 시드, 관리 화면 없음 | 일치 | 새 관리자 화면은 로그인·2FA 설정·2FA 확인·대시보드 자리뿐이다. 계정 생성·수정 UI는 없다 |
| R-17 | 1.1 용어집 | 일치 | "기업", "구직자"(eyebrow), "간편 등록", 관리자 "직원". 금지어 0건 |

## 4. STANDARD v2.5 보완 내역 (개정 이력 기록함)

| 위치 | 내용 | 이유 |
|---|---|---|
| 4.2 트리 | `src/auth.ts`, `src/middleware.ts`, `lib/admin/`, `lib/{authConfig,authCredentials,authGuard,employerAccount,otp,password,phone,rateLimit}.ts` | 트리에 없던 P1b 위치(v2.4에서 P1a 위치를 추가한 것과 같은 방식) |
| 4.5 | 공개 예외에 로그인·기업 회원가입·로그아웃·`/api/auth/*`. `requireStaff()` 첫 문장 인정 + 추가 권한은 다음 문장 `assertCan` | 예외 목록에 인증 진입점이 없었다. 관리자 액션 가드 형태가 정해져 있지 않았다 |
| 4.7 | Auth.js logger 허용 조건 | S-45 경고가 매번 다시 나오므로 판단 근거를 고정 |
| 5 | `errors.{그룹}.{코드 lowerCamelCase}`, `unknown` | UPPER_SNAKE 코드와 lowerCamelCase 키 규칙(3.6)을 잇는 변환 규칙이 없었다 |
| 3.6 | 알림 템플릿 키 `common.{주제}.{채널}` | 템플릿 키 영역이 정해져 있지 않았다(P2d 이메일도 적용) |
| 4.10 | 단위 픽스처 `{주제}Fixtures.ts`, E2E `support/` | db `helpers.ts` 말고는 도우미 위치 규칙이 없었다 |
| S-53 | 운영 수치와 입력 형식 상한 구분, messages 숫자 중복 금지 확인 | 스키마 길이 리터럴 허용 여부가 불명확했다. "한 곳에만"을 messages까지 구체화 |

## 5. 관찰 (불일치 아님, 권장)

1. 관리자 화면의 브랜드 문자열 "VISA n JOB 관리자"가 리터럴이다(`admin/page.tsx:25`, `components/admin/admin-auth-card.tsx:19`). 3.1 로고 규칙은 Logo 컴포넌트의 워드마크를 site.config로 두라는 것이라 이 위치는 직접 대상이 아니다. 다만 같은 Phase의 otpauth 발급자는 `getSiteConfig().brand.wordmark`를 쓴다(`authCredentials.ts:210`). 맞추기를 권장한다.
2. 주석 경로가 실제와 다르다. `server/actions/admin/auth.ts:12`는 "src/app/admin/_components/messages.ts"라고 적었지만 실제 파일은 `src/components/admin/admin-messages.ts`다.
3. 기업 가입 서버 오류 중 필드 오류(`BIZ_REG_NO_TAKEN`, `EMAIL_TAKEN`)는 포커스만 그 필드로 옮긴다. 문구는 폼 하단에 나온다(`employer-signup-form.tsx:58-62`). `setError`의 message가 `undefined`라 `FormField`가 `aria-invalid`를 붙이지 않는다. 3.3 "필드 바로 아래"는 위저드 규칙이라 판정 대상은 아니다. 필드 아래 표시를 권장한다.
4. `otpApiRequestSchema`(`schemas/auth/auth.ts:76`)에는 짝이 되는 `…Input` 타입 export가 없다(4.3 예시 형태). 사용처가 route 하나라 영향은 없다.
5. PLAN P1b의 파일명(`rate-limit.ts`, `tests/unit/{otp,rate-limit,admin-auth,employer-signup}.test.ts`)이 실제와 다르다. STANDARD가 앞서므로 PLAN 쪽을 고칠 것(오케스트레이터).
