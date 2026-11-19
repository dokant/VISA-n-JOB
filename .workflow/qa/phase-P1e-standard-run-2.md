# Phase P1e 기준 일치 검토 — run 2 (정적)

- 대상: 커밋 `e52a176` (`git show e52a176`, 22파일)
- 기준: STANDARD v2.10, DECISIONS Q-14·Q-15, run 1 보고서(`qa/phase-P1e-standard-run-1.md`) 수정 지시 E-1~E-5
- 방법: 커밋 diff와 변경 파일 열람, `scripts/qa-static.ts`·`scripts/lib/qa-rules.ts` 열람, rg 검사(S-08 `lg:(min-)?h-(8|8.5|9|9.5|10|10.5)` + `lg:min-h-0` 0건, S-32 `toLocaleString|+ "원"` 0건, 추가 줄의 하드코딩 색·임의값·`text-xs`·`any`·`console`·`outline-none`·`z.object(` 0건, S-23 금지어는 "상시근로자 수" 1건(아래 #50)), `messages/ko.json` 구인 의뢰 라벨 대조, 스크린샷 `p1e_r2_*.png` 확인. build·test·e2e·dev·start 미실행, `.next` 미사용(QA 동시 사용).
- 판정: 일치 / 불일치 / 기준 보완 필요

## 1. run 1 수정 지시 해소 여부

| ID | 판정 | 근거 |
|---|---|---|
| E-1 | **해소** | `src/app/admin/_i18n/ko.ts` `wonFmt = new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 })` 모듈 상수, `fmtWon`은 `wonFmt.format(n)`. 3.5·S-32 v2.10 관리자 예외(`ko-KR` 고정 `Intl` 상수 허용)와 일치. `rg "toLocaleString\|+ \"원\"" src` 0건 |
| E-2 | **해소** | `ko.ts` `LEAD_COLUMN_TITLE` C/B/A = "리드 등급 C/B/A", 보관·재접촉금지는 그대로(지시대로). `leads/page.tsx:96` 열 `<h2>`가 이 상수 사용 |
| E-3 | **해소** | `leadDesk.ts` `gradeAfterCall`: NO_INTENT·DNC → `DO_NOT_CONTACT`, 감사 사유 `CALL_NO_INTENT`(`transitions.ts` 유니온에 추가). 라벨 "고용 의사 없음 (재접촉금지로 이동)". `lead-call-form.tsx`가 `FINAL_CALL_OUTCOMES`(NO_INTENT·DNC) 제출 전 3.1 dialog(`CALL_FINAL_CONFIRM`) 표시, 확인 시 `confirmFinal=yes`. 서버도 확인 없으면 `CONFIRM_REQUIRED` 거부. DO_NOT_CONTACT로 가면 `nextActionAt=null`. Q-14와 일치. 스크린샷 `p1e_r2_admin_confirm_1280.png`에 다이얼로그 확인(캡처가 페이드 중이라 반투명 — 기준 판정과 무관) |
| E-4 | **해소** | `button.tsx` `sm` `lg:h-10.5` 삭제(모든 폭 `h-11`)·주석 갱신, `radio-group.tsx` `lg:h-8.5`, `tabs.tsx` `lg:h-9.5`, `locale-switcher.tsx` `lg:h-9.5`, `site-footer.tsx` 언어 바로가기 `lg:h-8.5` 삭제. Q-15에 따라 푸터 목록형 텍스트 링크 `min-h-8`→`min-h-11`. S-08 rg 0건 |
| E-5 | **해소** | `leads/[id]/page.tsx`가 `requestRows`(ko.ts) 사용. 필드 키 → 한국어 라벨, enum → 한국어 선택지(`messages/ko.json` `employer.request.*` 라벨·선택지와 글자 그대로 일치), 원화 `fmtWon`, 인원 `countFmt` + "명", 모르는 키는 키를 숨기고 "기타 항목"으로 묶음, 객체 값은 JSON 출력 안 함. 3.6·R-118과 일치 |

**해소 5/5.**

## 2. 빌더 확인 요청 판정

### 2.1 `adminAction` 래퍼와 4.5 "첫 문장 권한 검사"

- 형태: `export const x = adminAction(async function x(_prev, fd) { const actor = await requireStaff(); assertCan(actor, "…"); … })` — 관리자 서버 액션 9개 모두(`server/actions/admin/leads.ts` 3개, `seekers.ts` 6개). 안쪽 함수의 첫 문장 `requireStaff()`, 다음 문장 `assertCan`(9개 모두 확인).
- 래퍼(`src/lib/admin/actionGuard.ts`)는 `try { return await body(...args) } catch (e) { if (e instanceof AuthzError) return { ok:false, code:e.code }; throw e }`뿐이다. 본문 앞에 실행되는 문장(입력 해석·DB·로그)이 없고, `AuthzError` 외 예외(redirect 포함)는 그대로 던진다. 즉 요청이 들어와 실행되는 첫 의미 있는 문장은 여전히 `requireStaff()`이고, 거부 시 본문이 검사 뒤로 진행하지 않으므로 데이터 변경·감사 행이 없다.
- **판정: 일치.** 4.5의 목적(권한 검사보다 앞서 실행되는 로직 없음)을 지킨다. 다만 4.5 문언("첫 실행 문장")은 래퍼를 예상하지 않았으므로 아래 H-1로 명문화를 제안한다.
- **qa:static**: `scripts/lib/qa-rules.ts`에 rbac 첫 문장 검사가 **아예 없다**(규칙 ID는 BR-13/BR-01/BR-09/BR-12/WO13/S-10/S-02/S-06/S-03/S-36/S-23/S-45, 구조 검사는 SAMPLE 헤더뿐). S-40은 원래 "전수 열람"(수동) 항목이므로 래퍼 형태가 자동 검사를 깨뜨리는 일은 없다. 반대로 말하면 이 형태든 기존 `export async function` 형태든 자동으로 잡히지 않는다 → H-2(선택) 제안.

### 2.2 지시 밖 변경

| 변경 | 판정 | 근거 |
|---|---|---|
| 서버 `CONFIRM_REQUIRED` 거부 (`server/actions/admin/leads.ts`, `schemas/admin/leads.ts` `confirmFinal: z.enum(["", "yes"])`) | 일치 | Q-14 "확인 다이얼로그 필수"를 서버에서도 강제(화면 우회 방지). zod는 `src/schemas/**`(4.6), 검사는 rbac 두 문장 뒤(4.5), 오류 문구는 `ko.ts` `ERROR_TEXT`(3.6). `FINAL_CALL_OUTCOMES`·`isFinalCallOutcome`를 클라이언트·서버가 같은 import(4.6 취지) |
| dropdown-menu 행 `lg:min-h-0` 삭제 (Item·CheckboxItem·RadioItem·SubTrigger) | 일치 | 3.3 v2.10 "선택 행 모든 폭 44px, `lg:…`로 줄이지 않는다", S-08. 주석도 갱신 |
| 헤더 로고 링크 `flex min-h-11 items-center` (`site-nav.tsx:96`), 푸터 로고 링크 동일(`site-footer.tsx`), 푸터 전화·이메일 링크 `inline-flex min-h-11 items-center` | 일치 | 3.3 v2.10·Q-15(터치 대상 링크 44px). 시각 크기 변화 없이 높이만 확보(`p1e_r2_footer_1280/375.png`에서 레이아웃 깨짐 없음) |
| 푸터 목록 `gap-1` 제거, 하단 링크 `gap-y-1` 제거 | 일치 | 각 링크가 이미 44px 이상이라 간격 0이어도 타깃 크기 충족. 2.4 간격 규칙에 목록 간격 고정값 없음(임의값 아님). 행 간격은 `min-h-11` 안쪽 여백으로 시각상 run 1보다 넓어짐 — 기준 위반 아님 |

참고(판정 외): `p1e_r2_footer_375.png`에 "본문으로 바로가기"와 고정 헤더가 푸터 위에 겹쳐 찍힘 — 전체 페이지 캡처의 sticky·포커스 상태로 보이며 기준 판정 대상 아님. QA가 필요하면 확인.

### 2.3 모바일 햄버거 메뉴(sheet) 링크 높이 — 코드 판정

`src/components/common/site-nav.tsx:152-201`

| 요소 | 클래스 | 높이(코드상) | 판정 |
|---|---|---|---|
| 메뉴 열기(`nav-burger`) | Button `size="sm"` `w-11` | `h-11` 44×44 | 일치 |
| 메뉴 닫기 | Button `size="sm"` `w-11` | 44×44 | 일치 |
| 메뉴 항목 링크 | `flex min-h-11 items-center … py-4.5 text-h3` | 하한 44px, 실제는 위아래 18px + `text-h3` 줄 높이로 44px 초과 | 일치 |
| 하단 CTA·전화 | Button 기본 크기 `w-full` | `h-13` 52px | 일치 |

**판정: 일치(44px 이상).**

## 3. 항목별 판정 (run 1의 42항목 + run 2 추가)

run 1 일치 37항목(#1~#10, #12~#31, #33~#35, #37~#40)은 이번 커밋이 해당 영역을 바꾸지 않았거나 바꾼 부분이 기준을 유지함 — 그대로 일치. 불일치 5항목은 1절대로 해소.

| # | 기준 | 판정 | 근거 |
|---|---|---|---|
| 11 | S-32 | 일치 | E-1 해소 |
| 32 | 1.1 리드 등급 구분 | 일치 | E-2 해소 |
| 36 | 3.3 / S-08 터치 44px | 일치 | E-4 해소, rg 0건, dropdown 행 포함 |
| 41 | R-121 / Q-14 | 일치 | E-3 해소 |
| 42 | 3.6 / R-118 | 일치 | E-5 해소 |
| 43 | 4.5 / S-40 첫 문장 rbac (래퍼 형태) | 일치(기준 보완 제안 H-1) | 2.1절 |
| 44 | Q-14 서버 확인 강제, 4.6 | 일치 | 2.2절 |
| 45 | 3.3 dropdown 행 | 일치 | 2.2절 |
| 46 | 3.3 헤더·푸터 로고·전화·이메일·목록 링크 | 일치 | 2.2절 |
| 47 | 3.3 sheet 링크·버튼 | 일치 | 2.3절 |
| 48 | 3.1 dialog(확인용)·button | 일치 | 공용 `ui/dialog.tsx` 재사용(새 shadcn 없음, S-10), 확인·취소 Button 기본 크기 52px, 닫기 `size-11`, `variant="destructive"`는 3.1 variant 목록 안. 문구는 `ko.ts` `CALL_FINAL_CONFIRM`(3.6), 합쇼체·한 문장 한 정보(3.5) |
| 49 | 4.10 단위 테스트 위치·태그 | **불일치(경미)** | `tests/unit/app/admin/koFormat.test.ts` — 대상 `src/app/admin/_i18n/ko.ts`의 미러는 `tests/unit/app/admin/_i18n/ko.test.ts`. `_i18n` 폴더가 빠졌고 파일명이 `koFormat`. 단일 파일 대상이라 4.10 P-3 교차 테스트 예외에도 해당하지 않음. PRD 태그 없음(E-1·E-5와 STANDARD 절만 표기) → F-1 |
| 50 | S-23 금지어 "근로자" | 일치 | `ko.ts` `employeeCount` 라벨 "상시근로자 수"는 기업 인원 법정 용어로 구직자 호칭이 아님. `messages/ko.json` `employer.request.employeeCount.label`과 같은 글자이고 P1d run 1 S-23에서 같은 사유로 수용됨 |
| 51 | S-32 단위 연결 | 일치(기준 보완 제안 H-3) | `ko.ts` `requestValue` `` `${countFmt.format(v)}명` ``. 숫자는 `Intl` 상수로 포맷되고 "명"은 한국어 수 단위 글자. 3.5 금지 대상 예시는 `+ "원"`(통화 단위, `currency:'KRW'`로 대체 가능)이며, 관리자 화면은 run 1부터 "대기 인력 {n}명"·"{n}건" 표기를 수용해 왔음. 문언상 경계가 모호하므로 H-3 |

**집계: 판정 51항목 중 일치 50, 불일치 1(#49 F-1, 경미), 기준 보완 필요 0.**

## 4. 불일치 목록 (수정 지시)

| ID | 위치 | 기준 | 실제 | 지시 |
|---|---|---|---|---|
| F-1 | `tests/unit/app/admin/koFormat.test.ts` | 4.10 "단위 `tests/unit/{src 경로 미러}/{파일명}.test.ts`", "PRD 검증 테스트는 `R-xxx` 태그" | 미러 폴더 `_i18n` 누락, 파일명 `koFormat`, R 태그 없음 | `tests/unit/app/admin/_i18n/ko.test.ts`로 옮기고, 테스트 이름에 `R-118`(관리자 한국어 전용, E-5)·`R-121`(리드 상세 급여 표시, E-1) 태그 추가. 내용 변경 불필요 |

## 5. 기준 보완 제안 (v2.11 후보)

| ID | 대상 | 제안 |
|---|---|---|
| H-1 | 4.5 | 한 줄 추가: "[v2.11] 관리자 서버 액션은 `export const x = adminAction(async function x(...) { const actor = await requireStaff(); assertCan(actor, "…"); … })` 형태를 허용한다. 첫 문장 판정은 안쪽 함수 본문으로 한다. 래퍼(`src/lib/admin/actionGuard.ts`)는 본문 호출과 `AuthzError` → `{ ok: false, code }` 변환만 하고, 본문보다 먼저 실행되는 문장(입력 해석·DB·로그)이나 `AuthzError` 외 예외 삼키기를 넣지 않는다. 다른 영역(기업·구직자)에 같은 래퍼를 만들 때도 같은 조건." 4.2 트리 `lib/admin/`에 `actionGuard` 추가 |
| H-2 | S-40 / qa:static (선택) | 현재 S-40은 수동 전수 열람이고 `qa-rules.ts`에 rbac 검사가 없음. 자동화하려면 `"use server"` 파일과 `app/api/**/route.ts`에서 내보낸 함수(`export async function` 또는 `export const … = adminAction(async function …`)의 첫 문장이 `requireStaff(`/`requireSeeker(`/`requireEmployer(`/`requirePermission(`/`assertCan(` 또는 `// rbac: public` 주석인지 보는 구조 검사(warn)를 추가. 도입 여부는 오케스트레이터 판단 |
| H-3 | 3.5 / S-32 | "관리자 화면에서 `Intl`로 포맷한 숫자 뒤 한국어 수 단위 글자(명·건·일)는 허용. 통화(원)는 `currency:'KRW'`만, `toLocaleString`은 금지 유지" 명시 |

> **반영 결과(STANDARD v2.11, 코디네이터 지시 2026-11-17)**: H-1은 제안대로 4.5에 반영하고, 4.2 트리 `lib/admin/`에 `actionGuard.ts`를 기재했다. H-3도 제안대로 3.5와 S-32에 반영했다. H-2는 이번에 넣지 않았다. S-40은 계속 사람이 전수 열람하고, 개정 이력 v2.11에 "Gate 4 개선 후보"로만 메모했다. 판정 변화는 없다. #43·#51은 일치이며 기준 문언과도 맞게 되었다. F-1은 계속 유효하다.
