# QA 보고서 — Phase P1c / run 1

- 대상: Phase P1c — 구직자 등록(간편·위저드)·트랙 분류·마이페이지. 커밋 1e99955(선행 A: P1b 수정) + b3933a1(P1c)
- 기준 문서: PRD v1.1 R-105~R-113, N-01(BR-01), N-03, N-04, BR-08·BR-13; PLAN `### P1c` 완료 조건·QA 방법; DECISIONS SC-01·SC-02·SC-04·PC-9; WORK_ORDER §7.1~7.4, §15-5·15-8
- 일시: 2026-11-16 13:10 ~ 13:45 (KST)
- 환경: Windows 11, 개발 DB 54320(실행 중), 테스트 DB 54329(Vitest). 프로덕션 빌드 서버 `next start` 127.0.0.1:3150(`TRUST_PROXY=true`), 127.0.0.1:3151(`TRUST_PROXY` 미설정, .env에도 없음). E2E는 `E2E_PORT=3140`(+3141). 시험 스크립트는 Playwright(chromium) + 앱의 Prisma 클라이언트로 DB 확인(스크래치 디렉터리, 저장소 밖). 끝난 뒤 3150·3151 서버 종료 확인(포트 LISTEN 없음). 키 값은 출력·기록하지 않음.
- OTP 코드 획득: E2E 지원 함수 `setLatestOtpCode`(최신 challenge의 codeHash 교체)를 그대로 사용.

## 결과 요약
- 통과: 13 / 전체: 13 (통과율 100%) — PRD 요구사항 9 + N-01·N-03·N-04 + 검증 명령
- 필수 항목 실패: 0개
- P1b 선행 수정 재확인: 6건 중 5 Pass, 1 부분 Fail(2번 "타인 잠금 남용 불가" — 아래 D-1)
- 기준 외 발견: O-1~O-6

## 검증 명령 (순차 실행)
| 명령 | 종료 코드 | 결과 |
|---|---|---|
| `corepack pnpm lint` | 0 | 오류·경고 없음 |
| `corepack pnpm typecheck` | 0 | 오류 없음 |
| `corepack pnpm test` | 0 | 32 files / 289 tests passed |
| `corepack pnpm i18n:check` | 0 | ko 792 keys, 6 locales, errors 0 |
| `corepack pnpm qa:static` | 0 | errors 0, warnings 17 (S-23 문구 검토 14, S-45 console 3 — P1b와 동일 항목, 새 경고 없음) |
| `corepack pnpm build` | 0 | `/[locale]/seeker/{register,register/quick,register/complete,me,me/stay,me/referral,me/recommended}` 생성 |
| `E2E_PORT=3140 corepack pnpm test:e2e` | 0 | 186 passed (2.7m). P1c 스펙 quick-register·wizard-resume·referral·complete-screen·consent-revoke 13건 × 2 프로젝트(desktop, mobile-375) 모두 통과 |

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| R-105 | 완료 시 `isQuickSignup=true`, grade B, "프로필 완성" 알림 작업 생성(콘솔 어댑터) | 375px 컨텍스트로 `/ko/seeker/register/quick`에서 F-4·시도·OTP·필수 동의 3종 → 제출. DB의 SeekerProfile·StaffTask·Consent 조회, 서버 로그 확인 | Pass | `/ko/seeker/register/complete`로 이동. 프로필 `{isQuickSignup:true, grade:"B", track:"JOB_MATCH", visaCode:"F-4", completedStep:0}`. StaffTask `[{type:"PROFILE_COMPLETION_NOTICE", status:"DONE"}]`. 서버 로그 `{"event":"notification.send","provider":"console","to":"***60","templateKey":"common.profileCompletion.sms",...,"params":{"path":"/ko/seeker/register"}}`(번호 끝 2자리만). e2e `quick-register.spec.ts:13` 통과 |
| R-106 | 각 단계 문항 키가 WO §7.3과 일치(체크리스트), zod 스키마 서버·클라이언트 공유 (+ 화면당 ≤7, 진행률, 공개 배지, 모름, 비자 코드+설명) | (1) `src/schemas/seeker/register/step0~7.ts`·`quick.ts` 키를 WO §7.3 표와 대조. (2) `saveStep.ts`가 같은 스키마(`step1Schema`…`step7SchemaFor`)로 서버 검증하는지 확인. (3) 375px로 위저드 0·1·2·3a·3b·4·5a·5b·6·7 화면을 열어 입력 이름·진행률·배지 수 측정, 스크린샷으로 문항 수 확인. (4) BR-13: 스키마·마이그레이션·메시지에서 여권/외국인등록번호 필드 grep | Pass | (1) 키 일치: step0 locale·phone·referralCode / step1 legalName·nationality·sido·sigungu·messengerType·messengerId·email·birthYear·gender / step2 visaCode·visaSubType·stayExpiry·hasArc·entryYear·pendingApplication·visaConfirm / step3 8키(3a·3b 분할, SC-01) / step4 experiences[](country·industryCode·role·months·employerName)·skills·licenses / step5 9키(5a·5b 분할) / step6 3키 / step7 4동의. `stepKeys.test.ts` 통과. (2) 서버 액션 `saveRegistrationStep` → `saveWizardStep`이 폼과 같은 zod 스키마 사용. (3) 화면별 문항 수(WO 표 행 기준): 0=3, 1=7(스크린샷: 이름·국적·거주지 2단·메신저·이메일·출생연도·성별), 2=6(+세부 유형 조건부=7), 3a=4, 3b=4, 4=3, 5a=4, 5b=5, 6=3, 7=4 → 모두 ≤7. 진행률 "1/7"~"7/7", 공개 배지(`data-disclosure`) 1=7·2=5·3a=4·3b=4·4=3·5a=3·5b=4·6=2개 + 하단 요약(SC-04). 비자 선택지 "F-4 재외동포" 등 코드+설명. "모름" 선택지: visaCode·세부 유형·shiftOk·선택 문항(SC-02). 모든 화면 scrollWidth 375. (4) BR-13: `hasArc`는 예/아니오만(화면 문구 "번호는 묻지 않습니다."), 스키마·마이그레이션·`src` 전체에 passport/외국인등록번호 입력 필드 0건 |
| R-107 | E2E: Step 3까지 작성 → 새 세션 재로그인 → Step 4 재개, 입력값 유지 | e2e `wizard-resume.spec.ts:29` 실행 결과 확인 + 코드 경로(`resumePoint`, `canOpenStep`, `REQUIRED_DONE`) 확인. 추가로 Step 2 차단 뒤 `?step=3&sub=a` 직접 이동 시도 | Pass | e2e desktop·mobile 모두 통과(새 컨텍스트 로그인 → `/seeker/me` 진행 "3/7" → 계속 → `data-step=4`, Step 1·2 값 복원, `?step=6` 직접 이동 시 Step 4로 고정). 직접 시험: 차단된 프로필에서 `?step=3&sub=a` → `data-step="2"`(건너뛰기 불가) |
| R-108 | WO §7.4 표 전 행 테스트 통과. 코드에 비자→트랙 매핑 상수 없음 | (1) `classifyTrack.test.ts` 케이스 대조. (2) `src/**/*.ts(x)`에서 비자 코드 문자열 grep. (3) **데이터 기반 확인**: 개발 DB에 임시 VisaType 행 `QA-1` 생성 → `classifyVisa` 호출 → 행의 defaultTrack·autoConsult·registrable을 바꿀 때마다 재호출 → 시험 후 행 삭제(삭제 확인 0행). (4) D-2 졸업 3개월 후 입력 시 트랙 | Pass | (1) F-2·F-4·F-5·F-6·H-2→JOB_MATCH, D-10→JOB_MATCH+상담, D-2 6개월 이내→JOB_MATCH+상담/그 외·D-4→CONSULT_ONLY, E-7→JOB_MATCH+needsVisaReview, E-9·E-10→FUTURE_POOL, C-4·G-1→CONSULT_ONLY, B-1·B-2·C-3·NONE·만료·없음→불가, "행 수정 시 결과 변경" 테스트 포함, 289건 통과. (2) `src`에서 비자 코드 문자열 리터럴 0건(시드 `prisma/seed/visaTypes.ts`에만 존재). (3) `QA-1` JOB_MATCH → `{track:"JOB_MATCH"}`; defaultTrack=FUTURE_POOL로 수정 → `{track:"FUTURE_POOL"}`; CONSULT_ONLY+autoConsult → `{track:"CONSULT_ONLY", autoConsult:true}`; registrable=false → `{registrable:false, reason:"VISA_NOT_REGISTRABLE"}`. (4) D-2 + 졸업 예정 3개월 후 저장 → 프로필 track `JOB_MATCH` |
| R-109 | B-1, B-2, C-3, 만료일 과거, 비자 없음 → 서버에서 등록 완료 거부 + 상담 안내 (WO §15-5) | **클라이언트 우회 포함**. (1) 간편 등록: 폼에 F-4 선택·OTP 준비·동의 후, Playwright route로 서버 액션 POST 본문의 `"visaCode":"F-4"`를 B-1/B-2/C-3/UNKNOWN/NONE/OTHER/ZZ-9(없는 코드)로 바꿔 전송. (2) 위저드 Step 2: F-4·미래 만료월로 채운 뒤 본문을 B-1/C-3/NONE/UNKNOWN, 그리고 `"stayExpiry":"2025-01"`(과거)로 바꿔 전송. (3) **완료 시점**: Step 1~6을 저장한 구직자(임시 VisaType `QA-1`)로 Step 7 화면을 연 상태에서 (a) 관리자처럼 행을 registrable=false로 바꾼 뒤 제출, (b) 같은 세션 다른 탭의 `/me/stay`에서 만료월을 2025-01로 저장한 뒤 Step 7 제출 | Pass | (1) 7개 코드 모두 본문 변조 확인, 화면 `registration-blocked`(상담 안내) 표시, **User 생성 0건**. (2) 5개 모두 `registration-blocked` 표시, URL `?step=2` 유지, DB `track:null, completedStep:1`(진행 불가); 만료월 케이스도 같은 결과. (3a) 제출 → `registration-blocked`, `completedStep` 6 유지, Consent 0행; 이후 Step 7 재진입 시 동의 폼 대신 차단 안내만 표시. (3b) 제출 → `registration-blocked`, `completedStep` 6, Consent 0행. 이어서 만료월을 정상화하고 정상 제출 → `completedStep:7` |
| R-110 | Consent 행에 4개 값 저장 테스트. BLIND_PROFILE은 JOB_MATCH만 필수 | (1) 간편 등록·위저드 완료 뒤 Consent 행 조회. (2) JOB_MATCH 구직자의 Step 7 본문에서 `"blindProfile":true`→`false`로 변조해 제출. (3) E-9(FUTURE_POOL)은 BLIND_PROFILE 없이 완료(e2e). (4) 동의서 파일 grep | Pass | (1) 각 행 `type/version/locale/agreedAt/ipHash` 저장: 예 `BLIND_PROFILE/v1/ko/2026-11-16T04:22:47.403Z/ip:64자`, PRIVACY_REQUIRED·NOTICE 동일 형식. (2) 변조 제출 → 완료 거부(URL `?step=7`, `completedStep` 6, Consent 0행). (3) e2e `wizard-resume.spec.ts:132` E-9는 PRIVACY_REQUIRED·NOTICE만으로 완료, track FUTURE_POOL. (4) `content/consents/{PRIVACY_REQUIRED,BLIND_PROFILE,MARKETING,NOTICE}/v1/{6개 언어}.md` 24개 모두 `[전문가 검토 필요]` 포함(24/24). `consent.test.ts` 통과 |
| R-111 | E2E: 파라미터로 진입·등록 시 `referredByCode`, `sourceChannel` 저장 (+ 쿠키 유지, 고유 코드) | (1) `/ko?ref=<기존 코드 소문자>&src=QA_P1C_T1`로 진입 → `/ko/about` → 파라미터 없이 `/ko/seeker/register/quick` 이동 후 간편 등록. (2) 존재하지 않는 코드 `?ref=ZZZZ2222&src=QA_P1C_T2`로 등록. (3) 형식이 틀린 `?ref=../<x>&src=bad value!` | Pass | (1) 진입 직후 쿠키 `vj_ref=K3CBRHKM`(대문자 정규화)·`vj_src=QA_P1C_T1`, httpOnly. 다른 페이지를 거친 뒤 등록 → `referredByCode:"K3CBRHKM"`(기존 코드와 일치), `sourceChannel:"QA_P1C_T1"`, 본인 `referralCode:"7VHFVMBJ"`(8자). 등록 후 vj_ 쿠키 삭제됨. (2) 쿠키는 저장되나 DB에 해당 코드 0건 → `referredByCode:null`, `sourceChannel:"QA_P1C_T2"`(무시 처리). (3) 쿠키 생성 0개. e2e `referral.spec.ts` 2건 통과 |
| R-112 | 완료 화면 요소 존재 E2E (등급 B·승급 안내, 추천 코드·메신저별 공유, 트랙별 다음 행동) | 간편 등록 직후 완료 화면 요소·링크 수집(375px), e2e 결과 확인 | Pass | `grade-badge` data-grade="B", 승급 안내 "상담 예약을 하면 A등급, 체류와 한국어 확인까지 마치면 S등급이 되어 기업 추천 우선 대상이 됩니다."(WO §7.3 문구), `referral-code` "7VHFVMBJ", 공유 링크 WhatsApp `wa.me/?text=`·Telegram `t.me/share/url`·Viber `viber://forward`(PC-9) — 내용은 본인 추천 링크뿐, JOB_MATCH 다음 행동 "추천 일자리 보기"·"체류 만료 알림 설정", "구직자 이용료 없음." 표시. scrollWidth 375. e2e `complete-screen.spec.ts` 2건(JOB_MATCH, E-9 FUTURE_POOL→상담+점수 계산기) 통과 |
| R-113 | BLIND_PROFILE 철회 즉시 기업 후보 쿼리에서 제외 (WO §15-8) (+ /me, /me/stay, /me/referral) | grade A·JOB_MATCH·완료·BLIND_PROFILE 동의 구직자 생성(`createGradeASeeker`) → `isEligibleCandidate` 확인 → OTP 로그인 → `/ko/seeker/me`에서 철회 클릭·확인 → 즉시 `isEligibleCandidate`·Consent·AuditLog 조회 | Pass | 철회 전 `true` → 철회 직후 `false`. Consent `revokedAt` 설정(행 삭제 아님). AuditLog 0→1건 `{action:"CONSENT_REVOKE", entity:"Consent", meta:{type:"BLIND_PROFILE", versions:["v1"], count:1}}`(같은 트랜잭션). `eligibleCandidateWhere`가 `consents.some({type:"BLIND_PROFILE", revokedAt:null})`를 쿼리 조건으로 가짐. `/me/stay` 저장(`stay-saved`), `/me/referral` 코드 표시 확인. e2e `consent-revoke.spec.ts` 3건(재동의 시 복귀, 비로그인 시 로그인으로 이동 포함) 통과 |
| N-01 (BR-01) | 직접 연락 UI/API 0건 | 구직자 화면(`/ko/seeker/register/complete`, `/me`, `/me/stay`, `/me/referral`, `/me/recommended`, 위저드 Step 1)의 모든 `<a href>` 수집, 본문의 전화·이메일 패턴 검색, 소스 grep | Pass | 연락 링크는 푸터의 운영사 대표전화 `tel:0262818901`(site.config `02-6281-8901`, 비자앤잡 자신)과 본인 추천 링크 공유 3종뿐. 기업 연락처·채팅·이메일 전달 0건, 본문 전화·이메일 패턴 0건. 완료 화면 NOTICE "기업과의 연락은 비자앤잡을 통해서만" 표시 |
| N-03 | 동의서 초안 [전문가 검토 필요] | grep | Pass | 24/24 파일 |
| N-04 | 375px 가로 스크롤 없음 | 375×812 isMobile로 간편 등록·완료·마이페이지 3종·위저드 10화면 측정, 스크린샷 | Pass | 모든 화면 scrollWidth 375. 스크린샷(스크래치): 위저드 1·2 화면 확인. e2e mobile-375 프로젝트 P1c 13건 통과 |
| 검증 명령 | PLAN P1c 검증 명령 7개 통과 | 위 표대로 순차 실행 | Pass | 7개 모두 exit 0 |

### 개인정보 *Enc 평문 확인 (R-106 보조)
Step 1~4를 구별 가능한 값(`QAPLAINNAME ZEBRA`, `qaplain.zebra@example.test`, `qaplainmsgr_zebra`, `QAPLAINSCHOOL ZEBRA`, `QAPLAINEMPLOYER ZEBRA`)으로 저장한 뒤 raw SQL 조회:
- `legalNameEnc`·`emailEnc`·`messengerIdEnc`·`schoolNameEnc`(SeekerProfile), `employerNameEnc`(WorkExperience), `phoneEnc`(User) 모두 접두 `v1:`, 평문 포함 0.
- 행 전체 텍스트 `ILIKE '%zebra%'`: SeekerProfile 0, WorkExperience 0, AuditLog 0, StaffTask 0. 서버 로그 평문 0.

## P1b 선행 수정 재확인 (1e99955)
| # | 항목 | 시험 방법 | 결과 | 증거 |
|---|---|---|---|---|
| 1 | TOTP 같은 시간 단계 코드 재사용 거부(CODE_REUSED) | 3150 서버. 시험 ADMIN 생성 → 비번 로그인 → setup에서 otplib 코드 입력(→ `/admin`) → 새 컨텍스트로 재로그인 → verify 화면에 **같은 코드** 입력 → 다음 30초 단계까지 대기 후 새 코드 | Pass | 같은 코드: `/admin/2fa/verify` 유지, "이미 사용한 코드입니다. 인증 앱에 새 코드가 나오면 입력해 주세요." 다음 단계 코드 → `/admin` |
| 2 | 이메일·전화별 로그인 한도가 실패만 세고 성공 시 초기화 — 타인이 잠금 남용 불가 | `POST /api/auth/callback/employer-password`(매 요청 다른 XFF): 틀린 비번 9회 → 정답 → 틀린 비번 9회 → 정답 → 정답 12회. 이어서 제3자가 틀린 비번 11회 → 소유자 정답 | **부분 Fail** | 실패만 계수·성공 시 초기화는 동작: 실패 9 + 정답 302 성공, 다시 실패 9 + 정답 성공, 연속 성공 12회 모두 성공(성공은 계수 안 함). 그러나 제3자 실패 10회 뒤 11회째 `429`, **소유자 정답도 `429`** → 결함 D-1 |
| 3 | 사업자등록번호 체크섬(무효 번호 가입 거부) | `/ko/employer/signup` UI로 체크 자리만 1 바꾼 번호와 정상 번호 가입. 서버 함수 `registerEmployer`에 무효 번호 직접 호출 | Pass | 무효: "올바른 사업자등록번호가 아닙니다. 번호를 다시 확인해 주세요.", User 생성 0. 정상: `/ko` 이동, 생성됨. 서버 함수 직접 호출 `{ok:false, code:"INVALID_BIZ_REG_NO"}` |
| 4 | TRUST_PROXY=false면 X-Forwarded-For 무시 | 같은 XFF로 서로 다른 번호 21회 `POST /api/seeker/otp`: 3150(`TRUST_PROXY=true`) vs 3151(미설정) | Pass | true: 1~20회 200, 21회째 429(IP 한도 적용). 미설정: 21회 모두 200 → XFF로 버킷을 만들지 않음(IP 한도는 건너뜀, 번호별 한도는 유지 — `clientIp` null) |
| 5 | OTP 문구 {length} 인자화 | 6개 언어 messages에서 `{length}` 확인, ko·en·vi 로그인 코드 단계 렌더링 + 2자리 입력 오류 | Pass | 각 언어 `{length}` 3곳. 화면 "문자로 받은 6자리 숫자를 입력해 주세요." / "Enter the 6-digit code from the text message." / "Nhập mã 6 chữ số…", 오류 "인증번호 6자리를 입력해 주세요."; `{length}` 리터럴 노출 0 |
| 6 | 관리자 라벨 "(필수)" | `/admin/login` 라벨 텍스트, TOTP 폼 소스 | Pass | `["이메일(필수)","비밀번호(필수)"]`; `totp-form.tsx:26` 코드 라벨 `(필수)` |

## 결함 목록 (Fail만)
| 번호 | 항목 | 재현 방법 | 기대 | 실제 | 위치 |
|---|---|---|---|---|---|
| D-1 | P1b 재확인 2 (기준서 O-7 후속, PRD 필수 항목 아님) | 기업 계정 이메일로 `POST /api/auth/callback/employer-password` 틀린 비번 10회(IP 무관) → 해당 계정 소유자가 정답 비번으로 로그인 | 커밋 설명대로 "타인이 잠금 남용 불가" | 11번째 이후 정답 비번도 `429`(15분 창 동안). `loginGate`가 성공 판정 전에 실패 수만 보고(peek) 거부하므로 소유자가 성공으로 초기화할 기회가 없음. 성공 시 초기화는 소유자가 한도 전에 로그인할 때만 효과 | `src/lib/authCredentials.ts` `loginGate`/`loginOutcome` (식별자 키 `login:id:<hash>`만 사용) |

참고: D-1은 PRD 합격 기준 위반이 아니다(R-129 "한도 초과 시 429"는 충족). 운영 정책으로 수용할지, 식별자+IP 조합 키나 짧은 잠금·지수 지연 등으로 바꿀지 판단 필요.

## 기준 외 발견
| 번호 | 내용 | 재현·증거 | 영향 | 제안 |
|---|---|---|---|---|
| O-1 | `/me/stay`가 지난 달(예: 2025-01)을 그대로 저장하고, 연도 선택지에 2024·2025가 있음 | `/ko/seeker/me/stay` 저장 → `stayExpiry 2025-01-01`, `stay-saved` 표시 | 등록 완료 **후** 만료월을 과거로 바꿔도 `completedStep`·track은 그대로라 `eligibleCandidateWhere`에서 빠지지 않음(만료 확인은 Step 2·완료 시점에만). 미완료자는 완료 시점에 막힘(R-109 시험 3b) | 기업 후보 쿼리(P2b)나 저장 시점에 만료 여부 반영 검토 |
| O-2 | 공유 링크 도메인이 `SITE_URL` 기본값 `http://localhost:3000` | 3150 서버 완료 화면 공유 href에 `localhost:3000` | 로컬 한정. 운영은 `SITE_URL` 필수 | 배포 체크리스트에 `SITE_URL` 포함 |
| O-3 | Step 2 `pendingApplication`(선택 문항)에 "모름" 없음(예/아니오만) | 위저드 Step 2 스크린샷 | SC-02 "선택 문항에 모름 적용"과 해석 차이 가능(응답 안 함으로 넘어갈 수는 있음) | 기준 검토자 판단 |
| O-4 | 빌드 표에 `/[locale]/seeker/me` 등이 `●`(SSG)로 표시되나 페이지는 `dynamic = "force-dynamic"` | build 출력 | 실제 요청에서는 세션별로 렌더링됨(로그인 이동·본인 데이터 확인) | 없음(관찰) |
| O-5 | 간편 등록 화면의 비자 선택지에 B-1·B-2·C-3·NONE·UNKNOWN·OTHER가 그대로 보임 | 선택 시 즉시 상담 안내 + 제출 버튼 비활성(e2e), 서버도 거부 | 의도된 설계(SC-02 안내 경로) | 없음 |
| O-6 | E2E·QA가 개발 DB에 시험 행을 계속 남김(P1b O-5와 같음) | 이번 QA: 구직자 약 25명, 직원 1, 기업 계정 3, Consent·StaffTask·OtpChallenge·RateLimitBucket 다수, 차단 시험용 프로필(visaCode B-1 등). 임시 VisaType `QA-1`은 삭제(0행 확인), 해당 시험 구직자의 visaCode는 F-4로 되돌림. 첫 실행 중단 때 만든 구직자 1명은 visaCode `QA-1` 문자열이 남음(FK 없음) | 개발 데이터 오염 | e2e 전용 DB 또는 정리 스크립트 |

## 판정불가 / 사람 확인 필요
- 없음(범위 항목 모두 직접 실행해 판정).
- 번역 품질(6개 언어 위저드 문구 `_review` 초안)과 동의서 본문 법률 내용은 사람 검토 대상(N-03 표시는 확인됨).
