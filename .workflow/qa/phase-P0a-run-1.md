# QA 보고서 — Phase P0a / run 1

- 대상: Phase P0a (프로젝트 골격·도구·i18n·설정)
- 기준 문서: PRD (R-001, R-002, R-003, R-014, R-015, N-06), PLAN "### P0a"·"공통 규칙", DECISIONS (Q-05, Q-06 포함)
- 일시: 2026-11-16
- 검증 대상 커밋: `9b0f28d chore: P0a project skeleton (Next.js 15, tooling, next-intl, config)`
- 판정 제외(호출자 지시): 디자인 토큰·글꼴(Q-05 STANDARD 개정 대기), site.config 실제 값 반영(Q-06, 이후 작업)

## 결과 요약
- 통과: 6 / 전체: 6 (통과율 100%)
- 필수 항목 실패: 0개

## 검증 명령 실행 결과 (모두 `corepack pnpm <script>`, 프로젝트 루트)
| 명령 | 종료 코드 | 핵심 출력 |
|---|---|---|
| `lint` | 0 | `eslint .` 출력 없음(경고·오류 0) |
| `typecheck` | 0 | `tsc --noEmit` 출력 없음 |
| `test` | 0 | Test Files 4 passed (4), Tests 32 passed (32) — flags 17, site-config 2, i18n 6, qa-rules 7 |
| `i18n:check` | 0 | ko/en/vi/ru/zh/uz 모두 `[OK] 0 error(s), 0 warning(s)`; `source ko: 10 key(s), locales: 6, errors: 0` |
| `qa:static` | 0 | `qa:static: 15 line rules + structural checks, errors: 0, warnings: 0` |
| `build` | 0 | Next.js 15.5.29, `✓ Compiled successfully`, `✓ Generating static pages (10/10)`, `/[locale]` SSG(ko,en,vi,…), Middleware 47.4 kB |
| `test:e2e` | 0 | 24 passed (42.2s) — desktop-chromium 12 + mobile-375 12. 실행 전 3100 포트 비어 있음 확인(기존 서버 재사용 아님), webServer가 `next build && next start` 수행 |

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| R-001 | `pnpm build` 성공, `tsconfig` `strict: true`, git 저장소 존재 | `corepack pnpm build` 실행, tsconfig 열람, `git log`, `components.json`·lucide 사용 확인 | Pass | build EXIT=0 (위 표). `tsconfig.json`의 `"strict": true`. `git log --oneline` → `9b0f28d chore: P0a project skeleton ...`. package.json: next ^15.5.29, tailwindcss ^4.3.5, lucide-react, radix-ui; `components.json`(shadcn, iconLibrary lucide); `src/components/ui/button.tsx`, `dropdown-menu.tsx` |
| R-002 | `pnpm lint`, `pnpm test` 0 에러 종료. pre-commit 훅이 lint-staged 실행 | lint·test 실행, `.husky/pre-commit` 열람, `git config core.hooksPath`, husky 래퍼 열람, 스테이징 없는 상태에서 훅 스크립트 직접 실행(커밋은 하지 않음) | Pass | lint EXIT=0, test 32/32 EXIT=0. `.husky/pre-commit` 내용 = `lint-staged`. `core.hooksPath` = `.husky/_` (husky 9 래퍼 `.husky/_/h`가 `node_modules/.bin`을 PATH에 넣고 `.husky/pre-commit` 실행). 훅 직접 실행 → `lint-staged could not find any staged files.` EXIT=0 (lint-staged 16.4.0 호출 확인). package.json `lint-staged`: ts/tsx/js → `eslint --fix`, `prettier --write`; json/css/md/yml → `prettier --write` |
| R-003 | `.github/workflows/ci.yml`에 install→lint→typecheck→test 단계 존재 | ci.yml 열람 | Pass | 단계 순서: Checkout → Setup Node.js(24) → `corepack enable` → Install `pnpm install --frozen-lockfile` → Lint `pnpm lint` → Typecheck `pnpm typecheck` → Test `pnpm test` → `pnpm i18n:check` → `pnpm qa:static`. 원격 실행 안 함(범위 밖) |
| R-014 | 각 언어 메시지 파일에 `"_review": "native review required"`. `pnpm i18n:check`가 ko 대비 누락 키 0. (+ 6개 `/[locale]` 라우팅, 언어 전환 UI) | (1) 6개 파일 grep (2) i18n:check 실행 (3) 음성 시험: messages를 스크래치 폴더에 복사 → en.json에서 `meta.siteName` 삭제 후 `tsx scripts/i18n-check.ts <스크래치>` / vi.json에서 `_review` 삭제 후 같은 실행. 원본 미변경, 스크래치 삭제 (4) e2e 결과 | Pass | (1) `messages/{ko,en,vi,ru,zh,uz}.json` 각 1회 일치. (2) errors: 0, EXIT=0. (3) 키 삭제 → `[FAIL] en: missing key: meta.siteName`, EXIT=1; `_review` 삭제 → `[FAIL] vi: "_review" must be "native review required"`, EXIT=1. 단위 테스트 `tests/unit/scripts/i18n.test.ts` 6건 통과. `git status messages` 변경 없음. (4) e2e: `/ko,/en,/vi,/ru,/zh,/uz` 각 200 + `html lang` 일치(데스크톱·375px 모두), `/`→`/ko`(fr-FR), `/`→`/vi`(vi-VN), 언어 전환기에서 6개 자기 언어명 표시 후 vi 선택 시 `/vi`·`lang=vi`, `/ko/does-not-exist` 404, `/admin`은 `/ko/admin`으로 리다이렉트 안 됨 |
| R-015 | `site.config.ts`(사무소명·등록번호·대표자·주소 플레이스홀더) + 플래그 4종 기본 false. P0a에서는 flags 단위 테스트로 확인 | `src/config/flags.ts`, `src/config/site.config.ts`, `.env.example`, 단위 테스트 열람 및 실행 | Pass | `flags.ts`: FEATURE_DEMAND_MAP / PUBLIC_JOBS / REFERRAL_REWARD / EMPLOYER_CANDIDATES, 값이 정확히 `"true"`(trim·대소문자 무시)일 때만 true. `tests/unit/config/flags.test.ts` 17건 통과: 미설정 → 4개 모두 false, `"false"`,`""`,`"0"`,`"1"`,`"yes"` 등 → false, `.env.example`에 4개 모두 `=false` 검사. `.env.example` 3~7행 4개 `=false`. `site.config.ts`: 사무소명·행정사 등록번호·직업소개사업 등록번호·대표자·주소 env 미설정 시 `[... 미정]` 플레이스홀더, `site-config.test.ts` 2건 통과. 위치 `src/config/`는 STANDARD S-54 지정과 일치 |
| N-06 | 키·비밀번호는 `.env`(git 제외), `.env.example`만 커밋 | `.gitignore` 열람, `git ls-files`, `git check-ignore -v`, `git status` | Pass | `.gitignore:30 .env*`, `!.env.example`. `git check-ignore -v` → `.env`, `.env.local`, `.env.production` 모두 무시, `.env.example`은 무시되지 않음. `git ls-files` 중 env 관련은 `.env.example`만. 작업 트리에 `.env` 파일 없음, `git status`에 `.env` 없음. `.env.example`에 실제 비밀값 없음(빈 값·false) |

## 결함 목록 (Fail만)
없음.

## 기준 외 발견 (결함 아님, 참고)
1. 파일 경로가 PLAN P0a "만들거나 고칠 파일" 목록과 다름: `site.config.ts`(루트) → `src/config/site.config.ts`, `src/lib/flags.ts` → `src/config/flags.ts`, `src/components/LocaleSwitcher.tsx` → `src/components/common/locale-switcher.tsx`, `tests/unit/flags.test.ts` → `tests/unit/config/flags.test.ts`. STANDARD S-54가 `src/config/` 위치를 지정하므로 STANDARD와는 맞음. PLAN 문구 갱신 여부만 오케스트레이터가 판단.
2. 커밋 이후 `.workflow/DECISIONS.md`, `.workflow/STATE.md` 수정, `.workflow/SITE_INFO.md` 미추적 상태(워크플로우 문서, 코드 아님). Q-06에 따르면 SITE_INFO에는 계좌를 저장소에 보관하지 않기로 했으므로 커밋 전 내용 확인 권장.

## 판정불가 / 사람 확인 필요
- PLAN QA 방법 중 "임시 파일로 실제 커밋을 시도해 lint-staged 실행 로그 확인"은 호출자 지시(실제 커밋 금지)에 따라 하지 않음. 대신 hooksPath·husky 래퍼·훅 스크립트 직접 실행으로 lint-staged 호출 체인을 확인함. 스테이징된 파일에 대한 eslint/prettier 실제 적용은 확인하지 않음(R-002 판정에는 영향 없음).
- CI 원격 실행은 범위 밖(R-003 명시).
- 디자인 토큰·글꼴, site.config 실제 값: 이번 판정 대상 아님(Q-05, Q-06).
