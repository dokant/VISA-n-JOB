# QA 보고서 — Phase P1d / run 2 (재확인·회귀)

- 대상: 커밋 ef7ea14 (standard N-1~N-6, QA O-1·O-2 수정). 비교 기준: run 1 보고서 `phase-P1d-run-1.md`(O-1, O-2), 기준 검토 `phase-P1d-standard-run-1.md`(N-1~N-6)
- 기준 문서: PRD R-114, R-115, R-116, R-124, R-125, R-129 (BR-01, BR-14, WO §15-9); PLAN `### P1d` QA 방법; DECISIONS Q-12 ①③, Q-13; STANDARD v2.9 1.1·2.1.4·3.5·S-53
- 일시: 2026-11-16 16:20 ~ 17:10 (KST)
- 환경: Windows 11, 개발 DB 54320, Vitest 테스트 DB(실행마다 새 DB). 프로덕션 빌드 `next start` 127.0.0.1:3180(`TRUST_PROXY=true`), N-4 시험용 별도 서버 127.0.0.1:3190(임시 키 주입). E2E `E2E_PORT=3170`(+3171)을 **다른 직접 시험 없이 단독 실행**. 직접 시험: curl(본문 UTF-8 파일 `--data-binary @file`), 복호화 없는 PrismaClient(`row_to_json` 원본 행), 앱 코드 tsx, Playwright chromium 375×812. `INGEST_API_KEY`는 셸 변수로만 읽어 헤더에 넣었고 출력하지 않음. 외부 전송 없음(OTP는 콘솔 어댑터). 3180·3190 서버는 끝에 종료(LISTEN 없음 확인). 워커는 띄우지 않음. 스크래치 파일은 내가 만든 `p1d2_*`만 지움. `git status`는 `.workflow/` 기존 변경과 `qa/`뿐, HEAD ef7ea14.

## 결과 요약
- 통과: 21 / 전체: 22 (통과율 95%)
- 필수 항목(PRD 합격 기준) 실패: 0개
- 결함: D-1(단위 테스트 간헐 실패 — DB 교착, 검증 명령 항목)
- 기준 외 발견: O-6(rawJson 숫자 과잉 마스킹), O-7(`sigungu`만 null로 보내면 지역 전체 거부), O-8(시험 행 잔존)

## 검증 명령 (순차 실행)
| 명령 | 종료 코드 | 결과 |
|---|---|---|
| `corepack pnpm lint` | 0 | 오류·경고 없음 |
| `corepack pnpm typecheck` | 0 | 오류 없음 |
| `corepack pnpm test` | **1회차 1**, 총 16회 중 6회 1 | 통과 시 43 files / 359 tests (run 1 355 → +4). 실패는 매번 1건, 모두 Postgres `40P01 deadlock detected` (D-1) |
| `corepack pnpm i18n:check` | 0 | ko 894 keys, 6 locales, errors 0 |
| `corepack pnpm qa:static` | 0 | errors 0, warnings 17 (run 1과 같은 S-23 14, S-45 3) |
| `corepack pnpm build` | 0 (1회차) | 153/153 페이지, NODE_OPTIONS 재시도 불필요 |
| `E2E_PORT=3170 corepack pnpm test:e2e` | 0 (1회차) | **202 passed (2.5m)**, 실패·재시도 없음. 단독 실행이라 run 1의 부하성 실패 재현 안 됨. `employer-intake.spec.ts` 새 단언(Q-12 ③ 배지·고지 문구) 포함 4건×2 프로젝트 통과 |

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| 1 | O-1 `title`·`companyName` 열에 연락처 평문 없음, 회사명 본체 유지 | 3180에 2건 수집: A `companyName:"큐에이엣지산업 010-9876-5432 qa-hr@example.com"`, `title:"생산직 모집 문의 010-9876-5432 카톡 qahr77 https://open.kakao.com/o/qa77xyz 공일공 구팔칠육 오사삼이"` + 연락처 3필드. B `title:"용접공 모집 www.qa-recruit.kr 문의 qa.recruit@gmail.com"`, `companyName:"(주)한빛정밀"`. 원본 행 `row_to_json` 전체 텍스트에서 15개 값 검색 | Pass | `{"created":2,...} [HTTP 200]`. 열: `companyName = 큐에이엣지산업 *** ***`, `title = 생산직 모집 문의 *** *** *** ***`, B `title = 용접공 모집 *** 문의 ***`, `companyName = (주)한빛정밀`(그대로). `contact*Enc` = `v1:…`. 행 전체 검색 9876·5432·qa-hr·qahr77·open.kakao·구팔칠육·오사삼이·example.com·김담당·123-4567·1055554444·5555·qa-recruit·qa.recruit·gmail 모두 **0건** |
| 2 | O-1 rawJson 숫자 전화(tel, 중첩 fax/hp_no) 가림, payMin/payMax·일반 금액 유지 | 같은 A 항목에 `tel:1098765432`, `extra.fax:"051-123-4567"`, `extra.nested.hp_no:1055554444`, `extra.amount:3000000`, `headcount:12`, `year:2026`, `salaryWon:2800000`, `zip:49001`, `jobCode:"010203"`, `bizNum:1234567890`, `description:"월급 280만원, 근무 09:00~18:00, 주 5일"` | Pass (O-6 참고) | rawJson: `"tel":"***"`, `"fax":"***"`, `"hp_no":"***"`, `"payMin":2500000`, `"payMax":3200000`, `"amount":3000000`, `"salaryWon":2800000`, `"headcount":12`, `"year":2026`, `"zip":49001`, `"jobCode":"010203"`, description 원문 유지. 열 `payMin 2500000 / payMax 3200000`. 과잉: `"bizNum":"***"` → O-6 |
| 3 | O-2 재수집 시 빠진 키는 기존 값 유지 | `QAP1D2-O2-A` 전 필드(source WORK24_API, bizRegNo, 부산 영도구, 제조업, pay, postedAt, closesAt, foreignIntent, 연락처 3) 생성 → `{sourceRef, companyName, title}`만 재수집 | Pass | 재수집 `{"updated":1}` 뒤 title만 "포장 2차(부분)"로 바뀌고 source WORK24_API, bizRegNo 1234567890, industryCode C, BUSAN/BUSAN_YEONGDO_GU/true, 2200000/2800000, postedAt·closesAt, foreignIntent true, contactName/Phone/Email Enc·Hash 앞부분 동일 |
| 4 | O-2 명시적 null은 지움 | `payMax:null, foreignIntent:null, contactEmail:null, industryCode:null, industryName:null, bizRegNo:"", closesAt:null` 재수집 | Pass | `bizRegNo null, industryCode null, payMax null, closesAt null, foreignIntent null, contactEmailEnc null`. 보내지 않은 payMin 2200000, postedAt, 지역, contactName/Phone Enc는 유지 |
| 5 | O-2 필수 열 null → INVALID, 행 불변 | 한 배치에 `companyName:null` / `title:null` / `title:"   "` 3건 | Pass | `{"created":0,"updated":0,"rejected":[INVALID×3]}`. 행 `md5(row_to_json)`·`updatedAt` 전후 동일(`bc981f45…`, `07:32:48.810Z`) |
| 6 | O-2 지역 키 null만 → UNKNOWN_REGION 거부, 행 불변 | (a) `sido:null`만 (b) `sido/sigungu/address` 모두 null (c) 지역 키 없는 새 sourceRef | Pass | (a)(b) `rejected:[{"reason":"UNKNOWN_REGION"}]`, 행 md5·updatedAt 동일, BUSAN/BUSAN_YEONGDO_GU 유지. (c) `UNKNOWN_REGION`, DB 행 0 |
| 7 | O-2 + R-115 DNC 리드 부분 재수집 | 같은 행을 DO_NOT_CONTACT로 바꾼 뒤 `{sourceRef, companyName, title, postedAt:"2026-12-01"}` 재수집 | Pass | `{"updated":1}`, grade DO_NOT_CONTACT 유지, LEAD_GRADE_CHANGE 감사 0, 지역·payMin·contactPhoneEnc 유지, title·postedAt만 갱신 |
| 8 | N-3 진단·의뢰 리드가 수요 집계에 섞이지 않음 (Q-12 ①) | tsx로 `getDemandAggregate`: 제주(JEJU, 기존 C·B·A 리드 0) 기준 → DIAGNOSIS 6건(C)·REQUEST 6건(B) 추가(업종 I, 급여 300~320만) → AGENT 5건(250~260만) 대조군 추가 → 넣은 17건 삭제 | Pass | baseline `cells:[]` → 진단·의뢰 12건 추가 후에도 `cells:[] bySido:[]` → AGENT 5건 뒤 `{"sido":"JEJU","industryCode":"I","count":5,"payBand":{"min":2500000,"max":2600000}}`(진단·의뢰 급여 미반영). 삭제 후 `cells:[]`. 코드 `aggregate.ts:171` `source: { in: [...INGEST_SOURCES] }`. 단위 `aggregate.test.ts` 11 tests 통과 |
| 9 | N-1 구인 의뢰 고지에 [전문가 검토 필요] 배지 (6개 언어) | Playwright 375px, 새 기업 계정 로그인 → `/{ko,en,vi,ru,zh,uz}/employer/request`의 `request-notice` | Pass | 6개 언어 모두 `expert-review`에 해당 언어 `common.expertReview.label` 포함(ko "[전문가 검토 필요]", en "[전문가 검토 필요] / [Expert review required]" 등). `notice-box` 텍스트 = 각 언어 `employer.request.notice`와 일치. 가로 스크롤 없음 |
| 10 | N-1 비ko 로케일 한국어 원문 병기 (SC-08) | 같은 화면에서 `p[lang="ko"]`와 라벨 | Pass | ko: 원문 블록 0개(중복 없음). en·vi·ru·zh·uz: 각 1개, 텍스트 = ko `employer.request.notice`, 라벨 = 각 언어 `legal.koreanOriginal`("Korean original", "韩文原文" 등) |
| 11 | N-5 고지의 운영자 표기 "비자앤잡 담당자" (6개 언어) | 같은 화면 텍스트 + `messages/*.json:1329` | Pass | ko "회사 측 연락처(담당자 이름·전화·이메일)는 비자앤잡 담당자만 확인합니다. …", "직원" 0건. en "…seen only by VISA n JOB staff members", vi "nhân viên VISA n JOB", ru "сотрудники VISA n JOB", zh "VISA n JOB 负责人", uz "VISA n JOB xodimlari" |
| 12 | N-6 about 연락 안내 문구 (6개 언어) | Playwright `/{locale}/about` 본문에 `public.about.contact.body` 표시 확인 | Pass | 6개 언어 모두 화면에 표시. ko "상담은 대표전화로 신청해 주세요. 비자앤잡 담당자가 안내해 드립니다.", en "A VISA n JOB staff member will guide you.", vi/ru/zh/uz 모두 "VISA n JOB" 주체 포함 |
| 13 | N-2 접수 완료 패널에 판정색 없음 | 375px ko 의뢰 정상 제출 → `job-request-done` 계산 스타일 | Pass | class `grid gap-4 rounded-md border border-border bg-white p-6 text-n700 shadow-1`, 배경 `rgb(255,255,255)`, 테두리 `rgb(229,231,235)`(= `--border` #e5e7eb), 글자 `rgb(63,72,89)`, 그림자 shadow-1. success 토큰(#15803d/#f0fdf4/#166534) 미사용. 아이콘 CircleCheck `text-brand-blue-600` `rgb(36,90,224)`. 접수 직후 목록에 "검수 · 검증 대기" 표시. 리드 `grade B, source REQUEST, title 검수` |
| 14 | N-4 서버 키 최소 길이 미만이면 401 | 3190 서버를 임시 무작위 키(31자 / 32자)로 각각 띄우고 그 키 그대로 수집 호출 | Pass | 31자: `{"error":{"code":"UNAUTHENTICATED",...}} [HTTP 401]`. 32자(대조): `{"created":1,...} [HTTP 200]`. 상수 `src/config/limits.ts` `INGEST_API_KEY_MIN_LENGTH = 32`, `ingestAuth.ts`가 import |
| 15 | 회귀 R-114 | 3180 curl: 키 없음, 틀린 키, 3건+마감 1건 배치 2회, `[]`, 201건, 200건 | Pass | 401·401. 1회 `{"created":3,"rejected":[{"sourceRef":"QAP1D2-CLOSED","reason":"CLOSED"}]}` 행 3, 마감 행 0 → 2회 `{"created":0,"updated":3,…}` 행 3. `[]` 400 VALIDATION. 201 → 400 `BATCH_TOO_LARGE`, 행 0. 200 → `{"created":200}`, 행 200. 태깅은 1·3번(부산 영도구 → BUSAN_YEONGDO_GU, depopulationArea true, 제조업 → C) |
| 16 | 회귀 R-115 | 7번(DNC) + tsx `ingestJobLeads`: ARCHIVED로 바꾼 리드를 (a) postedAt 없이 (b) postedAt 2026-12-15로 재수집 | Pass | (a) ARCHIVED, archivedAt 유지. (b) C, archivedAt null, 감사 `{"actorId":"SYSTEM","meta":{"from":"ARCHIVED","to":"C","reason":"INGEST_REPOSTED"}}` |
| 17 | 회귀 R-116 보관 전이 | tsx `archiveStaleLeads(now, {scope: QAP1D2-ARCH-*})`, 이어서 now+31일, 한 번 더 | Pass | now: `{"archived":2,"closed":1,"noContact":1}` — old31·closedYesterday만 ARCHIVED, old29·fresh C, B_old·DNC_old 그대로. now+31일: `{"archived":2,"noContact":2}` 나머지 C 모두 ARCHIVED, B·DNC 그대로. 세 번째 `{"archived":0}`(멱등) |
| 18 | 회귀 R-124 무료 채용 진단 | 전체 E2E + 단위 테스트 | Pass | `employer-intake.spec.ts:37`(PUBLISHED 규칙 없음 → YELLOW 카드 1장 + 참고 문구), `:69`(5개 언어, 지원하기/Apply 0) 데스크톱·375 통과. 단위 `diagnosis.test.ts` 통과(359 통과 회차) |
| 19 | 회귀 R-125 구인 의뢰 | 13번 직접 제출 + E2E | Pass | 직접: 리드 B/REQUEST, requestJson에 연락처 없음. E2E `employer-intake.spec.ts:88`(자유 입력란 카톡 아이디 거부 + 사유, 고친 뒤 B 리드 1건, StaffTask OPEN/STAFF_PLACEMENT) 통과, `:83` 비로그인 리다이렉트 통과 |
| 20 | 회귀 R-129 429 | 3180: 키 있음·IP 분산 수집 70회(`[]`), 한 IP에서 다른 번호 OTP 22회. 로그인은 E2E·단위로 확인 | Pass | 수집: 400×60 → 429×10, `Retry-After: 41`. OTP: 200×20 → 429×2, `Retry-After: 1239`. E2E `auth.spec.ts:180`(로그인 429 + 폼 메시지) 통과, 단위 `rateLimit429.test.ts`(3)·`otp/route.test.ts`(4) 통과 |
| 21 | 회귀 P1c 흐름 | 전체 E2E 단독 실행 | Pass | 202 passed: `quick-register`, `wizard-resume`(Step 0~7), `wizard-focus`, `referral`, `complete-screen`, `consent-revoke`, `auth`, `demand`(flag on/off) 데스크톱·375 모두 통과 |
| 22 | 검증 명령 7종 | 위 표대로 순차 실행 | **Fail (D-1)** | lint·typecheck·i18n·qa:static·build·E2E는 1회차 exit 0. `pnpm test`는 1회차 exit 1, 같은 코드로 15회 더 돌려 5회 실패(총 6/16) |

## 결함 목록 (Fail만)
| 번호 | 항목 | 재현 방법 | 기대 | 실제 | 위치 |
|---|---|---|---|---|---|
| D-1 | 22 | 다른 작업 없이 `corepack pnpm test`를 반복 실행(이번 회차 16회 중 6회 실패: 1회차, 3회 반복의 3번째, 5회 반복의 2·4번째, 6회 반복의 2·4번째) | 매번 359/359 통과 | 매번 1건 실패, 모두 `40P01 deadlock detected`. 교착 상대는 항상 `TRUNCATE "Recommendation" CASCADE`(AccessExclusiveLock 대기)와 다른 파일의 쓰기(RowShareLock 대기). 실패 쪽은 매번 다름: (a) `tests/unit/db/ledger-trigger.test.ts:81` "TRUNCATE on Recommendation fails" — 기대 `/append-only ledger/`, 실제 deadlock 메시지 (3회) (b) `tests/unit/lib/seeker/saveStep.test.ts:158` → `src/lib/seeker/consent.ts:79` `tx.consent.create` deadlock (c) `tests/unit/lib/candidates/eligible.test.ts:24` `gradeASeeker` → 같은 `consent.ts:79` deadlock (d) 1건은 `tests/unit/lib/employer/diagnosis.test.ts` "saves an anonymous run as a new C lead …"(상세 출력 미확보, 같은 실행 묶음) | `tests/unit/db/ledger-trigger.test.ts:80-84`(공유 테스트 DB에서 병렬 파일과 동시에 CASCADE TRUNCATE). 이 테스트는 P0b 이후 바뀌지 않았고, P1d에서 DB를 쓰는 테스트 파일이 늘며 겹칠 확률이 커진 것으로 보임(run 1은 1회 실행에서 통과). 제품 코드 결함 아님. 제안: 해당 TRUNCATE 시험을 다른 파일과 겹치지 않게(파일 단위 직렬화, 별도 DB/스키마, 또는 `lock_timeout` 후 트리거 오류만 확인) — 판단은 builder |

## 기준 외 발견
| 번호 | 내용 | 재현·증거 | 영향 | 제안 |
|---|---|---|---|---|
| O-6 | rawJson 과잉 마스킹: 9~10자리 정수와 일부 키 이름이 통째로 `***`가 됨 | 수집 시 `extra.bizNum:1234567890` → `"***"`. tsx `isPhoneShapedNumber`: 100000000·250000000·999999999·1000000000·1012345678 → true(1억·2.5억 같은 금액도 가림). 7~8자리 금액(2500000, 3000000, 20261116, 12345678)은 유지. `isContactKey`: `cellCount`·`phoneCount`·`emailVerified`·`faxYn` → true(값 통째 가림), `telephone` → false(값이 문자열이면 maskContacts로는 가려짐). 최상위 `payMin/payMax`만 예외(`ingest.ts` `NUMERIC_FIELDS`, depth 1) | rawJson은 직원 전용 원본이라 정보 손실 수준. 연락처 누출 방향은 아님 | 필요 시 억 단위 금액 키(budget·amount 등) 예외 여부를 사람이 결정 |
| O-7 | `sigungu:null`만 보내 시·군·구만 지우려 하면 지역 전체가 `UNKNOWN_REGION`으로 거부됨 | 규칙상 지역 키 하나라도 있으면 묶어서 재태깅(`transitions.ts` 머리 주석 "carried but no 시·도 found → rejected"). 6번 (b)와 같은 경로 | 문서화된 동작. 시·군·구만 비우려면 sido를 함께 보내야 함 | 수집 에이전트 문서에 명시 |
| O-8 | 시험 행이 개발 DB에 남음 | JobLead `QAP1D2-O1-*` 2, `QAP1D2-O2-A` 1, `QAP1D2-IDEM-*` 3, `QAP1D2-B200-*` 200, `QAP1D2-REPOST` 1, `QAP1D2-ARCH-*` 6, `QAP1D2-N4` 1, UI 의뢰 리드 1 + 기업 계정·Company 1, StaffTask 1, OtpChallenge 20, RateLimitBucket, AuditLog. N-3용 17행은 삭제 | 개발 데이터 오염(run 1 O-5와 같음) | 정리 스크립트 또는 e2e 전용 DB |

## run 1 지적 사항 처리 확인
| 지적 | 판정 | 근거 |
|---|---|---|
| O-1 (title·companyName 평문, rawJson 숫자) | 해소 | 항목 1·2 |
| O-2 (빠진 필드 null 덮어쓰기) | 해소 | 항목 3~7 |
| N-1 / N-5 / N-6 | 해소 | 항목 9~12 |
| N-2 | 해소 | 항목 13 |
| N-3 | 해소 | 항목 8 |
| N-4 | 해소 | 항목 14 |
| O-4 (E2E 환경성 실패) | 재현 안 됨 | 단독 실행 1회차 202/202 |

## 판정불가 / 사람 확인 필요
- 고지 문구·[전문가 검토 필요] 대상 문구의 법률 내용과 5개 언어 번역 품질은 사람 검토 대상.
- D-1 4번째 실패(`diagnosis.test.ts`)는 상세 출력을 저장하지 못해 원인이 같은 교착인지 직접 확인하지 못함(같은 실행 묶음의 다른 3건은 모두 교착).
- 워커 cron 실행과 정상 종료 로그는 run 1과 같이 확인하지 않음(이번 수정 범위 밖).
