# Phase P1a — 기준 일치 검토 (run 2)

- 대상 커밋: `6ff9d15`(P1a run 2 수정). 비교 기준 `48a80fb`. 작업 트리(P1b 진행 중)는 보지 않았고 `git show 6ff9d15:<path>`와 `git diff 48a80fb 6ff9d15`만 근거로 썼다.
- 기준: `.workflow/STANDARD.md` v2.4. 이번 검토에서 기준을 바꾸지 않았다.
- 검토자: wf-standard (모드 B), 2026-11-16
- 실행한 확인: 커밋 기준 `git grep`(번역 키·z-index·afterHeader), 6개 messages를 node로 파싱해 최상위 키·`visa.score` 구조 확인, HO `site.css`·`site3.css`·`index.html`과 대조. build·test·e2e·lighthouse·서버는 **실행하지 않았다**(지시).
- 렌더 근거: 오케스트레이터 스크린샷 `p1a2_footer_375/900/1100`, `p1a2_drawer_375`, `p1a2_about_1440`, `p1a2_fees_375`, `p1a2_zh_375`(축소본이라 글자 모양은 판별 불가).

## 1. 결과 요약

- run 1 불일치 4건 → **해소 4 / 4**.
- 새 불일치 **0건**.
- 관찰 반영 3건(about·fees 검토 표시, G-1 이름, 서랍 z-index)은 모두 기준에 어긋나지 않는다. 서랍이 헤더를 덮는 문제는 기준 위반이 아니다(3절). 기준 보완 제안 1건을 적었다.
- 빌더 판단 2건(등록 정보 열 span, Playwright workers 상한)은 기준에 어긋나지 않는다.

## 2. 이전 불일치 재확인

| # | 항목 | 판정 | 근거 |
|---|---|---|---|
| 1 | S-04 / 2.3.2 zh 스택 | **해소** | `globals.css:128-135` `html:lang(zh)` = `var(--font-noto-sans-sc)`, `var(--font-inter)`, `"PingFang SC"`, `"Hiragino Sans GB"`, `"Microsoft YaHei"`, `"Noto Sans CJK SC"`, `var(--font-noto-sans-kr)`, `var(--font-system-fallback)`. 2.3.2(v2.4) 순서와 같다. SC가 로드되기 전에는 Inter에 한자 글리프가 없으므로 중국어 시스템 글꼴이 한자를 그린다. 지연 로드 구조는 그대로 두었고 이는 허용 범위다. 렌더로는 확인하지 못했다(스크린샷 축소본). 판정 근거는 코드다. |
| 2 | S-08 / B-10 푸터 언어 알약 | **해소** | `site-footer.tsx:170` `h-11 … lg:h-8.5`: 1025px 미만은 44px, 1025px 이상은 HO 34px. `lg`=1025px(`globals.css:244`). `footer_900`에서는 알약이 크고(44px), `footer_1100`에서는 작다(34px). |
| 3 | S-30 / 3.6 `score` 영역 | **해소** | 6개 파일 모두 최상위 키가 `_review, meta, common, nav, footer, public, visa, visaType, legal`이다. `score`가 없고, `visa.score.{form,result}`가 있으며 `result` 키는 10개로 같다. 사용처: `score-form.tsx:26` `useTranslations("visa.score.form")`, `score-result.tsx` `t("visa.score.result.*")` 10곳. `layout.tsx:22` `CLIENT_NAMESPACES = ["common","nav","visa","visaType"]`. 커밋 기준으로 `"score.` 호출은 0건이다. 남은 매치 `score/e74/page.tsx:18` `key: "score"`는 `meta.score` 메타데이터 키다. `public.score`도 `public` 영역 안이라 문제없다. `scoreE74.ts`에는 번역 호출이 없다. |
| 4 | 3.2 SiteFooter 열 경계 (A-1) | **해소** | `site-footer.tsx:76` `grid-cols-2 gap-6.5 md:grid-cols-3 md:gap-7.5 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1.2fr] lg:gap-8.5`, 브랜드 열 `col-span-2 md:col-span-3 lg:col-span-1`(`:77`). 760px 이하는 2열 26px, 761~1024px는 3열 30px, 1025px 이상은 5열 34px다. HO `site3.css:300, 540-541, 582-583`과 같다. 렌더: `footer_375` 2열(브랜드 전체 폭), `footer_900` 3열(브랜드 전체 폭 + 링크 3열), `footer_1100` 5열. |

## 3. 관찰 반영 확인

| 관찰(run 1) | 변경 | 판정 |
|---|---|---|
| 1. about·fees `ExpertReviewMark` | `about/page.tsx:37`, `fees/page.tsx:33`에 `PageShell afterHeader={<ExpertReviewMark />}`를 추가했다. 법적 문서·가이드와 같은 자리(`page-shell.tsx:32`)다. `about_1440`과 `fees_375`에서 "[전문가 검토 필요]" 배지와 설명이 보인다. | 기준과 충돌 없음(S-19 방식과 같다) |
| 6. G-1 이름 중복 | 6개 파일의 `visaType.g1.name`에서 코드를 뺐다(ko "기타", en "Miscellaneous", vi "Khác", ru "Прочее", zh "其他", uz "Boshqa"). | S-16 VisaLabel 규칙(코드 + 쉬운 설명)과 맞다. 3.6 `nameKey` 형식은 바뀌지 않았다. |
| 4. 서랍과 헤더 겹침 | `sheet.tsx:38` `z-40` → `z-60`. 헤더는 `z-50`(`site-nav.tsx:79`)이다. 이제 서랍이 헤더 전체를 덮는다. 닫기 버튼(`site-nav.tsx` SheetClose, `top-5`, 44px)은 `drawer_375`에서 보인다. | **기준 위반 아님.** 아래 판단 참고 |
| 3. `(public)/employer/candidates` | 파일 첫 줄에 "P2b에서 교체·삭제" 주석을 달았다. | 기준과 충돌 없음. P2b 검토 때 다시 확인할 것 |

**서랍이 헤더(언어 전환기)를 덮는 것에 대한 판단**
- STANDARD 3.1 sheet 행과 S-66이 정한 것은 전체 화면 흰 오버레이, 상단 100px·gutter 패딩, 링크 모양, 하단 CTA, 스크롤 잠금, Esc·링크·1025px 리사이즈로 닫힘, 포커스 복귀다. 서랍이 열린 동안 헤더나 언어 전환기를 보여야 한다는 규칙은 없다. 3.2 `LocaleSwitcher` 행도 위치를 헤더로만 정했고, 서랍 안에 넣으라는 요구는 없다.
- 실제로 쓸 수 있는지도 문제없다. Radix Dialog는 모달이라 서랍이 열리면 바깥(헤더 포함)이 비활성(aria-hidden, 포인터 차단)이 된다. run 1의 `z-40`이었다면 헤더가 보이기만 하고 누를 수는 없었다. 지금 구조가 동작과 화면이 맞는다. 언어를 바꾸려면 서랍을 닫으면 되고(Esc·닫기 버튼), 푸터의 6개 언어 바로가기도 있다.
- HO와 다른 점: HO는 `.nav` z-index 90이 `.drawer` 85보다 위다(`site.css:10, 119`). 서랍이 열려도 로고·언어 알약이 보이고 버거가 X로 바뀐다(`site.css` `.nav__menu-open`). 기준은 "서랍 전부"를 유지 요소로 적었지만(3.7 #1) 겹침 순서는 [HO] 수치로 옮기지 않았다. 그래서 불일치로 판정하지 않는다.
- **기준 보완 제안(선택, 오케스트레이터 결정):** 열린 서랍에서도 언어 전환이 필요하다고 보면 3.1 sheet 행에 다음 둘 중 하나를 적는다. "서랍 하단(`drawer__foot`)에 `LocaleSwitcher` 또는 6개 언어 링크" 또는 "헤더를 서랍 위에 두고 버거를 닫기 버튼으로 전환(HO 방식, 헤더를 Dialog 안에 포함)". 기준이 바뀌기 전에는 현재 구현이 기준에 맞는다.
- `z-60`은 건너뛰기 링크(`layout.tsx:61` `z-60`)와 값이 같다. 서랍이 열려 있으면 포커스가 서랍 안에 갇히므로 둘이 겹치는 상황은 없다. z-index 값 자체에 대한 토큰 규칙은 기준에 없다.

## 4. 빌더 판단 2건

| # | 판단 | 판정 | 근거 |
|---|---|---|---|
| 1 | 등록 정보 열 `col-span-2 md:col-span-3 lg:col-span-1`(`site-footer.tsx:104`) | **기준에 어긋나지 않음** | 3.2가 정한 것은 열 수·간격(5/3/2열, 34px)이다. 칸 span은 정하지 않았다. 760px 이하 span 2는 HO `.foot__legal { grid-column: span 2 }`(`site3.css:585`)와 같다. 761~1024px span 3은 HO와 다르다(HO는 1칸, 1/3 폭). 다만 등록번호·주소처럼 긴 값을 1/3 폭에 넣으면 `footer_1100`처럼 여러 줄로 끊긴다. 전체 폭을 쓰는 것은 기준 범위 안의 합리적 변형이다. HO 수치까지 맞추려면 3.2에 span을 적어야 한다(지금은 필요 없음). |
| 2 | Playwright `workers: Number(process.env.E2E_WORKERS ?? 4)`(`playwright.config.ts:15-17`) | **기준에 어긋나지 않음** | STANDARD에는 E2E 병렬도 규칙이 없다(5절에는 Playwright 사용만 적혀 있다). 운영 수치 한 곳 규칙(S-53)은 `src/` 운영 수치가 대상이라 테스트 설정은 해당하지 않는다. 환경 변수로 바꿀 수 있고 주석에 이유가 있다. 같은 커밋의 `seo.spec.ts` 로케일별 분리는 4.10 테스트 위치·이름 규칙에 맞다(같은 파일, 테스트 이름만 바뀜). |

## 5. 새 불일치

없음.

## 6. 참고 (판정에 넣지 않음)

- `site-footer.tsx:170` 클래스 순서(`lg:h-8.5`가 가운데)는 정렬 플러그인이 없는 Prettier 설정(`.prettierrc`)이라 `format:check`에 걸리지 않는다. 기준에 클래스 순서 규칙은 없다.
- zh 폰트는 렌더로 확인하지 못했다. QA가 zh 375px에서 JS를 끄고 한자 글꼴(computed `font-family`가 처음 적용되는 글꼴)을 확인하면 S-04 판정이 렌더로 확정된다.
- run 1 관찰 2(아직 없는 경로로 가는 링크), 7(sitemap `/score/e74` 조건)은 이번 커밋에서 바뀌지 않았다. QA·오케스트레이터가 판단할 일이다.
