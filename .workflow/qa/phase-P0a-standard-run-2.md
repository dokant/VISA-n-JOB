# Phase P0a — 기준 일치 검토 (run 2)

- 대상 커밋: `b192681` (feat: P0a run 2 - STANDARD v2 tokens, fonts, brand logo, operator config)
- 기준: `.workflow/STANDARD.md` v2.0 → 검토 중 **v2.1로 보완**(아래 3절). 판정은 v2.1 기준.
- 검토자: wf-standard (모드 B), 2026-11-16
- 실행한 확인: S-02·S-03·S-05·S-06·S-11·S-36·S-50의 `rg` 명령, `corepack pnpm i18n:check`(오류 0), `corepack pnpm qa:static`(오류 0·경고 0), `corepack pnpm typecheck`(통과). 렌더링은 하지 않음 — P0a 적용 항목은 모두 코드·파일 대조로 판정 가능(렌더 항목 S-05·S-07·S-08은 P1).
- 범위 밖(해당 없음): S-40, S-43, S-44, S-45, S-46, S-47, S-49, S-52, S-53은 P0 항목이지만 대상 코드(서버 액션·Route Handler·Prisma·시드·감사)가 아직 없음 → P0b/P0c에서 판정.

## 1. 결과 요약

**일치 14 / 15**, 불일치 1 (S-11), 기준 보완 필요 0 (빌더 보고 차이 5건은 v2.1에 반영해 해소).

## 2. 항목별 판정

| 번호 | 판정 | 근거 (파일:줄) |
|---|---|---|
| S-01 | 일치 | `src/app/globals.css:18-42` 2.1.1 hex 전부 일치(소문자 표기), `:45-48` 틴트, `:51-59` 그라디언트(`--grad-cta` #245AE0→#0E7490), `:62-71` 판정색, `:89-108` shadcn 변수(`--input` #868E9C `:106`, `--accent-foreground` `var(--blue-700)` `:102`, `--radius` 16px), `:135-210` `@theme inline` 색·반경(2xs 4px, xs~xl = `--r-*`, calc 파생식 제거), `:213-296` 그림자 8종·이징·브레이크포인트(401/761/1025/1181px)·`--text-*`. 표 밖 추가 `--color-brand-orange-hover`(`:168`), `--blur-glass`(`:230`), `--text-control`(`:268`)은 v2.1에서 기준에 등재 |
| S-02 | 일치 | 명령 결과 0건(globals.css·brand.css 제외). 로고 그라디언트는 `style={{ stopColor: "var(--blue)" }}`(`src/components/common/logo.tsx:37-38`). `@theme`의 `--color-*: initial`(`globals.css:136`)로 기본 팔레트 제거 |
| S-03 | 일치 | `src/lib/fonts.ts:1-2` `next/font/local`·`next/font/google`만. CDN 패턴 0건. Pretendard 정적 서브셋·`preload: false`(`fonts.ts:14-23`)는 v2.1 2.3.3과 일치. `src/fonts/` 4파일 + `OFL.txt` |
| S-04 | 일치 | 스택: 기본(ko) Pretendard 1순위 `globals.css:113-114`, en·vi·ru·uz Inter 1순위 `:118-124`, zh Noto Sans SC 1순위 `:126-130`. Inter 서브셋 `latin, latin-ext, vietnamese, cyrillic, cyrillic-ext`(`fonts.ts:36`). Noto Sans SC className은 zh에만(`src/app/[locale]/layout.tsx:41`). keep-all은 `:lang(ko)`만(`globals.css:352-357`), vi 제목 줄간격 1.2(`:318-322`) — S-65(P1) 선적용 확인 |
| S-06 | 일치 | 간격·반경 임의값 0건, 그림자 임의값·기본 그림자 0건(유일한 매치 `globals.css:214`는 주석). 기타 임의값 `active:scale-[0.975]`(`src/components/ui/button.tsx:15`), `transition-[..]`(`:14`), `tracking-[0.06em]`·`tracking-[0.14em]`(`logo.tsx:64,67`)는 v2.1 2.4 허용 범위([HO] 측정값) 안 |
| S-10 | 일치 | `src/components/ui/` = button, dropdown-menu(둘 다 3.1 목록), avatar 없음. `button.tsx:21-41` variant 7종·size 3종, 공통 `rounded-full`(`:13`). 측정값: sm `h-11 lg:h-10.5`(44/42px)·px 16·13.5px, default 52px·24px·`text-ui`, lg 60px·30px·16px, 아이콘 간격 10px, 화살표 3px, 누름 .975, disabled .45, 각 variant 색·그림자 3.1과 같음. dropdown-menu 236px·p 8px·`rounded-md`·`shadow-2`·행 9/11px·13.5px·선택 행 accent/600(`dropdown-menu.tsx:40,68`) |
| S-11 | **불일치** | lucide-react만 사용(다른 아이콘 패키지 없음, `package.json`). `locale-switcher.tsx:55,60`은 `strokeWidth={1.5}`. 그러나 `src/components/ui/dropdown-menu.tsx:124` `CircleIcon`, `:195` `ChevronRightIcon`에 strokeWidth 지정이 없어 lucide 기본값 2 (`:94` `CheckIcon`은 체크라 2 허용) |
| S-28 | 일치 | `messages/{ko,en,vi,ru,zh,uz}.json` 2행 첫 키 `"_review": "native review required"` |
| S-29 | 일치 | `pnpm i18n:check` 6개 로케일 오류 0·경고 0(키 9개) |
| S-30 | 일치 | 키 9개 전수: `meta.siteName`, `meta.home.{title,description}`, `common.localeSwitcher.label`, `common.notFound.{title,description,cta}`, `public.home.{title,description}` — 영역이 3.6 목록 안, lowerCamelCase. (표본 20개 기준이나 키가 9개뿐이라 전수 확인.) `public.home.title`은 임시 페이지용이며 P1a에서 `public.home.{hero…}`로 교체 예정 |
| S-34 | 일치 | `src/` 최상위 = app, components, config, fonts, i18n, lib, middleware.ts — 모두 4.2 트리 안. `src/app/brand.css` 있음, `globals.css:3`에서 import. `agency/` 없음. `components/home/`은 아직 없음 — 메인 섹션은 P1a 범위라 P0a 불일치로 보지 않음(P1a에서 재확인) |
| S-35 | 일치 | 컴포넌트 kebab-case(`locale-switcher.tsx`, `logo.tsx`, `button.tsx`, `dropdown-menu.tsx`), export PascalCase, `src/lib/fonts.ts`·`utils.ts` camelCase, `site.config.ts` WO 이름. brand.css 클래스 6개 모두 `vj-` 접두(`brand.css:9-35`) |
| S-36 | 일치 | `tsconfig.json:7` `"strict": true`, `any` 0건, `tsc --noEmit` 통과 |
| S-50 | 일치 | `src/` 안 `.test/.spec` 0건 |
| S-54 | 일치 | `src/config/site.config.ts`, `src/config/flags.ts`. 플래그 4종, `"true"`일 때만 켜짐(`flags.ts:14-16`) — 기본 false. site.config 값이 SITE_INFO와 같음(대표자 정충교, 사업자 748-39-01213, 행정사 24-SU-RG-042, 직업소개 제2026-3230291-14-5-00014호, 주소, 02-6281-8901), 워드마크 "VISA n JOB"·국문 "비자앤잡"(Q-07), 실적 지표 빈 목록(PC-7, `:90`), 휴대전화는 `getInternalContact()`만(`:137-139`, 기본값 ""), 계좌 항목 없음(Q-06) |

## 3. 불일치 목록과 수정 지시

| # | 항목 | 위치 | 기준 | 실제 | 수정 지시 |
|---|---|---|---|---|---|
| 1 | S-11 | `src/components/ui/dropdown-menu.tsx:195` (`ChevronRightIcon`), `:124` (`CircleIcon`) | 3.1 "아이콘 `strokeWidth={1.5}`(체크 아이콘은 2 허용)" | strokeWidth 미지정 → 2 | 두 아이콘에 `strokeWidth={1.5}`를 넣는다(`CheckIcon`은 그대로 둬도 됨). 현재 사용처 없는 하위 컴포넌트지만 언어 메뉴 확장 시 그대로 노출되므로 지금 맞춘다 |

## 4. 빌더 보고 차이 5건 판단과 STANDARD v2.1 보완

| # | 빌더 보고 | 판단 | STANDARD 변경 |
|---|---|---|---|
| 1 | Pretendard: 가변 KS X 1001 서브셋 요구 → 정적 서브셋 4굵기로 구현 | **수용.** 빌더가 받은 공식 패키지 `pretendard@1.3.9`의 `dist/web/` 구조를 검토 중 확인: `static/woff2-subset/`에 정적 `.subset.woff2` 9굵기, `variable/`에는 `woff2/PretendardVariable.woff2`(전체본)와 `woff2-dynamic-subset/`(unicode-range 분할)만 있고 가변 KS X 1001 서브셋은 없음. "Pretendard Std는 한글 0자"는 직접 검증하지 못했지만 어느 쪽이든 결론은 같음. 4굵기(400/500/600/700)는 2.3.4 타입 스케일이 쓰는 굵기와 일치 | 2.3.3 Pretendard 행 교체(정적 서브셋 4굵기, 파일명, 약 1.07MB, 추가 굵기 금지) |
| 2 | `preload: false` | **수용.** next/font의 preload는 선언·레이아웃 단위라 `[locale]/layout.tsx` 하나에서 ko만 preload할 수 없음. 한국어 LCP는 SC-11 측정 조건으로 관리 | 2.3.3 같은 행에 `preload: false`와 사유, 측정 미달 시 SC-11 경로 명시 |
| 3 | 토큰 추가 `--text-control`(16px), `--color-brand-orange-hover` | **수용.** `--orange-hover`는 2.1.1에 이미 있으나 2.2.2 노출 표에서 빠진 기준 공백. 16px는 B-08 입력 글자·`lg` 버튼에 필요한데 2.3.4에 이름이 없었음. 빌더가 추가한 `--blur-glass`(14px, glass 버튼)도 같은 성격이라 함께 등재 | 2.2.2에 `--color-brand-orange-hover`·`--blur-glass` 추가, 2.3.4에 `text-control` 행 추가 |
| 4 | 휴대전화는 환경변수에서만 읽음(코드 기본값 없음) | **수용.** Q-06(공개 화면 미표시)·SITE_INFO "설정에만 보관"과 맞고 더 보수적. 공개 `siteConfig` 객체에도 들어가지 않음(`site.config.ts:97-134`) | 4.2 트리 site.config 설명에 휴대전화(env 전용)·계좌(항목 없음) 명시 |
| 5 | `active:scale-[0.975]`, `tracking-[0.06em]` 등 간격 외 임의값 | **수용(조건부).** v2.0 2.4의 임의값 금지는 간격 맥락이었고 자간·변형 값은 규정이 없었음(기준 공백). 값이 모두 핸드오프 측정값(`tokens.css:207` `.btn:active scale(0.975)`, `site.css:41-43` `.logo__word` 0.06em·0.14em) | 2.4에 "간격 외 대괄호 임의값" 규칙 추가: 간격·반경·글자 크기·그림자·색은 계속 금지, 그 밖의 속성은 기준서에 적힌 [HO] 측정값만 허용. S-06 확인 방법에 대조 명령 추가 |

그 밖의 v2.1 변경: 3.2 `Logo` 워드마크 크기를 `text-body`(17px, ≤760 16px)로 바꿈 — 구현(`logo.tsx:64`)이 토큰을 쓰고 있고, 17px 고정을 위해 토큰을 하나 더 만드는 것보다 낫다고 판단. 개정 이력에 v2.1 행 추가.

## 5. 점검표 밖 관찰 (판정에 넣지 않음, 다음 run 또는 P1에서 처리 권고)

1. `src/components/common/locale-switcher.tsx:49` — `tracking-wide`(0.025em). 3.2 LocaleSwitcher 기준은 13px/600 **0.04em**(핸드오프 `site.css:73`). v2.1 2.4 허용 범위에 따라 `tracking-[0.04em]`으로 바꾼다. 밝은 면 hover 테두리 `border-input`은 핸드오프 `--n400`(장식 테두리) 대신 쓴 것으로, 비텍스트 대비가 더 높아 문제 없음.
2. `src/app/not-found.tsx:11` — JSX 안 한국어 리터럴. locale 없는 경로(사실상 `/admin/*`)용 전역 404라 3.6 관리자 예외에 해당한다고 봄. S-31(P1) 때 같은 판단을 유지하려면 파일 주석(`:5`)을 그대로 둘 것.
3. `.workflow/SITE_INFO.md`(대표 휴대전화 포함)가 커밋 `b192681`에 들어 있음. Q-06이 저장소 보관을 막는 것은 입금계좌뿐이라 위반은 아니나, 저장소를 공개할 계획이 있다면 사람이 확인할 것.
4. `globals.css:383` `:focus-visible { border-radius: 4px }`는 핸드오프 `:focus-visible` 규칙 그대로이며 `rounded-*` 유틸이 있는 요소는 유틸이 우선(레이어 순서). S-69(P1) 렌더 시 버튼 포커스 링이 알약 모양인지 확인.
