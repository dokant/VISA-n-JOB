# QA 보고서 — Phase P1d / run 3 (최종 재확인)

- 대상: 커밋 dc04584 (QA D-1 ledger TRUNCATE 교착, wizard E2E hydration 경합, O-6 rawJson 과잉 마스킹). 비교 기준: run 2 보고서 `phase-P1d-run-2.md`(D-1, O-6)
- 기준 문서: PRD R-114, R-115, R-116, R-124, R-125, R-129; PLAN `### P1d` QA 방법·검증 명령; R-006(ledger, 테스트 대상)
- 일시: 2026-11-16 17:00 ~ 17:20 (KST)
- 환경: Windows 11, 개발 DB 54320, Vitest 테스트 클러스터 54329(실행마다 새 DB). 프로덕션 빌드 `next start` 127.0.0.1:3186(`TRUST_PROXY=true`). E2E `E2E_PORT=3172`(+3173)를 **다른 시험 없이 단독** 실행. test 계열은 모두 순차 실행(동시 실행 없음). 직접 시험: curl(본문 UTF-8 파일 `--data-binary @file`), 복호화 없는 PrismaClient(`row_to_json` 원본 행), 앱 코드 tsx. `INGEST_API_KEY`는 셸 변수로만 읽어 헤더에 넣었고 출력하지 않음. 외부 전송 없음(OTP는 콘솔 어댑터만 존재). 3186 서버는 끝에 종료(3186·3172·3173·54329 LISTEN 없음 확인). 저장소 임시 파일(`p1d3_*.tmp.ts`)과 스크래치 `p1d3_*`는 이름으로 지움. `git status`는 `.workflow/` 기존 변경과 `qa/`뿐, HEAD dc04584.

## 결과 요약
- 통과: 14 / 전체: 14 (통과율 100%)
- 필수 항목(PRD 합격 기준) 실패: 0개
- 결함: 없음
- 기준 외 발견: O-9(사업 숫자 키 아래 숫자형 전화번호 유지), O-10(플래그 접미 키의 메신저 ID 문자열 미마스킹), O-8 계속(시험 행 잔존)

## 검증 명령 (순차 실행)
| 명령 | 종료 코드 | 결과 |
|---|---|---|
| `corepack pnpm test` ×12 연속 | **12회 모두 0** | 매회 43 files / **360 tests** 통과(run 2 359 → +1, O-6 테스트). 12개 로그 전체에서 `40P01`·`deadlock` 0건. 1회 20~23s |
| `corepack pnpm lint` | 0 | 오류·경고 없음 |
| `corepack pnpm typecheck` | 0 | 오류 없음 |
| `corepack pnpm i18n:check` | 0 | ko 894 keys, 6 locales, errors 0 |
| `corepack pnpm qa:static` | 0 | errors 0, warnings 17 (run 2와 같음) |
| `corepack pnpm build` | 0 | Compiled successfully, 153/153 페이지 |
| `E2E_PORT=3172 corepack pnpm test:e2e tests/e2e/wizard-resume.spec.ts --repeat-each=5` | 0 | **30 passed (2.0m)** (3 tests × 5 × 2 프로젝트) |
| `E2E_PORT=3172 corepack pnpm test:e2e` | 0 | **202 passed (2.9m)**, 실패·재시도 없음 |

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| 1 | D-1 `pnpm test` 반복 시 교착 없음 | 다른 작업 없이 12회 연속 실행, 로그마다 exit·`40P01|deadlock` 검색 | Pass | 12/12 exit 0, `Tests 360 passed (360)` ×12, 교착 0건(run 2: 16회 중 6회 실패) |
| 2 | D-1 수정 후에도 ledger 테스트가 UPDATE/DELETE/TRUNCATE 차단을 실제로 검증 | 코드 확인 + **변이 시험**: 스크래치 vitest 설정으로 프로젝트 globalSetup을 감싸 새 테스트 DB를 만든 뒤 그 DB에서만 트리거를 끄고 `ledger-trigger.test.ts` 실행. (a) `*_no_truncate` 2개만 DISABLE (b) 4개 모두 DISABLE. 개발 DB 트리거는 건드리지 않음, 테스트 DB는 teardown에서 삭제 | Pass | 코드: `truncateError`는 lock 대기 오류(55P03/57014/40P01)만 재시도, 문장이 성공하면 `"… succeeded — the append-only TRUNCATE trigger did not fire"`로 실패, 그 외 오류는 `LEDGER_ERROR` 일치 단언. (a) `tgenabled` D/O 확인 후 TRUNCATE 2건이 `TRUNCATE "Recommendation" CASCADE succeeded — …did not fire`, `TRUNCATE "AuditLog" succeeded — …`로 **실패**(5 failed / 3 passed; 나머지 3건은 TRUNCATE로 행이 사라진 연쇄 실패). (b) UPDATE/DELETE raw SQL `promise resolved "1" instead of rejecting`, Prisma update/delete도 실패, 7 failed / 1 passed(설치 여부 테스트만 통과). 트리거 정상인 12회 본 실행에선 8/8 통과. `deleteMany({})`가 `where: { id }`로 좁혀졌으나 트리거가 행 단위라 검증 강도는 같음 |
| 3 | wizard-resume E2E 안정 (hydration 경합) | `--repeat-each=5` 단독 실행 | Pass | 30 passed, 실패·flaky 0 |
| 4 | E2E 전체 | 단독 1회 | Pass | 202 passed (2.9m) |
| 5 | O-6 개수·플래그·사업 숫자 키는 rawJson에 값 유지 | 3186에 `QAP1D3-O6-A` 1건 수집(cellCount 2, phoneCount 3, emailVerified true, faxYn "N", bizNum 1234567890, budget 250000000, amount 1000000000, salaryWon 1012345678, headcount 12, `연락처수` 2, `전화번호여부` "Y", contact.verified false). 원본 행 `rawJson::text` 확인 | Pass | `{"created":1,…} [HTTP 200]`. rawJson: `"cellCount": 2`, `"phoneCount": 3`, `"emailVerified": true`, `"faxYn": "N"`, `"bizNum": 1234567890`, `"budget": 250000000`, `"amount": 1000000000`, `"salaryWon": 1012345678`, `"headcount": 12`, `"연락처수": 2`, `"전화번호여부": "Y"`, `"contact": {…, "verified": false}`, payMin/payMax 2500000/3200000, description 원문 유지 |
| 6 | O-6 실제 연락처는 가려짐 | 같은 항목에 `tel:"051-777-3333"`, `telephone:"02-345-6789"`, `hpNo:1077778888`, `handphone:"010-2222-6666"`, `contact.phone:1044445555`, `contact.name:"이담당"`, `extra.value:1066667777`(알 수 없는 키), `extra.memo:"문의 010-5151-6262 또는 qa3.recruit@gmail.com"`, `extra.faxYn:"051-919-2828"`·`extra.hasPhone:"010-4747-5858"`(플래그 키에 전화번호), `extra.phoneCount:1088889999`(개수 키에 전화 모양 수), `extra.list:[1012121313]`, `extra.nested.unknownNum:1031314141`·`tel2:"010-6060-7070"`·`휴대폰번호:"010-8181-9292"` | Pass | rawJson: `"tel":"***"`, `"telephone":"***"`, `"hpNo":"***"`, `"handphone":"***"`, `"contact":{"name":"***","phone":"***",…}`, `"value":"***"`, `"memo":"문의 *** 또는 ***"`, `"faxYn":"***"`(extra), `"hasPhone":"***"`, `"phoneCount":"***"`(extra), `"list":["***","x"]`, `"unknownNum":"***"`, `"tel2":"***"`, `"휴대폰번호":"***"`. 전용 연락처 3필드는 rawJson에서 빠지고 `contactNameEnc/PhoneEnc/EmailEnc = v1:…` |
| 7 | 행 전체 평문 연락처 0건 | 같은 행 `row_to_json(j)::text` 전체에서 26개 값 검색(3333, 7777, qa3-hr, example.com, 김담당, 777-3333, 345-6789, 1077778888, 2222-6666, 1044445555, 이담당, 1066667777, 5151, 6262, qa3.recruit, gmail, 919-2828, 1088889999, 4747, 5858, 1012121313, 1031314141, 6060, 7070, 8181, 9292) | Pass | `ROW_HITS 0 []`. 열: companyName "큐에이삼차정밀", title "생산직 모집", BUSAN/BUSAN_YEONGDO_GU/depopulationArea true/industryCode C |
| 8 | O-6 단위 테스트 | `ingest.test.ts` "O-6 rawJson: counts / flags …" | Pass | 12회 실행 모두 `ingest.test.ts (10 tests)` 통과 |
| 9 | 회귀 R-114 | 3186 curl: 키 없음, 틀린 키, 3건+마감 1건 배치 2회, `[]`, 201건 | Pass | 401·401(`UNAUTHENTICATED`). 1회 `{"created":3,…,"rejected":[{"sourceRef":"QAP1D3-CLOSED","reason":"CLOSED"}]}` → 2회 `{"created":0,"updated":3,…}`; DB `QAP1D3-IDEM-*` 3행, CLOSED 0행. `[]` 400 VALIDATION, 201건 400 `BATCH_TOO_LARGE`. 태깅: 부산 영도구 → BUSAN_YEONGDO_GU·depopulationArea true·제조업 C, 경북 의성군 → GYEONGBUK_UISEONG_GUN·true·농업 A. 단위 `route.test.ts`(9)·`ingest.test.ts`(10) 통과 |
| 10 | 회귀 R-115 | tsx로 `QAP1D3-IDEM-2`를 DO_NOT_CONTACT로 바꾼 뒤 같은 배치 재수집 | Pass | `{"updated":3}` 후 IDEM-2 grade `DO_NOT_CONTACT` 유지, IDEM-1·3 C 유지 |
| 11 | 회귀 R-116 | tsx `archiveStaleLeads(now / now+31일 / 한 번 더, {scope: QAP1D3-IDEM-*})` | Pass | now `{"archived":0}` → +31일 `{"archived":2,"noContact":2}`(IDEM-1·3 ARCHIVED, DNC IDEM-2 그대로) → 다시 `{"archived":0}`(멱등). 단위 `archiveLeads.test.ts`(2) 통과 |
| 12 | 회귀 R-124 | E2E + 단위 | Pass | `employer-intake.spec.ts:37`(PUBLISHED 규칙 없음 → 확인 필요 카드 + 참고 고지), `:69`(전 로케일, 지원하기 문구 없음) 데스크톱·375 통과. `diagnosis.test.ts`(8) 통과 |
| 13 | 회귀 R-125 | E2E + 단위 | Pass | `employer-intake.spec.ts:88`(자유 입력 연락처 거부 + 사유, 고친 뒤 B 리드), `:83`(비로그인 리다이렉트) 데스크톱·375 통과. `server/actions/employer/request.test.ts`(5)·`schemas/employer/request.test.ts`(5) 통과 |
| 14 | 회귀 R-129 | 3186: 키 있음·IP 분산 수집 70회(`[]`), 한 IP에서 다른 번호 OTP 22회. 로그인은 E2E·단위 | Pass | 수집: 400×60 → 429×10, `Retry-After: 31`. OTP: 200×20 → 429×2, `Retry-After: 2789`. E2E `auth.spec.ts:180`(로그인 429 + 폼 메시지) 데스크톱·375 통과, 단위 `rateLimit429.test.ts`(3)·`seeker/otp/route.test.ts`(4) 통과 |

## 결함 목록 (Fail만)
| 번호 | 항목 | 재현 방법 | 기대 | 실제 | 위치 |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

## 기준 외 발견
| 번호 | 내용 | 재현·증거 | 영향 | 제안 |
|---|---|---|---|---|
| O-9 | 사업 숫자 키(bizNum·amount·pay·salary·price…) 아래에 **숫자형** 전화번호가 오면 그대로 남음 | tsx `sanitizeRaw`: `{extra:{amount:1098765432}}` → `1098765432`, `bizNum:1012345678` → 유지, `payAmount:1012345678` → 유지. 문자열 `budget:"010 1234 5678"`은 `***`, `bizTel`·`salaryTel`처럼 연락처 단어가 같이 있으면 `***` | O-6 수정의 의도된 절충(사업 숫자 우선). rawJson은 직원 전용이고, 수집 소스가 금액 키에 전화번호를 숫자로 넣을 가능성은 낮음 | 수용 여부 사람 결정. 필요하면 사업 숫자 키라도 `010`으로 시작하는 10자리(0 복원 시 휴대폰 모양)만은 가림 |
| O-10 | 개수·플래그 단어가 붙은 메신저 키의 **ID 문자열**이 가려지지 않음 | `kakaoYn:"qahr77"` → 유지, `useKakao:"qahr77"` → 유지(커밋 전엔 `kakao` 단어로 연락처 키 → `***`). 같은 자리의 전화·이메일 문자열은 `maskContacts`로 가려짐(`hasPhone:"010-…"` → `***`, `emailYn:"a.b@x.co.kr"` → `***`) | 키 이름이 플래그인데 값이 ID인 비정상 입력에서만 발생. 누출 방향이지만 가능성 낮음 | 플래그 키라도 값이 boolean/Y·N/숫자가 아니면 연락처 키 규칙 적용 등 검토(판단은 builder) |
| O-8 | 시험 행이 개발 DB에 남음(계속) | 이번 회차 추가: JobLead `QAP1D3-O6-A` 1, `QAP1D3-IDEM-1~3` 3(1·3 ARCHIVED, 2 DNC), OtpChallenge 20, RateLimitBucket, 로그인 E2E 계정 등 | 개발 데이터 오염(run 1 O-5, run 2 O-8과 같음) | 정리 스크립트 또는 e2e 전용 DB |

## run 2 지적 사항 처리 확인
| 지적 | 판정 | 근거 |
|---|---|---|
| D-1 (단위 테스트 교착) | 해소 | 항목 1(12/12, 교착 0), 항목 2(트리거 끄면 테스트 실패 → 검증 강도 유지) |
| O-6 (rawJson 과잉 마스킹) | 해소 | 항목 5~8. 절충에 따른 잔여는 O-9·O-10 |
| O-7 (`sigungu:null` 단독 거부) | 이번 범위 밖(문서화된 동작) | — |
| wizard-resume 경합 | 재현 안 됨 | 항목 3·4 |

## 판정불가 / 사람 확인 필요
- 고지 문구·[전문가 검토 필요] 대상 문구의 법률 내용과 5개 언어 번역 품질은 사람 검토 대상(run 2와 같음).
- 워커 cron 실행·정상 종료 로그는 이번 수정 범위 밖이라 확인하지 않음(run 1·2와 같음).
