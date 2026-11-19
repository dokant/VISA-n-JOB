# Phase P1a — 기준 일치 검토 (run 1)

- 대상 커밋: `79339bc`(P0c 불일치 수정: 테스트 파일명), `48a80fb`(P1a 공개 페이지·진단/점수 엔진·수요 지도·SEO)
- 기준: `.workflow/STANDARD.md` v2.3 → 검토 중 **v2.4로 보완**(3절). v2.4는 SC-11 적용과 기준 공백만 반영했다. 산출물에 새로 요구한 것은 1건뿐이다: zh 폰트 스택 순서(S-04, 아래 #1). 이는 v2.3 2.3.1 "한국식 자형 한자가 섞이지 않게"를 지연 로드 상황에 맞춰 구체화한 것이다. 판정은 v2.4 기준.
- 검토자: wf-standard (모드 B), 2026-11-16
- 실행한 확인: `corepack pnpm qa:static`(오류 0, 경고 15 = S-23 "수수료"·"보장" 문맥 14건 + S-45 console 1건, 모두 문맥상 허용), `typecheck` 통과, `i18n:check` 6개 로케일 오류 0(ko 키 365개). 점검표의 rg 명령(S-02·03·05·06·23·24·32·36·42~45·47·48·50·53·55·60·63·64·69~71)을 모두 돌렸다. build·test·e2e·lighthouse는 실행 제약 때문에 **돌리지 않았다**.
- 렌더 근거: 빌더 스크린샷 `_ko_1440.png`, `_ko_375.png`, `m_0~m_3.png`(ko, 375·1440, 플래그 off), `.lighthouse/summary.json`, 그리고 빌더의 `e2e.log`(131 통과, 1 실패 = zh guide 타임아웃)를 **보조 근거**로 썼다. zh·vi 렌더, 키보드 조작, computed style은 직접 보지 못했다(이 항목들은 "렌더 미확인"으로 적음).

## 1. 결과 요약

- 점검표: **일치 57 / 60**, 불일치 3(S-04, S-08, S-30), 해당 없음 8(S-12~15, S-27, S-33, S-41, S-52), P2 항목(S-37~39, S-51)은 대상 아님.
- 3·4절 규칙: 일치 8 / 9, 불일치 1(3.2 SiteFooter 열 경계).
- 이전 불일치 재확인: P0c S-50(`enc-extension.test.ts` 파일명) → **해소**. `tests/unit/lib/db.test.ts`(`79339bc`, 이름만 바뀌고 내용 동일).
- 빌더가 보고한 STANDARD와의 차이 7건: 6건은 수용해 v2.4에 반영했다. 2번(zh 지연 로드)은 수용하되 조건을 달았고, 그 조건에 현재 구현이 맞지 않는다(불일치 #1).

## 2. 항목별 판정

### 2.1 점검표

| 번호 | 판정 | 근거 |
|---|---|---|
| S-01 | 일치 | `globals.css` 이번 diff는 폰트 변수 3곳뿐(`:110-131`). 보정값 `--input` #868e9c(`:106`), `--grad-cta`(`:52`), `--accent-foreground` blue-700(`:102`) 유지 |
| S-02 | 일치 | 매치 1건 `final-cta.tsx:11` 주석 "#13a"(섹션 번호, 색 아님) |
| S-03 | 일치(v2.4) | `fonts.ts`·`fontsZh.ts`는 `next/font/google`만 사용. CDN `<link>`/`@import` 0건. `src/fonts/` Pretendard를 import하는 코드 0건 |
| S-04 | **불일치** | ko=Noto Sans KR, en·vi·ru·uz=Inter, Inter 서브셋 5종(`fonts.ts:31`), SC는 zh에만(`[locale]/layout.tsx:67`)이다. 다만 SC 클래스는 하이드레이션 뒤에만 붙는다(`zh-font.tsx:10`). 그 전과 JS 비활성 상태에서 zh 스택(`globals.css:128-131`)은 `--font-noto-sans-sc` 미정의 → Inter → **Noto Sans KR**(이미 `<html>`에 변수가 있음, `layout.tsx:56`) 순서가 되어 한자가 한국어 글꼴로 그려진다. 2.3.1 "한국식 자형 한자가 섞이지 않게"와 2.3.2(v2.4) 위반. 렌더 미확인(코드상 확정) |
| S-05 | 일치 | `text-[` 0건. CSS 직접 크기는 `vj-map-label` 11.5px(`brand.css:323`), 지표 접미사 0.5em(지표 34~50px의 절반)뿐. 고지·면책 문구 `text-caption` 이상(`outcome-card.tsx:62`, `notice-box.tsx` `text-dense`, `expert-review-mark.tsx:25`). 입력란 `text-control`(`native-select.tsx:15`, `globals.css:369-373`). computed 크기 표본은 렌더 미확인 |
| S-06 | 일치 | 간격·반경 대괄호 0건, 기본 그림자 0건. 그 밖의 대괄호 값은 `active:scale-[0.975]`, `tracking-[0.02em/0.04em/0.06em/0.14em]`, `transition-[..]`, `backdrop-blur-[22px]`(`site-nav.tsx:82`), `grid-cols-[1.5fr_1fr_1fr_1fr_1.2fr]`(`site-footer.tsx:76`)이다. 모두 기준서에 적힌 [HO] 값이며, v2.4에서 2.4 예시 목록에 명시했다 |
| S-07 | 일치 | 스크린샷 375에서 가로 넘침 없음(`m_0~m_3`). 빌더 E2E `static-pages.spec.ts:64` 6로케일×375 통과(보조 근거, 최종 판정은 QA) |
| S-08 | **불일치** | 버튼 `sm` h-11(`button.tsx:38`), 탭 h-11(`tabs.tsx:34`), 언어 전환기·버거 44px로 대부분 맞다. 그러나 **푸터 하단의 6개 언어 바로가기 알약이 `h-8.5`(34px)**이다(`site-footer.tsx:170`). <1025px에서도 그대로라 B-10 "언어 전환 44px"에 미달. 푸터 열 링크 `min-h-8`(`:94`, `:150-158`)은 글자 링크라 3.3 대상 밖(관찰 5) |
| S-09 | 일치 | `OutcomeCard` 아이콘+라벨(`outcome-card.tsx:13-29, 55-58`). 등급·공개 배지는 이 Phase에 없음 |
| S-10 | 일치(v2.4) | `ui/`: badge·button·card·dropdown-menu·sheet·tabs·native-select. avatar 없음. button variant 7종·size 3종, 모두 `rounded-full`(`button.tsx:13-40`). native-select는 v2.4에서 3.1에 추가(3절 #3) |
| S-11 | 일치 | lucide만 사용. `strokeWidth` 1.5. 2인 곳은 `Check` 2건(`audience-selector-client.tsx:199`, `about/page.tsx:46`)뿐이고, `logo.tsx`의 2.2는 3.1 로고 규격이다. `dropdown-menu.tsx:94` `CheckIcon`은 기존 shadcn 파일(P0a) |
| S-12~S-15 | 해당 없음 | 위저드 없음(P1c) |
| S-16 | 일치 | 비자 표시는 `VisaLabel`(`outcome-card.tsx:60`)과 위젯 비자 박스(코드+이름, DB `nameKey`)다. 관찰 6(G-1 이름 중복) 참고 |
| S-17 | 일치 | `OutcomeCard:61-63`, `ScoreResult:97-99` 면책 문구가 항상 보이고 끄는 prop이 없다. 빌더 E2E WO15-09에서 확인됨 |
| S-18 | 일치 | ko `visa.outcome` = 가능성 높음/확인 필요/어려움 3개. 단정 표현 없음. `visa.outcomeReviewNote` "[전문가 검토 필요]"(messages, SC-12, 확인 방법 = messages ko) |
| S-19 | 일치 | `/terms`·`/privacy`가 `LegalDocument` → 제목 아래 `ExpertReviewMark`(`legal-document.tsx:28`), 비 ko는 한국어 원문 병기(`:31-60`). 배지 자체도 한국어 원문+번역(`expert-review-mark.tsx:26-28`). 가이드도 표시(`guide/[slug]/page.tsx:88`). 관찰 1(about·fees) 참고 |
| S-20 | 일치 | `/demand` `NoticeBox`가 표 위(`demand/page.tsx:62`), 메인 미리보기는 지도 위(`demand-preview.tsx:45`). 6개 언어 키 존재(i18n:check), 빌더 E2E 6로케일 통과. 직접 렌더는 미확인(플래그 off 스크린샷만 있음) |
| S-21 | 일치 | 버튼은 `DemandActions`의 2개뿐(`demand-actions.tsx:68-82`). 미리보기의 "수요 지도 자세히 보기"(`demand-preview.tsx:37`)는 글자 링크라 버튼이 아님 |
| S-22 | 일치 | 메인: 히어로 통계 띠·위젯·최종 CTA, `/fees:39`. 구직자 등록 화면은 아직 없음(P1c) |
| S-23 | 일치 | ko 매치는 "사회보장"(업종명)과 "보장하지 않습니다"(부정문)뿐. en·vi·ru·zh·uz에서 apply/guarantee/chat류 0건(en `expertReviewNote` 내부 설명 1건 제외). qa:static 경고 14건은 기업 대상 "수수료 안내"·"유료직업소개소"(법정 명칭) |
| S-24 | 일치 | `tel:`은 site.config 연락처를 쓰는 3곳뿐(푸터 `:68`, 최종 CTA `:89`, 서랍 `site-nav.tsx:189`). `mailto:`는 푸터(값 있을 때)만. 메신저 링크 0건(나머지 매치는 pii-guard 탐지 패턴) |
| S-25 | 일치 | `/demand` 플래그 off → `ComingSoon` + noindex(`demand/page.tsx:20-27, 38-43`). 내비(`site-nav.tsx:65-66`)·푸터·메인(`page.tsx:36,43`)·sitemap(`sitemap.ts:30`)에서 숨김. API는 이 Phase에 없음 |
| S-26 | 일치 | `/score/e74` 게시 점수표 없으면 `ComingSoon`(+상담 신청) + noindex(`score/e74/page.tsx:18, 42-43`) |
| S-27 | 해당 없음 | 등급 표시 없음 |
| S-28 | 일치 | 6개 파일 첫 키 `"_review": "native review required"` |
| S-29 | 일치 | i18n:check 오류 0 |
| S-30 | **불일치** | 키 대부분은 3.6 형식이다(`public.home.{hero,audience,metrics,visaWidget,demandPreview,finalCta}`, `visaType.*.name`). 그러나 **최상위 영역 `score`**가 3.6 영역 목록(common, public, seeker, employer, visa, visaType, legal, errors, nav, footer, meta)에 없다(ko 최상위 키 `score`). |
| S-31 | 일치 | `eslint.config` `react/jsx-no-literals`(`noStrings`, 기호만 허용)가 `[locale]/**`·`components/**`에 적용된다. 빌더 lint 통과 로그. 직접 lint는 돌리지 않음 |
| S-32 | 일치 | `toLocaleString`·문자열 연결 0건. 숫자·통화·날짜는 `format.number/dateTime`(`count-up.tsx:62`, `score-result.tsx:42`, `demand-view.ts:39` KRW, `legal-document.tsx`, 가이드) |
| S-33 | 해당 없음 | 동의서 없음(P1c). `content/consents/` 아직 없음 |
| S-34 | 일치(v2.4) | `src/` 최상위 새 폴더 없음. `agency/` 없음. `components/public/`·`lib/demand/`·`lib/seo/`는 v2.4 트리에 추가(PLAN P1a가 지정). 관찰 3(`(public)/employer/candidates`) 참고 |
| S-35 | 일치 | components·app 파일은 kebab-case, lib 신규 파일은 camelCase(`referenceData.ts`, `fontsZh.ts`, `aggregate.ts`, `jsonld.ts`), WO 지정명 `evaluate.ts`·`e74.ts`. brand.css 클래스는 `vj-`와 HO 계약 `.reveal`·`.js-reveal`뿐 |
| S-36 | 일치 | `any` 0건, typecheck 통과 |
| S-40 | 일치 | 서버 액션 3개(`evaluateVisaAction`, export된 `runVisaCheck`, `scoreE74Action`) 모두 첫 문장이 `// rbac: public — 사유`(`evaluateVisa.ts:26, 55`, `scoreE74.ts:17`). Route Handler 0개 |
| S-41 | 해당 없음 | `/admin` 화면 없음(P1b). noindex 헤더만 있음(`middleware.ts:9-16`) |
| S-42 | 일치 | `z.object(`가 `src/schemas/**` 밖에 0건(새 스키마 `schemas/{guide,score,visa}/`) |
| S-43 | 일치 | 0건 |
| S-44 | 일치 | 0건 |
| S-45 | 일치 | `notifications/console.ts:19`만 해당하며 4.7 예외(P0c에서 확인, 변경 없음) |
| S-46 | 일치 | 이 Phase에 4.8 대상 행위 없음, `audit.ts` 변경 없음 |
| S-47 | 일치 | 0건 |
| S-48 | 일치 | 검사 1(비자 코드 리터럴) 0건. 검사 2는 주석의 문서 번호(`BR-11`, `WO §15-9`, `E-7-4`)만 걸리고 숫자 상수는 0건. 검사 3 매핑 상수 0건. 판정은 DB 규칙 조건 JSON 비교만 한다(`evaluate.ts:1-8`). 위젯 비자 목록은 DB(`referenceData.ts:12-18`) |
| S-49 | 일치 | 시드 변경 없음 |
| S-50 | 일치(해소) | `src/` 안 테스트 0건. 새 단위 테스트가 미러 규칙을 따름: `tests/unit/lib/{visa-engine/evaluate, score/e74, demand/aggregate}.test.ts`, `tests/unit/db/seed-name-keys.test.ts`. P0c `db.test.ts` 해소 |
| S-52 | 해당 없음 | Route Handler 0개 |
| S-53 | 일치 | 새 운영 수치(30일, 표본 5, 급여 구간 10만, 리드 등급)는 `config/limits.ts` 한 곳. rg 결과의 나머지는 Tailwind 유틸(`/60` 등)과 SVG 지도 좌표(`demand-map.tsx`, 기하값) |
| S-54 | 일치 | `site.config.ts`에 `siteUrl`만 추가, 플래그 파일 변경 없음 |
| S-55 | 일치 | `<html lang={locale}>`(`layout.tsx:56`). `localeNames` 6개 자국어 표기(`i18n/locales.ts:8-15`). 2차 언어 0건. 경로 유지·전환은 렌더 미확인(빌더 E2E R-014 통과) |
| S-56 | 일치 | `.gitignore`에 3줄 추가, `.env.example` 2줄(값 없음) |
| S-57 | 일치 | `opacity: 0`은 `.vj-art`(`brand.css:191`, 대상 카드 장식 아트, `aria-hidden`)뿐. `vj-panel-in` 키프레임은 transform만(`:409-412`). 대상 카드는 `?for=` 링크라 JS 없이도 패널이 바뀐다. 빌더 E2E S-57 통과 |
| S-58 | 일치 | 전역 0.001ms(`globals.css:389-397`), reveal 즉시 `is-in`(`reveal-controller.tsx:29-32`), 카운트업 정지(`count-up.tsx:23`), 자석 끔(`:61-62`), 필름·메시 층은 `prefers-reduced-motion: no-preference`에서만(`brand.css:95, 374`). 빌더 E2E S-58 통과 |
| S-59 | 일치 | 렌더 순서 Hero→대상→실적(라이선스)→위젯→수요(플래그)→최종 CTA(`page.tsx:38-45`, `_ko_1440.png`). `components/home/`에 제외 섹션 파일 0개, 필름 모달·FAB·마퀴 없음 |
| S-60 | 일치 | 예시 숫자 0건. 지표는 `site.metrics`가 비면 미렌더(스크린샷에 지표 행 없음, 라이선스 카드만) |
| S-61 | 일치 | `CountUp` 초기 상태가 최종값(`count-up.tsx:20`). 운영자 값이 없어 화면 확인은 못 함(코드 근거) |
| S-62 | 일치(v2.4) | `<video>`·`<iframe>` 0건. 움직이는 층은 `display:none` + ≥1025px·no-preference에서만(`brand.css:93-100`). 모바일 LCP는 히어로 부제 `<p>`(`.lighthouse/summary.json`, /ko 성능 86) — v2.4 "히어로 텍스트(H1 또는 부제)" 충족(3절 #6) |
| S-63 | 일치 | rg 매치는 모두 `text-brand-blue-600/700`(패턴 `\b` 오탐)이고, `text-n400`·`text-white/1x~4x`는 0건. 어두운 면 글자는 `white/60` 이상, 아트 위는 `white/72`(`audience-selector-client.tsx:103-136`). 흰 글자 버튼은 `--grad-cta`(`button.tsx:26`). Lighthouse 접근성 /ko·about·fees·terms 모두 100. axe는 직접 돌리지 않음 |
| S-64 | 일치 | `seeker` 버튼은 최종 CTA 구직자 카드(`final-cta.tsx:56`)와 수요 지도 "알림 받기"(구직자 행동, `demand-actions.tsx:69`)뿐. 주황 점은 구직자 섹션 인사 알약(`visa-widget.tsx:41`). 기업 주 행동은 `brand`/`default` |
| S-65 | 일치 | `keep-all`은 `:lang(ko)`에만, 나머지 로케일은 `normal`(`globals.css:354-359`). vi 제목 줄간격 1.2(`:320-324`). `overflow-wrap:anywhere`(`:349`). zh·vi 렌더 미확인 |
| S-66 | 일치 | 메인에서만 투명(`site-nav.tsx:36, 71`). 높이 64/76/66(`:89-90`). <1025px 버거 → Radix Dialog sheet(포커스 트랩·Esc·스크롤 잠금·포커스 복귀), ≥1025px 리사이즈 시 닫힘(`:51-53`). 키보드는 렌더 미확인. 관찰 4 참고 |
| S-67 | 일치 | K-01(메신저 0), K-02(협력 소개소 카드 "준비 중"+상담 신청, C-15 가안), K-03·04·05·09·16·19(해당 섹션 없음), K-06(공고 목록·수 없음, 위젯·미리보기로 변형), K-07(고정 문구+`/fees`), K-10·11·13·14(rg 0건, 6개 언어), K-12(JSON-LD 3종만), K-15(site.config), K-17(문구 사용 + `hero.expertReviewNote`), K-18(서비스 흐름 없음), K-20(좌표 없음, 등록번호만) |
| S-68 | 일치 | 위젯 비자 목록은 DB `VisaType`(`registrable`만, `visa-widget.tsx:21-29`), 결과는 `evaluateVisaAction` → `evaluate.ts` → `OutcomeCard` |
| S-69 | 일치 | `outline-none` 1건(`native-select.tsx:18`)은 `focus-visible:border-brand-blue ring-4 ring-brand-blue/13`과 함께 쓰임(2.8 입력 글로). 전역 `:focus-visible` 2px blue / offset 3px(`globals.css:381-385`) |
| S-70 | 일치 | 플레이스홀더 0건(`pii-guard.ts:101` 주석 예시는 무관). 푸터·히어로·라이선스·about은 site.config 값 |
| S-71 | 일치 | JSON-LD 타입은 `Organization`·`FAQPage`·`BreadcrumbList`로 제한(`seo/jsonld.ts:12`) |
| S-72 | 일치 | 공개 화면에 구직자 프로필·고객사명·로고 없음(스크린샷, `components/home/`) |

### 2.2 3·4절 규칙

| 번호 | 규칙 | 판정 | 근거 |
|---|---|---|---|
| A-1 | 3.2 SiteFooter 열 `1.5fr 1fr 1fr 1fr 1.2fr`, ≤1024 3열, ≤760 2열 [HO `site3.css:300, 540, 582`] | **불일치** | `site-footer.tsx:76` `grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[…]`. 실제 동작: ≤400 1열(HO 2열), 761~1024 **2열**(HO 3열), 1025~1180 **3열**(HO 5열). 경계가 한 칸씩 밀렸다. 375 스크린샷 `m_3.png`에서 1열 확인 |
| A-2 | 3.1 sheet 링크 22px/600 | 일치(v2.4) | `site-nav.tsx:168` `text-h3 font-semibold`. 22px 토큰이 없어 기준을 `text-h3`로 정정 |
| A-3 | 2.3.3 폰트 선언 위치·로딩 | 일치(v2.4) | `fonts.ts`(KR·Inter), `fontsZh.ts`(SC), 지연 로더 `zh-font-loader.tsx`. 스택 순서는 S-04 불일치 |
| A-4 | 3.1 accordion(FAQ) | 일치(v2.4) | `guide/[slug]/page.tsx:100-107` 펼친 `<dl>`, 행 18px(`py-4.5`), `--n200` 구분선, 제목 `text-body`/600 navy, 내용 `text-dense` n700 |
| A-5 | 4.2 `components/public/` | 일치(v2.4) | PLAN P1a "만들 파일"에 `src/components/public/**`가 있다. 메인 섹션(home/)과 역할이 구분됨 |
| A-6 | 3.7 #3 패널 3열 | 일치 | `audience-selector-client.tsx:180` `lg:grid-cols-3`. 기준은 "3열"이고 비율은 정하지 않았다. v2.4에서 HO 비율 또는 균등 3열로 명시. ≤1024 1열은 HO `site3.css:523`과 같다 |
| A-7 | "상담 신청" 목적지 | 일치(v2.4) | `coming-soon.tsx:9` `CONSULT_HREF = "/about#contact"`를 OutcomeCard·ComingSoon·협력 소개소 카드가 같이 쓴다. `/about#contact` 블록이 있고(`about/page.tsx:62-77`) `scroll-mt-24` 적용 |
| A-8 | 4.10 테스트 위치(P0c 재확인) | 일치 | S-50 |
| A-9 | SC-07 플래그 off `/demand` | 일치 | ComingSoon 200 noindex. PLAN P1a 작업 6의 "플래그 off → 404"는 SC-07(사람 결정)과 다르다. 결정이 우선이므로 구현이 맞고, PLAN 문구 정정은 오케스트레이터 몫 |

## 3. 빌더 보고 차이 판단과 STANDARD v2.4 보완

| # | 빌더 보고 | 판단 | STANDARD 변경 |
|---|---|---|---|
| 1 | Pretendard → Noto Sans KR, Pretendard 파일 미사용 보관 | **수용.** SC-11 사전 승인 조건(측정 미달 58~81 → 86)을 충족했다 | 2.3.1 적용 표기, 2.3.2 ko·en·vi·ru·uz 스택, 2.3.3 Noto Sans KR 행 신설(Pretendard 행 폐지), S-03·S-04 문구. `src/fonts/`는 import 없는 보관만 허용(4.2 주석) |
| 2 | Noto Sans SC를 `fontsZh.ts`로 분리, zh에서 하이드레이션 뒤 로드, Inter `preload:false` | **조건부 수용.** 분리 사유(루트 레이아웃 글꼴의 @font-face가 전 로케일 렌더 차단 CSS에 들어감)는 타당하다. 다만 로드 전에는 zh 스택에서 Noto Sans KR가 한자를 그려 2.3.1 취지를 어긴다 | 2.3.3 "선언 두 곳"(fonts.ts + fontsZh.ts), SC `weight:'variable'` 허용, Inter `preload:false` 허용, **2.3.2 zh 스택에 중국어 시스템 글꼴을 Noto Sans KR 앞에 두는 조건 추가** → 현재 구현은 불일치 #1 |
| 3 | 네이티브 `<select>`, FAQ 펼친 목록 | **수용.** HO도 지역·업종에 네이티브 `<select class="select">`를 쓴다(`index.html:602,617`). 공개 폼은 JS 없이 동작해야 한다(3.3). 펼친 FAQ는 JS 없이 보이고 JSON-LD 문구와 같다 | 3.1에 `native-select` 행 추가(공개 폼, 길이 제한 없음, 트리거 모양만 규정), accordion 행에 펼친 목록 허용 |
| 4 | `components/public/` | **수용.** PLAN P1a가 지정한 경로 | 4.2 트리에 `public/` 추가(+ `lib/demand/`, `lib/seo/`, `fontsZh.ts`, `guide.ts`, `referenceData.ts`) |
| 5 | 대상 패널 균등 3열 | **수용.** 3.7 #3은 "패널 3열"만 정했다 | 3.7 #3에 "HO 비율 `1fr 1.22fr 0.8fr` 또는 균등 3열"을 적고, 2.4 임의값 예시에 그 비율을 추가 |
| 6 | 모바일 LCP가 부제 문단 | **수용(기준 정정).** 3.8 규칙의 목적은 LCP가 영상·이미지·장식 층이 아니게 하는 것이다. 375px에서는 여러 줄 부제가 H1보다 면적이 커서 LCP가 되는 것이 정상이고, H1을 억지로 LCP로 만들 수단은 없다 | 3.8·S-62를 "히어로 텍스트(H1 또는 부제 문단)"로 정정 |
| 7 | "상담 신청" → `/about#contact` | **수용.** C-17이 지적한 경로 공백을 메움. 상수 한 곳 | 3.3에 목적지 규칙과 `CONSULT_HREF` 한 곳 관리 추가 |
| — | (검토 중 발견) sheet 링크 22px, `backdrop-blur-[22px]`·`tracking-[0.02em]`·푸터 열 비율 | 기준 공백(토큰 없음, 2.4 예시 목록 누락) | 3.1 sheet `text-h3`, 2.4 예시 추가 |

개정 이력에 v2.4 행을 추가했다.

## 4. 불일치 목록과 수정 지시

| # | 항목 | 위치 | 기준 | 실제 | 수정 지시 |
|---|---|---|---|---|---|
| 1 | S-04 / 2.3.1·2.3.2 | `src/app/globals.css:128-131` | zh 스택에서 Noto Sans SC 적용 전에도 한자를 한국어 글꼴로 그리지 않음 | SC 클래스는 하이드레이션 뒤에만 붙는다. 그 전과 JS 비활성 상태에서는 `--font-noto-sans-kr`(이미 적용됨)가 zh 한자를 그린다 | `html:lang(zh)`의 `--app-font-sans`를 `var(--font-noto-sans-sc,"Noto Sans SC"), var(--font-inter,"Inter"), "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", var(--font-noto-sans-kr,"Noto Sans KR"), var(--font-system-fallback)`로 바꾼다(또는 zh 스택에서 Noto Sans KR를 뺀다). 지연 로드 구조는 유지해도 된다 |
| 2 | S-08 / B-10 | `src/components/common/site-footer.tsx:170` | <1025px 언어 전환 터치 대상 44px 이상 | 푸터 6개 언어 알약 `h-8.5`(34px) | `h-11 lg:h-8.5`(또는 `min-h-11`)로 바꾸고 줄바꿈 간격은 `gap-y` 유지 |
| 3 | S-30 / 3.6 | `messages/*.json` 최상위 `score`, 사용처 `components/visa/score-*.tsx`, `server/actions/score/scoreE74.ts`, `layout.tsx:21` `CLIENT_NAMESPACES` | 영역은 3.6 목록 11개 | 최상위 `score` 영역 | 6개 파일에서 `score.*`를 `visa.score.*`로 옮기고 `t("score.…")` 호출과 `CLIENT_NAMESPACES`에서 `"score"`를 뺀다(`visa`가 이미 포함). 새 영역이 꼭 필요하면 먼저 기준 개정을 요청할 것 |
| 4 | 3.2 SiteFooter (A-1) | `src/components/common/site-footer.tsx:76-77` | >1024 5열, 761~1024 3열(브랜드 열 span 3), ≤760 2열(브랜드 span 2) | 1열(≤400)/2열(401~1024)/3열(1025~1180)/5열(≥1181) | `grid-cols-2 gap-6.5 md:grid-cols-3 md:gap-7.5 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1.2fr] lg:gap-8.5`, 브랜드 열 `col-span-2 md:col-span-3 lg:col-span-1` (HO `site3.css:300,540-541,582-583`의 간격 26/30/34px 포함) |

## 5. 점검표 밖 관찰 (판정에 넣지 않음, QA·오케스트레이터 몫)

1. PLAN P1a 작업 5는 "/about, /fees … 초안 + [전문가 검토 필요]"인데, `about/page.tsx`와 `fees/page.tsx`에는 `ExpertReviewMark`가 없다(커밋 메시지는 있다고 적음). STANDARD S-19는 "법적 문서"가 대상이고 두 페이지는 현재 사실 안내뿐이라 판정에서 뺐다. PLAN 완료 조건은 QA가 판단할 것.
2. 공개 화면에서 아직 없는 경로로 가는 링크가 많다: `/employer/diagnosis`(히어로 주 버튼·내비 CTA), `/seeker/register/quick`(내비·최종 CTA·수요 지도 "알림 받기"), `/seeker/register`, `/employer/request`(푸터). P1a에서는 모두 404다. 이후 Phase까지의 임시 처리(ComingSoon 등)를 둘지는 QA·오케스트레이터가 정할 것.
3. `src/app/[locale]/(public)/employer/candidates/page.tsx`: 4.2 트리상 `employer/`는 `(public)`과 나란한 폴더다. P2b에서 `[locale]/employer/candidates`를 만들면 같은 URL로 충돌하므로, P2b에서 이 파일을 옮기거나 지울 것.
4. 서랍 `SheetContent`는 `z-40`, 헤더는 `z-50`(`sheet.tsx:38`, `site-nav.tsx:79`). 열린 상태에서 헤더(버거)가 서랍의 닫기 버튼(`top-5`) 위에 겹쳐 보일 수 있다. 렌더 미확인, QA 키보드·터치 확인 대상.
5. 푸터 열 링크 `min-h-8`(32px)은 3.3 "링크 버튼"에 해당하지 않아 판정에서 뺐다. WCAG 2.5.8(24px)은 충족한다.
6. 비자 위젯 마지막 칸이 "G-1 / 기타(G-1)"로 코드가 두 번 보인다(`messages/ko.json` `visaType.g1.name` = "기타(G-1)", P0b 시드 키). VisaLabel 규칙(코드 + 쉬운 설명)상 이름에서 코드를 빼는 편이 맞다. P0b 산출물이라 판정에서 뺐다.
7. `sitemap.ts`는 `/score/e74`를 항상 뺀다. 주석은 "준비 중일 때만"이다. 점수표가 게시되면 넣도록 조건을 달지 QA가 확인할 것.
8. 빌더 E2E 1건 실패(`seo.spec.ts:69` zh guide 타임아웃)는 QA 몫이다.
