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

| 명령                                      | 내용                                                                                               |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `pnpm dev`                                | 개발 서버                                                                                          |
| `pnpm build` / `pnpm start`               | 프로덕션 빌드 / 실행                                                                               |
| `pnpm lint`                               | ESLint                                                                                             |
| `pnpm typecheck`                          | `tsc --noEmit`                                                                                     |
| `pnpm test`                               | Vitest 단위 테스트 (`tests/unit`)                                                                  |
| `pnpm test:coverage`                      | Vitest + v8 커버리지 (`coverage/`)                                                                 |
| `pnpm test:e2e`                           | Playwright E2E (`tests/e2e`, 프로덕션 빌드 서버 대상, 데스크톱 + 375px 모바일)                     |
| `pnpm i18n:check`                         | `messages/*.json` 키를 ko 기준으로 비교, `_review` 표시 검사. 누락 시 비0 종료                     |
| `pnpm qa:static`                          | BR 정적 점검(주민·여권번호 필드, 직접 연락 링크, 원장 수정, 비자 코드 리터럴, 하드코딩 색 등)      |
| `pnpm lighthouse`                         | 프로덕션 빌드 후 /ko·/ko/about·/ko/fees·/ko/terms 3회 측정 중앙값(성능 85·접근성 90 미만이면 실패) |
| `pnpm worker`                             | pg-boss 워커(리드 보관, 30일 상태 확인, 체류 만료, 노쇼 재집계 예약 작업)                          |
| `pnpm format`                             | Prettier                                                                                           |
| `pnpm db:start` / `db:stop` / `db:status` | 로컬 임베디드 Postgres 기동·중지·상태 (아래 "데이터베이스")                                        |
| `pnpm db:migrate`                         | `prisma migrate dev` (마이그레이션 적용, 스키마 변경 시 새 마이그레이션 생성)                      |
| `pnpm db:deploy`                          | `prisma migrate deploy` (생성 없이 적용만)                                                         |
| `pnpm db:seed`                            | 참조 데이터 시드 (기존 행은 덮어쓰지 않음)                                                         |
| `pnpm db:reset`                           | 로컬 DB 삭제·재생성 → 마이그레이션 → 시드 (로컬 임베디드 DB만 허용)                                |
| `pnpm db:studio`                          | Prisma Studio (데이터 열람)                                                                        |

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
scripts/             db.ts, i18n-check.ts, qa-static.ts, worker.ts, build-terms-pdf.ts, lighthouse.ts (+ lib/)
src/app/[locale]/    다국어 페이지 (next-intl, /admin·/api 제외)
src/app/admin, api/  관리자 화면(ko 고정), API 라우트
src/components/      ui/(shadcn), common/, home/, 화면별 묶음
src/config/          site.config.ts, flags.ts
src/i18n/            routing.ts, request.ts, navigation.ts, locales.ts, dateTime.ts
src/lib/             utils.ts, fonts.ts, fontsZh.ts, db.ts (Prisma 싱글턴), audit.ts, crypto.ts,
                     serializers/, notifications/, visa-engine/, files/ 등 도메인 모듈
src/fonts/           Pretendard woff2 + OFL.txt (미사용 보관, SC-11)
tests/unit, tests/e2e (support/ 포함), tests/setup (Vitest 테스트 DB)
```

## 설정

- **기능 플래그** (`src/config/flags.ts`, WO §16): `FEATURE_DEMAND_MAP`, `FEATURE_PUBLIC_JOBS`, `FEATURE_REFERRAL_REWARD`, `FEATURE_EMPLOYER_CANDIDATES`.
  기본 false. 환경변수 값이 정확히 `true`일 때만 켜진다. 운영자 법무 확인 후에만 켠다.
- **운영 주체 정보** (`src/config/site.config.ts`): 브랜드 표기(VISA n JOB / 비자앤잡), 코리아비자행정사사무소(사업자등록번호·행정사 등록번호), 비자앤잡 유료직업소개소(직업소개사업 등록번호), 대표자·주소·대표전화. 기본값은 `.workflow/SITE_INFO.md`, `SITE_*` 환경변수가 있으면 우선. 휴대전화는 `SITE_OPERATOR_MOBILE`(내부용, 공개 화면 미표시), 입금계좌는 저장소에 두지 않는다. 실적 지표(`metrics`)는 운영자 입력 전까지 빈 목록(PC-7).
- **비밀 정보**: `.env`(git 제외)에만 둔다. `.env.example`만 커밋한다.

## 배포 (A-8, DECISIONS Q-30·Q-31)

스테이징: AWS Lightsail 서울 서버 1대(2GB, Ubuntu 24.04) 안에서 Docker로 Caddy·앱·워커·**PostgreSQL 17 컨테이너**(`db`, compose 프로필 `local-db`, 호스트 포트 없음)·매일 백업을 돌린다. 비공개 스테이징(`staging.visanjob.co.kr`, 기본 인증·검색 차단)을 먼저 연다. 운영 전환 때는 관리형 DB(외부, `sslmode=require` + CA)로 바꾸고 프로필을 끈다.
AWS 계정 준비부터 서버 생성·설치·실행·확인·백업·복원·업데이트·운영 전환까지: [deploy/DEPLOY.md](deploy/DEPLOY.md).

| 파일                             | 내용                                                                                                                             |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `Dockerfile`                     | 멀티 스테이지(node 24, corepack pnpm). 운영 의존성만, 한 이미지로 `app`·`worker`·`migrate`·`seed`                                |
| `deploy/docker-entrypoint.sh`    | 명령별 필수 환경 변수 확인(없으면 시작 실패, 값은 출력 안 함). 내부 `db`는 sslmode·CA 불필요, 외부 DB는 sslmode·CA 경고          |
| `deploy/docker-compose.yml`      | db(`local-db` 프로필, 헬스체크 후) → migrate(1회) → app·worker, caddy(80/443), backup. 비공개 파일 볼륨은 app(읽기 전용: backup) |
| `deploy/backup.sh`               | 매일 `pg_dump -Fc` + 비공개 파일 tar → `/home/ubuntu/visanjob-backups`(0700/0600), 최근 14개 보관                                |
| `deploy/Caddyfile`               | 스테이징: 기본 인증, `X-Robots-Tag: noindex, nofollow`, `/robots.txt` 전체 차단. 운영 블록 주석                                  |
| `deploy/.env.production.example` | 서버 환경 변수 이름·설명(값 없음). 서버에서 `deploy/.env`로 복사                                                                 |
| `scripts/gen-secrets.ts`         | 비밀값·`POSTGRES_PASSWORD` 생성, 비어 있으면 내부 DB용 `DATABASE_URL` 조립 → 파일에만 기록(화면에는 이름만)                      |
| `src/lib/jobs/boss.ts`           | `bossConnectionOptions`: 워커가 내부 `db`에 CA 없이 붙을 때 TLS 끔(외부 DB는 URL의 sslmode 그대로)                               |
| `src/app/api/health/route.ts`    | `GET /api/health` — DB `SELECT 1` 성공 시 200, 실패 시 503(상세 없음)                                                            |

`prisma`·`tsx`·`typescript`는 운영 이미지에서 마이그레이션·워커·시드·`next.config.ts`에 필요해 `dependencies`, `embedded-postgres`는 개발·테스트 전용이라 `devDependencies`다.

## 글꼴

`src/lib/fonts.ts`(STANDARD 2.3):

- Noto Sans KR(가변 굵기) — ko 1순위. `next/font/google`, `preload: false`(DECISIONS SC-11, STANDARD 2.3·S-03·S-04).
- Inter(latin, latin-ext, vietnamese, cyrillic, cyrillic-ext) — en·vi·ru·uz 1순위, ko의 라틴 글자. `next/font/google`.
- Noto Sans SC — zh에서만(`src/lib/fontsZh.ts`, zh 페이지만 불러옴). `next/font/google`.
- 모두 빌드 시 받아 자체 호스팅한다(빌드에 인터넷 필요). 로케일별 글꼴 순서는 `src/app/globals.css`.
- Pretendard 1.3.9 파일(`src/fonts/*.subset.woff2`, SIL OFL 1.1 `src/fonts/OFL.txt`)은 **미사용 보관(SC-11)**이다. /ko 모바일 Lighthouse 성능 미달로 Noto Sans KR로 바꿨고, 되돌릴 때를 위해 파일만 남겼다. import하지 않는다.

## 번역

1차 번역은 초안이며 원어민 검수가 필요하다(`_review` 표시). uz는 라틴 문자.

## 출시 점검 (P2e, PRD §6)

### 전체 검증 순서

```bash
pnpm db:reset && pnpm lint && pnpm typecheck && pnpm test:coverage && pnpm i18n:check   && pnpm qa:static && pnpm build && pnpm test:e2e && pnpm lighthouse
```

- `db:reset`은 개발 DB를 지운다. 개발 데이터를 남기려면 별도 데이터 디렉터리의 임시 클러스터로 돌린다:
  `PG_DATA_DIR=<임시 폴더>`, `DATABASE_URL=postgresql://…@127.0.0.1:54329/<임시 DB 이름>`으로 `pnpm db:start` → `pnpm db:reset`.
  54329는 Vitest 테스트 클러스터 포트이므로 `pnpm test`·`test:coverage`를 돌리는 동안에는 임시 클러스터를 멈춘다(`pnpm db:stop`, 같은 환경 변수). 끝나면 임시 폴더를 지운다.
- `test:e2e`·`lighthouse`는 프로덕션 빌드를 띄운다(E2E 기본 포트 `E2E_PORT`=3100과 +1~+3, Lighthouse `LH_PORT`=3200). E2E가 쓰는 DB는 `.env`의 `DATABASE_URL`(환경 변수로 덮어쓰기 가능)이다. E2E 데이터는 고유 값으로 만들고 지우지 않는다.
- Lighthouse와 Next 빌드(Google 글꼴)는 인터넷이 필요하다.

### 환경 변수 (이름만, 값은 `.env`에만)

| 묶음        | 변수                                                                                                                                                                                                                                                                                                                        |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 기능 플래그 | `FEATURE_DEMAND_MAP`, `FEATURE_PUBLIC_JOBS`, `FEATURE_REFERRAL_REWARD`, `FEATURE_EMPLOYER_CANDIDATES`                                                                                                                                                                                                                       |
| 운영 주체   | `SITE_BRAND_WORDMARK`, `SITE_BRAND_NAME_KO`, `SITE_BRAND_TAGLINE`, `SITE_ADMIN_SCRIVENER_OFFICE_NAME`, `SITE_BUSINESS_REG_NO`, `SITE_ADMIN_SCRIVENER_REG_NO`, `SITE_JOB_PLACEMENT_NAME`, `SITE_JOB_PLACEMENT_REG_NO`, `SITE_REPRESENTATIVE`, `SITE_ADDRESS`, `SITE_PHONE`, `SITE_EMAIL`, `SITE_URL`, `SITE_OPERATOR_MOBILE` |
| DB          | `DATABASE_URL`, `PG_DATA_DIR`, `PG_TEST_DATA_DIR`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_SAMPLE_SEEKERS`                                                                                                                                                                                                         |
| 저장소      | `PRIVATE_STORAGE_DIR` (비공개 업로드 경로, 기본 `storage/private/`, R-210)                                                                                                                                                                                                                                                  |
| 보안        | `ENCRYPTION_KEYS`, `HASH_KEY`, `AUTH_SECRET`, `AUTH_URL`, `TRUST_PROXY`, `INGEST_API_KEY`                                                                                                                                                                                                                                   |
| 이메일      | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`                                                                                                                                                                                                                                              |
| 배포        | `COMPOSE_PROFILES`, `POSTGRES_PASSWORD`, `BACKUP_DIR`, `BACKUP_KEEP`, `STAGING_DOMAIN`, `STAGING_BASIC_AUTH_USER`, `STAGING_BASIC_AUTH_HASH`, `IMAGE_TAG` (`deploy/.env`만, [deploy/DEPLOY.md](deploy/DEPLOY.md))                                                                                                           |
| 테스트·측정 | `E2E_PORT`, `E2E_WORKERS`, `E2E_DEMAND_URL`, `E2E_JOBS_PORT`, `E2E_CANDIDATES_PORT`, `LH_PORT`, `CHROME_PATH`                                                                                                                                                                                                               |

### 기능 플래그 4종 (WO §16)

`FEATURE_DEMAND_MAP`, `FEATURE_PUBLIC_JOBS`, `FEATURE_REFERRAL_REWARD`, `FEATURE_EMPLOYER_CANDIDATES` — 모두 **기본 false**(값이 정확히 `true`일 때만 켜짐, `.env.example`도 false). 꺼져 있으면 페이지는 ComingSoon(200, noindex)·링크 숨김, API는 404(SC-07). 운영자 법무 확인 후에만 켠다(PLAN A-5).
확인 테스트: `tests/unit/config/flags.test.ts`(기본값·`.env.example`·E2E 기본 서버에 플래그 없음), E2E 기본 서버의 ComingSoon 검사(`demand`, `jobs-apply`, `employer-candidates`, `seeker-recommended`, `score` 스펙).

### WO §15 필수 테스트 1~11 매핑

| #   | 항목                                                                     | 테스트 파일 · 테스트 이름                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `blindSeeker` 키 ⊆ `BLIND_SEEKER_FIELDS`(모든 시드 프로필)               | `tests/unit/lib/serializers/blindSeeker.test.ts` · "WO15-01: every seed profile … has keys ⊆ BLIND_SEEKER_FIELDS"                                                                                                                                                                                                                                                                                                                                          |
| 2   | 기업 API 응답 전체 전화·이메일 0건                                       | `tests/unit/lib/employer/employerApiLeak.test.ts` · "WO15-02 / R-206: no phone or e-mail in any employer response"                                                                                                                                                                                                                                                                                                                                         |
| 3   | C·B 리드가 `/jobs`·공고 API에 없음                                       | `tests/unit/lib/postings/public.test.ts` · "WO15-03: postings whose lead is C or B are never listed …", "WO15-03: a lead that later moved to 보관 / 재접촉금지 …"; `tests/unit/app/api/jobs/route.test.ts` · "WO15-03 / R-202: flag on → grade-A postings only …"; `tests/unit/lib/postings/interest.test.ts` · "WO15-03: postings that are not public … cannot be requested"; `tests/e2e/jobs-apply.spec.ts` · "R-202 / WO15-03: only grade-A postings …" |
| 4   | `verifiedAt` 없는 공고 공개 불가                                         | `tests/unit/lib/postings/manage.test.ts` · "WO15-04: publishing without verifiedBy / verifiedAt is a server error …", "WO15-04: the database refuses a PUBLISHED row without verification (CHECK constraint)"; `tests/unit/lib/postings/public.test.ts` · "WO15-04 / WO §8.5 …"; `tests/unit/lib/serializers/publicPosting.test.ts` · "WO15-04: an unverified row cannot be serialized as public"                                                          |
| 5   | B-1·C-3·만료 비자 등록 불가                                              | `tests/unit/lib/seeker/account.test.ts` · "R-109 WO15-05: quick signup with %s is refused …"; `tests/unit/lib/seeker/saveStep.test.ts` · "R-109 WO15-05: Step 2 with %s is refused …", "R-109 WO15-05: an expired stay is refused at Step 2"; `tests/unit/lib/visa-engine/classifyTrack.test.ts` · "R-109 WO15-05: %s → 등록 불가", "R-109 WO15-05: 만료 … → 등록 불가"                                                                                    |
| 6   | E-9 → `FUTURE_POOL`, 기업 후보 제외                                      | `tests/unit/lib/visa-engine/classifyTrack.test.ts` · "R-108 WO15-06: %s → FUTURE_POOL"; `tests/unit/lib/candidates/eligible.test.ts` · "WO15-06 BR-07: an E-9 seeker … is never a candidate"; `tests/unit/lib/candidates/browse.test.ts` · "WO15-06 / BR-02 …"; `tests/unit/lib/candidates/interest.test.ts` · "WO15-06 / WO15-08 …"; `tests/e2e/employer-candidates.spec.ts` · "R-205 / R-207 / WO15-06: blind list (E-9 excluded) …"                     |
| 7   | Recommendation·AuditLog 수정·삭제 불가                                   | `tests/unit/db/ledger-trigger.test.ts` · "R-006 ledger triggers (WO15-07)" 묶음(UPDATE·DELETE·TRUNCATE·Prisma); `tests/unit/lib/recommendations/ledger.test.ts` · "WO15-07 / R-209: UPDATE and DELETE through the app client are refused …"                                                                                                                                                                                                                |
| 8   | 동의 철회 즉시 기업 노출 차단                                            | `tests/unit/lib/candidates/eligible.test.ts` · "R-113 WO15-08: revoking BLIND_PROFILE removes the seeker … at once"; `tests/unit/lib/candidates/interest.test.ts` · "WO15-06 / WO15-08 …"; `tests/e2e/consent-revoke.spec.ts` · "R-113 WO15-08: revoking BLIND_PROFILE on /seeker/me …"                                                                                                                                                                    |
| 9   | PUBLISHED 규칙 없음 → "행정사 확인 필요"                                 | `tests/unit/lib/visa-engine/evaluate.test.ts` · "WO15-09 seed state (SAMPLE rules are DRAFT) → YELLOW …"; `tests/unit/lib/employer/diagnosis.test.ts` · "WO15-09 R-124 …"; `tests/e2e/home.spec.ts` · "seed state: result is YELLOW 확인 필요 … (WO15-09)"; `tests/e2e/employer-intake.spec.ts` · "R-124 WO15-09 …"                                                                                                                                        |
| 10  | 수요 지도 5건 미만 셀 마스킹                                             | `tests/unit/lib/demand/aggregate.test.ts` · "WO15-10 masking (R-117)" 묶음, "WO15-10 aggregates leads from the database with masking"                                                                                                                                                                                                                                                                                                                      |
| 11  | E2E 간편 등록 → 프로필 완성 → A 승격 → 후보 노출 → 면접 요청 → 추천 원장 | `tests/e2e/integration.spec.ts` · "R-217 / WO15-11: 간편 등록 → 프로필 완성 → 관리자 A 승격(2FA) → 기업 후보 노출 → 면접 요청 → 추천 원장"                                                                                                                                                                                                                                                                                                                 |

N-05 감사 로그 묶음(PII 열람·내보내기(PC-14 함수 단위)·등급 변경·추천·공고 공개): `tests/unit/lib/auditCoverage.test.ts`. N-04 375px 일괄: `tests/e2e/mobile-375.spec.ts`(공개 화면 6개 언어, 플래그 on 목록, 로그인 구직자 화면).

### N-01 직접 연락 수단 점검 (코드 리뷰 체크리스트)

| 항목                                    | 결과                                                                                                                                                                                      |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 채팅(구직자↔기업 메시지, 웹소켓) UI·API | 없음                                                                                                                                                                                      |
| 기업의 구직자 연락처 열람 UI·API        | 없음. 기업 응답은 `blindSeeker`·`interviewDisclosure`(동의 건 실명만, 연락처 없음, PC-1)만 거침, `qa:static`·WO15-02 검사. 연락처 복호 열람은 관리자 화면 직원 전용(R-122, PII_VIEW 기록) |
| 이메일 전달(구직자·기업 사이 메일 중계) | 없음. 알림은 운영자 → 구직자 템플릿(OTP·프로필 완성 안내·상태 확인·체류 만료·면접 동의 요청)과 직원 알림(STAFF 채널)뿐                                                                    |
| 외부 링크 공유                          | 없음. **예외(PC-9)**: 구직자 본인 추천 코드 링크의 Web Share·링크 복사·WhatsApp/Telegram/Viber 공유 URL(`referral-share.tsx`) — 상대방 연락처를 주고받는 경로가 아님                      |
| 운영자 연락처(`tel:`·`mailto:`)         | 푸터·내비·최종 CTA의 운영자 대표 연락처만(BR-01 허용, 휴대전화 비공개 Q-06)                                                                                                               |

### 사람 승인 필요 (Gate 4 이후)

아래는 코드가 하지 않고 사람이 승인·실행해야 하는 일이다(PLAN "승인 필요 지점").

| 승인 지점 | 내용                                                         | 담당               | 위치                                                                   |
| --------- | ------------------------------------------------------------ | ------------------ | ---------------------------------------------------------------------- |
| A-3       | 실제 SMTP·SMS 자격 증명 설정과 첫 외부 발송                  | 운영자             | `.env`의 `SMTP_*`(SMS 실제 어댑터는 Phase 3), `src/lib/notifications/` |
| A-5       | 기능 플래그 4종 켜기(법무 확인 후)                           | 운영자·법무        | `.env`의 `FEATURE_*`, `src/config/flags.ts`                            |
| A-6       | 규칙·점수표 실제 값 입력과 PUBLISHED 게시                    | 행정사             | 관리자 화면 규칙·점수표 메뉴(`/admin`)                                 |
| A-7       | 약관·동의서·고지 문구 확정, 실제 규칙 문구, 번역 원어민 검수 | 법무·행정사·운영자 | `messages/*.json`(`_review`), 약관·동의서 문서, 규칙 문구 키           |
| A-8       | 실서버 배포·도메인·운영 DB(서울 리전)                        | 운영자             | [deploy/DEPLOY.md](deploy/DEPLOY.md), `deploy/.env`                    |

### 알려진 한계 (Gate 4 보고 대상)

- 연락처 필터(`pii-guard`) 우회 D-10(앞자리 덧붙인 번호)·D-11(+ 없는 외국 번호)과 날짜 옆 시간·단위·쉼표 없는 금액 범위 오탐은 한계로 둔다(DECISIONS Q-20~Q-23). 공고는 직원 검증 후 공개되므로 "공고 검증 시 숫자 나열 직접 확인"을 운영 점검 항목으로 둔다.
- 규칙·점수표는 SAMPLE 초안뿐이라 공개 진단은 모두 "행정사 확인 필요"(BR-12). 실제 값 입력·게시는 행정사(PLAN A-6).
- 시·군·구·인구감소지역은 에이전트 초안(`isSample`·검토 필요, PC-6), 전공 분야 코드(Q-24)·KSIC 중분류(Q-12, null)는 운영자 검토 대기.
- SMS 실제 채널 없음, 이메일은 `SMTP_*` 설정 전 콘솔 기록만: 콘솔만 보낸 상태 확인은 14일 무응답 비활성화·강등 근거가 아니다(Q-27).
- 카카오·Zalo 공유는 Phase 3(PC-9), CSV 내보내기(PC-14)·직원 계정 관리 화면(PC-15)은 범위 밖.
- 약관·동의서·고지 문구는 [전문가 검토 필요] 초안, 번역은 원어민 검수 전(`_review`, PLAN A-7).

Gate 4 법무 확인 목록:

- 구인 의뢰 담당자 개인정보 수집 고지에 수집 동의 체크박스를 둘지(DECISIONS Q-12 ③, 현재 고지 문구에 [전문가 검토 필요] 표시).
- 면접 실명 제공 동의서의 "기간: 이 면접 건이 끝날 때까지" 해석(DECISIONS Q-25, 현재 결과 기록·취소 시 실명 제공 종료).
- THIRD_PARTY_INTERVIEW 동의서에 받는 기업(수령자)이 적혀 있지 않음(BR-03, P2c).
- 기업 가입 화면(`/employer/signup`)에 개인정보 수집 고지·약관 동의가 없음(QA P2e run 1 O-4, run 2 O-7). 계약 약관 동의는 가입 후 `/employer/contract`에서 받는다.

Gate 4 운영·배포 확인 목록(STATE.md·DECISIONS 기록 모음):

- OTP 5회 오류 시 번호 잠금(R-104 규정대로 유지, P1c O-7).
- `/admin` 리디렉트가 localhost를 가리킬 수 있음(P1c O-9) — 해소: 미들웨어 리디렉트는 `AUTH_URL`→`SITE_URL`→(`TRUST_PROXY=true`일 때) `X-Forwarded-Host`→`Host` 순의 공개 주소를 쓴다(`src/lib/publicOrigin.ts`). 서버에서는 `AUTH_URL`·`SITE_URL`·`TRUST_PROXY=true` 설정 필수.
- 전공 분야 코드(MAJOR_FIELDS) 운영자 검토(Q-24, P2b).
- 수집 리드로 공고를 만들 때 생기는 중복 Company 병합(Q-17 ①).
- 리드 원본(rawJson, 직원 전용)에 숫자형 전화번호·메신저 ID가 남을 수 있음(P1d O-9·O-10).
- 개발 DB 초기화 여부(누적 E2E 데이터, P2a).
- 실제 SMTP(A-3)와 실제 규칙 문구(A-7) 전에는 상태 확인이 콘솔 기록뿐이고, SMS 실제 채널이 없어 이메일 없는 구직자는 자동 비활성화 대상이 아님(Q-27, P2d).
