# 비자앤잡 (Visa&Job)

국내 체류 외국인 구직자, 구인기업, 지역 직업소개소의 의뢰를 운영자(행정사·직업소개소)가 접수하는 폐쇄형 중개 플랫폼.
요구사항 원천: [docs/WORK_ORDER.md](docs/WORK_ORDER.md). 비즈니스 규칙 BR-01~15를 반드시 지킨다([CLAUDE.md](CLAUDE.md)).

## 기술 스택

Next.js 15 (App Router) · TypeScript strict · Tailwind CSS 4 · shadcn/ui · lucide-react · next-intl (ko, en, vi, ru, zh, uz)
· react-hook-form + zod · Prisma 6 + PostgreSQL (개발: embedded-postgres) · Auth.js v5 · pg-boss · Vitest · Playwright.

## 시작하기

요구 사항: Node.js 24, corepack (Node에 포함).

```bash
corepack enable          # 권한 문제로 실패하면 아래 명령을 모두 `corepack pnpm ...`으로 실행
pnpm install
cp .env.example .env     # 값은 로컬에서만 채운다. .env는 커밋하지 않는다
pnpm exec playwright install chromium   # E2E용 브라우저 (최초 1회)
pnpm dev                 # http://localhost:3000 → /ko 로 이동
```

## 명령어

| 명령                        | 내용                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| `pnpm dev`                  | 개발 서버                                                                                     |
| `pnpm build` / `pnpm start` | 프로덕션 빌드 / 실행                                                                          |
| `pnpm lint`                 | ESLint                                                                                        |
| `pnpm typecheck`            | `tsc --noEmit`                                                                                |
| `pnpm test`                 | Vitest 단위 테스트 (`tests/unit`)                                                             |
| `pnpm test:coverage`        | Vitest + v8 커버리지 (`coverage/`)                                                            |
| `pnpm test:e2e`             | Playwright E2E (`tests/e2e`, 프로덕션 빌드 서버 대상, 데스크톱 + 375px 모바일)                |
| `pnpm i18n:check`           | `messages/*.json` 키를 ko 기준으로 비교, `_review` 표시 검사. 누락 시 비0 종료                |
| `pnpm qa:static`            | BR 정적 점검(주민·여권번호 필드, 직접 연락 링크, 원장 수정, 비자 코드 리터럴, 하드코딩 색 등) |
| `pnpm format`               | Prettier                                                                                      |
| `pnpm db:*`                 | 임베디드 Postgres·Prisma (P0b에서 추가)                                                       |

커밋 시 Husky pre-commit 훅이 `lint-staged`(ESLint --fix + Prettier)를 실행한다.

## 디렉터리

`.workflow/STANDARD.md` 4.2절을 따른다. 요약:

```
messages/            번역 (ko 원본, 모든 파일 첫 키 "_review": "native review required")
scripts/             i18n-check.ts, qa-static.ts (+ lib/)
src/app/[locale]/    다국어 페이지 (next-intl, /admin·/api 제외)
src/components/      ui/(shadcn), common/(LocaleSwitcher 등)
src/config/          site.config.ts, flags.ts
src/i18n/            routing.ts, request.ts, navigation.ts, locales.ts
src/lib/             utils.ts, fonts.ts
tests/unit, tests/e2e
```

## 설정

- **기능 플래그** (`src/config/flags.ts`, WO §16): `FEATURE_DEMAND_MAP`, `FEATURE_PUBLIC_JOBS`, `FEATURE_REFERRAL_REWARD`, `FEATURE_EMPLOYER_CANDIDATES`.
  기본 false. 환경변수 값이 정확히 `true`일 때만 켜진다. 운영자 법무 확인 후에만 켠다.
- **사무소 정보** (`src/config/site.config.ts`): 사무소명·행정사 등록번호·직업소개사업 등록번호·대표자·주소. `SITE_*` 환경변수, 없으면 `[... 미정]` 플레이스홀더.
- **비밀 정보**: `.env`(git 제외)에만 둔다. `.env.example`만 커밋한다.

## 글꼴

`src/lib/fonts.ts`: Noto Sans, Noto Sans SC(zh만)를 `next/font/google`로 빌드 시 받아 자체 호스팅한다(빌드에 인터넷 필요).
Pretendard(`next/font/local`, `src/fonts/`)는 woff2 파일이 아직 없어 글꼴 스택에 이름만 있다(설치된 경우에만 사용).

## 번역

1차 번역은 초안이며 원어민 검수가 필요하다(`_review` 표시). uz는 라틴 문자.
