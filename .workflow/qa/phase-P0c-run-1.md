# QA 보고서 — Phase P0c / run 1

- 대상: Phase P0c — 보안 유틸·암호화 확장·알림 인터페이스 (커밋 611260c, 선행 1bbf269)
- 기준 문서: PRD v1.1 (R-008~R-013), PLAN ### P0c, WO §1.3·§2(BR-01/02/14/15)·§11, DECISIONS PC-1·PC-14, STANDARD 4.7·4.8·S-45
- 일시: 2026-11-16

## 결과 요약
- 통과: 15 / 전체: 15 (통과율 100%) — 요구사항 6, 종료 코드 결함 수정 검증 1, 회귀 7, 시군구 코드 1
- 필수 항목 실패: 0개
- 결함: 없음. 개선 제안 6건(pii-guard 미탐·부분 오탐, rbac 명칭), 기준 외 관찰 1건(coverage 1회 이상 실행)

## 종료 코드 결함(빌더 보고, P0b부터) 수정 검증
| 시험 | 결과 | 증거 |
|---|---|---|
| 저장소 안에 `tests/unit/__qa_fail.test.ts`(`expect(1).toBe(2)`) 생성 → `corepack pnpm test` | Pass | `Test Files 1 failed \| 14 passed (15)`, `Tests 1 failed \| 118 passed (119)`, `[ELIFECYCLE] Test failed`, **EXIT=1**. 직후 파일 삭제, `git status --short`에 tests/ 변경 없음(남은 항목은 이 시험 전부터 있던 `.workflow/*` 수정과 `?? .workflow/qa/`뿐) |
| 커버리지 임계값 미달 시 종료 코드 | Pass(우연한 증거) | 아래 "기준 외 관찰"의 1회차 `test:coverage`가 0% 커버리지로 `ERROR: Coverage for lines (0%) does not meet "src/lib/crypto.ts" threshold (90%)` 등 4줄을 내고 **EXIT=1** → 임계값 미달도 비영 종료 |
| 수정 방식 | 확인 | `tests/setup/global-db.ts:46-58` `preserveFailureExitCode()` — `process.exit(0)`/인자 없음일 때 `process.exitCode`가 설정돼 있으면 그 값을 유지 |

이전 Phase 판정 영향: P0a에는 embedded-postgres globalSetup이 없어(P0b에서 도입) 해당 없음. P0b QA(`phase-P0b-run-1.md` 회귀-3)는 종료 코드뿐 아니라 출력 `Test Files 8 passed (8)`, `Tests 65 passed (65)`를 확인해 기록했으므로 실패가 숨겨진 Pass가 아님. P0a run-2도 `Tests 36 passed (36)`를 출력으로 확인. **이전 판정 변경 필요 없음.** 단, P0b 기간 동안 pre-commit·CI가 종료 코드만 보고 통과시켰을 가능성은 이번 수정으로 해소됨.

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| R-008 | 암·복호 왕복, 변조 시 실패, 키 버전 교체 후 구버전 복호 성공 테스트 | `src/lib/crypto.ts`, `tests/unit/lib/crypto.test.ts` 열람 + `pnpm test` 실행 | Pass | 9건 통과. 왕복: 한글·`+8210…`·베트남어+이모지·빈 문자열, `v2:` 접두 확인, 같은 평문 → 다른 암호문(무작위 IV). 변조: IV(바이트 0)·태그(12)·본문(28) 1비트 뒤집기 → `DecryptionError`, `v2:`→`v1:` 재표기 → `authentication failed`. 잘못된 키 → 오류 메시지에 페이로드 미포함. 키 교체: `1:` 로 암호화 → `1:,3:`에서 구버전 복호 성공·신규는 v3 → v1 폐기 시 `no key for version v1`. HMAC-SHA256 hex 64자·결정적·키 의존, HASH_KEY 32바이트 미만 거부. 테스트 키는 `tests/setup/env.ts`가 파일마다 생성(.env 미사용) |
| R-009 | DB raw 조회 시 `*Enc` 컬럼에 평문 없음, 앱 조회 시 복호 테스트 | `src/lib/db.ts`, `tests/unit/lib/enc-extension.test.ts` 열람·실행. schema의 `Enc` 필드 전수와 테스트 목록 대조 | Pass | 7건 통과. raw `$queryRawUnsafe`로 `^v[0-9]+:` 형식·평문 미포함 확인, 전체 테이블 `LIKE '%홍길동%'/'%@%'/'%zalo%'` 0건. 커버 범위: 중첩 create(배열)·중첩 createMany(WorkExperience), 중첩 update(맨몸/`{data}`)·updateMany·upsert(단건/배열), connectOrCreate, 역방향 중첩 create, 최상위 upsert(생성·갱신 양쪽)·createMany(raw `LIKE` 0건)·createManyAndReturn·updateMany, `{set}` 갱신, null, 트랜잭션, 싱글턴 `db`. `User.totpSecret` 암호화(raw 암호문) 포함. 앱 조회: find*·include·select·delete 반환값 복호. 암호화 컬럼 where 필터는 예외. schema `Enc` 필드 12개(User 1, SeekerProfile 4, WorkExperience 1, Company 2, JobLead 3) + totpSecret이 `encryptedFieldsOf` 테스트 목록과 일치 |
| R-010 | STAFF_PLACEMENT 연락처 허용·체류 사건 거부, STAFF_VISA 반대, ADMIN 둘 다 — 테스트 | `src/lib/rbac.ts` 매트릭스를 WO §1.3·§11·BR-01·PC-1과 대조, `rbac.test.ts` 실행 | Pass | 10건 통과. PLACEMENT: `contact:view` true, `visaCase:view/manage` false·assertCan 403. VISA: 반대. ADMIN: 둘 다 + 모든 직원 권한. AGENCY: `permissionsOf` = `["agency:visaRequest"]`만(WO §1.3 "비자 업무 의뢰만"). EMPLOYER: `candidates:view`만, `contact:view`·`seeker:view`·`visaCase:view`·`admin:access` false(BR-01, PC-1 "연락처는 앱에 없음"과 일치). 포털 3역할 모두 `contact:view` 없음. `audit:view`·`pii:export` ADMIN 전용, `rules:publish` = STAFF_VISA·ADMIN(WO §6.5 "STAFF_VISA 이상"). 401/403 API 오류 본문 형식 확인. 빌더 판단 배정 검토는 아래 참고 |
| R-011 | 기록 함수 호출 시 AuditLog 행 생성 테스트 | `src/lib/audit.ts`, `audit.test.ts` 열람·실행, STANDARD 4.8 표와 대조 | Pass | 6건 통과. `AUDIT_ACTIONS` 11개 = STANDARD 4.8 표 11개와 이름·순서 일치(PII_VIEW, PII_EXPORT, SEEKER_GRADE_CHANGE, SEEKER_TRACK_CHANGE, LEAD_GRADE_CHANGE, RECOMMENDATION_CREATE, POSTING_PUBLISH, CANDIDATE_BULK_VIEW, RULE_PUBLISH, CONSENT_REVOKE, COMPANY_VERIFY). 액션마다 `writeAudit` → 행 11개 생성·meta 저장 확인, 기본 클라이언트(db)로도 행 생성, PII_VIEW·PII_EXPORT 헬퍼(필드명만, PC-14 함수 단위), meta에 전화·이메일·`*Enc`/password 키 → 거부 후 0행, 트랜잭션 롤백 시 0행. 코드는 `auditLog.create`만 사용(S-47) |
| R-012 | 국내·국제 전화, 이메일, URL, `@아이디`, kakao/zalo/telegram id 패턴 각 양성·음성 케이스 테스트 | `pii-guard.test.ts` 열람·실행 + 스크래치 tsx 스크립트로 직접 38개 케이스 투입 | Pass | 17건 통과. 양성: 국내 전화 17, 국제 11, 이메일 10, URL 12, @handle 3, 메신저 id 24(kakao/카톡·zalo/잘로·telegram/텔레그램 포함). 음성: 금액 9, 날짜 7, 시간 5, 인원 7, 비자 코드 4, 우편·주소 4, id 없는 메신저 단어 7, 기타 8. 직접 시험(지정 10개 전부 기대대로): `연락처 공일공-일이삼사-오육칠팔`→PHONE_LOCAL, `zalo: 0912345678`→MESSENGER_ID, `nhắn tin qua zalo 0912 345 678`→MESSENGER_ID, `telegram @worker_kim`→MESSENGER_ID, `월급 2,800,000원 주 5일 08:00~17:00`→없음, `E-9 비자 3명 모집`→없음, `kakao id: abc123`→MESSENGER_ID, `abc123@naver.com`→EMAIL, `naver dot com`→없음(로컬부 없음, 아래 제안), `1588-1234`→PHONE_LOCAL. 추가: 베트남 번호 `0912.345.678`·`0912 345 678`·`0912345678` 탐지, `hong[at]naver[dot]com` 탐지, `facebook.com/hong` 탐지, 사업자번호·계좌번호·지번·급여/교대 문장 오탐 없음. 미탐·부분 오탐은 개선 제안 P-1~P-5 |
| R-013 | crypto·rbac·audit·pii-guard 라인 커버리지 각 90% 이상 | `corepack pnpm test:coverage`(2회), `coverage/coverage-summary.json` 파일별 수치 확인, `vitest.config.ts` thresholds 열람 | Pass | EXIT=0, 14 files/118 tests. 라인: crypto 100, rbac 100, audit 100, pii-guard 100(분기 96.96). 참고 db.ts 96.9, notifications/console 100, index 100, types 0(타입 전용 파일). `vitest.config.ts` 4개 파일 각 `lines: 90` 임계값 → 미달 시 EXIT=1 실증(위) |
| 회귀-1 | lint | `corepack pnpm lint` | Pass | EXIT=0, 출력 없음 |
| 회귀-2 | typecheck | `corepack pnpm typecheck` | Pass | EXIT=0 |
| 회귀-3 | test | `corepack pnpm test` | Pass | `Test Files 14 passed (14)`, `Tests 118 passed (118)`, EXIT=0 |
| 회귀-4 | i18n:check | `corepack pnpm i18n:check` | Pass | 6개 언어 0 error, EXIT=0 |
| 회귀-5 | qa:static | `corepack pnpm qa:static` | Pass | errors 0, warnings 1: `S-45/console src/lib/notifications/console.ts:19`. STANDARD 4.7(v2.3)의 유일한 예외 파일로, 조건을 열어 확인: 수신자 `maskRecipient` → `***` + 끝 2자리, params는 `NODE_ENV !== 'production'`에서만, JSON 한 줄 → 조건 충족 |
| 회귀-6 | build | `corepack pnpm build` | Pass | EXIT=0, `/[locale]` SSG, Middleware 47.4 kB |
| 회귀-7 | test:e2e | `corepack pnpm test:e2e` | Pass | `24 passed (53.3s)`, EXIT=0 |
| 시군구 | 콜론 코드 0건, 중복 0건 | 개발 DB(54320, running)에 Prisma로 조회(임시 스크립트, 실행 후 삭제) | Pass | Region 246행, `code LIKE '%:%'` 0, 중복 code 0, `^[A-Z0-9_]+$` 위반 0. 예: `BUSAN_BUK_GU`, `BUSAN_BUSANJIN_GU` |

## R-010 빌더 판단 배정 검토 (WO와 모순 여부만)
- `company:verify` → STAFF_PLACEMENT·ADMIN: WO §1.3은 기업 검증 담당을 명시하지 않고, PRD R-218은 "관리자가 … 설정"이라고만 한다. 구인 리드·기업 관리가 PLACEMENT 업무(§1.3)라 **모순 없음**. 다만 R-218의 "관리자"를 ADMIN 한정으로 읽을 여지가 있어 P2 착수 전 사람 확인 권장.
- `seeker:review` → 직원 3역할: WO §1.3은 "구직자 검증"을 STAFF_VISA 행동으로 적었고 PLACEMENT에는 없다. PLACEMENT까지 준 것은 WO보다 넓은 배정이나 WO가 PLACEMENT를 금지하지 않으므로 **명시적 모순은 아님**. §11 분리 원칙(연락처·체류 사건)에는 영향 없음. 정책 확인 권장.
- 그 외 `agency:visaRequest` 명칭이 PLAN 예시 `agency:visaRequestOnly`와 다름 — 의미 동일, 결함 아님.

## 결함 목록 (Fail만)
없음.

## 개선 제안 (합격 기준 밖, pii-guard 미탐·오탐 — Fail 아님)
| 번호 | 입력 | 실제 | 제안 |
|---|---|---|---|
| P-1 | `Liên hệ Zalo: Nguyễn 0912-345-678` | `MESSENGER_ID[Zalo: Nguy]` + PHONE → 마스킹 결과 `Liên hệ ***ễn ***` (이름 일부만 가림, 부분 오탐) | `ID_TOKEN` 뒤에 비ASCII 글자가 이어지면(`(?![\p{L}])`) 매치하지 않도록 경계 추가 |
| P-2 | `naver dot com`, `hong 점 naver 점 com` 류 | 로컬부 없는 `dot` 단어 표기는 미탐(`(dot)`·` 점 `·` 닷 `만 처리) | URL 단어 표기에 `\bdot\b` + 알려진 메일 호스트 조합 추가 검토 |
| P-3 | `15881234`(구분자 없음) | 미탐(구분자 있는 `1588-1234`만) | 앞에 "대표번호/전화/tel" 키워드가 있을 때만 구분자 없는 대표번호 허용 |
| P-4 | `공1공-1234-5678`, `o1o-1234-5678`, `010-I234-5678`, `제로원제로 1234 5678`, `전화번호는 공일공에 일이삼사 오육칠팔` | 모두 미탐(한글·숫자 혼합, 영문자 o/I 치환, 조사 삽입) | 정규화 단계에서 o/O→0, I/l→1 치환 및 한글·숫자 혼합 런 허용 검토(오탐 영향 시험 필요) |
| P-5 | `카 톡 abc123`, `k a k a o abc123`, `instagram hong.job`, `fb: hong.job`, `skype: hong.gd`, `discord hong#1234` | 미탐. `line id: hong123`·`라인 아이디 hong123`은 `id:`/`아이디` 규칙으로만 탐지(키워드 `line/라인`은 미포함 — "생산 라인" 오탐 회피 의도로 보임) | WO §11 지정 메신저(kakao/zalo/telegram)는 충족. 기업 자유 입력란(BR-14) 우회 방지용으로 instagram/facebook/skype/line 키워드와 글자 사이 공백 변형 추가 검토 |
| P-6 | rbac 명칭 | `agency:visaRequest` vs PLAN 예시 `agency:visaRequestOnly` | PLAN 예시를 실제 이름으로 맞추면 혼동 감소 |

## 기준 외 관찰
- O-1: 첫 `corepack pnpm test:coverage` 실행이 `No test files found, exiting with code 1`을 출력하고 0% 커버리지 보고 후 `Tests closed successfully but something prevents Vite server from exiting`로 멈춤(약 10분, 호출자가 중단). 직후 테스트 파일 14개 존재 확인, 같은 명령 2회 재실행은 모두 정상(14/118 통과, EXIT=0, 약 20초). 직전에 임시 실패 테스트 파일을 만들고 지운 직후라 파일 탐색 시점 문제였을 가능성이 있으나 재현되지 않아 원인 미확정. 결함으로 올리지 않음. CI에서 재발하면 `teardownTimeout`·임베디드 PG 종료 확인 필요.

## 판정불가 / 사람 확인 필요
- 판정불가 항목 없음.
- 사람 확인 권장: R-218 "관리자"의 범위(`company:verify`에 STAFF_PLACEMENT 포함 여부), `seeker:review`의 STAFF_PLACEMENT 부여 여부.

## 정리
- 임시 파일: `tests/unit/__qa_fail.test.ts`, 저장소 루트 `__qa_region.ts` 모두 삭제. 스크래치 스크립트는 세션 스크래치 디렉터리에만 있음.
- 최종 `git status --short`: 소스·테스트 변경 없음(`.workflow/` 문서 수정은 이 QA 이전부터 있던 것 + 본 보고서).
