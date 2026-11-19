# Phase P1e 기준 일치 검토 — run 3 (최종, 정적)

- 대상: 커밋 `7380403` (`git show 7380403`, 23파일)
- 기준: STANDARD v2.11 (이번 검토에서 v2.12로 3.3에 한 줄 보완, 아래 4절), DECISIONS Q-16, run 2 보고서 F-1
- 방법: 커밋 diff, 변경 파일 열람(`site-nav.tsx`, `button.tsx`, `server/actions/admin/leads.ts`, `lib/admin/leadDesk.ts`, `lib/leads/transitions.ts`, `_i18n/ko.ts`, 테스트 파일), 추가 줄 rg 검사(하드코딩 색·임의값 `-[`·`text-xs`·`any`·`console`·`outline-none`·S-08 `lg:(min-)?h-(8|8.5|9|9.5|10|10.5)`·`toLocaleString` — 0건), 스크린샷 `p1e_r3_header_1280.png`·`p1e_r3_home_1280.png`·`p1e_r3_dashboard_1280.png`, 측정 `p1e_r3_measure.txt`. build·test·e2e·dev·start 미실행, `.next` 미사용(QA 동시 사용).

## 1. run 2 불일치 해소 여부

| ID | 판정 | 근거 |
|---|---|---|
| F-1 | **해소** | `tests/unit/app/admin/koFormat.test.ts` 삭제, `tests/unit/app/admin/_i18n/ko.test.ts`로 이동(4.10 미러 위치). 파일 머리 주석과 `it` 이름에 `R-118`·`R-121` 태그(`R-121 / E-1`, `R-118 / R-121 / E-5`, `R-118 / R-121 / QA O-4`) |

## 2. 새 변경 판정

### 2.1 site-nav 밑줄 span 구조 (`src/components/common/site-nav.tsx:107-128`)

- 링크 상자: `inline-flex min-h-11 min-w-11 items-center justify-center` — 측정 1280px 구직자 44×44, 기업 44×44, 비자 진단 53×44, 회사 소개 53×44, 수수료 44×44. 3.3(44×44) 일치.
- 밑줄: 라벨을 감싼 `<span class="relative">` 안의 `absolute inset-x-0 -bottom-px h-0.375 origin-left bg-current … duration-400 ease-out`. 폭 = 라벨 폭(상자 폭이 아님), 두께 1.5px, 왼쪽부터 0.4s, 현재 페이지 `scale-x-100`·hover `group-hover:scale-x-100`, `aria-current="page"` + `font-semibold` 유지. 위치는 이전 `bottom-2.5`(44px 상자 바닥에서 10px = 글자 줄 상자 바로 아래)와 사실상 같은 높이(글자 줄 상자 1px 아래). 3.2 SiteNav "hover 1.5px 밑줄이 왼쪽부터 0.4s, 현재 페이지 600 + 밑줄"과 일치.
- `relative`를 링크에서 안쪽 span으로 옮긴 것은 밑줄 기준 상자만 바꾸며, 포커스 outline(2.8 전역 `:focus-visible`)은 여전히 링크 상자에 그려진다.
- 간격: `ul` `gap-5 xl:gap-6.5`(26px)는 그대로이며 **상자 사이** 간격이다. 짧은 라벨(구직자·기업·수수료)은 상자가 44px로 넓어져 글자 사이 간격이 26px보다 넓어 보인다(스크린샷에서 "구직자–기업" 간격이 "비자 진단–회사 소개"보다 넓음). Q-16(폭 포함 44px)이 우선하는 결과이므로 위반으로 보지 않고, 기준 문언에 해석을 v2.12로 명시했다(4절).
- 판정: **일치.** 헤더 높이·로고·언어 알약·CTA 배치에 변화 없음(스크린샷 확인).

### 2.2 Button 기본 `min-w-11` (`src/components/ui/button.tsx:13`)

- `sm`은 `px-4`, `default`·`lg`는 더 넓어 글자가 있는 버튼은 원래 44px 이상이다. 영향받는 것은 글자가 짧은 `ghost`(`px-1.5`)와 아이콘 버튼뿐이고, 아이콘 버튼은 이미 `w-11`/`size-11`. `<Button>`에 44px보다 작은 `w-*`/`size-*`·`min-w-0` 지정 0건(rg). `justify-center`라 짧은 ghost 라벨은 44px 상자 가운데에 놓인다 — 3.1 button 규칙(높이·패딩·variant)과 충돌 없음.
- 높이 규칙(sm 44 / default 52 / lg 60)과 `rounded-full`·그림자·누름 효과 변화 없음. 주석이 Q-16을 인용.
- 판정: **일치.** 홈 1280 스크린샷의 히어로 CTA·헤더 CTA·언어 알약 레이아웃 변화 없음.

### 2.3 텍스트 링크 `min-w-11` (푸터·홈·visa-check·employer login/signup·관리자 목록/상세)

- 모두 기존 `inline-flex min-h-11 items-center`에 `min-w-11`만 추가. 시각 요소(글자·화살표·밑줄 `underline-offset-4`)는 글자 폭 그대로. 측정 결과 전부 44 이상(수수료 44×44, 이용약관 48×44 등). 3.3·Q-15·Q-16 **일치.**
- 대시보드 "리드 검증" 링크(`src/app/admin/(staff)/page.tsx:100`): `inline-flex min-h-11 min-w-11 items-center` — 측정 53.5×44. 스크린샷에서 알약 안 배치 유지. **일치.**

### 2.4 `refuseInvalidTransition` (`src/server/actions/admin/leads.ts:29-38`)과 4.5 / H-1

- `recordCallAction`·`verifyLeadAction` 안쪽 함수의 첫 문장 `const actor = await requireStaff()`, 둘째 `assertCan(actor, "lead:manage")` 그대로. `refuseInvalidTransition`은 권한 검사·입력 검증·`CONFIRM_REQUIRED` 검사 **뒤**에 도메인 호출만 감싼다 — 권한 검사보다 앞서 실행되는 문장 없음(4.5).
- 액션 래퍼(`adminAction`)는 바뀌지 않았다(4.5 v2.11 H-1 조건 유지: `AuthzError`만 변환). 새 헬퍼는 래퍼가 아니라 본문 안 보조 함수이며 `LeadTransitionError`만 `{ ok: false, code: "INVALID_TRANSITION" }`로 바꾸고 그 밖의 예외(`AuthzError`·redirect·DB 오류)는 다시 던진다 — H-1의 "다른 예외를 삼키지 않는다" 취지와 같음. 래퍼에 넣지 않고 본문에 둔 것은 H-1 문언("래퍼는 `AuthzError` 변환만")에 맞는 배치.
- 롤백: `recordLeadCall`은 `$transaction` 안에서 `transitionLead`가 던지는 `LeadTransitionError`를 `.catch`에서 `LeadConflict`가 아니므로 다시 던진다 → CallLog·감사 행 롤백 후 액션에서 코드로 응답. 단위 테스트 `tests/unit/server/actions/admin/leads.test.ts`("no CallLog, no audit, grade kept")가 이를 다룸(실행은 QA).
- 오류 문구: `ko.ts` `ERROR_TEXT.INVALID_TRANSITION`(3.6 관리자 한국어 상수, 3.5 문체 — 다른 오류 문구와 같은 "~합니다/~해 주세요").
- 판정: **일치.**

### 2.5 전이표 Q-16 (`src/lib/leads/transitions.ts:47`)

- `ARCHIVED: ["C", "B", "DO_NOT_CONTACT"]`, `DO_NOT_CONTACT: []` 유지. 머리 주석에 Q-16 근거. Q-16 "모든 등급 → DO_NOT_CONTACT 허용, 나가는 전이 금지"와 일치. 재수집 규칙(R-115, DNC 유지)은 바뀌지 않음.
- 판정: **일치.**

### 2.6 O-4 객체 값 요약 (`src/app/admin/_i18n/ko.ts` `requestValue`)

- 객체 값은 키·JSON 없이 "(세부 항목 n개)"(`countFmt` `Intl` 상수 + "개"). 3.6·R-118 일치. "개"는 3.5 v2.11 H-3 예시(명·건·일)에 없지만 같은 "한국어 수 단위 글자"이고 금지 대상(`toLocaleString`, `+ "원"`)이 아니다. 예시 목록이 열거가 아니라 예이므로 **일치**로 판정.

### 2.7 새 테스트 위치·태그 (4.10)

`tests/unit/lib/leads/transitions.test.ts`, `tests/unit/lib/admin/leadDesk.test.ts`, `tests/unit/server/actions/admin/leads.test.ts`(모두 src 미러), `tests/e2e/admin-core.spec.ts`(기존 파일), 태그 `R-121 / Q-16`·`R-115`. **일치.**

## 3. 항목별 집계

| # | 기준 | 판정 |
|---|---|---|
| 1~48, 50, 51 | run 2 일치 항목 | 일치(이번 커밋이 기준을 바꾸지 않음. #36·#46은 폭까지 보강) |
| 49 | 4.10 테스트 위치·태그 | 일치(F-1 해소) |
| 52 | Q-16 전이표 ARCHIVED → DNC | 일치(2.5) |
| 53 | 4.5 / H-1 — `refuseInvalidTransition` | 일치(2.4) |
| 54 | 3.6 오류 문구 `INVALID_TRANSITION` | 일치(2.4) |
| 55 | 3.2 SiteNav 밑줄·간격 + 3.3 폭 | 일치(2.1, v2.12 해석 명시) |
| 56 | 3.1 / 3.3 Button `min-w-11` | 일치(2.2) |
| 57 | 3.3 텍스트 링크 폭(푸터·홈·공개·기업) | 일치(2.3) |
| 58 | 3.3 대시보드 리드 검증 링크 | 일치(2.3) |
| 59 | 3.6 / 3.5 O-4 객체 요약 | 일치(2.6) |
| 60 | 4.10 새 테스트 위치·태그 | 일치(2.7) |

**집계: 60항목 중 일치 60, 불일치 0, 기준 보완 필요 0.**

## 4. 기준 보완 (반영함, STANDARD v2.12)

3.3 "터치 타깃 44×44" 문언은 폭 포함 여부와 텍스트 링크 포함 여부가 Q-15·Q-16(DECISIONS)에만 있고 3.3 자체엔 명확하지 않았다. 3.3에 한 줄 추가하고 개정 이력에 v2.12 기재:

> [v2.12, Q-16] 44×44는 **폭 포함**이며 대상에 텍스트 링크(헤더 내비·본문·푸터 링크)도 들어간다. 폭은 `min-w-11`(Button은 기본 클래스)로 상자에만 주고, 글자·밑줄 같은 시각 요소는 글자 폭을 유지한다. 그 결과 짧은 라벨 사이의 글자 간격이 핸드오프 간격(예: SiteNav 26px — 상자 사이 간격으로 적용)보다 넓어지는 것은 허용한다.

산출물 판정 변화 없음.

## 5. 참고 (판정 외)

- 헤더 내비의 짧은 라벨 간격이 고르지 않게 보이는 것(2.1)은 기준상 허용이다. 디자인상 고르게 하려면 상자 사이 gap을 줄이는 방법이 있으나 선택 사항이며 지시하지 않는다.
- "개"(2.6)처럼 H-3 예시 밖 단위 글자가 더 늘면 3.5 예시에 "개"를 추가하는 것을 다음 개정 때 고려.
