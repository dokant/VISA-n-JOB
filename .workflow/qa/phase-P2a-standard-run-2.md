# Phase P2a 기준 검토 — run 2 (정적)

- 대상: 커밋 6886cb8 (`git show 6886cb8`, 19파일) — run 1(`phase-P2a-standard-run-1.md`) F-1~F-3 수정 + QA D-1·D-2·O-2 반영
- 기준: STANDARD v2.13 → 이번 검토 중 **v2.14**로 보완(트리·SiteFooter 행 형태·S-64 범위 명시, 판정 변화 없음)
- 방법: 정적만. `pnpm i18n:check`(6로케일 오류 0, ko 950키 — `interest.register` 1개 삭제), `pnpm qa:static`(오류 0, 경고 17건 모두 기존 S-23 phrases-review·S-45 console), 변경 파일 eslint(오류 0), 추가 줄 금지 패턴 rg(`text-xs`·대괄호 임의값·hex·any·console·z.object·mailto/tel 0건), 변경 파일 전수 열람, 핸드오프 `reference/index.html:775-783`·`site3.css:308-310` 대조, 빌더 스크린샷 `p2a_r2_*.png` 16장 중 6장 열람(관리자 목록·상세, 푸터 vi 1280·375, ru 1024, uz 1280, 면접 신청 BLOCKED·NOT_ELIGIBLE). build/test/e2e/dev는 실행하지 않음.

## 1. run 1 불일치 해소 여부

| # | run 1 항목 | 판정 | 근거 |
|---|---|---|---|
| F-1 | S-09 관리자 공고 상태·검증 배지 아이콘 | **해소** | 새 `src/components/admin/posting-badges.tsx`: `PostingStatusBadge`(DRAFT `FilePen`·PUBLISHED `Eye`·CLOSED `Lock`), `PostingVerifiedBadge`(검증 완료 `BadgeCheck`·검증 전 `Clock`), 모두 `strokeWidth={1.5}`·`aria-hidden`. 목록(`postings/page.tsx:151-162`)과 상세(`postings/[id]/page.tsx:72-73`) 모두 사용. run 1 권장대로 목록 "검증" 열 글자 "전"도 배지로 바뀜(검증 시각은 배지 아래 `text-dense`). 스크린샷 `p2a_r2_admin_badges_{list,detail}_1280` 확인 |
| F-2 | S-30 / 3.6 코드값 키 `option.` | **해소** | 6개 messages에서 `public.jobs.{overtime,dormitory,meals,shift}.option.{값}`, `posting-view.ts:59` `t(\`public.jobs.${group}.option.${value}\`)`. 옛 경로 사용 0건. 관찰 O-1(미사용 `interest.register`)도 6개 파일에서 삭제 |
| F-3 | 3.2 SiteFooter 등록 정보 열 세로 꺾임 | **해소** | `site-footer.tsx:114-135` 세 행 모두 `grid gap-0.5`, `<dt>`의 `flex-none`·`items-center` 삭제(지시와 동일). vi·uz 1280에서 라벨이 열 안에서 줄바꿈되고 값은 아래 줄에 온전히 표시, ru 1024는 3열 규칙대로 5번째 열이 아래로 내려가 넘침 없음, vi 375 넘침 없음 |

**해소 3/3**

## 2. 새 파일·변경 판정

| # | 항목 | 판정 | 근거 |
|---|---|---|---|
| 1 | 4.2 트리 — `components/admin/posting-badges.tsx` 위치 | 일치 | 트리에 `components/admin/` 폴더가 있고(관리자 전용), 새 `src/` 최상위 폴더 없음. 파일 단위 예시가 없어 v2.14에서 `admin/ = forbidden-notice, posting-forms, posting-badges` 한 줄 기재 |
| 2 | 4.3 파일명·내보내기 | 일치 | kebab-case 파일, PascalCase 컴포넌트 2개 |
| 3 | `_i18n/ko.ts` import 범위(4.2) | 일치 | `POSTING_STATUS_LABEL`을 `src/components/admin/**`에서 import — 허용 범위 |
| 4 | 3.1 badge | 일치 | `ui/badge.tsx` 그대로 사용(26px·좌우 11px·`rounded-full`·`text-eyebrow`), 아이콘은 Badge 내장 `[&_svg]:size-3.5`, `gap-1.5`. variant는 3.1 목록 안(`cyan`·`neutral`·`blue`·`orange`), `className` 덮어쓰기 없음 |
| 5 | S-09 색만으로 구분하지 않음 | 일치 | DRAFT·CLOSED는 같은 `neutral` 색이지만 아이콘·글자가 다름 |
| 6 | S-64 오렌지 | 일치 | "검증 전" `orange` 틴트 배지는 `brand-orange` 배경·`seeker` 버튼이 아니며, 기존 3.2 사용례(ExpertReviewMark, 점수 부족 항목, P1e 관리자 "검증 대기")와 같은 주의·대기 표시. 해석이 갈릴 수 있어 v2.14에서 S-64 범위를 한 줄 명시(판정 변화 없음) |
| 7 | 3.2 SiteFooter 구조 변경 vs 핸드오프 | 일치(v2.14 기준) | 핸드오프 `.foot__legal div`는 라벨·값 가로 `flex gap 8px`, `b{flex:none}`. 핸드오프 라벨은 2~5글자 한국어(상호·대표 등)라 성립했으나 실제 라벨(6로케일 번역, "Văn phòng giới thiệu việc làm có thu phí")에서는 같은 구조가 F-3 결함을 만듦. 3.7 #13b가 유지하는 것은 "5열 그리드·타이포·하단 바"이고 행 내부 배치는 정해져 있지 않았음 → v2.14 3.2 SiteFooter에 "등록 정보 행은 라벨 위·값 아래(`grid gap-0.5`, `registration-info`와 같은 형태)"를 명시. 열 비율·13px·열 제목·하단 바·플레이스홀더 금지는 변화 없음(값은 site.config 실제 값) |
| 8 | 면접 신청 패널 상태 변경(O-2) | 일치 | `interest-how` 문구는 비로그인·신청 가능·신청 완료에서만, 비자 부적합·BLOCKED에서는 없음. 서버가 NOT_ELIGIBLE·BLOCKED를 돌려주면 폼이 패널과 같은 안내 + `CONSULT_HREF` 상담 신청(`default` 버튼, `ArrowRight` 1.5)으로 바뀜 — 3.3 CONSULT_HREF, S-64(오렌지는 면접 신청 버튼만), SC-06(지원하기·Apply 0건). 스크린샷 `p2a_r2_interest_{blocked,not_eligible}_1280` 확인 |
| 9 | i18n(S-29·S-30·S-31) | 일치 | 오류 0, 새 사용자 문자열은 기존 키(`common.consult`, `interest.*`) |
| 10 | pii-guard·manage(D-1·D-2) | 일치 | 4.2 위치 변경 없음, any·console·법령 수치 없음, 단위 테스트 미러 위치(`tests/unit/lib/pii-guard.test.ts`, `tests/unit/lib/postings/manage.test.ts`). 동작 판정은 QA 몫 |
| 11 | S-02·S-05·S-06·S-08 | 일치 | 추가 줄에 하드코딩 색·`text-xs`·대괄호 임의값 0건. 새 상담 신청 버튼은 `default`(52px) |

새 불일치: **0건**

## 3. P2a 전체 판정 (run 1 표 35항목 기준)

run 1의 불일치 3건(#11 S-09, #20 S-30, #35 SiteFooter)이 모두 해소되고, 나머지 32항목은 6886cb8에서 해당 부분이 바뀌지 않았거나 위 2절대로 일치를 유지한다.

**일치 35 / 전체 35**

## 4. 관찰 (판정 밖)
- O-1 관리자 "검증 완료"는 `blue`+`BadgeCheck`, 공개 화면 `VerifiedBadge`는 `cyan`+`BadgeCheck`. 3.2 VerifiedBadge는 공개 화면 컴포넌트 규칙이고 관리자 화면에서는 `cyan`이 "공개 중"에 쓰여 구분을 위한 선택으로 보이므로 불일치로 보지 않는다.
- O-2 푸터 대표전화 행은 링크의 44px 터치 영역 때문에 라벨과 값 사이가 다른 행보다 넓어 보인다(스크린샷). 터치 규칙상 맞으며 결함 아님.
- O-3 `p2a_r2_footer_*_375`·`_1024`에서 내비·"본문으로 바로가기"가 푸터 위에 겹쳐 보이는 것은 run 1 O-4와 같은 전체 페이지 캡처의 sticky·포커스 현상이다.

## 5. STANDARD v2.14 변경 내역
- 머리 버전 2.13 → 2.14, 개정 이력 2.14 행.
- 4.2 트리: `components/admin/` 예(forbidden-notice, posting-forms, posting-badges).
- 3.2 SiteFooter: 등록 정보 행 라벨 위·값 아래(`grid gap-0.5`).
- S-64: `orange` 틴트 배지(주의·대기 표시)는 대상 밖임을 명시.
