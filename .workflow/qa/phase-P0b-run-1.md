# QA 보고서 — Phase P0b / run 1

- 대상: Phase P0b — DB·스키마·시드·원장 트리거 (커밋 8c36dd3)
- 기준 문서: PRD v1.1 (R-004~R-007, §3), PLAN ### P0b, DECISIONS PC-3·PC-4·PC-6·SC-02·SC-05·SC-10, WO §2(BR-09·BR-12·BR-13)·§5·§7.4
- 일시: 2026-11-16
- 환경: Windows 11, Git Bash, `corepack pnpm`, 개발 DB 127.0.0.1:54320(.pgdata), 테스트 DB 54329(Vitest 자동)

## 결과 요약
- 요구사항 통과: 4 / 전체: 4 (통과율 100%)
- 부가 점검(회귀 7종 + git 추적 확인) 통과: 8 / 8
- 필수 항목 실패: 0개

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| R-004 | `db:start`로 Postgres 기동, `db:migrate`, `db:seed` 성공. README에 절차 | (1) 기존 개발 클러스터: `db:status`(running) → `db:stop` → `db:status`(stopped) → `db:start` → `db:migrate` → `db:seed` 2회. (2) **새 클러스터**: `PG_DATA_DIR=<scratchpad>/freshpg`로 `db:start`(initdb부터) → `db:migrate` → `db:seed` 2회 → stop 후 삭제. 두 경우 모두 seed 전후로 행 수와 내용 md5를 비교. (3) README 열람 | Pass | `[db] stopped` / `[db] ready on 127.0.0.1:54320, database visanjob`; 새 클러스터: `[db] initialising cluster in ...\freshpg`, `[db] created database visanjob`, migrate가 `20261115224522_init`, `20261115224531_ledger_triggers` 적용, exit 0. seed 출력 2회 동일 `{"regions":246,"industries":21,"visaTypes":19,"sampleRules":2,"sampleScoreTables":1,"admin":"skipped"}`, 스냅숏(행 수 + VisaType/Region/Industry/VisaRule/ScoreTable 내용 md5) seed 전후 동일 → 멱등. 공백이 들어간 저장소 경로(.pgdata)에서도 기동 정상. README.md:37-61 "데이터베이스" 절(cp .env.example → db:start → db:migrate → db:seed → db:stop, PG_DATA_DIR 대안, 관리자 셸 주의, db:reset 가드, 원장 정리 방법) |
| R-005 | 마이그레이션 후 WO §5 모든 모델·enum DB 존재. 주민·여권번호 필드 0개(BR-13) | 개발 DB에서 Prisma `$queryRawUnsafe`로 `information_schema.tables/columns`, `pg_enum` 직접 조회. WO §5 코드 블록을 파싱해 17개 모델·205개 스칼라 필드를 DB 컬럼과 하나씩 대조하는 임시 스크립트 실행. 금지 패턴 정규식 조회 | Pass | 테이블: AgencyRequest, AuditLog, CallLog, Company, Consent, Industry, InterestRequest, Interview, JobLead, JobPosting, OtpChallenge, Placement, RateLimitBucket, Recommendation, Region, ScoreTable, SeekerProfile, StaffTask, User, VisaCase, VisaRule, VisaType, WorkExperience (WO 17개 + PRD §3 추가 6개 전부). 필드 대조 결과 `models 17 fields 205 missing 0`. enum 9종 값이 WO와 정확히 일치(Role, SeekerTrack, SeekerGrade, JobSearchStatus, SeekerStatus, LeadGrade, PostingStatus, RuleStatus, Outcome) + ShiftOk `YES NO CONDITIONAL UNKNOWN`(SC-10), RegionLevel, StaffTaskType, StaffTaskStatus. 정규식 `arc|alien|passport|rrn|registration|resident|jumin|idno` 매칭은 `hasArc`(boolean, 보유 여부 — WO §7.3 허용), `jobSearchStatus`·`archivedAt`(오탐) 3개뿐 → 번호 성격 컬럼 0개. PC-3: SeekerProfile의 legalNameEnc·nationality·hasArc·koreanSpeaking·needDormitory·shiftOk·jobSearchStatus·배열 필드 nullable, completedStep NOT NULL default 0; NOT NULL로 남은 sido·visaCode·track은 간편 등록(WO §7.2)에서 받는 값이라 충돌 없음. SC-10: `shiftOk` udt=`ShiftOk`. PC-4: `StaffTask` 테이블 존재. 테스트 `tests/unit/db/schema.test.ts` 6건 통과 |
| R-006 | 마이그레이션에 BEFORE UPDATE/DELETE 트리거. raw SQL UPDATE·DELETE 시 에러 | `prisma/migrations/20261115224531_ledger_triggers/migration.sql` 열람. 개발 DB에서 부모 행(User 2, SeekerProfile 1, Company 1) 만들고 Recommendation 1행·AuditLog 1행 INSERT → UPDATE / DELETE / 전체 DELETE / TRUNCATE / TRUNCATE CASCADE / 부모 SeekerProfile DELETE 시도. 이후 `db:reset`으로 초기화. 테스트 파일 열람·실행 | Pass | `pg_trigger`: Recommendation_no_update_delete(tgtype 27 = BEFORE ROW UPDATE\|DELETE), Recommendation_no_truncate(34 = BEFORE STATEMENT TRUNCATE), AuditLog 동일 2개. 실제 결과: INSERT 성공, `UPDATE "Recommendation"` → `23001 append-only ledger "Recommendation": UPDATE is not allowed (BR-09)`, DELETE·전체 DELETE → `DELETE is not allowed`, `TRUNCATE ... CASCADE` → `TRUNCATE is not allowed`; AuditLog UPDATE/DELETE/TRUNCATE 동일 23001. 부모 SeekerProfile 삭제는 FK Restrict(`Recommendation_seekerId_fkey`)로 거부 → 우회 경로 없음. 시험 후 행이 그대로 남은 것 확인(`qa_p0b_rec_1`, `qa_p0b_audit_1`) — 원장이라 지울 수 없음. `db:reset`으로 DB 재생성 후 Recommendation 0, AuditLog 0, User 0. 로컬 가드: `DATABASE_URL=...@db.example.invalid:54320` → `Refusing destructive command: host ... is not local (A-9)` exit 1, `...@127.0.0.1:5432` → `port 5432 is not the embedded dev (54320) or test (54329) port` exit 1. `tests/unit/db/ledger-trigger.test.ts` 8건 통과(raw SQL·Prisma update/delete·TRUNCATE·INSERT 유지) |
| R-007 | 시드 후 VisaRule·ScoreTable 전 행 isSample=true·DRAFT, 시드 파일 `SAMPLE` 주석, VisaType.defaultTrack이 WO §7.4와 일치 | 개발 DB 시드 결과를 직접 SELECT, 시드 파일 열람, WO §7.4 표와 VisaType 19행을 손으로 대조 | Pass | VisaRule 2행(`SAMPLE-1`, `SAMPLE-2`) 모두 `status=DRAFT, isSample=true`, 조건 값은 `sampleFieldA`/`SAMPLE_VALUE` 등 자리표시자. ScoreTable 1행(E-7-4) `DRAFT, isSample=true`, 모든 points 0, passScore null. `prisma/seed/sampleRules.ts:1`, `prisma/seed/sampleScoreTable.ts:1` 첫 줄 `// SAMPLE — 실제 법령 수치 아님 (BR-12)`, regions.ts 머리 주석 `SAMPLE / 검토 필요 (DECISIONS PC-6)`. §7.4 대조: F-2·F-4·F-5·F-6·H-2=JOB_MATCH; D-10=JOB_MATCH+autoConsult; D-2=CONSULT_ONLY, graduationWindowMonths 6 → JOB_MATCH+autoConsult(SC-05: 트랙 조건을 데이터로); D-4=CONSULT_ONLY; E-7=JOB_MATCH+needsVisaReview; E-9·E-10=FUTURE_POOL; C-4·G-1·OTHER=CONSULT_ONLY; B-1·B-2·C-3·NONE·UNKNOWN=defaultTrack null, registrable=false(BR-08); "만료"는 행이 아니라 stayExpiry 날짜 판정으로 주석 명시 → 전부 일치. Region: SIDO 17행·SIGUNGU 229행 전부 `isSample=true, needsReview=true`(PC-6), 인구감소지역 89곳 표시. Industry A~U 21개. 시드 파일 숫자 열람: 법령 수치처럼 보이는 값 없음(점수 0, D-2 6개월은 WO §7.4 원문의 트랙 조건). `tests/unit/db/seed.test.ts` 8건 통과 |
| 회귀-1 | lint | `corepack pnpm lint` | Pass | exit 0, 경고 출력 없음 |
| 회귀-2 | typecheck | `corepack pnpm typecheck` | Pass | exit 0 |
| 회귀-3 | test | `corepack pnpm test` | Pass | `Test Files 8 passed (8)`, `Tests 65 passed (65)`, 7.33s. 실행 후 54329 포트 LISTEN 없음(테스트 클러스터 정상 종료) |
| 회귀-4 | i18n:check | `corepack pnpm i18n:check` | Pass | `source ko: 9 key(s), locales: 6, errors: 0` |
| 회귀-5 | qa:static | `corepack pnpm qa:static` | Pass | `18 line rules + structural checks, errors: 0, warnings: 0` |
| 회귀-6 | build | `corepack pnpm build` | Pass | exit 0, /[locale] SSG 6개 언어, Middleware 47.4 kB |
| 회귀-7 | test:e2e | `corepack pnpm test:e2e` 2회 | Pass | 1회차 `24 passed (37.3s)` exit 0, 2회차 `24 passed (38.1s)` exit 0. 빌더가 보고한 Windows 크래시(exit -1073740791)는 **2회 모두 재현 안 됨** |
| git | `.env`, `.pgdata` 미추적 | `git ls-files \| grep -E "\.env\|\.pgdata"`, `git check-ignore -v` | Pass | 추적 파일은 `.env.example`뿐. `.env` ← .gitignore:30 `.env*`, `.pgdata` ← :36, `.pgdata-test` ← :35 |

## 결함 목록 (Fail만)
없음.

## 기준 외 발견 (결함 아님, 참고)
- `information_schema.triggers`에는 TRUNCATE 트리거가 나타나지 않는다(PostgreSQL 사양). 이후 점검 스크립트는 `pg_trigger`로 확인해야 한다. 기존 테스트는 실제 TRUNCATE 시도로 확인하므로 문제없음.
- VisaType `OTHER`는 §7.4 표대로 defaultTrack=CONSULT_ONLY지만 SC-02에 따라 registrable=false. 시드 주석(visaTypes.ts:8-9)에 근거가 적혀 있어 결정과 일치한다.
- "E-7 계열"은 `E-7` 한 행으로 처리하고 세부 유형은 SeekerProfile.visaSubType에 둔다(visaTypes.ts:6-7). P1 트랙 분류(R-108) 구현 때 E-7-x 입력이 E-7 행으로 매핑되는지 확인 필요.
- Region·Industry 이름과 인구감소지역 목록은 에이전트 기억 기반 초안(파일 주석에 명시, 전 행 needsReview=true). 운영자 대조가 필요하다(PC-6).
- README는 `pnpm db:*`로 적혀 있다. 이 환경에서는 `corepack pnpm`으로 실행했고 동작은 같다.

## 판정불가 / 사람 확인 필요
- 없음. 단, Region 시·군·구 목록(229개)과 인구감소지역 89곳의 사실 정확성은 공식 출처와 대조하지 않았다. PC-6에 따라 "초안 + 검토 필요 표시"가 합격 기준이므로 표시 여부만 판정했다.

## 시험 흔적
- 개발 DB에 넣은 시험 행(User·SeekerProfile·Company·Recommendation·AuditLog `qa_p0b_*`)은 `db:reset`으로 DB를 재생성해 제거했다(재생성 후 Recommendation 0, AuditLog 0, User 0). 개발 DB는 켜진 상태(54320)로 둠.
- 임시 클러스터(scratchpad/freshpg)는 중지 후 삭제했다. 임시 스크립트는 scratchpad에만 두었고 끝난 뒤 지웠다. 저장소 파일 변경 없음(`git status`가 시험 전과 같음).
