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
src/fonts/           Pretendard woff2 + OFL.txt
tests/unit, tests/e2e
```

## 설정

- **기능 플래그** (`src/config/flags.ts`, WO §16): `FEATURE_DEMAND_MAP`, `FEATURE_PUBLIC_JOBS`, `FEATURE_REFERRAL_REWARD`, `FEATURE_EMPLOYER_CANDIDATES`.
  기본 false. 환경변수 값이 정확히 `true`일 때만 켜진다. 운영자 법무 확인 후에만 켠다.
- **운영 주체 정보** (`src/config/site.config.ts`): 브랜드 표기(VISA n JOB / 비자앤잡), 코리아비자행정사사무소(사업자등록번호·행정사 등록번호), 비자앤잡 유료직업소개소(직업소개사업 등록번호), 대표자·주소·대표전화. 기본값은 `.workflow/SITE_INFO.md`, `SITE_*` 환경변수가 있으면 우선. 휴대전화는 `SITE_OPERATOR_MOBILE`(내부용, 공개 화면 미표시), 입금계좌는 저장소에 두지 않는다. 실적 지표(`metrics`)는 운영자 입력 전까지 빈 목록(PC-7).
- **비밀 정보**: `.env`(git 제외)에만 둔다. `.env.example`만 커밋한다.

## 글꼴

`src/lib/fonts.ts`(STANDARD 2.3):

- Pretendard 1.3.9 — `next/font/local`, `src/fonts/Pretendard-{Regular,Medium,SemiBold,Bold}.subset.woff2`.
  공식 npm `pretendard@1.3.9` `dist/web/static/woff2-subset`(KS X 1001 한글 2,350자 전부 포함, 2,780자) 파일을 복사했다. 라이선스 SIL OFL 1.1(`src/fonts/OFL.txt`). npm 패키지는 의존성으로 두지 않는다.
- Inter(latin, latin-ext, vietnamese, cyrillic, cyrillic-ext)·Noto Sans SC(zh만) — `next/font/google`, 빌드 시 받아 자체 호스팅(빌드에 인터넷 필요).
- 로케일별 1순위: ko=Pretendard, en·vi·ru·uz=Inter, zh=Noto Sans SC (`src/app/globals.css`).

## 번역

1차 번역은 초안이며 원어민 검수가 필요하다(`_review` 표시). uz는 라틴 문자.
