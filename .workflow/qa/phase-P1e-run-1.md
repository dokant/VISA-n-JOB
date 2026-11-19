# QA 보고서 — Phase P1e / run 1

- 대상: 커밋 4beeb9f (관리자 MVP: 대시보드 카운트, 구직자 검토 큐, 리드 칸반·통화 기록, PII_VIEW)
- 기준 문서: PRD R-119, R-120, R-121, R-122; PLAN `### P1e` 완료 조건·QA 방법·검증 명령; DECISIONS Q-08, Q-14, PC-5, PC-10; WO §7.6, §8.2, §8.3, §11; BR-01
- 일시: 2026-11-16 17:40 ~ 18:20 (KST)
- 환경: Windows 11, 개발 DB 54320(세션 timezone Asia/Seoul, 컬럼 `timestamp without time zone`), Vitest 테스트 클러스터. 직접 시험은 프로덕션 빌드 `next start` 127.0.0.1:3187(`TRUST_PROXY=true`, 쿠키 때문에 `localhost`로 접속)에 Playwright 스크립트(스크래치)로 수행. 직원 계정은 `tests/e2e/support/authDb.ts`의 `createStaff`와 같은 방식(앱 `db`·`hashPassword`)으로 역할별 새로 만들고, 실제 로그인 화면 → TOTP 설정 화면에서 표시된 시크릿으로 코드 생성 → `/admin`까지 진행. 서버 액션 직접 호출은 빌드 `server-reference-manifest.json`의 액션 ID로 `Next-Action` 헤더 POST(React encodeReply 형식, 세션 쿠키 포함)를 보냄. E2E는 `E2E_PORT=3174`로 **다른 시험 없이 단독** 실행. test 계열 순차 실행. `.env` 값 출력 없음. 외부 전송 없음. 3187 서버는 끝에 종료(3174·3175·3187 LISTEN 없음 확인). 스크래치 `p1e1_*` 파일은 이름으로 삭제. `git status`는 `.workflow/` 기존 변경과 `qa/`뿐, HEAD 4beeb9f.

## 결과 요약
- 통과: 21 / 전체: 21 (통과율 100%)
- 필수 항목(PRD 합격 기준) 실패: 0개
- 결함: 없음
- 관찰·기준 외 발견: O-1(NO_INTENT 현재 동작, Q-14로 run 2 변경 예정), O-2(DNC 저장 확인 다이얼로그 없음), O-3(권한 없는 직접 호출이 처리되지 않은 오류로 응답), O-4(E2E wizard-focus 1회 불안정), O-5(시험 행 잔존)

## 검증 명령 (순차 실행)
| 명령 | 종료 코드 | 결과 |
|---|---|---|
| `corepack pnpm lint` | 0 | 오류·경고 없음 |
| `corepack pnpm typecheck` | 0 | 오류 없음 |
| `corepack pnpm test` | 0 | 49 files / **386 tests** 통과(19.8s). admin: `dashboard.test.ts`(3), `seekerReview.test.ts`(7), `leadDesk.test.ts`(7), `piiView.test.ts`(3), `priority.test.ts`(3), `adminActionsRbac.test.ts`(3) |
| `corepack pnpm i18n:check` | 0 | ko 894 keys, 6 locales, errors 0 |
| `corepack pnpm qa:static` | 0 | errors 0, warnings 17 (P1d run 3과 같음) |
| `corepack pnpm build` | 0 | Compiled successfully, 152/152 페이지. `/admin`, `/admin/seekers`, `/admin/seekers/[id]`, `/admin/leads`, `/admin/leads/[id]` 동적 라우트 생성 |
| `E2E_PORT=3174 corepack pnpm test:e2e` (1회차) | 1 | 205 passed / **1 failed**: `wizard-focus.spec.ts:86` desktop(`toBeFocused` 5s 타임아웃, P1c 범위). admin-core 4건(2 tests × 2 프로젝트) 통과 → O-4 |
| `E2E_PORT=3174 … wizard-focus.spec.ts admin-core.spec.ts --repeat-each=5` | 0 | 60 passed (2.1m), 실패 0 |
| `E2E_PORT=3174 corepack pnpm test:e2e` (2회차) | 0 | **206 passed (2.4m)** |

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| 1 | R-119 각 카운트가 DB 상태와 일치 | ADMIN·STAFF_VISA·STAFF_PLACEMENT로 `/admin`을 열어 `count-*` 4개를 읽고, 같은 순간 원시 SQL(정의 독립 작성: 신규=B·consultedAt null·BLOCKED 제외 / 전화=C·B이고 nextActionAt null 또는 KST 내일 0시 미만 / 면접=KST 오늘 [0시, 내일 0시) / 만료=BLOCKED 제외, stayExpiry ≥ KST 이번 달 1일, ≤ now+90일)과 대조. 3단계(변경 전·추가 후·수정 후) | Pass | STEP0 page `{672,490,2,6}` = sql `{672,490,2,6}`; STEP1 `{673,493,4,8}` = `{673,493,4,8}`; STEP2 `{672,494,4,9}` = `{672,494,4,9}`. 세 역할 화면 값 동일. (첫 시도의 SQL 불일치는 내 SQL이 timestamptz 파라미터를 Asia/Seoul 세션에서 비교한 오류였고, `::timestamp` UTC 문자열로 고친 뒤 전 단계 일치) |
| 2 | R-119 데이터를 바꾸면 수가 따라 바뀜 | 추가: B 미상담 1(+1), B BLOCKED·B 상담·A 미상담(0); 리드 C null(+1), B 오늘 23:59:59(+1), C 내일 0시 정각(0), C 어제(+1, 연체), A·ARCHIVED·DNC(0); 면접 4건; 만료 4건. 수정: 신규 구직자 상담 처리, 내일 리드를 오늘로, 91일 구직자를 80일로 | Pass | DELTA `{newSeekers:1, callLeads:3, interviewsToday:2, expiringSoon:2}` = 기대값. DELTA2 `{-1, +1, 0, +1}` = 기대값 |
| 3 | R-119 D-90(PC-10)·만료 경계 | stayExpiry = now+90d−1h(포함), now+90d+1h(제외), 지난달 1일(만료, 제외), 이번 달 1일(R-109 월 단위 판정으로 미만료, 포함), BLOCKED+30d(제외) | Pass | expiringSoon +2(90d−1h, 이번 달 1일). 91d → 80d로 바꾸자 +1. `ADMIN_STAY_EXPIRY_SOON_DAYS = 90`(limits.ts) |
| 4 | R-119 KST 오늘 경계 | 면접 scheduledAt = 오늘 KST 0시, 내일 0시−1ms, 내일 0시, 오늘 0시−1ms. tsx로 `kstDayRange`·`dashboardCounts(now 고정, scope=시험 면접)` 호출 | Pass | 화면: 면접 +2(0시, 23:59:59.999). `kstDayRange(2026-11-16T14:59:59.999Z)` → [11-15T15:00Z, 11-16T15:00Z), `15:00:00.000Z` → 다음 날 범위. now=KST 23:59:59.999 → 4건(두 회차 × 2), now=다음 날 0시 → 2건(내일 0시 정각분), now=어제 23:59:59.999 → 2건. 리드 nextActionAt=내일 0시 정각은 오늘 전화 대상에서 제외(STEP1 +3) |
| 5 | R-120 조건 미충족 B→A 서버 거부 | STAFF_VISA 세션으로 `changeGradeAction` 직접 호출(화면 버튼 안내와 무관) | Pass | 아무것도 없음 → `REQUIREMENTS_UNMET ["CONSULTED","VERIFIED_VISA"]`, 상담만 → `["VERIFIED_VISA"]`, 체류확인만 → `["CONSULTED"]`. 모두 grade B 유지, SEEKER_GRADE_CHANGE 0행. E2E `admin-core.spec.ts:21`도 화면에서 거부 문구·B등급 유지 확인 |
| 6 | R-120 조건 미충족 A→S 서버 거부 | A등급 구직자로 조건 하나씩 빠뜨려 직접 호출 | Pass | 한국어 미확인 → `["VERIFIED_KOREAN"]`, INACTIVE·EMPLOYED → `["ACTIVE"]`, 상태 확인 31일 전 → `["RECENT_CONFIRM"]`, (불일치 데이터) consultedAt null → `["CONSULTED"]`, verifiedVisa false → `["VERIFIED_VISA"]`. 모두 A 유지, 감사 0행. 29일 전 → S 성공 |
| 7 | R-120 한 단계씩만 / 요청 변조 | S 조건을 모두 갖춘 B에 `to=S`; `to`=`X`·`s`·빈값; 없는 seekerId; 확인 항목 값 `consulted=yes`; 트랙 `VIP` | Pass | `GRADE_STEP`(B 유지), `INVALID_INPUT` ×3, `NOT_FOUND`, `INVALID_INPUT`, `INVALID_INPUT`. 변조 후 grade B, 감사 0행. 같은 등급 → `SAME_GRADE` |
| 8 | R-120 등급 변경 시 AuditLog | 조건 충족 구직자 B→A→S(STAFF_VISA), S→A→B(ADMIN) 직접 호출 | Pass | 각 `{"ok":true}`, DB grade A→S→A→B. AuditLog SEEKER_GRADE_CHANGE 4행: `[VISA {from:B,to:A}] [VISA {A→S}] [ADMIN {S→A}] [ADMIN {A→B}]`(actorId 일치). E2E도 승격 후 actorId=직원 1행 확인 |
| 9 | R-120 트랙 변경·확인 항목·전환 가능성 입력 감사, BR-07 | 같은 구직자에 상담+체류확인 체크 → B→A → A에서 체류확인 해제 시도 → 트랙 CONSULT_ONLY → 전환 가능성 E-7-4/2027-03-01 → 미등록 코드 Z-99 → ADMIN이 판정 지움. E-9(VisaType FUTURE_POOL) 구직자 JOB_MATCH로 변경 시도 | Pass | 감사 5행: `SEEKER_REVIEW_UPDATE {changes:{consultedAt:false→true, verifiedVisa:false→true}}`, `SEEKER_GRADE_CHANGE {B→A}`, `SEEKER_TRACK_CHANGE {from:null,to:CONSULT_ONLY}`, `SEEKER_REVIEW_UPDATE {convertibleVisa:null→E-7-4, convertibleAt:null→2027-02-28T15:00Z}`(KST 3/1 0시), ADMIN `{E-7-4→null}`. A에서 해제 → `GRADE_DEPENDS`, Z-99 → `UNKNOWN_VISA`. E-9 → `FUTURE_POOL_LOCKED`, 트랙 그대로, 감사 0행. 메타에 PII 없음 |
| 10 | R-121 칸반 열 C/B/A/보관/재접촉금지 | PLACEMENT로 `/admin/leads` 열고 열별 `lead-col-count-*`와 DB 등급별 건수 대조 | Pass | C 451(db 451), B 49(49), A 3(3), ARCHIVED 16(16), DO_NOT_CONTACT 7(7). C는 상위 50건 표시 + "상위 50건만 표시" |
| 11 | R-121 기본 정렬 priority 내림차순, 값은 limits.ts 가중치로 계산 | 시험 구직자(S·A·JOB_MATCH·ACTIVE, JEJU/ANY × 업종 A; 제외 대상 FUTURE_POOL·INACTIVE·B·다른 지역도 생성)와 리드(JEJU/A 인구감소+오늘, 8일 전, 6일 전, 업종 없음+인구감소, B열)를 만든 뒤, DB 전 리드·전 대상 구직자로 WO §8.3 식을 **스크립트에서 독립 계산**(`LEAD_PRIORITY_WEIGHTS` = S2·A1·×2·인구감소+3·7일 신규+2). 각 카드 `data-priority`·"대기 인력 n명"을 기대값과 비교, 순서·숨은 카드 검사 | Pass | 5개 열 모두 `priorityMismatch 0`, `waitingMismatch 0`, `orderViolations 0`. C·B·A는 표시 최솟값보다 높은 숨은 리드 0건. C 상위 `[227(hi), 224(6일), 222(8일), 5(업종없음), 5]` — 6일 전은 신규 +2, 8일 전은 0, 업종 없는 리드는 대기 0명·5점(3+2). B열 bLead 225 맨 앞(30일 전, 신규 0) |
| 12 | R-121 통화 결과별 전이와 AuditLog | PLACEMENT로 `recordCallAction` 직접 호출, 결과마다 새 리드 | Pass | C INTERESTED → B, 감사 `{C→B, CALL_INTERESTED}`, foreignIntent true, lastContactedAt 설정, nextActionAt 2026-11-20 → `2026-11-19T15:00Z`(KST 0시). C REQUEST_RECEIVED → B + requestedAt 설정, `CALL_REQUEST_RECEIVED`. C·B·A DNC → DO_NOT_CONTACT, `CALL_DNC`. ARCHIVED INTERESTED → B(`from:ARCHIVED`). A INTERESTED → A 유지(감사 없음). NO_ANSWER → C 유지, lastContactedAt 미갱신(Q-14 수용). 각 CallLog 1행(staffId=행위자). 연락처 든 메모(전화·이메일) → `NOTE_HAS_CONTACT`, CallLog 0행. outcome `HIRED` → `INVALID_INPUT`. E2E `admin-core.spec.ts:62`도 화면에서 C→B·감사 확인 |
| 13 | R-121 재접촉금지 리드 통화 불가 | DO_NOT_CONTACT 리드에 INTERESTED·NO_ANSWER 직접 호출, 상세 화면 확인 | Pass | 둘 다 `LEAD_DNC`, CallLog 0행, 등급·연락 시각 그대로. 상세에 `call-form` 0개, "재접촉금지 리드입니다. 전화하지 않습니다." 표시 |
| 14 | R-121 검증 완료 → A (BR-05) | `verifyLeadAction` 직접 호출 | Pass | 구인신청(REQUEST_RECEIVED) 받은 B → A, 감사 `{B→A, STAFF_VERIFIED}`. 신청 없는 B → `NOT_REQUESTED`, C → `LEAD_STATE`, 회사명 없는 B → `NO_COMPANY`. LEAD_REVIEW 업무 달린 B → A, 업무 `DONE`·assigneeId=행위자 |
| 15 | R-122 복호 필드 열람 시 PII_VIEW | 구직자(이름·학교·이전 직장·전화·메신저·이메일 암호화 저장)·리드(담당자 3필드) 생성. VISA 기본 묶음 2회, PLACEMENT 연락처 1회(직접 호출), ADMIN 기본·연락처(화면 버튼), PLACEMENT 리드 연락처(화면 버튼) | Pass | 열람마다 PII_VIEW 1행(구직자 5행, 리드 1행). meta는 필드 이름만: `{fields:["legalNameEnc","schoolNameEnc","experiences.employerNameEnc"]}`, `["user.phoneEnc","messengerIdEnc","emailEnc"]`, `["contactNameEnc","contactPhoneEnc","contactEmailEnc"]`. 반환·화면 값은 복호된 원문. 두 엔터티 AuditLog 전 행에서 평문 10종 검색 0건. 권한 없는 열람(VISA 연락처)·비로그인은 PII_VIEW 미기록 |
| 16 | R-122 목록·상세 응답에 복호 값·*Enc 원문 없음 | 위 행의 DB 원본(`row_to_json`)에서 `v1:` 암호문 9개 수집. 세 역할로 `/admin`, `/admin/seekers?queue=ALL`·`NEW`, `/admin/seekers/[id]`, `/admin/leads`, `/admin/leads/[id]`(VISA 제외)를 HTML과 `RSC: 1` 페이로드로 받아 평문 10종·암호문 9개·`"v1:` 패턴·`…Enc` 키 이름 검색. 열람 후 다시 받아 재검사 | Pass | 17개 응답(+열람 후 2개) 모두 `plainHits [] cipherHits 0 v1Pattern false encKeyName null`. DB 행에는 평문 0건(암호화 확인) |
| 17 | Q-08 STAFF_PLACEMENT의 seeker:review 행위 거부 | PLACEMENT 세션으로 changeGrade·changeTrack·updateFlags·setConvertibility 직접 호출(조건 충족 구직자). 상세 화면 확인 | Pass | 4건 모두 HTTP 500 + 오류 digest, 서버 로그 `AuthzError: missing permission seeker:review`. 구직자 grade B·track null·확인 항목·전환 판정 그대로, 감사 0행. 상세에 `grade-form` 0개(연락처 열람 버튼은 있음 — WO §11 허용) |
| 18 | Q-08 STAFF_VISA의 리드 통화·연락처 열람 거부 | VISA 세션으로 recordCall·verifyLead·revealLeadContact·revealSeekerContact 직접 호출, `/admin/leads`·`/admin/leads/[id]` GET | Pass | 4건 모두 오류 digest(`missing permission lead:manage`/`contact:view`), 응답에 담당자명·전화·이메일 없음. 리드 B 유지, CallLog 0, 리드·구직자 감사 0. 두 화면 `admin-forbidden` 표시, 회사명 미노출. 대조: ADMIN은 같은 리드 열람·검증 성공 |
| 19 | 비로그인·2FA 미완료 접근 차단 | 비로그인 GET 4개 경로·액션 POST; 비밀번호만 통과한(TOTP 미설정) STAFF_VISA·ADMIN 세션으로 GET·액션 POST. 미들웨어를 피하려고 액션을 `/ko`, `/api/health`, `/`로도 POST | Pass | 비로그인 GET·POST → 307 `/admin/login`. 2FA 미완료 GET → `/admin/2fa/setup`. 2FA 미완료 액션(관리자 경로·`/ko`·`/api/health`·`/`) → 실행 안 됨: 조건 충족 구직자 grade B 유지, 감사 0, 응답에 이름 없음. PLACEMENT의 `/ko` 경유 changeGrade도 `seeker:review` 거부. 비로그인 `/ko` 경유 열람 → 이름 없음 |
| 20 | BR-01 관리자 화면이 구직자↔기업 직접 연결 수단을 만들지 않음 | 변경 파일 코드 검색(`mailto:`, `tel:`, `sms:`, 알림·메시지 발송, InterestRequest, 구직자↔리드 연결) + 화면 확인 | Pass | 해당 없음. 연락처는 직원 화면 안에서 텍스트로만 표시(링크 없음). 리드 화면의 "대기 인력 n명"은 숫자뿐(구직자 식별자·목록 없음). 기업·구직자에게 나가는 경로 변경 없음 |
| 21 | 검증 명령 7종 | 위 표 | Pass | 6종 1회 통과. E2E 1회차 wizard-focus 1건 실패 → 반복 60/60·전체 재실행 206/206 통과(O-4, P1e 범위 밖) |

## 결함 목록 (Fail만)
| 번호 | 항목 | 재현 방법 | 기대 | 실제 | 위치 |
|---|---|---|---|---|---|
| — | — | — | — | — | — |

## 관찰 / 기준 외 발견
| 번호 | 내용 | 재현·증거 | 영향 | 제안 |
|---|---|---|---|---|
| O-1 | (관찰, Fail로 세지 않음) NO_INTENT 현재 동작: 등급 유지, `foreignIntent=false`, `lastContactedAt` 갱신, LEAD_GRADE_CHANGE 없음 | C NO_INTENT → C 유지(foreignIntent null→false, lastContacted 설정, 감사 0). B NO_INTENT → B 유지(true→false). `gradeAfterCall`이 DNC·INTERESTED·REQUEST_RECEIVED만 전이 | Q-14 결정(WO §8.2 "의사 없음 → DO_NOT_CONTACT")과 다름. run 2에서 바뀔 예정 | run 2에서 NO_INTENT → DO_NOT_CONTACT + 감사 + 확인 다이얼로그 재시험 |
| O-2 | DNC 결과 저장에 확인 다이얼로그 없음 | 화면에서 `통화 결과=DNC` 선택 후 저장 → 브라우저 dialog 없이 바로 DO_NOT_CONTACT(되돌릴 수 없음) | Q-14는 NO_INTENT→DNC에 확인 다이얼로그를 요구. 같은 비가역 전이인 DNC에도 같은 보호가 자연스러움 | run 2 다이얼로그 작업 때 DNC에도 적용 검토(판단은 builder) |
| O-3 | 권한 없는 서버 액션 직접 호출이 처리되지 않은 오류로 응답 | PLACEMENT의 seeker:review 호출 → HTTP 500 + digest, VISA의 lead 호출 → 200 + `E{digest}`. 서버 로그에 `⨯ Error [AuthzError]` 19건 | 거부는 정상이고 데이터·PII 노출 없음. 버튼이 숨겨져 있어 정상 사용에선 안 보임. 다만 로그 소음, 상태 코드 비일관 | 필요하면 액션에서 AuthzError를 `{ok:false, code:"FORBIDDEN"}`으로 바꿔 반환(선택) |
| O-4 | E2E `wizard-focus.spec.ts:86`(desktop) 1회 실패 | 1회차 전체 실행에서 Step 2 체크박스 `toBeFocused` 5s 타임아웃. 이후 `--repeat-each=5` 10/10, 전체 재실행 통과 | P1c 영역 간헐 실패. P1e 변경과 무관해 보임 | 재발하면 P1c 담당이 hydration·포커스 경합 확인 |
| O-5 | 시험 행이 개발 DB에 남음 | 직원 `qa-p1e1-*@example.test`(약 15), 구직자 `sourceChannel QAP1E1-*`, 리드 `QAP1E1-*`, Company "큐에이 대시 회사" 1, **Recommendation 2(원장, 삭제 불가)**, Interview 8, CallLog, AuditLog. JEJU/ANY·업종 A의 S·A 시험 구직자가 생겨 업종 A 리드들의 우선순위가 올라감 | 개발 데이터 오염(이전 회차 O-8과 같은 성격). 오늘 날짜 면접 4건이 대시보드 "면접 일정"에 잡힘 | 정리 스크립트 또는 e2e 전용 DB |

## 판정불가 / 사람 확인 필요
- 관리자 화면 한국어 문구의 업무 적합성(용어·안내문)은 사람 검토 대상.
- 운영 데이터 규모에서 칸반 전량 우선순위 계산(C열 451건 + 대상 구직자 110명) 성능은 이번 범위에서 측정하지 않음.
