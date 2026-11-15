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

| 명령                                      | 내용                                                                                          |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| `pnpm dev`                                | 개발 서버                                                                                     |
| `pnpm build` / `pnpm start`               | 프로덕션 빌드 / 실행                                                                          |
| `pnpm lint`                               | ESLint                                                                                        |
| `pnpm typecheck`                          | `tsc --noEmit`                                                                                |
| `pnpm test`                               | Vitest 단위 테스트 (`tests/unit`)                                                             |
| `pnpm test:coverage`                      | Vitest + v8 커버리지 (`coverage/`)                                                            |
| `pnpm test:e2e`                           | Playwright E2E (`tests/e2e`, 프로덕션 빌드 서버 대상, 데스크톱 + 375px 모바일)                |
| `pnpm i18n:check`                         | `messages/*.json` 키를 ko 기준으로 비교, `_review` 표시 검사. 누락 시 비0 종료                |
| `pnpm qa:static`                          | BR 정적 점검(주민·여권번호 필드, 직접 연락 링크, 원장 수정, 비자 코드 리터럴, 하드코딩 색 등) |
| `pnpm format`                             | Prettier                                                                                      |
| `pnpm db:start` / `db:stop` / `db:status` | 로컬 임베디드 Postgres 기동·중지·상태 (아래 "데이터베이스")                                   |
| `pnpm db:migrate`                         | `prisma migrate dev` (마이그레이션 적용, 스키마 변경 시 새 마이그레이션 생성)                 |
| `pnpm db:deploy`                          | `prisma migrate deploy` (생성 없이 적용만)                                                    |
| `pnpm db:seed`                            | 참조 데이터 시드 (기존 행은 덮어쓰지 않음)                                                    |
| `pnpm db:reset`                           | 로컬 DB 삭제·재생성 → 마이그레이션 → 시드 (로컬 임베디드 DB만 허용)                           |
| `pnpm db:studio`                          | Prisma Studio (데이터 열람)                                                                   |

커밋 시 Husky pre-commit 훅이 `lint-staged`(ESLint --fix + Prettier)를 실행한다.

## 데이터베이스 (임베디드 PostgreSQL, Q-02)

Docker나 별도 설치 없이 npm `embedded-postgres`(PostgreSQL 17)가 받은 바이너리로 로컬 서버를 띄운다.

```bash
cp .env.example .env     # DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54320/visanjob (로컬 전용)
pnpm db:start            # 최초 1회 initdb(.pgdata/) 후 127.0.0.1:54320에서 백그라운드 기동, DB visanjob 생성
pnpm db:migrate          # prisma/migrations 적용 (원장 트리거 포함)
pnpm db:seed             # 시·도/시·군·구, KSIC 대분류, 비자 유형, 샘플 규칙·점수표
pnpm db:stop             # 중지 (데이터는 .pgdata/에 남음)
```

- 데이터 디렉터리: `PG_DATA_DIR`(기본 `./.pgdata`, git 제외). 경로 공백·권한 문제로 initdb가 실패하면 `PG_DATA_DIR=%LOCALAPPDATA%/visanjob/pgdata`.
- 관리자 권한 셸에서는 Postgres가 기동을 거부한다. 일반 권한 셸에서 실행한다.
- `pnpm db:reset`은 DB를 지우고 다시 만든다. `DATABASE_URL`이 127.0.0.1/localhost의 54320(개발)·54329(테스트) 포트가 아니면 거부한다(A-9).
- **원장 테이블**(`Recommendation`, `AuditLog`)은 DB 트리거가 UPDATE·DELETE·TRUNCATE를 막는다(BR-09). 데이터 정리는 행 삭제가 아니라 `db:reset`(DB 재생성)으로 한다.
- 시드 데이터: 비자 유형은 WO §7.4 트랙 표(운영 매핑, 관리자 수정 가능). 규칙·점수표는 `SAMPLE` 더미(`isSample=true`, `DRAFT`, BR-12). 시·군·구·인구감소지역은 에이전트 초안이라 전 행 `isSample`·`needsReview` 표시 — 운영자가 공식 목록과 대조해야 한다(PC-6). `SEED_ADMIN_EMAIL`·`SEED_ADMIN_PASSWORD`가 있으면 개발용 관리자 계정을 만든다.
- 테스트: `pnpm test`가 별도 클러스터(127.0.0.1:54329, `PG_TEST_DATA_DIR`, 기본 `./.pgdata-test`)를 띄우고 실행마다 새 DB를 만들어 마이그레이션·시드 후 끝나면 DB를 지운다. 개발 DB와 무관.

## 디렉터리

`.workflow/STANDARD.md` 4.2절을 따른다. 요약:

```
messages/            번역 (ko 원본, 모든 파일 첫 키 "_review": "native review required")
prisma/              schema.prisma, migrations/, seed/
scripts/             db.ts, i18n-check.ts, qa-static.ts (+ lib/)
src/app/[locale]/    다국어 페이지 (next-intl, /admin·/api 제외)
src/components/      ui/(shadcn), common/(LocaleSwitcher 등)
src/config/          site.config.ts, flags.ts
src/i18n/            routing.ts, request.ts, navigation.ts, locales.ts
src/lib/             utils.ts, fonts.ts, db.ts (Prisma 싱글턴)
src/fonts/           Pretendard woff2 + OFL.txt
tests/unit, tests/e2e, tests/setup (Vitest 테스트 DB)
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
