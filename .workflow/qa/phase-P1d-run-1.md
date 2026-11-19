# QA 보고서 — Phase P1d / run 1

- 대상: 커밋 c2bb5d8 (pii-guard P-1~P-5), 032f363 (P1d: 수집 API, 리드 전이·보관 작업, pg-boss 워커, 기업 진단, 구인 의뢰, R-129 429)
- 기준 문서: PRD R-114, R-115, R-116, R-124, R-125, R-129 (BR-01, BR-14, WO §15-9); PLAN `### P1d` (작업 1~6, QA 방법: 테스트 출력, curl 수동 호출, 워커 기동 로그)
- 일시: 2026-11-16 15:20 ~ 16:20 (KST)
- 환경: Windows 11, 개발 DB 54320, Vitest 테스트 DB. 프로덕션 빌드 `next start` 127.0.0.1:3180(`TRUST_PROXY=true`). E2E는 `E2E_PORT=3170`(+3171). 직접 시험: curl(본문은 UTF-8 파일 `--data-binary @file`), Node fetch, Playwright chromium 375×812, 앱 코드(tsx)와 별도 PrismaClient(복호화 없이 원본 열 확인). `INGEST_API_KEY`는 셸 변수로만 읽어 헤더에 넣었고 출력하지 않음. 외부 전송 없음(OTP는 콘솔 어댑터). 3180 서버와 워커는 끝에 종료(LISTEN 없음 확인). 스크래치 파일은 내가 만든 것만 이름으로 지움. `git status`는 `.workflow/` 기존 변경과 `qa/`뿐.

## 결과 요약
- 통과: 23 / 전체: 23 (통과율 100%)
- 필수 항목(PRD 합격 기준) 실패: 0개
- 결함: 없음
- 기준 외 발견: O-1(수집 리드 `title`·`companyName` 열에 연락처 평문 저장 가능), O-2(재수집 시 빠진 필드가 null로 덮임), O-3(pg-boss 일정 행 개발 DB 잔존), O-4(첫 E2E 실행의 환경성 실패), O-5(시험 행 잔존)

## 검증 명령 (순차 실행)
| 명령 | 종료 코드 | 결과 |
|---|---|---|
| `corepack pnpm lint` | 0 | 오류·경고 없음 |
| `corepack pnpm typecheck` | 0 | 오류 없음 |
| `corepack pnpm test` | 0 | 43 files / 355 tests passed (P1c run-3 297 → +58) |
| `corepack pnpm i18n:check` | 0 | ko 894 keys, 6 locales, errors 0 |
| `corepack pnpm qa:static` | 0 | errors 0, warnings 17 (S-23 문구 검토 14, S-45 console 3 — 이전과 같은 종류) |
| `corepack pnpm build` | 0 (1회차) | 153/153 페이지. 메모리 부족 중단 없음(NODE_OPTIONS 재시도 불필요) |
| `E2E_PORT=3170 corepack pnpm test:e2e` | 1회차 1 → 재실행 0 | 1회차: 194 passed / 8 failed (16.7m). 실패 8건은 P1d와 무관한 위저드·추천·점수 화면이며, 그중 4건이 각 12.3분 걸린 뒤 `net::ERR_NETWORK_IO_SUSPENDED`·타임아웃(호스트 절전/중단)으로 끝남. 나머지 데스크톱 위저드 3건은 같은 시간대 내 직접 시험 스크립트가 함께 돌던 부하 중 URL 전이 5초 대기 초과. 실패 4개 파일 재실행 32/32 통과(1.5m), **아무것도 함께 돌리지 않은 전체 재실행 202 passed (2.4m)**, `.last-run.json` = passed. P1d `employer-intake.spec.ts` 4건×2 프로젝트는 1회차부터 통과 |

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| 1 | R-114 키 없음 401 | 3180에 curl: 키 헤더 없음 / 틀린 키(43자) / 빈 키 | Pass | 세 경우 모두 `{"error":{"code":"UNAUTHENTICATED",...}} [HTTP 401]`. 비교는 sha256 후 `timingSafeEqual`, 서버 키 32자 미만이면 전부 거부(`src/lib/leads/ingestAuth.ts`) |
| 2 | R-114 같은 배치 2회 → 행 수 동일 | 3건 배치(`QAP1D-…-1..3`) 두 번 전송, 사이에 DB 행 수 조회 | Pass | 1회: `{"created":3,"updated":0,"rejected":[]} [HTTP 200]` → 행 3. 2회: `{"created":0,"updated":3,"rejected":[]}` → 행 3 |
| 3 | R-114 closesAt 과거 거부 | 마감 2026-11-01 항목 + 정상 항목 한 배치 | Pass | `{"created":1,"updated":0,"rejected":[{"sourceRef":"…-closed","reason":"CLOSED"}]}`, 마감 항목 DB 행 0 |
| 4 | R-114 201건 거부 / 200건 수용 | 201건 배열, 200건 배열 | Pass | 201: `{"error":{"code":"BATCH_TOO_LARGE",…}} [HTTP 400]`, DB 0행. 200: `{"created":200,…}`, DB 200행. 추가: `[]` → 400 VALIDATION "must not be empty", 객체 → 400 "must be a JSON array", `REQUEST:` 접두 sourceRef → rejected `RESERVED_SOURCE_REF` |
| 5 | R-114 태깅(시·도·시군구·인구감소지역·KSIC) | 한글 축약·주소·코드로 보낸 3건을 DB에서 확인 | Pass | `sido:"부산", sigungu:"영도구", industryName:"제조업"` → `BUSAN / BUSAN_YEONGDO_GU / depopulationArea true / C`(Region 시드에서 영도구 인구감소지역 true). `address:"충청남도 천안시 서북구 …", industryCode:"H4930"` → `CHUNGNAM / CHUNGNAM_CHEONAN_SI / false / H`. `sido:"SEOUL", sigungu:"없는구", industryCode:"C"` → `SEOUL / null / false / C`(모르는 시군구는 비움). `"경기"` → `GYEONGGI`. 목록은 코드에 없고 Region·Industry 테이블에서 읽음(`tagging.ts`) |
| 6 | R-114 rawJson 저장, rawJson·연락처 열에 평문 없음 | 연락처 3필드 + 본문·중첩 객체에 전화·카톡·이메일·Zalo·한글 숫자 전화를 넣어 수집 → 복호 없는 PrismaClient로 원본 열 조회, 행 전체 텍스트에서 값 검색 | Pass (O-1 참고) | rawJson: `contactName/Phone/Email` 키 제거, `"description":"문의 *** 또는 ***, 메일 ***"`, `"extra":{"memo":"***","note":"***"}`. `contactNameEnc/PhoneEnc/EmailEnc` = `v1:…` 암호문, `contactPhoneHash` 있음. 행 전체 텍스트 평문 검색(9876·qa-hr@·qahr77·0912·김담당) 0건. 단 `title`·`companyName` 열은 마스킹 대상이 아님 → O-1 |
| 7 | R-115 DO_NOT_CONTACT 재수집 시 C 복귀 금지 | `…-1`을 DB에서 DO_NOT_CONTACT로 바꾼 뒤 `postedAt`(2026-12-01)이 있는 같은 sourceRef를 두 번 재수집 | Pass | 두 번 모두 `updated:1`, grade `DO_NOT_CONTACT` 유지, 해당 리드 LEAD_GRADE_CHANGE 감사 행 0(전이 없음). 제목은 "생산직 재게시"로 갱신(O-2) |
| 8 | R-115 ARCHIVED 재게시 규칙(PLAN 작업 2) | `…-2`를 ARCHIVED(archivedAt=지금)로 바꾼 뒤 (a) postedAt 없이 재수집 (b) postedAt 2026-12-15로 재수집 | Pass | (a) grade ARCHIVED, archivedAt 유지. (b) grade C, archivedAt null, 감사 `{"action":"LEAD_GRADE_CHANGE","actor":"SYSTEM","meta":{"from":"ARCHIVED","to":"C","reason":"INGEST_REPOSTED"}}`. 규칙은 `transitions.ts` 머리 주석에 명시 |
| 9 | R-116 시간 조작으로 보관 전이 | tsx로 리드 10개 생성(생성일·접촉일·다음 조치일·마감일·등급 조합) → `archiveStaleLeads(now)`, `archiveStaleLeads(now+31일)`, 다시 한 번 | Pass | now: `{"archived":3,"closed":1,"noContact":2}` — closedYesterday·old31·contacted31만 ARCHIVED, old29·contacted5·nextActionFuture·closesIn10d·fresh는 C. now+31일: `{"archived":5,…}` 나머지 C 모두 ARCHIVED. B_old·DNC_old는 끝까지 그대로. 세 번째 `{"archived":0}`(멱등). 감사 8행 `SYSTEM:ARCHIVE_NO_CONTACT`·`SYSTEM:ARCHIVE_CLOSED`, archivedAt = 주입한 now |
| 10 | R-116 워커 기동 로그(QA 방법) | `corepack pnpm worker` 실행 → 로그 → `pgboss` 스키마 조회 → 종료 | Pass | `{"event":"worker.started","schema":"pgboss","jobs":[{"name":"leads.archive-stale","cron":"15 3 * * *","tz":"Asia/Seoul"}]}`. `pgboss.schedule` 1행(같은 값), `pgboss.queue`에 `leads.archive-stale`. public 스키마에 pg-boss 테이블 없음. 종료는 Windows 강제 종료(taskkill)라 `worker.stopping` 로그는 확인 못 함 |
| 11 | R-124 PUBLISHED 규칙 없음 → YELLOW + 행정사 확인 필요 (WO §15-9) | 개발 DB 규칙 현황 조회(DRAFT·isSample 2행뿐) → 375px 로그인 기업으로 `/ko/employer/diagnosis` 입력·제출 | Pass | 카드 `data-outcome` = `["YELLOW"]` 1장, 본문 "판정 기준이 없거나 맞지 않는 비자는 '확인 필요'로 보입니다. 행정사 확인이 필요합니다." + "등록된 판정 기준과 일치하지 않아 행정사 확인이 필요합니다. 참고용, 행정사 확인 필요". 비자 13종 코드+이름(F-2 … G-1, VisaType 데이터) |
| 12 | R-124 DRAFT/SAMPLE 규칙 미사용, PUBLISHED만 사용 | tsx로 `runDiagnosis`를 업종 U에 대해 (1) 규칙 없음 (2) DRAFT·isSample GREEN 추가 (3) DRAFT·isSample=false GREEN 추가 (4) PUBLISHED RED 추가 후 실행, 끝에 넣은 규칙 3행 삭제 | Pass | (1)(2)(3) 모두 13종 YELLOW `visa.result.needsReview`, needsReview true. (4) F-2만 RED(넣은 규칙 messageKey), 나머지 YELLOW. 삭제 후 규칙 현황 DRAFT·isSample 2행으로 복구. 시·도와 시군구 불일치 입력 → `INVALID_REFERENCE` |
| 13 | R-124 법령 수치 하드코딩 없음, '지원하기' 없음, 6개 언어, 결과를 리드로 저장 | 코드 grep(비자 코드 리터럴·수치), 6개 언어 화면, DB 리드 | Pass | `diagnosis.ts`·`diagnosis-form.tsx`·`schemas/employer/diagnosis.ts`에 비자 코드 리터럴·기준 수치 0(대상 비자는 `isStatusCode && registrable` 데이터). ko·en·vi·ru·zh·uz `/employer/diagnosis`·`/employer/request` 모두 200, h1 = 각 언어 `employer.*.title`, 원시 키 노출 0, `지원하기`/`Apply` 0. 리드: 비로그인 → source DIAGNOSIS, grade C, companyName null, diagnosisJson(answers·results·needsReview). 로그인 기업 → `DIAGNOSIS:COMPANY:<id>` 1건 |
| 14 | R-125 자유 입력란 연락처 거부 + 사유 표시 | 375px, 새 기업 계정. companyName에 전화, role에 URL, workHours에 이메일, detail에 카톡 아이디·Zalo·한글 숫자 전화·open.kakao URL·"골뱅이 점 com"·`o1o-I234-5678`, preferences에 텔레그램 @id | Pass | 모든 경우 해당 칸 `aria-invalid="true"` + "연락처·이메일·링크·메신저 아이디는 적을 수 없습니다. 연락은 비자앤잡이 따로 드립니다." 표시, 다음 단계로 안 넘어감/접수 안 됨(done 0) |
| 15 | R-125 서버 우회 거부 | Playwright route로 서버 액션 본문의 `detail` 값을 깨끗한 값 → "… 카톡 qahr77 010-5555-6666"으로 바꿔 전송 | Pass | 변조 적용(hit 1, 본문 변경 true). 화면 "자유 입력란에 연락처가 있어 접수하지 않았습니다. 표시된 칸을 고쳐 주세요.", detail `aria-invalid=true`, 단계 living 유지, 완료 화면 0. DB: 해당 회사 리드는 이후 정상 제출분 1건뿐, 변조 값 평문 0 |
| 16 | R-125 회사정보 암호화(Company `*Enc`) | 복호 없는 PrismaClient로 Company·JobLead 원본 | Pass | `Company.nameEnc` = `v1:…` (평문 "큐에이" 포함 false), `bizRegNoEnc` `v1:…`, sido·sigungu·employeeCount 갱신(BUSAN / BUSAN_YEONGDO_GU / 40). 리드 `contactNameEnc/PhoneEnc/EmailEnc` `v1:…`, 행 전체 평문(담당자 이름·전화·이메일) 0. `requestJson`에는 검사 통과 값만(연락처 없음). 의뢰 페이지 본문에 담당자 연락처 노출 없음 |
| 17 | R-125 B 전이 + AuditLog + 검증 큐 | 같은 계정이 먼저 진단(리드 C) → 의뢰 정상 제출. 계정 2개로 반복 | Pass | 진단 리드가 B로 전이(새 리드 아님), title "포장", requestedAt 있음. 감사 `{"action":"LEAD_GRADE_CHANGE","meta":{"from":"C","to":"B","reason":"JOB_REQUEST"}}`, actor = 해당 기업 사용자. StaffTask `LEAD_REVIEW / STAFF_PLACEMENT / OPEN`, leadId 일치. 목록 "검증 대기". 진단 없이 의뢰하는 경로(새 REQUEST 리드 B)는 E2E `employer-intake.spec.ts:88` 통과로 확인 |
| 18 | R-129 OTP·로그인·수집 API 한도 초과 429 | 3180(TRUST_PROXY=true). OTP: 한 IP에서 다른 번호 22회 `POST /api/seeker/otp`. 로그인: 한 IP·한 이메일로 틀린 비밀번호 12회 (CSRF → `callback/employer-password`). 수집: 키 있음 IP 분산 65회(`[]`), 키 없음 한 IP 125회 | Pass | OTP 200×20 → 21·22회 `429 RATE_LIMITED`, Retry-After 677. 로그인 302(CredentialsSignin)×10 → 11·12회 429. 수집 키별: 400×60 → 429×5, `Retry-After: 42`. IP별(키 확인 전): 401×120 → 121회째부터 429 |
| 19 | pii-guard P-1~P-5 개선과 오탐 | `detectContacts` 직접 호출 47문장 | Pass | 47/47 기대대로. 탐지: 메신저 키워드 뒤 이름이 아닌 ID(`zalo nguyenvan`, `Zalo: 0912 345 678`), 철자 메일 호스트(`naver dot com`, `hong 골뱅이 naver 점 com`), 키워드 뒤 8자리(`문의 15881234`), 닮은 글자(`o1o-I234-5678`, `공1공-1234-5678`), 추가 SNS(`insta`, `line id`, `k a k a o`, `위챗`), 전각 숫자. 오탐 없음: `주문번호 20261116`, `주문번호 12345678`, `kakaopay로…`, `Zalo: Nguyễn Văn An`, `Zalo của tôi là Nguyễn`, `Trần Thị Bích`, `생산 라인`, `zalora`, 금액·시간·비자 코드·우편번호·사업자번호·`급여 2500000`. 화면에서도 `Nguyễn Văn An … kakaopay 아님`, `주문번호 20261116`이 들어간 의뢰가 접수됨 |
| 20 | BR-01 기업 화면에 구직자 직접 연락 수단 없음 | 기업 화면(진단·의뢰·후보·로그인·가입) 링크 수집, 032f363 diff 확인 | Pass | 진단 본문 링크 `/ko/about#contact`(운영사 상담), `/ko/employer/request`뿐. 의뢰 본문 링크 0. 각 화면의 `tel:` 1개는 공통 푸터의 운영사 대표 연락처(SITE_PHONE). 구직자 데이터를 읽는 코드 없음(이번 범위 화면은 리드·회사 데이터만) |
| 21 | 회귀: 기업 가입·로그인 후 이동 | 375px 새 기업 UI 가입 → 쿠키 삭제 → `next` 없이 로그인 | Pass | 가입 후 `http://localhost:3180/ko/employer/request`, 로그인 후 같은 주소. 비로그인 `/ko/employer/request` → 307 `/ko/employer/login?next=/employer/request`, `x-robots-tag: noindex, nofollow` |
| 22 | 회귀: P1c 핵심 흐름 | 전체 E2E 재실행 | Pass | 202 passed: `quick-register`, `wizard-resume`(Step 0~7), `wizard-focus`, `referral`, `complete-screen`, `consent-revoke`, `auth`(D-1 포함) 등 데스크톱·375 모두 통과 |
| 23 | 검증 명령 7종 | 위 표대로 순차 실행 | Pass | 6개 1회차 exit 0, E2E는 환경성 실패 뒤 재실행 202/202 (O-4) |

## 결함 목록 (Fail만)
없음.

## 기준 외 발견
| 번호 | 내용 | 재현·증거 | 영향 | 제안 |
|---|---|---|---|---|
| O-1 | 수집 API가 `rawJson` 안 문자열은 마스킹하지만 `JobLead.title`·`companyName` 열에는 받은 값을 그대로 저장. `rawJson` 안 숫자 값도 그대로 | `title:"생산직 문의 010-9876-5432 카톡 qahr77"`, `companyName:"큐에이 엣지 010-9876-5432"`, `tel:1098765432` 수집 → `title` 열 평문 그대로, rawJson은 `"title":"생산직 문의 *** ***"`·`"tel":1098765432`(숫자 유지). 위치 `src/lib/leads/ingest.ts` `prepare()`(`companyName: item.companyName`, `title: item.title`), `sanitizeRaw`의 number 분기 | 지금은 직원 전용 리드 열이라 R-114 합격 기준 밖. 다만 P1e 칸반·P2 공고 생성에서 리드 제목을 쓰면 회사 연락처가 공개 화면으로 이어질 수 있음(BR-14 취지) | 수집 시 `title`·`companyName`도 `maskContacts` 또는 거부, 숫자 키는 기준 결정 후 처리. P1e/P2 전 사람 판단 |
| O-2 | 재수집 시 항목에 없는 필드가 null로 덮임(DNC 리드 포함) | DNC 리드 재수집 본문에 `industryName`이 없자 `industryCode` C → null, 제목·postedAt 갱신. 등급은 유지 | 태깅·통계(R-117 수요 집계) 값이 사라질 수 있음 | 빠진 필드는 기존 값 유지 여부 결정 |
| O-3 | 워커 기동으로 개발 DB `pgboss` 스키마에 일정 행 생성 | `pgboss.schedule` `leads.archive-stale 15 3 * * * Asia/Seoul` | 워커가 돌 때만 실행. 개발 DB의 오래된 C 리드가 03:15에 보관될 수 있음 | 필요 시 정리 |
| O-4 | 첫 E2E 실행 8건 실패(환경성) | 4건이 12.3분 뒤 `ERR_NETWORK_IO_SUSPENDED`·타임아웃, 3건은 동시 부하 중 URL 전이 5초 초과. 재실행 32/32, 전체 202/202 | 코드 결함 아님 | — |
| O-5 | 시험 행이 개발 DB에 남음 | JobLead 약 215(`QAP1D-1794811516-*`, `QAP1D-ARCH-*`) + 진단 리드 약 5, 기업 계정·Company 2(+UI 1회차 1), StaffTask 2, OtpChallenge 20, RateLimitBucket, AuditLog. 임시 VisaRule 3행은 삭제함 | 개발 데이터 오염 | e2e 전용 DB 또는 정리 스크립트(P1c O-6과 같음) |
| 참고 | 시군구 태깅 단위 | `천안시 서북구` → `CHUNGNAM_CHEONAN_SI`(Region 시드가 시 단위만 가짐) | 기준 위반 아님 | — |

## 판정불가 / 사람 확인 필요
- 워커가 실제 cron 시각(03:15 KST)에 작업을 받아 처리하는 것은 확인하지 않음(개발 DB 전체 리드에 실행되므로 강제 발송하지 않음). 처리 로직은 같은 핸들러를 시각 주입으로 시험(9번).
- Windows에서 워커를 강제 종료해 SIGINT/SIGTERM 정상 종료 로그는 보지 못함.
- 진단 결과 문구·동의 문구의 법률 내용과 5개 언어 번역 품질은 사람 검토 대상.
