# Phase P1e 기준 일치 검토 — run 1 (정적)

- 대상: 커밋 `4beeb9f` (`git diff dc04584..4beeb9f`, 37파일)
- 기준: STANDARD v2.9, PRD R-119~R-122, PLAN "### P1e", DECISIONS PC-4·PC-5·PC-10·PC-15·Q-08·Q-14
- 방법: 파일 열람, `git show/diff`, `pnpm lint`(0건), `pnpm qa:static`(errors 0, warnings 17 — 모두 P1e 이전 파일, 관리자 파일 0건), `pnpm i18n:check`(6로케일 오류 0), 변경 파일 대상 rg 검사, 스크린샷 `p1e_{dashboard,seeker,leads}_{1280,375}.png` 확인. build/test/e2e/dev 미실행(QA 동시 사용).
- 판정: 일치 / 불일치 / 기준 보완 필요(기준이 관리자 화면을 예상하지 못해 판단 불가)

## 1. 항목별 판정

| # | 기준 | 판정 | 근거 |
|---|---|---|---|
| 1 | S-02 하드코딩 색 0 | 일치 | 변경 파일 rg 0건 |
| 2 | S-05 글자 크기 토큰만, `text-xs`·`text-[..]` 0 | 일치 | 0건. 표 헤더 `text-label` 12px = 3.1 table 규칙 |
| 3 | S-06 간격·반경 임의값 0, 그림자 목록 | 일치 | 임의값은 `transition-[border-color,box-shadow]`(2.4 허용 "전환 속성 목록")뿐. `min-w-5xl`·`min-w-3xl`은 Tailwind 척도 |
| 4 | S-09 상태 표시 = 색+아이콘+글자 | 일치 | 승격 조건 `Check`/`X` + 글자 + sr-only "(충족/미충족)" |
| 5 | S-10 shadcn 목록 안 | 일치 | 새 ui 컴포넌트 없음(button·input·textarea·label·native-select·checkbox·badge 재사용) |
| 6 | S-11 lucide, stroke 1.5(체크 2) | 일치 | `Check` 2, `X`·`Eye` 1.5 |
| 7 | S-16 비자 표시 = VisaLabel | 일치(v2.10 관리자 예외로 재판정; 최초 판정 "기준 보완 필요") | 관리자 목록·상세·전환 가능 비자 옵션이 코드만 표시(`seekers/page.tsx:96`, `seekers/[id]/page.tsx:118-121`, `seeker-review-forms.tsx:186-190`). VisaLabel은 next-intl messages에 의존하고 관리자는 3.6에 따라 messages를 쓰지 않음 → 기준이 관리자 화면을 예상하지 못함 |
| 8 | S-23 금지 표현 | 일치 | 관리자 파일에 지원·보장·사업주·근로자·채팅 0건 |
| 9 | S-27 등급 표시 = GradeBadge | 일치(v2.10 관리자 예외로 재판정; 최초 판정 "기준 보완 필요") | 관리자 구직자 등급은 글자("B등급")만(`seekers/page.tsx:98` 열 제목 "구직자 등급", `seekers/[id]/page.tsx:106-108` "구직자 등급 B등급"). GradeBadge도 next-intl 의존 — 7과 같은 사유. 리드 등급 구분은 #32(E-2) |
| 10 | S-29 i18n 누락 0 | 일치 | i18n:check 0 오류(messages 변경 없음) |
| 11 | S-32 금액·숫자 formatter, `toLocaleString('ko-KR')`·문자열 연결 0 | **불일치** | `src/app/admin/_i18n/ko.ts:170` `` `${n.toLocaleString("ko-KR")}원` `` (리드 상세 급여 표시에 사용) |
| 12 | S-34 디렉터리 4.2 | 일치(기준 보완 제안) | 새 최상위 폴더 없음. `app/admin/_i18n/ko.ts`(PLAN 지정), `lib/leads/priority.ts`(PLAN 지정), `lib/admin/{dashboard,leadDesk,seekerReview}.ts`, `schemas/admin/`는 트리의 "…"·`{영역}` 범위. 트리 문서화 제안은 3절 |
| 13 | S-35 파일명 4.3 | 일치 | app·components kebab-case, lib·schemas·server camelCase, `ko.ts`·`_i18n`은 PLAN 지정 이름 |
| 14 | S-36 `any` 0 | 일치 | 0건, lint 통과 |
| 15 | S-40 / 4.5 첫 문장 rbac | 일치 | 서버 액션 9개·페이지 5개 모두 첫 문장 `requireStaff()`, 다음 문장 `assertCan`(액션) — 페이지는 `assertCan` 또는 `can()` 분기 후 ForbiddenNotice |
| 16 | S-41 `/admin/**` 역할+2FA | 일치 | `(staff)/layout.tsx` + 각 페이지 재검사 |
| 17 | Q-08 권한 분리 | 일치 | 등급·트랙·확인 항목·전환 판정 = `seeker:review`(STAFF_VISA·ADMIN), 연락처 = `contact:view`, 리드 = `lead:manage`(rbac.ts 기존 매핑) |
| 18 | S-42 zod는 `src/schemas/**`만 | 일치 | `schemas/admin/{leads,review}.ts` |
| 19 | S-43 새 식별 필드 없음 | 일치 | 스키마 변경 없음 |
| 20 | S-44 직접 암·복호 0 | 일치 | 복호는 db extension 경유(`…Enc` select) |
| 21 | S-45 console 0 | 일치 | 변경 파일 0건 |
| 22 | 4.7 / R-122 복호 표시마다 PII_VIEW(값 반환 전) | 일치 | `revealSeekerPii`·`revealLeadContact`가 `auditPiiView`(필드 이름만) 후 복호 select. 목록·상세 select에 `…Enc` 없음 |
| 23 | S-46 / 4.8 AuditAction 포함·각 행위 기록 | 일치(기준 보완 필요) | 4.8의 11개 유지 + `SEEKER_REVIEW_UPDATE` 신설(확인 항목·전환 판정). 등급 `SEEKER_GRADE_CHANGE`, 트랙 `SEEKER_TRACK_CHANGE`, 리드 전이 `transitionLead`→`LEAD_GRADE_CHANGE`, meta 평문 PII 없음. 표에 없는 액션이므로 4.8 행 추가 필요 |
| 24 | S-47 auditLog update/delete 0 | 일치 | 0건 |
| 25 | S-48 / 4.9 비자 코드 리터럴 0 | 일치 | 0건. BR-07 잠금은 `VisaType.defaultTrack` 데이터로 판정 |
| 26 | S-50 / 4.10 테스트 위치·태그 | 일치 | `tests/unit/lib/admin/{dashboard,leadDesk,seekerReview}.test.ts`(미러), `tests/unit/lib/leads/priority.test.ts`(미러), 교차 `piiView.test.ts`·`server/actions/admin/adminActionsRbac.test.ts`, 픽스처 `adminFixtures.ts`, E2E `admin-core.spec.ts` + `support/adminDb.ts`. 모두 R-119~122 태그, 시간 의존은 고정 `NOW` 주입. PLAN 파일명(`tests/unit/admin/…`, kebab)과 다르나 4.10이 위치·명명 기준이므로 수용. `piiView`는 P-3 `{모듈}{주제}` 형식에 엄밀히는 `adminPiiView`가 맞으나 미러 폴더(admin)로 모듈이 드러나 경미 — 불일치로 잡지 않음 |
| 27 | S-53 운영 수치 limits.ts 한 곳 | 일치 | D-90(PC-10), 30일(WO §7.6), 가중치(PC-5), 목록 상한 모두 `limits.ts`. 화면 문구는 상수 보간. `CALL_NOTE_MAX` 500은 저장 보호 상한(허용) |
| 28 | PC-5 우선순위 식·정렬 | 일치 | `priority.ts` 가중치 주입, `sortByPriority` 내림차순, "대기 인력 n명" 표시 |
| 29 | PC-4 / PC-15 | 일치 | StaffTask 집계·LEAD_REVIEW 연결, 직원 계정 관리 화면 없음 |
| 30 | S-69 포커스(`outline-none` 단독 0) | 일치 | 0건 |
| 31 | 1.1 "직원"은 관리자 화면 전용 | 일치 | "직원"은 `src/app/admin/**`·`src/components/admin/**`에만. messages 변경 없음(기존 `legal` 처리방침 s5는 법적 문서 예외) |
| 32 | 1.1 관리자 화면 "구직자 등급"/"리드 등급" 구분 | **불일치(경미)** | 칸반 열 제목이 `C`·`B`·`A`만(`leads/page.tsx:91-98`, `ko.ts` `LEAD_GRADE_LABEL`). 상세·검증 목록·대시보드는 "리드 등급 X"로 구분됨 |
| 33 | 1.1 리드 등급 "보관"/"재접촉금지" | 일치 | `LEAD_GRADE_LABEL` |
| 34 | 2.6 관리자 데스크톱 우선, 최소 1024px | 일치 | 375px 칸반 가로 스크롤은 `overflow-x-auto` 컨테이너 안(`min-w-5xl`=1024px). S-07(375 가로 스크롤 없음)은 공개·구직자 화면 대상이라 관리자 비적용. 표도 2.6 "표만 가로 스크롤 컨테이너" 규칙대로 |
| 35 | 2.7 관리자 reveal·자석·장식 애니메이션 없음 | 일치 | hover 색·그림자 전환만 |
| 36 | 3.3 터치 타깃 (v2.10: 모든 화면·모든 폭 44px 이상, CLAUDE.md 우선) | **불일치** | 관리자 링크·탭·체크박스 행은 `h-11`/`min-h-11`(44px)로 일치. 그러나 관리자 버튼은 모두 `size="sm"`이고 공용 `button.tsx:38` `sm`이 ≥1025px에서 `lg:h-10.5`(42px) → E-4. (v2.9 판정 당시 관리자 하한 32px 기준으로는 일치였으나 v2.10으로 재판정) |
| 37 | 3.1 table 헤더 `--n50`·12px/600·`--n700`, 숫자 tabular | 일치 | `seekers/page.tsx` |
| 38 | 3.6 관리자 한국어 전용·리터럴 허용 | 일치 | 문구는 페이지 리터럴 + `_i18n/ko.ts` |
| 39 | R-119 대시보드 4 카운트 | 일치 | `dashboard.ts` 정의 = 화면, 신규 구직자 = 상담 전 B 전체(Q-14 수용분) |
| 40 | R-120 승격 조건·감사 | 일치 | B→A(consultedAt+verifiedVisa), A→S(+verifiedKorean, ACTIVE, 30일), 조건부 update로 경합 방지 |
| 41 | R-121 / Q-14 통화 결과 전이 | **불일치(기록만 — run 2 대상)** | `leadDesk.ts` `gradeAfterCall`: NO_INTENT → 등급 유지. Q-14 결정은 WO §8.2대로 NO_INTENT → DO_NOT_CONTACT + 확인 다이얼로그 필수. 라벨 `ko.ts` `CALL_OUTCOME_LABEL.NO_INTENT`에 전이 표시 없음, `lead-call-form.tsx`에 확인 단계 없음(DNC 포함 되돌릴 수 없는 결과) |

| 42 | 3.6 관리자 한국어 전용(R-118) | **불일치** | `leads/[id]/page.tsx:53-58` `jsonRows`와 `:178-186` "구인 의뢰 내용"이 `requestJson`의 영문 키·enum 값(예 `overtime`, `UNKNOWN`)과 객체 값의 `JSON.stringify` 원문을 그대로 표시 → E-5 (최초 "관찰"에서 코디네이터 지시로 승격) |

집계(최초, v2.9): 41항목 중 일치 35, 불일치 3(#11, #32, #41), 기준 보완 필요 2(#7, #9).

**집계(최종, v2.10 재판정 + #42 추가)**: 판정 42항목 중 **일치 37**, **불일치 5**(#11 E-1, #32 E-2, #41 E-3 — Q-14 기존 지시, #36 E-4, #42 E-5), 기준 보완 필요 0.

## 2. 불일치 목록 (수정 지시)

| ID | 위치 | 기준 | 실제 | 지시 |
|---|---|---|---|---|
| E-1 | `src/app/admin/_i18n/ko.ts:170` `fmtWon` | S-32, 3.5 "원화 `currency:'KRW'`, 문자열 이어 붙이기·`toLocaleString('ko-KR')` 금지" | `toLocaleString("ko-KR")` + `"원"` 연결 | `Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW" })`(또는 `maximumFractionDigits:0`) 모듈 상수로 교체. 관리자는 ko 고정이므로 로케일 `ko-KR` 고정은 허용(3절 G-5 제안) |
| E-2 | `src/app/admin/(staff)/leads/page.tsx:91-98` 칸반 열 제목 | 1.1 "관리자 화면에서는 반드시 '구직자 등급'/'리드 등급'으로 구분" | "C 74", "B 33"처럼 글자만 | 열 제목을 "리드 등급 C"(보관·재접촉금지 열은 그대로) 또는 보드 위 범례/`<h2>`에 "리드 등급" 접두. 시각 공간이 좁으면 `sr-only` 접두 + 보드 제목 "리드 칸반(리드 등급별)" 중 택일 |
| E-3 | `src/lib/admin/leadDesk.ts` `gradeAfterCall`·주석, `ko.ts` `CALL_OUTCOME_LABEL.NO_INTENT`, `components/admin/lead-call-form.tsx` | Q-14 | NO_INTENT 등급 유지, 확인 없음 | run 2에서 Q-14대로(이미 지시됨). 라벨에 "(재접촉금지로)" 표시, DO_NOT_CONTACT로 가는 결과(NO_INTENT·DNC) 제출 전 확인 단계(3.1 dialog 또는 확인 체크) |

| E-4 | `src/components/ui/button.tsx:38` `sm: "h-11 px-4 text-dense font-semibold lg:h-10.5"` (주석 `:8-9` "sm 42px") | v2.10 3.1 button `sm` 44px, 3.3·B-10·S-08 모든 화면·모든 폭 44px 이상(CLAUDE.md `h-11` 우선) | ≥1025px에서 42px | `lg:h-10.5` 삭제(모든 폭 `h-11`), 주석 갱신. **공용 컴포넌트라 전 화면 영향**: `size="sm"` 사용 33곳(관리자 `lead-call-form`·`pii-reveal`·`seeker-review-forms`·`sign-out-button`, 구직자 login·me·referral·stay·register·quick, `site-nav`, `locale-switcher`, `consent-manager`, `referral-share`, `seeker-login-form`, `wizard-steps-b`, `outcome-card`). 같은 v2.10 개정으로 기준 미달이 된 공용 요소(같은 원인, 함께 수정): `src/components/ui/radio-group.tsx:42` `lg:h-8.5`(34px), `src/components/ui/tabs.tsx:34` `lg:h-9.5`(38px), `src/components/common/locale-switcher.tsx:49` `lg:h-9.5`(38px), `src/components/common/site-footer.tsx:170` 언어 바로가기 `lg:h-8.5`(34px) — 모두 `lg:h-…` 삭제. 수정 후 S-08 확인 `rg "lg:(min-)?h-(8\|8\.5\|9\|9\.5\|10\|10\.5)\b" src` 0건 + 1440px boundingBox. (참고: `site-footer.tsx:94,150,153,158`의 `min-h-8` 텍스트 링크는 3.3 대상 "링크 버튼"이 아닌 목록형 텍스트 링크라 이번 지시에 넣지 않음 — 대상에 포함할지는 오케스트레이터 판단) |
| E-5 | `src/app/admin/(staff)/leads/[id]/page.tsx:53-58`(`jsonRows`), `:178-186`("구인 의뢰 내용" `Field label={k}`) | 3.6·R-118 관리자 한국어 전용 | `requestJson`의 영문 필드 키·enum 코드·`JSON.stringify` 원문을 그대로 표시 | 구인 의뢰·진단 필드 키→한국어 라벨, enum 값→한국어 라벨 매핑을 `src/app/admin/_i18n/ko.ts`에 두고 사용(관리자는 messages 미사용). 매핑에 없는 키는 "기타 항목"으로 묶거나 키를 보조 표기. 배열·객체 값은 한국어 라벨로 풀어 표시. 값의 사실(금액·인원)은 `Intl` 상수로(S-32 v2.10) |

## 3. 빌더 확인 요청에 대한 판단과 기준 개정 제안

> **반영 결과(STANDARD v2.10, 코디네이터 지시)**: G-1·G-2·G-3·G-5는 아래 제안대로 반영. **G-4는 방향을 바꿔 반영** — CLAUDE.md 사용자 규칙("터치 영역 44px=h-11 이상")이 우선하므로 모든 화면(관리자 포함)·모든 폭 44px 이상, 관리자 32px 하한 삭제, ≥1025px 핸드오프 높이 허용 삭제, 3.1 button `sm`·radio 칩·tabs·LocaleSwitcher 44px, B-10·S-08 갱신(아래 표 G-4 칸의 "sm 42px 허용" 안은 채택되지 않음). 이에 따라 #7·#9는 일치로, #36은 불일치(E-4)로 재판정. 2.6에 관리자 1024px 미만 컨테이너 가로 스크롤 허용도 명시.

| 요청 | 판단 | 제안(v2.10 후보) |
|---|---|---|
| 1) `SEEKER_REVIEW_UPDATE` | 수용. PLAN P1e "모두 AuditLog"를 채우려면 등급·트랙 외 행위의 액션이 필요하고, meta 평문 PII 없음 | **G-1** 4.8 표에 행 추가: `SEEKER_REVIEW_UPDATE` — 구직자 검토 확인 항목(상담 완료·체류자격 확인·한국어 확인) 변경, 전환 가능성 판정(`convertibleVisa/At`) 입력 (R-120). S-46 문구 "4.8 목록(`COMPANY_VERIFY`, `SEEKER_REVIEW_UPDATE` 포함)" |
| 2) 테스트 경로 4.10 미러 | 수용(일치). 위치·명명은 STANDARD 4.10이 기준이고 PLAN 파일 목록은 산출물 목록 | **G-2** 4.10에 "PLAN 파일 목록의 테스트 경로가 4.10과 다르면 4.10을 따른다" 한 줄. (선택) 교차 테스트 예에 `tests/unit/lib/admin/piiView.test.ts`(R-122) 추가해 미러 폴더명이 모듈을 대신하는 경우 허용 명시 |
| 3) `_i18n/ko.ts`를 `components/admin/**`에서 import | 기준 위반 아님(4.2는 모듈 간 import를 제한하지 않음). 문서화 권장 | **G-3** 4.2 트리 `app/admin/` 아래 `_i18n/ko.ts — 관리자 공용 한국어 문구·포맷터(PLAN P1e). app/admin/**·components/admin/**만 import`와 `lib/leads/(…, priority)`, `lib/admin/(session, dashboard, leadDesk, seekerReview)`, `schemas/admin/` 기재 |
| 4) 터치 44px vs 관리자 32px | 충돌 아님: 44px은 32px 하한을 충족. 다만 CLAUDE.md "버튼 등 44px(h-11) 이상"은 STANDARD 3.1 button `sm` 42px(≥1025px)과 문언상 어긋나며, 이번 산출물 sm 버튼도 데스크톱 42px | **G-4** 3.3 터치 규칙을 "모든 화면 <1025px 44px 이상, ≥1025px은 3.1 크기(sm 42px) 허용. 관리자도 같은 규칙(v2.10부터 32px 하한 대신)"으로 통일하고, CLAUDE.md 문구를 "<1025px 44px, 데스크톱 sm 42px 허용"으로 맞추도록 오케스트레이터에 요청(CLAUDE.md는 기준 담당 수정 범위 밖) |
| 5) 375px 칸반 가로 스크롤 | 기준 부합(2.6 관리자 최소 1024px, S-07 비적용, 스크롤은 컨테이너 안) | 없음(필요하면 2.6에 "관리자 1024px 미만은 보드·표 컨테이너 가로 스크롤 허용" 명시) |
| S-16·S-27 관리자 적용 | 기준 보완 필요 | **G-5** 3.2/S-16/S-27에 관리자 예외: 관리자 화면은 messages를 쓰지 않으므로 비자는 코드(+`VisaType.nameKo`가 있으면 병기), 구직자 등급은 "구직자 등급 X등급" 글자 표시 허용. 3.5/S-32에 "관리자는 `ko-KR` 고정 `Intl` 포맷터 허용, `toLocaleString`·단위 문자열 연결 금지는 유지" |
