# Phase P1c — 기준 일치 검토 (run 1)

- 대상 커밋: `1e99955`(선행 A: P1b 경미 2건 + 보안 보강), `b3933a1`(P1c 본 작업). 범위 `git diff 615abef..b3933a1`. 작업 트리의 `src/`·`messages/`·`content/`·`tests/`는 `b3933a1`과 같다(`git status`에서 바뀐 것은 `.workflow/`뿐).
- 기준: `.workflow/STANDARD.md` v2.6, PRD R-105~R-113, DECISIONS SC-01~SC-04·SC-10·Q-07·Q-09, CLAUDE.md(h-11, 임의값·`text-xs` 금지, `cn` import).
- 검토자: wf-standard(모드 B), 2026-11-16. 판정은 v2.6 기준으로 했다. **[후속] 오케스트레이터 지시와 DECISIONS Q-10에 따라 5절 B-1~B-12를 STANDARD v2.7로 반영했다.** 반영 결과는 1절 끝과 3절 #10~#12에 적었다.
- 실행한 확인
  - `corepack pnpm lint`: 통과.
  - `qa:static`: 오류 0, 경고 17. P1b와 같은 기존 경고이고 새 경고는 없다.
  - `i18n:check`: 6개 로케일 오류 0, ko 키 792개.
  - 점검표의 rg/grep 명령: S-02·05·06·23·24·32·36·42~48·50·53·63·64·69·70과 4.9 검사 1~3.
  - 화면: 375px 스크린샷 11장(`p1c_step0~7`, `p1c_complete`)을 봤다.
  - 지시에 따라 build·test·e2e·dev·start는 **실행하지 않았고**, `.next`도 건드리지 않았다.

## 0. P1b 불일치 해소 확인

| P1b # | 판정 | 근거 |
|---|---|---|
| 2 (S-53 OTP 길이 숫자 중복) | **해소** | `messages/ko.json:653` `errors.field.invalidCode` = "인증번호 {length}자리…", `:706`·`:768` `code.help` = "{length}자리 숫자…". 6개 로케일 모두 `{length}`이다. 호출부에서 `OTP_CODE_LENGTH`를 넘긴다(`seeker-login-form.tsx` `fieldError`, `help`). P1c의 `wizard-shell.tsx:73-77` `FIELD_ERROR_ARGS`도 같은 방식이다. |
| 3 (3.3 관리자 "(필수)") | **해소** | `staff-login-form.tsx`(이메일·비밀번호), `totp-form.tsx`(코드) 라벨에 `<span className="ms-1 font-normal text-n500">(필수)</span>`가 붙었다. `FormField`와 같은 모양이다. |
| (P1b 관찰 1) 관리자 워드마크 리터럴 | 해소 | `admin-auth-card.tsx:20` → `getSiteConfig().brand.wordmark` |

## 1. 결과 요약

- 점검표: **일치 38 / 43**. 불일치 4(S-10, S-13, S-19, S-53), 기준 보완 필요 1(S-15).
- 3·4·5절 규칙·결정: **일치 19 / 25**. 불일치 6(3.2 WizardProgress 블러, 3.3 하단 고정, 3.3 첫 오류 포커스, 1.1 브랜드 표기, 2.4 위저드 폭, 3.7 H1 크기). WizardProgress 블러는 S-10 다이얼로그 블러와 함께 수정 지시 #1로 묶었다.
- 합계 **57 / 68**. 수정 지시는 9건이다. 모두 작은 수정이고 BR 위반은 없다.
- **[후속, v2.7 반영 후]** S-15는 '기준 보완 필요'에서 판정할 수 있게 됐다. `pendingApplication` '모름' 누락이 불일치로 바뀐다(#10). 새 기준에 따라 수정 지시 2건이 늘었다: 가짜 코드 노출(#11), 내비 블러 임의값을 토큰으로(#12). #5·#9는 Q-10으로 대안 없이 확정됐다. 수정 지시는 모두 **12건**이다.
- 빌더 해석 4건: 1·2·4는 **수용**했다. 3은 **해석은 수용**하지만 적용이 한 문항(`pendingApplication`)에서 빠졌다. 그래서 기준 보완을 제안한다(5절 B-5).

## 2. 빌더 해석 판정

| # | 해석 | 판정 | 근거 / 조건 |
|---|---|---|---|
| 1 | Step 1 메신저 종류+ID를 1문항으로 센다 | **수용** | WO §7.3 Step 1 표에서 `messengerType / messengerId`는 한 행이다("연락받을 메신저", 유형 "선택+입력"). `sido / sigungu`("2단 선택")도 한 행이고, 3.3은 이미 이를 1문항으로 센다. ID 입력란은 같은 라벨 안의 종속 입력이다(`wizard-steps-a.tsx:174-201`). 따라서 Step 1은 7문항이다. 3.3 문구는 sido/sigungu만 예로 들고 "조건부 문항은 표시될 때 1개"라고도 적어 해석이 갈린다. 그래서 "WO §7.3 표 한 행 = 1문항"을 명시하자고 제안한다(B-1). |
| 2 | 비자 native `<option>`에 '코드+쉬운 이름' 문자열을 쓰고, 선택 후 `VisaLabel`로 표시 | **수용** | `<option>`에는 컴포넌트를 넣을 수 없다. 문자열 `{code} {t(nameKey)}`는 VisaLabel과 같은 정보다. P1a `visa-check-form.tsx:91`에 선례가 있고 그때 불일치로 보지 않았다. 선택 직후 `VisaLabel`도 나온다(`wizard-steps-a.tsx:314-318`, `quick-register-form.tsx:145`). S-16 예외를 명시하자고 제안한다(B-2). **단서:** 가짜 코드 행(OTHER·NONE·UNKNOWN)도 코드가 보인다. 예: "UNKNOWN 모름", 칩 "UNKNOWN"(B-3). |
| 3 | SC-02 '모름'은 비필수 선택 문항에만(세부 유형·shiftOk·다음 비자·입국 연도·희망 월급), 성별은 '응답 안 함' | **해석 수용, 적용 보완 필요** | SC-02는 "선택 문항·세부 유형·shiftOk"라고 따로 적었다. 세부 유형과 shiftOk를 따로 적은 것은 "선택 문항"이 선택형 전체가 아니라 비필수 문항이라는 뜻으로 읽힌다(shiftOk는 필수 선택형이라 별도 표기가 필요했다). 그러나 같은 해석을 그대로 적용하면 비필수 선택 문항인 `pendingApplication`(진행 중인 비자 신청 여부, `step2.ts` `optionalYesNo`)에도 '모름'이 있어야 하는데 예/아니오만 있다. `groupApply`·`wantsConsult`(본인 의사), `birthYear`(본인 정보), `messengerType`("없음" 제공), 다중 선택(빈 선택 = 무응답)은 '모름'이 어색하다. 그래서 범위를 기준서에 열거하자고 제안한다(B-5). 결정 전까지 S-15는 "기준 보완 필요"로 둔다. |
| 4 | 위저드 질문 라벨 `text-h3`로 모바일 간격이 큼 | **수용(현행 유지)** | 3.1 input·label 행에 "위저드 질문 라벨 `text-h3`"가 있고, 2.3.4 `text-h3` 용도에 "위저드 질문"이 있다. 375px에서 20px/1.35로, 스크린샷 기준 문항 구분이 분명하고 넘침이 없다. 줄이려면 기준 개정이 먼저 필요하다. 권장하지 않는다. 문항 간격은 2.4(24px)와 3.1(22px)이 서로 다르다. 현행 22px로 통일하자고 제안한다(B-9). |

## 3. 불일치 목록 (수정 지시)

| # | 기준 | 위치 | 실제 상태 | 수정 지시 |
|---|---|---|---|---|
| 1 | S-10 / 3.1 dialog("스크림 … `blur(14px)`, 진입 `translateY(18px) scale(.98)`→0 0.5s"), 3.2 WizardProgress("`bg-white/82` + blur(내비 스크롤 상태와 동일)") | `src/components/ui/dialog.tsx:27`, `:33`; `src/components/seeker/wizard-progress.tsx:24` | 다이얼로그 스크림이 `backdrop-blur-md`(Tailwind 기본 12px)다. 진입은 `fade-in-0`뿐이고 translate·scale이 없다. 진행 바는 `backdrop-blur-xl`(24px)이고 saturate가 없다. 내비는 `backdrop-blur-[22px] backdrop-saturate-160`이다(`site-nav.tsx:82`). | dialog 스크림: `backdrop-blur-glass`(2.2.2 `--blur-glass` 14px). 콘텐츠 진입: `data-[state=open]:slide-in-from-bottom-4.5 data-[state=open]:zoom-in-98`(tw-animate) 또는 같은 값의 transform. WizardProgress: **`backdrop-blur-nav backdrop-saturate-160`**(v2.7 토큰 `--blur-nav` 22px, CLAUDE.md 임의값 금지와 맞춤). `globals.css` `@theme`에 `--blur-nav: 22px;`를 추가한다. |
| 2 | S-13 / SC-04 "필드별 아이콘 + 단계 하단 요약" | `src/components/seeker/wizard-steps-b.tsx:98-115`(경력 국가), `:244-247`(Step 4 요약) | 경력 행의 국가는 기업에 공개되지 않는다. WO §7.5 `experienceSummary` = 업종·직무·기간만이다. 그런데 국가 필드에 공개 여부 아이콘이 없고, 요약의 공개·비공개 어느 쪽에도 없다. 회사명에만 `private` 아이콘이 있다. | 국가 FormField에 `labelAddon={icon("private")}`. Step 4 요약 `hidden`에 `s.text("country")`를 추가한다(`experienceSummary` 문구 "업종·직무·기간"은 유지). |
| 3 | S-19 / 3.2 ExpertReviewMark("법적 문서 제목 바로 아래", `orange` 배지 + `FileWarning`) | `src/components/seeker/consent-documents.tsx:31-37`, `content/consents/*/v1/*.md:3` | 동의서 24개 파일에 "[전문가 검토 필요]"가 있다. 그러나 마크다운 문단으로 들어가 `<p className="mt-2">` 일반 글자로 렌더된다. `ExpertReviewMark`를 쓰지 않는다. `/about`·`/fees`·`legal-document`는 컴포넌트를 쓴다. | `loadConsentDocuments`가 본문 위(제목 바로 아래)에 `<ExpertReviewMark />`를 렌더한다. 본문의 마커 줄은 렌더에서 빼거나 md에서 지운다. 파일 원문에 남길 때는 `legal-document`와 같은 처리로 맞춘다. 번역본의 한국어 원문 병기(SC-08)는 이미 있다(번역본 끝의 한국어 원문 절, 예 `vi.md` "## Bản gốc tiếng Hàn"). |
| 4 | S-53(v2.5): `limits.ts` 값을 messages에 숫자로 중복하지 않는다 | `messages/*.json` `seeker.register.step5.desiredIndustries.help`, `…desiredRegions.help`(ko `:1018`, `:1022`, 6개 로케일 × 2키). 호출부 `wizard-steps-b.tsx:312` 등. `useStepText.help`(`wizard-steps-a.tsx:59`)는 인자를 받지 않는다. | "최대 **3**개까지 고를 수 있습니다." `DESIRED_MAX_SELECTIONS = 3`(`limits.ts`)과 중복된다. 같은 뜻의 오류 문구 `errors.field.tooMany`는 이미 `{max}`를 쓴다(`:663`). P1b #2와 같은 유형이다. | 두 키를 `{max}`로 바꾼다(6개 로케일). `useStepText.help(field, values?)`가 인자를 받게 하고 `{ max: DESIRED_MAX_SELECTIONS }`를 넘긴다. |
| 5 | 3.3 "위저드: … **하단 고정** '이전/다음'" | `src/components/seeker/wizard-shell.tsx:161-176`(`WizardNav`) | 이전/다음 줄이 폼 맨 끝의 일반 흐름에 있다. 스크린샷 step5a에서 화면 높이는 2,924px다. 고정이 아니어서 긴 화면에서는 끝까지 스크롤해야 버튼이 보인다. | 버튼 줄을 `sticky bottom-0` 바로 만든다. 바탕 `bg-white/82` + 내비와 같은 블러, 위 `border-navy/8`, 세로 패딩 12px(`py-3`, 임의값 없이). 요약·오류 문구는 바 밖(위)에 그대로 둔다. **Q-10으로 확정: sticky 하단 바**(3.3 문구 그대로). 바 블러는 `backdrop-blur-nav`. |
| 6 | 3.3 "오류는 필드 바로 아래 + **첫 오류 필드로 포커스**" | `src/components/forms/choice-chips.tsx`(`ChipGroup`·`MultiChips`), `src/components/forms/month-select.tsx`, Controller 사용처(`wizard-steps-a.tsx:243-255` 외), `wizard-shell.tsx:120-122` | 칩·월 선택은 `Controller`의 `field.ref`를 받지 않는다. 그래서 react-hook-form `shouldFocusError`가 이 필드들로 포커스를 옮기지 못한다. 예: Step 3a 학력, 3b TOPIK, 5a 구직 상태처럼 첫 오류가 칩이면 포커스가 움직이지 않거나 뒤의 입력란으로 간다. 서버 필드 오류는 `setError`에 `shouldFocus`가 없다. | `ChipGroup`·`MultiChips`·`MonthSelect`가 `ref`를 받아 첫 칩(또는 연 select)에 연결한다. Controller에서 `field.ref`를 넘긴다. 서버 오류는 첫 항목에 `form.setError(name, {…}, { shouldFocus: true })`. 확인은 QA E2E(오류 제출 후 `document.activeElement`)로 한다. |
| 7 | 1.1 "영문 워드마크 표기는 C-14" → Q-07 결정 "문자 표기 **'VISA n JOB'**(국문 '비자앤잡')" | `messages/{en,vi,ru,zh,uz}.json` 각 12곳(예 en `:63`, `:168`, `:809`, `:826`, `:1084`, `:1096`, `:1109`, `:1118`, `:1127`, `:1137`, `:1139`, `:1140`), `content/consents/*/v1/{en,vi,ru,zh,uz}.md` | P1c에서 새로 넣은 문구가 "Visa&Job"을 쓴다(615abef에는 0건). 같은 파일의 기존 키 28곳은 "VISA n JOB"이다. 한 화면 안에서 브랜드 표기가 섞인다(예: 완료 화면 푸터 "VISA n JOB" + 본문 "Visa&Job"). | 비한국어 messages와 동의서 번역본의 "Visa&Job"을 "VISA n JOB"으로 바꾼다. ko의 "비자앤잡"은 그대로 둔다. 동의서 본문을 바꾸면 버전 정책(v1 유지 여부)은 P1c가 초안 상태라 v1 덮어쓰기로 충분하다(아직 운영 동의 기록 없음). |
| 8 | 2.4 "콘텐츠 폭: … 폼·위저드 576px(`max-w-xl`)" | `src/app/[locale]/seeker/register/page.tsx:85`, `src/components/seeker/wizard-progress.tsx:27` | 위저드 본문과 진행 바가 `max-w-180`(720px)이다. 간편 등록 폼은 `max-w-140`(560px)으로 기준 안이다. | 위저드 본문 컨테이너를 `max-w-xl`(576px)로 바꾼다. 진행 바 안쪽 폭도 같게 해서 막대와 본문 좌우가 맞도록 한다. |
| 9 | 3.7 "구직자·기업 화면: … 상단에 `SectionHeader`(H1은 `text-h1`)" | `src/app/[locale]/seeker/register/page.tsx:87` | 위저드 H1(단계명)이 `text-h2`이고 SectionHeader를 쓰지 않는다. 같은 Phase의 quick·complete·me 화면은 `PageShell`(SectionHeader, `text-h1`)이다. | H1을 `text-h1`로 바꾼다. 아이브로우가 필요 없으면 SectionHeader의 아이브로우 없는 형태로 쓴다. **Q-10으로 확정: `text-h1`, 예외 없음.** |
| 10 (v2.7) | 3.3 '모름' 열거(B-5, Q-10): `pendingApplication`에 '모름' | `src/schemas/seeker/register/step2.ts`(`optionalYesNo`), `src/components/seeker/wizard-steps-a.tsx:437-447` | 예/아니오만 있다 | 스키마를 `optionalChoice(["YES","NO","UNKNOWN"])`(또는 `YES_NO`+`UNKNOWN` 상수)로 바꾼다. 칩에 `seeker.register.common.unknown`을 추가하고 저장값 매핑(`saveStep`·`wizardValues`)도 맞춘다. 마이그레이션이 필요한지는 저장 컬럼 타입으로 확인한다. |
| 11 (v2.7) | 3.2 VisaLabel ②(B-3): 체류자격 코드가 아닌 행은 이름만 | `wizard-steps-a.tsx:306-310`, `:314-318`, `quick-register-form.tsx:135-145`, `src/components/visa/visa-label.tsx` | "UNKNOWN 모름", "OTHER 그 밖의 비자", "NONE 비자 없음", 선택 후 칩 "UNKNOWN"이 보인다 | `VisaType`에 데이터 속성(예 `isStatusCode`/`displayCode` 불리언, 시드·마이그레이션 동반)을 두고 옵션 문자열·VisaLabel이 그 값으로 코드 표시 여부를 정한다. `src/`에 OTHER·NONE·UNKNOWN 리터럴 목록을 만들지 않는다(4.9). |
| 12 (v2.7) | 2.2.2 `--blur-nav`, 2.4 임의값 허용 목록에서 `backdrop-blur-[22px]` 삭제 | `src/components/common/site-nav.tsx:82`, `src/app/globals.css` `@theme` | P1a 내비가 `backdrop-blur-[22px]`이다 | `@theme`에 `--blur-nav: 22px;`를 추가하고 `backdrop-blur-nav`로 바꾼다(#1과 함께). |

## 4. 항목별 판정

### 4.1 점검표

| 번호 | 판정 | 근거 |
|---|---|---|
| S-02 | 일치 | 새 코드에 hex·rgba·기본 팔레트 0건. 매치 1건은 `final-cta.tsx:11` 주석(기존)이다. |
| S-05 | 일치 | `text-[`·`text-xs` 0건(`globals.css:247` 주석뿐). 도움말·오류·공개 배지 `text-caption`(13px), 칩 13px(HO 12.5px보다 큼), 입력 `text-control`. |
| S-06 | 일치 | 간격·반경 임의값 0건, 기본 그림자 0건. 새 대괄호는 `transition-[..]` 3건(`checkbox.tsx:17`, `progress.tsx:27`, `radio-group.tsx:43`)이며 2.4 허용 범위다. `rounded-2xs`, `h-1.25`, `p-6.5`는 척도 유틸이다. `cn` import 0건. |
| S-07 | 일치(스크린샷) | 375px 11장 모두 가로 넘침이 없다. 칩은 줄바꿈되고 긴 업종명도 칩 안에서 줄바꿈된다(step5a). 수치 측정은 QA가 한다. |
| S-08 | 일치(코드) | 칩 `h-11`(<1025), `lg:h-8.5`. 체크박스 행·"전문 보기" `min-h-11`. 버튼 `sm`=h-11. 다이얼로그 닫기 `size-11`. 관찰 6 참조. |
| S-09 | 일치 | GradeBadge는 글자("B등급")와 S일 때 `Star`. 공개 여부는 `Eye`/`Lock` + 문장(또는 `sr-only`). |
| S-10 | **불일치** | 새 shadcn `checkbox`, `radio-group`, `progress`, `dialog`는 모두 3.1 목록 안에 있고 avatar·calendar는 없다. 체크박스(20px, `rounded-2xs`, `--input`, navy 체크 + `Check` 2), 칩(pill, `--input`, 선택 navy), progress(5px, n200, `--grad`, 0.6s)는 규칙과 같다. **다이얼로그 블러·진입 모션은 → #1.** |
| S-11 | 일치 | 새 아이콘 `Eye`, `Lock`, `Check`(2), `X`, `ArrowLeft/Right`, `Trash2`, `Plus`, `Share2`, `Copy`, `Star`. 모두 lucide이고 1.5, `aria-hidden`이다. |
| S-12 | 일치 | `WizardProgress`: 막대 + "n/7 · 단계명"(SC-03 분모 `WIZARD_LAST_STEP`=7, Step 0은 0/7), `aria-label`·`aria-valuetext`, "자동 저장됨" `text-caption` n500 + `Check`. 블러 값은 #1. |
| S-13 | **불일치** | 각 화면 필드 아이콘과 하단 요약(`DisclosureSummary`, n50 `rounded-sm`, 배지 + `text-dense`)이 있다. 문구 "이 정보는 기업에 공개되지 않습니다"/"블라인드로 공개됩니다"(ko `:746-747`)는 WO §7.1과 같다. 경력 국가만 빠졌다 → #2. |
| S-14 | 일치(해석 1 수용) | 화면별 문항 수: 1=7(메신저 1), 2=7(세부 유형 조건부 포함), 3a=4, 3b=4, 4=4(WO 행 기준: 경력 반복 그룹, 회사명, 기술, 자격증), 5a=4(시작일 조건부 포함), 5b=5(친구 코드 조건부 포함), 6=3, 7=4. Step 3·5는 a/b로 나뉘고 단계 번호는 유지된다(`page.tsx:52-65`, `options.ts:194`, 스키마 `pick`). 반복 그룹을 세는 법은 B-1. |
| S-15 | **기준 보완 필요** | 맞는 부분: `shiftOk` = `YES/NO/CONDITIONAL/UNKNOWN`(SC-10, `options.ts:171`). 세부 유형·다음 비자·입국 연도·희망 월급에 '모름'이 있다. visaCode 모름/기타 = `VisaType` UNKNOWN·OTHER·NONE(`registrable=false`) → `BlockedNotice` + 상담 안내다. `hasArc`·`needDormitory`는 예/아니오만, 성별은 `NO_ANSWER`. 판단할 수 없는 부분: `pendingApplication` 등 비필수 예/아니오 문항의 '모름' 여부 → B-5. |
| S-16 | 일치(해석 2 수용, 보완 2건) | 표시 지점: `VisaLabel`(Step 2 선택 후, quick, `/seeker/me`). select는 `{code} {name}` 문자열(B-2). 가짜 코드 노출(B-3), 세부 유형 칩이 코드만 표시(B-4)는 기준 보완 대상이다. |
| S-19 | **불일치** | 마커 문구는 있다. 한국어 원문 병기도 있다(`vi.md` "## Bản gốc tiếng Hàn" 등). 그러나 `ExpertReviewMark`로 렌더되지 않는다 → #3. |
| S-22 | 일치 | 위저드 모든 화면 머리(`page.tsx:89`), 간편 등록(`quick/page.tsx:54-59` NoticeBox), 완료 화면(`complete/page.tsx:85`). |
| S-23 | 일치 | 새 messages에 금지 표현 0건. `qa:static` S-23 경고 14건은 기존 그대로("수수료 안내" 등 기업·공시 문맥). |
| S-24 | 일치(보완 B-6) | 구직자↔기업 연락 UI 0건. 매치는 `referral-share.tsx:27-35`의 WhatsApp·Telegram·Viber **공유** URL이다. PC-9 승인 사항이고, 본인 추천 링크만 공유하며 기업 연락처는 없다. S-24 문구에는 이 예외가 없어 B-6으로 명시를 제안한다. `final-cta.tsx:89` `tel:`은 기존(site.config 운영자 전화)이다. |
| S-27 | 일치 | 등급 표시는 `GradeBadge`뿐이다(`complete/page.tsx:49`, `me/page.tsx:54`). S = solid + Star, A = blue, B = outline(`border-input text-n700`). |
| S-28 | 일치 | 6개 파일 첫 키는 `_review` 그대로다. |
| S-29 | 일치 | `i18n:check` 오류 0(792키). |
| S-30 | 일치 | 표본 24개: `seeker.register.step1.legalName.{label,help}`, `…step2.visaCode.{label,help}`, `…step3.topikLevel.option.{0..6}`, `…step5.shiftOk.option.UNKNOWN`, `…step7.readFull`, `seeker.register.{common.unknown,progress.count,progress.saved,disclosure.private,disclosure.blind,disclosure.summaryTitle}`, `seeker.referral.{shareText,copyLink}`, `seeker.grade.label`, `errors.field.tooMany`, `errors.register.*`, `common.profileCompletion.sms`(v2.5 `common.{주제}.{채널}`), `meta.seekerRegister.*`. 필드 세그먼트는 WO §7.3 키와 같고 option 값은 enum과 같다. |
| S-31 | 일치 | `lint`(jsx-no-literals) 통과. 관찰 4 참조(괄호 리터럴). |
| S-32 | 일치 | 희망 월급은 `format.number(…, { style: "currency", currency: "KRW" })`(`wizard-steps-b.tsx:455`). `toLocaleString`·"원" 연결 0건. |
| S-33 | 일치 | `content/consents/{PRIVACY_REQUIRED,BLIND_PROFILE,MARKETING,NOTICE}/v1/{6 locales}.md`. messages에 본문 없음. |
| S-34 | 일치(보완 B-8) | 새 `src/` 최상위 폴더는 없다. `lib/seeker/`, `lib/candidates/`, `schemas/seeker/register/fields.ts`가 4.2 트리에 없다. v2.5와 같은 방식으로 추가를 제안한다. |
| S-35 | 일치 | components·app kebab(`wizard-steps-a.tsx`, `choice-chips.tsx`, `month-select.tsx`), lib·schemas·server camelCase(`saveStep.ts`, `wizardValues.ts`, `classifyTrack.ts`(WO 지정명)), 액션 동사(`requestSignupOtp`, `startRegistration`, `quickRegister`, `saveRegistrationStep`, `changeConsent`, `saveStaySettings`), zod `step{n}Schema`/`Step{n}Input`. |
| S-36 | 일치 | `any` 매치는 주석 1건(기존). |
| S-40 | 일치(보완 B-7) | 공개 주석: `requestSignupOtp:75`, `startRegistration:95`, `quickRegister:130`. 첫 문장 `requireSeeker()`: `saveRegistrationStep:169`, `changeConsent:29`, `saveStaySettings:48`. 내부에서 `assertCan(…,"seeker:selfService")`, 권한은 `rbac.ts:33`. 4.5는 `requireStaff()`만 인정 예로 들고 있어 `requireSeeker()` 명시를 제안한다. 새 Route Handler는 없다. |
| S-42 | 일치 | `src/schemas/**` 밖 `z.object(` 0건. 클라이언트 폼과 `saveStep`이 같은 `step*Schema`를 쓴다. Step 3·5 하위 화면은 `pick`이다(4.6). |
| S-43 | 일치 | `legalNameEnc`, `messengerIdEnc`, `emailEnc`, `schoolNameEnc`, `employerNameEnc`, Consent `ipHash`. 외국인등록번호·여권 필드 0건(`hasArc`는 예/아니오, BR-13). |
| S-44 | 일치 | 직접 `encrypt(`/`decrypt(` 0건. |
| S-45 | 일치 | 새 `console.*` 0건. 경고 3건은 기존이다. |
| S-46 | 일치 | 동의 철회 시 `revokedAt` + `CONSENT_REVOKE` 감사를 같은 트랜잭션에서 기록한다(`lib/seeker/consent.ts:9,17`). |
| S-47 | 일치 | 0건. |
| S-48 | 일치 | 4.9 검사 1: 0건. 검사 2: 주석만(`classifyTrack.ts:2,41` 등). 검사 3: 매핑 상수 0건. 트랙은 `VisaType.defaultTrack`·`registrable` 데이터에서 온다. |
| S-50 | 일치 | `src/` 안 테스트 0건. 미러: `tests/unit/lib/seeker/{account,consent,saveStep}.test.ts`, `lib/visa-engine/classifyTrack.test.ts`, `lib/candidates/eligible.test.ts`. 픽스처 `seekerFixtures.ts`, E2E `support/{seekerDb,seekerFlow}.ts`. R-105~R-113 태그가 있다. 관찰 7 참조. |
| S-53 | **불일치** | src 쪽은 맞다(새 운영 수치 `limits.ts` 일괄, 스키마 `.max(100)` 등은 v2.5 허용 상한). messages "최대 3개" → #4. |
| S-56 | 일치 | `.env.example`에 `TRUST_PROXY=false`(비밀값 아님, 설명 포함)만 추가됐다. |
| S-57 | 일치 | 새 `opacity-0` 0건. 다이얼로그 fade는 오버레이 예외다(2.7-5). |
| S-63 | 일치 | `text-n400`·`text-brand-blue`·`white/1x~4x` 0건. 파랑 글자는 `text-brand-blue-700`(흰 위 7.06:1). |
| S-64 | 일치 | `variant="seeker"`는 구직자 화면(위저드 다음·간편 등록·완료·마이페이지·공유·체류 저장)에만 있다. |
| S-69 | 일치 | 새 컴포넌트는 `focus-visible:outline-2 outline-offset-3 outline-brand-blue`이다. `outline-none` 단독은 0건. |
| S-70 | 일치 | 플레이스홀더 값 0건(전화 placeholder "010-0000-0000"은 형식 예시라 대상 아님). |

해당 없음(이번 diff에 대상 없음): S-01, S-03, S-04, S-17, S-18, S-20, S-21, S-25, S-26, S-37~S-39(P2), S-41(관리자 변경 없음 — 1e99955는 TOTP 재사용 방지만 추가), S-49, S-51, S-52(새 Route Handler 없음), S-54, S-55, S-58~S-62, S-65~S-68, S-71, S-72.

### 4.2 규칙·결정

| # | 기준 | 판정 | 근거 |
|---|---|---|---|
| R-1 | 3.1 checkbox·radio 칩·progress 모양 | 일치 | S-10. 칩 선택 그림자는 HO 값 대신 `shadow-ink`다(2.5 목록 준수, B-12) |
| R-2 | 3.1 form 간격 22/7px | 일치 | 모든 위저드 폼 `grid gap-5.5`, `FormField` `gap-1.75`. 2.4 "위저드 문항 간 24px"와의 내부 충돌은 B-9 |
| R-3 | 3.2 WizardProgress | **불일치** | sticky·막대·글자·저장 상태는 맞다. 블러 → #1 |
| R-4 | 3.2 DisclosureBadge(variant, 문장형 13px 줄바꿈, 필드 아이콘 14px n500/blue-700 + sr-only) | 일치 | `disclosure-badge.tsx`. 누락 1필드는 S-13 |
| R-5 | 3.2 GradeBadge | 일치 | S-27 |
| R-6 | 3.2 VisaLabel | 일치 | 새 사용처가 기존 컴포넌트를 그대로 쓴다 |
| R-7 | 3.3 터치 44px | 일치 | S-08 |
| R-8 | 3.3 문항 ≤7, SC-01 분할 | 일치 | S-14 |
| R-9 | 3.3 하단 고정 이전/다음 | **불일치** | #5 |
| R-10 | 3.3 오류 필드 아래 + 첫 오류 포커스 | **불일치** | 필드 아래 `role="alert"`는 맞다. 포커스 → #6 |
| R-11 | 3.3 `<label>` + "(필수)" | 일치 | `FormField`, 확인 체크박스(`wizard-steps-a.tsx:470`), 동의 행 "(필수)/(선택)"(`wizard-steps-b.tsx:663`) |
| R-12 | 3.5 필수 고정 문구 | 일치 | "구직자 이용료 없음", 공개 배지 2문장, NOTICE "기업과의 연락은 비자앤잡을 통해서만 진행"(`step7` 라벨, 완료 화면 NoticeBox) |
| R-13 | 1.1 용어·브랜드 표기(Q-07) | **불일치** | 용어(구직자·기업·간편 등록·동의 철회·추천 코드)는 맞다. 영문 브랜드 → #7 |
| R-14 | 2.4 위저드 폭 576px | **불일치** | #8 |
| R-15 | 3.7 구직자 화면 H1 `text-h1` | **불일치** | #9 |
| R-16 | 3.6 키 규칙·알림 템플릿 키 | 일치 | S-30. `common.profileCompletion.sms`(`tasks.ts:69,91`) |
| R-17 | 4.5 rbac 첫 문장 | 일치(B-7) | S-40 |
| R-18 | 4.6 `step{0..7}.ts` + 하위 화면 `pick` | 일치 | `schemas/seeker/register/step0~7.ts`, `fields.ts`(공용 조각) |
| R-19 | 4.7 `*Enc`/`*Hash` | 일치 | S-43 |
| R-20 | 4.8 `CONSENT_REVOKE` | 일치 | S-46 |
| R-21 | 4.9 등록 가능 = `VisaType.registrable`만 | 일치 | `reference.ts` `registrable: row.registrable`, 화면 차단 `page.tsx:142` `track.registrable` |
| R-22 | SC-03 분모 7 | 일치 | S-12 |
| R-23 | SC-10 shiftOk enum | 일치 | S-15 |
| R-24 | Q-09 긴 목록 native-select | 일치 | 국적 37개, 시·도 17개, 시·군·구, 경력 업종·직무, 출생·입국 연도, 다음 비자가 `NativeSelect`다. 희망 업종(21)·지역(18) 다중 선택은 3.1 checkbox "다중 선택 칩"으로 맞다 |
| R-25 | 2.3.4/3.1 위저드 질문 라벨 `text-h3` | 일치 | `FormField labelSize="question"` → `text-h3 text-navy`(해석 4) |

## 5. 기준 개정 (STANDARD v2.7로 반영함 — 오케스트레이터 지시, Q-10)

아래는 모두 v2.7에 반영됐다. B-5는 Q-10에 따라 `pendingApplication`을 포함했다. 추가로 블러 토큰 `--blur-nav`를 신설하고 2.4 임의값 허용 목록에서 `backdrop-blur-[22px]`를 지웠다. 다중 선택 칩 `<button>` 예외(3.1)와 dialog 블러 토큰도 명시했다.

| 번호 | 위치 | 제안 | 이유 / 산출물 영향 |
|---|---|---|---|
| B-1 | 3.3 문항 수 | "문항 1개 = WO §7.3 표의 한 행. `sido/sigungu`, `messengerType/messengerId`처럼 한 행의 종속 입력은 1개. 반복 그룹(`experiences[]`)은 1개, 표에 따로 적힌 하위 행(`employerName`)은 별도 1개." | 해석 1. 산출물 변경 없음 |
| B-2 | S-16 / 3.2 VisaLabel | "네이티브 `<option>`은 컴포넌트를 담을 수 없으므로 `{code} {t(nameKey)}` 문자열(VisaLabel과 같은 내용)을 허용한다. 선택 후 값 표시가 있으면 VisaLabel." | 해석 2. 선례 `visa-check-form.tsx:91`. 변경 없음 |
| B-3 | 3.2 VisaLabel / 3.5 | "체류자격 코드가 아닌 `VisaType` 행(OTHER·NONE·UNKNOWN)은 코드 없이 이름만 표시한다." | **현재 화면에 내부 코드가 노출된다**: `wizard-steps-a.tsx:308`, `quick-register-form.tsx:137` 옵션 "UNKNOWN 모름", "OTHER 그 밖의 비자", "NONE 비자 없음", 선택 후 VisaLabel 칩 "UNKNOWN". 승인되면 옵션·VisaLabel 분기를 수정해야 한다. 판별은 하드코딩 목록이 아니라 데이터 플래그(예: `VisaType` 행 속성)로 해야 한다(4.9-1). |
| B-4 | S-16 | "세부 유형(`VisaType.subTypes`)은 쉬운 이름 키가 없으므로 코드만 표시를 허용한다. 상위 비자 VisaLabel을 바로 위에 함께 보인다. 세부 유형 설명은 법령 내용이라 임의로 쓰지 않는다(BR-12)." | Step 2 칩 "E-7-1"…(`wizard-steps-a.tsx:342`), Step 6 목표 옵션은 상위 이름 병기. 변경 없음 |
| B-5 | 3.3·S-15 "모름" | 적용 대상 열거: **'모름' 있음** = `visaSubType`, `entryYear`, `pendingApplication`(제안), `shiftOk`, `desiredPayMin`, `nextVisaGoal`. **없음** = 필수 선택 문항, `hasArc`·`needDormitory`(예/아니오), `groupApply`·`wantsConsult`(본인 의사), `birthYear`(미선택 = 무응답), `messengerType`("없음"), 다중 선택(빈 선택 = 무응답), 성별(`NO_ANSWER`) | 해석 3. 승인되면 `pendingApplication`에 `UNKNOWN` 칩 추가(`step2.ts` enum, `wizard-steps-a.tsx:442`, 6개 로케일은 `common.unknown` 재사용). **오케스트레이터 결정 필요** |
| B-6 | S-24 | "예외: 구직자 본인 추천 링크 공유(PC-9) — Web Share·링크 복사·WhatsApp/Telegram/Viber 공유 URL. `components/seeker/referral-share.tsx` 한 곳, 공유 문구는 추천 링크만 담고 연락처 없음." | 변경 없음 |
| B-7 | 4.5 | "`requireSeeker()`(`src/lib/seeker/session.ts`, 내부 `assertCan(…,'seeker:selfService')`)도 첫 문장 검사로 본다." | v2.5 `requireStaff`와 같은 형태. 변경 없음 |
| B-8 | 4.2 트리 | `lib/seeker/`(account·consent·options·overview·reference·referral·saveStep·session·tasks·wizardValues), `lib/candidates/eligible.ts`(BR-06·07 쿼리 계층), `schemas/seeker/register/fields.ts`(공용 조각) | 변경 없음 |
| B-9 | 2.4 vs 3.1 | 2.4 "위저드 문항 간 24px"를 "3.1 form 간격(22px)과 같음"으로 고친다 | 기준 내부 충돌. 현행 22px 유지 |
| B-10 | 3.6 참조 데이터 키 | "시·군·구(`Region` SIGUNGU, PC-6 초안)는 번역 키 없이 `nameKo`를 모든 로케일에 표시한다(고유명사). 번역 키는 검수 후 도입." | `wizard-steps-a.tsx:167` 한국어 이름이 en 등에도 나온다. 변경 없음 |
| B-11 | 3.1 사용 금지(calendar) | "WO가 '날짜'로 정한 문항(`availableFrom`)은 네이티브 `<input type="date">`를 허용한다. shadcn calendar는 계속 금지." | `wizard-steps-b.tsx:303`. 변경 없음 |
| B-12 | 2.5 / 3.1 radio 칩 | 칩 선택 그림자(HO `0 8px 18px -10px rgba(11,27,63,.6)`)는 2.5 목록에 없으므로 `shadow-ink`로 대신하는 것을 명시한다(또는 `shadow-chip` 토큰 추가). | `radio-group.tsx:45-46`. 변경 없음 |

## 6. 관찰 (불일치 아님, 권장)

1. 스크린샷 step5a "어디든 가능", step5b shiftOk "모름" 칩, step7 NOTICE 체크박스가 회색에 글자가 거의 보이지 않는다. 클릭 직후 200ms 전환 중에 찍힌 것으로 보인다. 선택 상태(navy/흰 글자) 대비는 QA가 정지 상태에서 확인할 것.
2. `referral-share.tsx:51` 추천 코드가 `font-mono`(Tailwind 기본 시스템 고정폭)다. 2.3의 글꼴 체계 밖이다. `tabular-nums` + 자간으로 충분하므로 `font-mono`를 빼기를 권장한다.
3. `messages/ko.json` `seeker.register.step3.graduationDate.help` "유학생(D-2·D-10)은 꼭 입력해 주세요."는 비자 코드를 문구에 적었다. 그래서 `VisaType.requiresGraduationDate` 데이터와 중복된다(4.9 취지). 필수일 때만 "(필수)"가 붙으므로(`required={reference.requiresGraduationDate}`) 코드 없는 문구로 바꾸기를 권장한다.
4. `register/page.tsx:215`는 하위 화면 제목을 `` `${stepName} (${…})` ``로 이어 붙인다. zh 전각 괄호 등 로케일별 문장 부호를 위해 ICU 키(`"{title} ({current}/{total})"`)를 권장한다.
5. 간편 등록 제목·설명 "1분 간편 등록", "1분 만에 등록합니다"는 실적 숫자는 아니다(PC-7 대상 밖). 다만 소요 시간 약속이므로 운영자 확인을 권장한다.
6. 칩의 데스크톱 높이 `lg:h-8.5`(34px)는 S-08(<1025px) 범위 밖이라 판정하지 않았다. B-10 보정안의 "≥1025px에서는 패딩으로 44px 확보"는 칩에 적용되지 않았다. 기존 tabs와 같은 상태다.
7. `tests/unit/schemas/seeker/register/stepKeys.test.ts`는 src의 한 파일을 그대로 비추지 않는다(여러 step 스키마 대상, R-106 체크리스트). 4.10 미러 규칙의 묶음 테스트 예외로 보고 허용했다.
8. WizardProgress `md:top-19`(76px)는 내비가 스크롤 뒤 66px로 줄면(>760px) 사이에 10px 틈이 생길 수 있다. QA가 데스크톱 스크롤 상태를 확인할 것.
