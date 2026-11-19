# Phase P1c — 기준 일치 재검토 (run 3, 최종, 정적 검토)

- 대상 커밋: `601992f`(`git show 601992f`, 16개 파일).
- 기준: `.workflow/STANDARD.md` v2.7 → 이번 검토에서 **v2.8**로 갱신. `.workflow/qa/phase-P1c-standard-run-2.md` 4절 R2-1~R2-3. CLAUDE.md.
- 검토자: wf-standard(모드 B), 2026-11-16.
- 실행한 확인
  - `qa:static`: 오류 0, 경고 17. run 2와 같은 기존 경고이고 새 경고는 없다.
  - `i18n:check`: 6개 로케일 오류 0, ko 키 792개.
  - 생성 CSS 확인: 빌더가 남긴 `.next/static/css/40e286d5d3a70448.css`를 **읽기만** 했다. 다음 세 가지를 확인했다.
    - `.data-[state=open]:slide-in-from-bottom-dialog[data-state=open]{--tw-enter-translate-y:var(--translate-dialog)}`
    - `@layer theme`의 `--translate-dialog:18px`
    - `:root:has([data-sticky-bottom-bar]){scroll-padding-bottom:var(--spacing-wizard-bar)}`와 `--spacing-wizard-bar:96px`
  - 스크린샷(375px): `p1c_r3_step2_blocked.png`, `p1c_r3_visa_check_unknown.png`.
  - build·test·e2e·dev·start·lint·typecheck는 **실행하지 않았다**. `.next`에는 쓰지 않았다.

## 1. 결과 요약

- run 2 수정 지시 **해소 3 / 3**(R2-1, R2-2, R2-3).
- 새 불일치 **0건**.
- run 2 관찰 1·2·3도 처리됐다.
  - 관찰 1: Step 2 등록 불가 비자에서 버튼 라벨이 "저장 중…"으로 바뀌던 문제가 고쳐졌다.
  - 관찰 2: 간편 등록 ConsentRow에 ref가 연결됐다.
  - 관찰 3: Step 0을 sticky 바 대상에서 빼는 규칙을 v2.8에 적었다.
- 범위 밖 변경(O-8 KST 월 경계 `classifyTrack.ts`, E2E 보조 함수)에도 기준 불일치가 없다.
- **P1c 전체 기준 일치: 68 / 68.** run 1 점검표 43항목과 3·4·5절 규칙 25항목을 합친 수다. run 1에서 판정 대상이 된 S-15(v2.7 이후)와 S-16 ②(N-1)도 이 안에 들어 있다.

## 2. 수정 지시별 판정

| # | 판정 | 근거 |
|---|---|---|
| R2-1 | 해소 | `globals.css:233-234` `@theme`에 `--translate-dialog: 18px`를 넣었다. `dialog.tsx:33`은 `data-[state=open]:slide-in-from-bottom-dialog`이다. 생성 CSS에서 해당 규칙이 `--tw-enter-translate-y: var(--translate-dialog)`(18px, 아래에서 올라옴)로 나오는 것을 확인했다. `zoom-in-98`·`duration-500`·`ease-out`은 그대로다. 임의값은 없다. 3.1 dialog의 진입 `translateY(18px) scale(.98)`→0 0.5s와 일치한다. |
| R2-2 | 해소 | `wizard-steps-a.tsx:468` visaConfirm `Checkbox ref={field.ref}`. `wizard-steps-b.tsx:657`에 `ref?: Ref<HTMLButtonElement>` prop을 추가했고, 이를 `:668` 내부 `Checkbox`에 연결한다. `:730` Step 7 호출부는 `ref={f.ref}`를 넘긴다. 간편 등록 `quick-register-form.tsx:92`도 `ref={f.ref}`다. React 19이고 `Checkbox`는 props를 Radix Root에 펼쳐 넘기므로 ref가 button에 닿는다. E2E `wizard-focus.spec.ts`는 Step 7과 Step 2에서 `toBeFocused()`를 확인한다. 실행 결과는 QA 소관이다. |
| R2-3 | 해소 | `referenceData.ts:22` select에 `isStatusCode`를 넣었다. `visa-check/page.tsx:54-59`는 이 값을 넘긴다. `visa-check-form.tsx:98` 옵션은 `isStatusCode ? "{code} {label}" : label`이고, 홈 위젯 박스 `:81`은 코드 span을 조건부로 그린다. `evaluateVisa.ts:47`은 결과에 `isStatusCode`를 담는다. `outcome-card.tsx:64`는 `showCode={visa.isStatusCode}`다. `src/`에 비자 코드 리터럴 목록은 0건이다. `"OTHER"`·`"NONE"` 매치는 국가·언어·메신저·인증 상태 값이고 VisaType이 아니다. 따라서 4.9를 지킨다. 스크린샷 `visa_check_unknown`: select에 "모름"이 보이고, 결과 카드 비자 줄에도 코드 칩 없이 "모름"만 보인다. 이로써 VisaLabel을 쓰는 곳 4곳(`seeker/me/page.tsx:63`, `quick-register-form.tsx:146`, `wizard-steps-a.tsx:319`, `outcome-card.tsx:64`)이 모두 `showCode`를 넘긴다. |

## 3. 그 밖의 변경 점검

| 항목 | 판정 | 근거 |
|---|---|---|
| D-2 sticky 바 포커스 가림 | 일치(v2.8 3.3) | 3.3 기준에 해당한다. `wizard-shell.tsx:119` `data-sticky-bottom-bar=""`, `globals.css:315-317` `@layer base`에서 `:root:has(...)`가 `scroll-padding-bottom: var(--spacing-wizard-bar)`를 준다. 토큰은 `globals.css:245`의 96px이다. 이 토큰은 기준서에 없었으므로 v2.8 2.2.2에 추가했다. |
| WizardNav `disabled` prop | 일치 | `wizard-shell.tsx:86,94,134` `disabled={pending \|\| disabled}`. 라벨은 `pending`일 때만 "저장 중…"이다. Step 2는 `pending={pending} disabled={blocked}`(`wizard-steps-a.tsx:495`)를 넘긴다. 스크린샷 `step2_blocked`: 비활성 버튼 라벨이 "저장하고 다음"이다. |
| S-05·S-06 임의값·`text-xs` | 일치 | 변경 파일에 대괄호 임의값과 `text-xs`가 0건이다. |
| S-50 테스트 위치 | 일치 | `tests/unit/lib/visa-engine/classifyTrack.test.ts`는 미러 경로다. `tests/e2e/wizard-focus.spec.ts`와 `tests/e2e/support/seekerDb.ts`는 4.10 위치다. |
| S-53 운영 수치 | 일치 | `SERVICE_TIME_ZONE = "Asia/Seoul"`(`classifyTrack.ts:66`)은 운영자가 바꾸는 정책 값이 아니다. 서비스 기준 시간대 상수다. 사용처가 한 곳이라 모듈 상수로 충분하다. |
| 6개 언어 키 | 일치 | 새 문구 키는 없다. `i18n:check` 오류 0. |

## 4. 새 불일치

없음.

## 5. STANDARD v2.8 갱신 내용

- 2.2.2 토큰 표에 두 줄을 추가했다.
  - `--translate-dialog` 18px: 3.1 dialog 진입, `slide-in-from-bottom-dialog`.
  - `--spacing-wizard-bar` 96px([제안]): sticky 하단 바 화면의 `scroll-padding-bottom`.
- 3.1 dialog 행에 진입 구현 유틸을 적었다(`slide-in-from-bottom-dialog zoom-in-98 duration-500 ease-out`).
- 3.3 위저드 항목에 하위 규칙 2개를 추가했다.
  - 하단 고정 대상은 Step 1~7이고, **Step 0은 제외**한다.
  - sticky 바 화면에는 `scroll-padding-bottom`을 주고, 첫 오류 포커스에 필수 체크박스도 포함한다(`field.ref` 연결).
- 개정 이력에 2.8 행을 추가하고 머리말 버전을 2.8로 바꿨다. 산출물 기준은 바뀌지 않았다. 이번 커밋에 이미 들어간 값을 기준서에 옮겨 적었을 뿐이다.

## 6. 관찰 (불일치 아님)

1. `:root:has()`는 2023년 이후 주요 브라우저가 지원한다. 지원하지 않는 브라우저에서는 scroll-padding만 빠지고 기능은 그대로 동작한다.
2. `--spacing-wizard-bar`는 `@theme`의 spacing 이름공간에 있다. 그래서 `p-wizard-bar` 같은 유틸도 만들어질 수 있다. 기준(2.2.2)은 변수로만 참조하도록 적었다.
