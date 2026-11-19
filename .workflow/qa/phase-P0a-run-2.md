# QA 보고서 — Phase P0a / run 2

- 대상: Phase P0a (회귀 + 디자인 토큰·폰트·브랜드·site.config 값 반영)
- 기준 문서: PRD (R-001, R-002, R-003, R-014, R-015, N-06), PLAN "### P0a", DECISIONS (Q-05, Q-06, Q-07), SITE_INFO.md
- 일시: 2026-11-16
- 검증 대상 커밋: `b192681 feat: P0a run 2 - STANDARD v2 tokens, fonts, brand logo, operator config`
- 원본 파일 수정 없음. 임시 파일(스크래치 폴더의 메시지 사본·브라우저 점검 스크립트)과 임시 서버(포트 3101)는 시험 후 삭제·종료함

## 결과 요약
- 통과: 8 / 전체: 8 (통과율 100%) — PRD 6개 + 결정 반영 2개(Q-06, Q-07)
- 필수 항목 실패: 0개
- 사람 확인 필요: 2건 (아래)

## 검증 명령 실행 결과 (모두 `corepack pnpm <script>`, 프로젝트 루트)
| 명령 | 종료 코드 | 핵심 출력 |
|---|---|---|
| `lint` | 0 | `eslint .` 출력 없음 |
| `typecheck` | 0 | `tsc --noEmit` 출력 없음 |
| `test` | 0 | Test Files 4 passed, Tests 36 passed (36) — flags 17, site-config 5, i18n 6, qa-rules 8 |
| `i18n:check` | 0 | ko/en/vi/ru/zh/uz 모두 `[OK] 0 error(s), 0 warning(s)`; `source ko: 9 key(s), locales: 6, errors: 0` |
| `qa:static` | 0 | `16 line rules + structural checks, errors: 0, warnings: 0` |
| `build` | 0 | `✓ Generating static pages (10/10)`, `/[locale]` SSG(ko,en,vi,+3), `/[locale]/[...rest]` 동적, Middleware 47.4 kB. 실행 전 3100 포트 비어 있음 |
| `test:e2e` | 0 | 24 passed (38.1s) — desktop-chromium 12 + mobile-375 12 |

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| R-001 | `pnpm build` 성공, `tsconfig` `strict: true`, git 저장소 존재 | build 실행, tsconfig 확인, git log | Pass | build EXIT=0. `tsconfig.json:7 "strict": true`. `git log` → `b192681`, `9b0f28d`. run 2 커밋은 tsconfig·package.json을 바꾸지 않음(`git diff --stat 9b0f28d b192681 -- tsconfig.json package.json` 빈 결과) |
| R-002 | `pnpm lint`, `pnpm test` 0 에러. pre-commit 훅이 lint-staged 실행 | lint·test 실행, `.husky/pre-commit` 열람, `core.hooksPath` 확인, 스테이징 없이 `sh .husky/_/pre-commit` 직접 실행(커밋 안 함) | Pass | lint EXIT=0, test 36/36 EXIT=0. `.husky/pre-commit` = `lint-staged`, `core.hooksPath` = `.husky/_`. 훅 실행 → `lint-staged could not find any staged files.` EXIT=0. `.husky` 변경 없음 |
| R-003 | `ci.yml`에 install→lint→typecheck→test | ci.yml `run:` 줄 확인 | Pass | 23 `corepack enable` → 26 `pnpm install --frozen-lockfile` → 29 `pnpm lint` → 32 `pnpm typecheck` → 35 `pnpm test` → 38 `i18n:check` → 41 `qa:static`. run 2에서 `.github` 변경 없음 |
| R-014 | 각 메시지 파일 `_review`, `i18n:check` 누락 키 0 (+ 6개 라우팅·언어 전환) | (1) `_review` grep (2) i18n:check (3) 음성 시험: messages를 스크래치에 복사 → en.json `meta.siteName` 삭제 → `tsx scripts/i18n-check.ts <스크래치>` (4) e2e | Pass | (1) 6개 파일 각 1회. (2) errors 0, EXIT=0. (3) `[FAIL] en: 1 error(s)`, `errors: 1`, EXIT=1. 스크래치 삭제, `git status messages` 변경 없음. (4) e2e: `/ko,/en,/vi,/ru,/zh,/uz` lang 일치, `/`→`/ko`·`/vi`, 언어 전환기 6개 언어·vi 전환, 404, `/admin` 비현지화 — 데스크톱·375px 모두 통과 |
| R-015 | site.config(사무소명·등록번호·대표자·주소) + 플래그 4종 기본 false | flags·site.config·.env.example·단위 테스트 열람 및 실행 | Pass | flags.test 17건 통과(미설정·"false" 등 → false, `.env.example` 4개 `=false`). `.env.example:4-7` 4개 `=false`. `src/config/site.config.ts`가 두 사업체의 상호·대표자·등록번호·주소·대표전화를 제공, env(`SITE_*`)로 덮어쓰기 가능, site-config.test 5건 통과 |
| N-06 | `.env` git 제외, `.env.example`만 커밋 | `.gitignore`, `git check-ignore -v`, `git ls-files`, 작업 트리 확인 | Pass | `.gitignore:30 .env*` → `.env`, `.env.local` 무시. `git ls-files` 중 env 파일은 `.env.example`만. 작업 트리에 `.env` 없음. `.env.example`의 `SITE_*`·`SITE_OPERATOR_MOBILE`은 모두 빈 값 |
| Q-06 | site.config 공개 값 = SITE_INFO, 계좌번호 저장소 전무, 010이 공개 객체·클라이언트 번들에 없음 | site.config와 SITE_INFO 대조, 계좌 패턴 grep(작업 트리·`git grep` HEAD·전체 리비전·`git log -p --all`·`--reflog`·도달 불가 객체), 빌드 산출물·응답 HTML grep | Pass | **값 대조**(`SITE_DEFAULTS`, site.config.ts 80~93행): 코리아비자행정사사무소 / 비자앤잡 유료직업소개소, 대표자 정충교(두 사업체 공통), 748-39-01213, 24-SU-RG-042, 제2026-3230291-14-5-00014호, 서울특별시 송파구 법원로9길 26 에이치비즈니스파크 C동 1층 128호, 02-6281-8901 — SITE_INFO와 일치(상호 표기는 아래 사람 확인 2). **계좌**: 패턴 `케이뱅크\|180221\|예금주\|계좌번호\|은행명들` → 작업 트리·HEAD·모든 리비전·`git log -p --all`·reflog·도달 불가 stash 커밋 2개(`99eef6f`, `c695374`)에서 번호 0건. 걸린 것은 규칙 문장(SITE_INFO:21 "입금계좌: 공개 화면에 표시하지 않는다"), 테스트 정규식(site-config.test.ts:42), lockfile 해시의 우연 일치(`SbKbANk…`)뿐. **010**: `getSiteConfig()`에 휴대전화 필드 없음, 내부용 `getInternalContact()`는 env만 읽고 기본값 빈 문자열. `.next/static` 전체에서 `[삭제됨]` 0건, `.next` 서버 HTML/RSC/JS 0건, 실행 서버의 `/ko`,`/en`,`/vi` 응답에서 `[삭제됨]`·`180221` 0건. `src` `messages` `scripts` `tests` `.env.example` `README.md` `CLAUDE.md`에도 0건 |
| Q-07 | 문자 표기 'VISA n JOB', Pretendard ko 적용·자체 호스팅(외부 CDN 없음), OFL 파일 | 소스·빌드 CSS 확인, 실제 서버(`next start -p 3101`)를 Playwright Chromium으로 열어 계산된 font-family·로드된 폰트·외부 요청 기록 | Pass | 표기: `SITE_DEFAULTS.brandWordmark = "VISA n JOB"`, `brandNameKo = "비자앤잡"`, `logo.tsx:22`가 `siteConfig.brand`에서 읽음. 브라우저에서 텍스트가 정확히 "VISA n JOB"인 요소 2개(ko/en/zh 각). 폰트: `src/lib/fonts.ts` `next/font/local`로 `src/fonts/Pretendard-{Regular,Medium,SemiBold,Bold}.subset.woff2`. 빌드 CSS의 `@font-face{font-family:pretendard;src:url(/_next/static/media/…woff2)`, 4개 파일 크기(267096/268324/268752/270784)가 `.next/static/media`에 그대로 존재. `/ko` body font-family 첫 항목 `pretendard`, 로드된 폰트 `pretendard 400/600/700`; `/en`은 Inter 우선, `/zh`는 Noto Sans SC 우선(STANDARD 2.3.2 순서). **외부 요청**: ko/en/zh 모두 localhost 외 요청 0건. `.next/static`·`.next/server`에 `fonts.googleapis\|fonts.gstatic\|jsdelivr\|cdnjs\|unpkg` 0건, CSS의 외부 `url()` 0건. 라이선스: `src/fonts/OFL.txt`(4419 B, "Copyright (c) 2021, Kil Hyung-jin … Reserved Font Name Pretendard", SIL OFL 1.1) |

## 결함 목록 (Fail만)
없음.

## 기준 외 발견 (결함 아님, 참고)
1. 사업자 등록 정보(대표자·등록번호·주소·대표전화)는 아직 어떤 화면에도 렌더링되지 않음(`ko.html`에서 0회). 푸터·회사 소개는 이후 Phase 범위이므로 P0a 판정에는 영향 없음. 화면 표시 확인은 해당 Phase에서 할 것.
2. `next/font/google`(Inter, Noto Sans SC)은 빌드 시 폰트를 내려받으므로 빌드에 인터넷이 필요함(fonts.ts 주석에 명시). 런타임 외부 요청은 없음을 확인함. 오프라인 빌드 환경이 필요하면 고려할 사항.
3. 도달 불가 git 객체(stash 생성 후 삭제된 것으로 보이는 `99eef6f "index on main"`, `c695374 "WIP on main"`)가 로컬에 남아 있음. 계좌 번호는 없음. `git gc` 전까지 로컬 `.git`에 유지됨.
4. PLAN P0a 파일 경로와 실제 경로 차이(run 1 기준 외 발견 1과 동일, 변화 없음).

## 판정불가 / 사람 확인 필요
1. **휴대전화 번호가 커밋에 포함됨(사실 기록, 결함 판정 아님)**: `.workflow/SITE_INFO.md` 10행·16행에 `휴대전화: [휴대전화 번호 삭제됨]`가 있고, 이 파일이 커밋 `b192681`로 추적됨(`git ls-files .workflow` 포함, `git grep "[삭제됨]" HEAD` → SITE_INFO.md:10, :16). 위 도달 불가 stash 커밋 `99eef6f`에도 같은 파일이 들어 있음. 현재 `git remote -v` 결과는 비어 있어 원격 저장소로 나간 적은 없음. Q-06은 "휴대전화는 설정에만 보관, 공개 화면 미표시"이고 저장소 보관 금지는 계좌에만 명시되어 있으므로, 저장소(향후 원격 공개 포함)에 개인 번호를 남겨도 되는지 사람이 결정할 것. 제거하려면 커밋 기록 재작성 + 도달 불가 객체 정리가 필요함.
2. **유료직업소개소 상호 표기**: SITE_INFO는 "비자앤잡(VISA N JOB) — 유료직업소개소", site.config 기본값은 "비자앤잡 유료직업소개소". 직업소개사업 등록증의 정식 상호와 같은지 사람이 확인할 것(공시 의무 표기).
- 실제 커밋으로 lint-staged가 스테이징 파일에 eslint/prettier를 적용하는지는 시험하지 않음(커밋 금지). 훅 체인 호출만 확인.
- CI 원격 실행은 범위 밖(R-003).
