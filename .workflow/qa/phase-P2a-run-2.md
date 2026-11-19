# QA 보고서 — Phase P2a / run 2 (재확인·회귀)

- 대상: 커밋 6886cb8 (run 1 D-1·D-2 수정, 관리자 배지 아이콘, 옵션 키, 푸터 등록 정보 세로 배치, 면접 신청 패널 상태 — QA O-2)
- 기준 문서: PRD R-201·R-202·R-203·R-015; PLAN `### P2a`; WO §2(BR-01·03·04·05·14·15), §8.5, §15-3, §15-4; DECISIONS SC-06, SC-07; run 1 보고서(D-1, D-2, O-2)
- 일시: 2026-11-17 07:54 ~ 08:20 (KST)
- 환경: Windows 11, 개발 DB. 검증 명령 7종은 하나씩 순차 실행, E2E는 `E2E_PORT=3260`(3260·3261·3262)으로 다른 시험 없이 단독 실행. 직접 시험은 E2E가 끝난 뒤 같은 빌드로 `next start` 두 개: 플래그 off 127.0.0.1:3270(`TRUST_PROXY=true`), 플래그 on 127.0.0.1:3272(`FEATURE_PUBLIC_JOBS=true`, `TRUST_PROXY=true`). 브라우저는 `localhost`로 접속. 스크래치 Playwright 스펙(workers 1): 직원은 `signInNewStaff`(실제 로그인 → TOTP → `/admin`), 기업은 실제 이메일 로그인, 구직자는 실제 OTP 로그인(`loginUi`). 서버 액션 직접 호출은 브라우저가 실제로 보낸 요청(`Next-Action` 헤더, 공고 작성은 multipart, 구인 의뢰는 JSON 본문)을 잡아 값만 바꿔 같은 세션의 페이지 `fetch`로 다시 보냄. 함수 단위 대조는 `tsx`로 `detectContacts`·`containsCompanyName` 직접 호출. 수집 API는 로컬 3270 서버에만 호출. `.env` 값 출력 없음, 외부 전송 없음. 두 서버 종료(3100~3299·3300 LISTEN 0 확인). 스크래치 파일(`qa-p2a2.config.ts`, `tests/e2e/qa-p2a2-*.spec.ts`, 스크래치패드 `qa-p2a2-*`)은 이름으로 삭제. `git status`는 `.workflow/` 기존 변경과 `qa/`뿐, HEAD 6886cb8.

## 결과 요약
- 통과: 17 / 전체: 18 (통과율 94.4%), 판정불가 0
- 필수 항목(PRD 합격 기준 문구) 실패: 0개. run 1 결함 D-1·D-2는 해소(run 1 우회 표기 전부 서버 거부). 새로 시도한 우회 표기 일부가 통과해 결함 1개(D-3)
- 결함: D-3(한글 `ㅡ`·`•`·`・`·`●`·`→` 구분자와 키캡 이모지 숫자 연락처 통과)
- 관찰: O-1 ~ O-5

## 검증 명령 (순차 실행)
| 명령 | 종료 코드 | 결과 |
|---|---|---|
| `corepack pnpm lint` | 0 | 오류·경고 없음 |
| `corepack pnpm typecheck` | 0 | 오류 없음 |
| `corepack pnpm test` | 0 | **56 files / 427 tests** 통과(21.0s). run 1 대비 +4 tests |
| `corepack pnpm i18n:check` | 0 | ko 950 keys(run 1 951, `interest.register` 삭제), 6 locales, errors 0 |
| `corepack pnpm qa:static` | 0 | errors 0, warnings 17 (run 1과 같은 수) |
| `corepack pnpm build` | 0 | 158/158 페이지 생성 |
| `E2E_PORT=3260 corepack pnpm test:e2e --reporter=line` | 0 | **226 passed (2.8m)**, 실패 0 (run 1 222 + jobs-apply 신규 2 tests × 2 프로젝트) |

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| 1 | 검증 명령 7종 | 위 표 | Pass | 7개 모두 종료 코드 0 |
| 2 | D-1 재확인: 공고 문구 연락처 우회 표기 거부(R-201, BR-03·14) | PLACEMENT로 A 리드 작성 화면에서 제목 `생산직 010`+U+200B+`1234`+U+200B+`5678` 저장(화면). 그 요청을 잡아 제목만 바꿔 직접 호출 25가지 + 직무란 3가지 | Pass | 화면: `action-error` data-code `TEXT_HAS_CONTACT`, 문구 "공고 제목·직무에 전화번호·이메일·메신저 같은 연락처를 적지 마세요.", 입력값 그대로. 직접 호출 전부 HTTP 200 `{ok:false,code:"TEXT_HAS_CONTACT"}`: 보이지 않는 문자 U+200B·200C·200D·2060·00AD·FEFF, 구분자 `_ ~ * / + = \| \`, 혼합(`010_`+ZWSP+`1234*~5678`, `0`ZWSP`1`SHY`0 1\|2=3+4 5\6/7*8`), `o1o_I234`+ZWSP, 이메일 사이 ZWSP·SHY, 전각, `공일공`ZWSP`일이삼사…`, 위첨자 `⁰¹⁰-…`, 원 숫자 `⓪①⓪-…`, `카`ZWSP`톡 hong1234`, 수학 굵은 숫자. 직무란 ZWSP·`_`·혼합도 거부 |
| 3 | D-1 재확인: 기업 구인 의뢰 자유 입력란(BR-14) | 기업 실제 로그인 → 구인 의뢰서 작성. 화면에서 상세에 카톡 아이디·ZWSP 전화 입력 후 제출, 정상 문구로 제출해 요청을 잡음 → 같은 요청의 `detail`을 25가지 우회 표기로, `preferences`·`workHours`·`role`·`companyName`을 각 8가지로 바꿔 직접 호출 | Pass | 화면 2건: `errors.field.contactInfo` 문구 표시, `aria-invalid=true`, 리드 0. 직접 호출 57건(위 25가지 × detail, 8가지 × 4개 필드) 모두 `{ok:false,code:"CONTACT_INFO",fields:[해당 필드]}`. 이 57건 동안 생긴 리드는 아래 항목 4의 통과 표기 10건뿐 |
| 4 | 새 우회 표기(호출자 지정: 분해 자모, 이모지 숫자, 위첨자, 아랍·데바나가리 숫자 등) | 항목 2·3과 같은 경로로 11가지 + 함수 단위 대조 | **Fail** | 거부됨: 위첨자·아래첨자·원 숫자·수학 굵은 숫자(NFKC로 숫자화), `…`·전각 `～`·`—`. **통과(저장됨, 공고 생성 경로와 구인 의뢰 detail 모두)**: `010ㅡ1234ㅡ5678`(한글 모음 ㅡ), `010•1234•5678`, `010・1234・5678`, `010●1234●5678`, `010→1234→5678`, 키캡 이모지 `0️⃣1️⃣0️⃣…` → 결함 D-3. 같이 통과: 아랍-인도 숫자 `٠١٠-…`, 데바나가리 `०१०-…`, 한자 `零一零 一二三四 五六七八`, 분해 자모 `ㄱㅗㅇㅇㅣㄹㄱㅗㅇ …` → 관찰 O-1 |
| 5 | 오탐 없음(날짜, 금액, 시간, 비자 코드 나열, 일반 공고 문구, 베트남어 이름) | 공고 제목 직접 호출 7가지 + 직무 1가지; 구인 의뢰 detail·workHours·preferences·role에 섞어 3번 제출; 함수 단위 16가지 | Pass | 공고: `2026-12-01 입사 2026.12.15 교육`, `월 2,500,000원~3,100,000원`, `근무 08:30~17:30 (07:00-19:00)`, `E-9, H-2, F-4, F-5, F-6 가능`, `경기 화성 자동차 부품 생산직 3명`, `Nguyễn Văn An, Trần Thị Bình 환영`, `인천(Incheon) 남동공단 생산직`, 직무 `Nguyễn 팀 생산` 모두 `{ok:true}`. 구인 의뢰 3건 모두 `{ok:true}`(리드 3건 추가, 250만원·E-7-4·우편번호 21633·시급 10,030원 포함). 함수 단위(타임스탬프, `20261117`, `C29 / 10-20명`, 연봉 36,000,000원 등) 검출 0 |
| 6 | maskContacts가 원문 위치에 정확(수집 API rawJson·제목) | 로컬 `POST /api/ingest/job-leads`로 2건: 제목·회사명·rawJson 문자열·중첩 객체에 ZWSP 전화, 전각 전화, ZWSP 이메일, `카`ZWSP`톡 hong1234`, `010_1234_5678`, ZWSP 한글 숫자, 위첨자 전화와 날짜·금액을 섞음; 대조로 연락처 없는 베트남어 회사명·시간·비자 코드 | Pass | 200 `{created:2}`. 저장값: title `생산직 문의 *** 끝`, companyName `큐에이 마스킹 ***`, note `앞 *** 중간 *** 뒤 2026-12-01 월 2,500,000원`, memo `*** / *** / *** 끝`, nested `A`ZWSP`b *** c`(연락처 밖 ZWSP는 그대로). 대조 건은 제목·회사명·rawJson 변경 없음 |
| 7 | D-2 재확인: 공고 문구 회사명 우회 거부(BR-03) | 회사명 "이투이공고정밀 주식회사" A 리드 요청을 잡아 제목 17가지 + 직무 1가지 직접 호출 | Pass | 모두 `TEXT_HAS_COMPANY`: `/`, `_`, U+200B, U+00AD, U+2060, U+FEFF, `~`, `+`, `:`, `\|`, `\`, 전각 공백, `(주)`, `㈜`, 한 글자씩 띄움, NFD 분해, 혼합(`이투이_`ZWSP`공고/정밀`), 직무 `이투이/공고정밀` |
| 8 | D-2 부작용: 지명 들어간 정상 문구, `inc` 제거 | 회사명을 달리한 A 리드 8개로 직접 호출 + 함수 단위 | Pass(관찰 O-2) | `인천(Incheon) 남동공단 생산직`: 회사 "Incheon Steel Inc."·"인천정밀 주식회사"·"이투이공고정밀" 리드 모두 `{ok:true}`. "Incheon Steel Inc." 리드에 `Incheon Steel 생산직` → `TEXT_HAS_COMPANY`(정상). 다만 `inc`·`corp` 제거가 단어 경계 없이 동작해 부작용 확인 → O-2 |
| 9 | 면접 신청 패널: 비자 부적합·BLOCKED 안내 문구(ko, vi) | E-9 구직자 / F-4지만 BLOCKED 구직자로 F-4 전용 공고 열기 | Pass | NOT_ELIGIBLE: 제목 `notEligibleTitle` + 본문 `notEligibleBody`, 상담 신청 1(`/ko/about#contact`, vi `/vi/about#contact` "Yêu cầu tư vấn"), 면접 신청 0, 등록 0, "신청하면 … 연락드립니다"(`interest-how`) **0**. BLOCKED: "지금은 면접 신청을 할 수 없습니다. 상담 신청으로 문의해 주세요."(vi "Hiện bạn chưa thể …") 한 줄 + 상담 신청 1, how 0. 상담 버튼 136.5×52(vi 182×52), 375에서 가로 스크롤 없음 |
| 10 | 신청 중 비자 변경·차단 시 그 자리 상담 신청 버튼(run 1 O-2) | ELIGIBLE로 화면을 연 뒤(how 1) DB에서 비자를 E-9로 바꾸고 "면접 신청" 클릭; 같은 방식으로 status BLOCKED; ko·vi | Pass | 비자 변경: `interest-not-eligible` data-code `NOT_ELIGIBLE`(role=alert), 제목+본문, 상담 신청 1(href `/ko/about#contact`), 면접 신청 버튼 0, how 0, 오류 문구 0, URL 그대로, InterestRequest 0. 375에서 상담 버튼 136.5×52. 차단: data-code `BLOCKED`, 차단 문구, 상담 신청 1, 행 0. vi 동일 |
| 11 | 푸터 등록 정보 세로 깨짐 없음(vi·ru·uz·ko × 1280·1024·375) | 플래그 off 서버 홈에서 `footer-registration`의 dt·dd 8행 측정(줄 수, 줄당 글자 수, 라벨 아래 값 배치, 넘침) + 12장 캡처 확인 | Pass | 12개 조합 모두 이상 행 0: dt 폭 ≥ 40px, 두 줄 이상인 칸의 줄당 글자 4 이상, 값이 라벨 아래(dd.top ≥ dt.bottom), dl 넘침 없음, 문서 `scrollWidth = clientWidth`. 최대 2줄(예: vi "Văn phòng giới thiệu việc làm có thu phí", ru "Рег. номер административного агента"). dl 폭 1280 217px, 1024 934px, 375 335px. 캡처에서 한 글자씩 세로로 쌓인 칸 없음 |
| 12 | 관리자 공고 배지 아이콘(색+아이콘+글자) | 상세에서 DRAFT·검증 전 → 검증 → 공개 → 마감 각 단계 배지 측정, 목록 `/admin/postings` 전체 배지 측정 | Pass | 상세: 작성됨 `lucide-file-pen`, 검증 전 `lucide-clock`(주황), 검증 완료 `lucide-badge-check`(파랑), 공개 중 `lucide-eye`(시안), 마감 `lucide-lock`. 모두 svg 1개 `aria-hidden=true` + 글자. 목록 배지 200개(DRAFT 22, PUBLISHED 77, CLOSED 1, 검증 완료 78, 검증 전 22) 아이콘 없는 배지 **0** |
| 13 | 회귀 R-201 | C·B·ARCHIVED·DNC 리드 작성 화면; A 리드 공고 생성 요청을 B 리드 id로 재호출; 검증 전 공개; 원시 SQL로 미검증 PUBLISHED; 검증 → 공개 → 마감 | Pass | 4개 화면 `admin-forbidden` 1·폼 0. 재호출 `LEAD_NOT_A`, B 리드 공고 0. 검증 전 공개 `NOT_VERIFIED`, DRAFT 유지. SQL 23514 `JobPosting_published_requires_verification`. 공개 후 POSTING_PUBLISH 감사 1행, 마감 CLOSED |
| 14 | 회귀 R-202 / BR-03 공개 응답 금지 필드 0 | A 리드 공고 1건 + B·C·ARCHIVED·DNC 리드 PUBLISHED 공고 → 6개 언어 목록·상세 HTML·RSC 24개 + `/api/jobs`·`/api/jobs/[id]`에서 회사명·`companyId`·`leadId`·`verifiedBy`·`bizRegNo`·`contactPhone`·검증자·실제 companyId·leadId·리드 제목·`"@type":"JobPosting"` 검색; `/api/jobs`를 DB와 대조 | Pass | 26개 응답 검출 **0**(공고는 모두 포함). `/api/jobs` 50건(목록 상한) 중 리드 비A 0, 비PUBLISHED/미검증 0. 숨은 공고 4개: 상세 404, API 404, 목록 0. API 키 = `BLIND_JOB_FIELDS` 16개(run 1과 같음) |
| 15 | 회귀 R-203 ①(신청·중복) | F-4 구직자 ko·vi로 면접 신청 → 새로고침 | Pass | 완료 문구("면접 신청이 접수되었습니다…", vi "Đã tiếp nhận …"), 새로고침 `REQUESTED`, InterestRequest 1 `{SEEKER, RECEIVED, 본인}`, StaffTask 1 `{OPEN, STAFF_PLACEMENT}`. E2E 동시·중복·`?next=` 경로 통과 |
| 16 | 회귀 R-015 / SC-07 플래그 off | 3270 서버 6개 언어 홈·`/jobs`·`/jobs/[id]`, API 2개, sitemap | Pass | 6개 언어 모두 목록·상세 200 + `coming-soon` + noindex, 공고 카드·면접 패널 0, 홈 `/jobs` 링크 0. API 404·404. sitemap `/jobs` 0 |
| 17 | 회귀 P1d 구인 의뢰 연락처 거부 | 항목 3의 화면 시험 + E2E employer-intake | Pass | 화면 거부 문구·`aria-invalid`, 리드 0; 정상 문구 제출 시 완료. E2E 통과 |
| 18 | 회귀 P1e 관리자 핵심 | E2E admin-core·auth 등 | Pass | 226/226 통과(admin-core 포함) |

## 판정불가 / 사람 확인 필요
없음.

## 결함 목록 (Fail만)
| 번호 | 요구사항 | 재현 방법 | 기대 | 실제 | 위치 | 심각도 |
|---|---|---|---|---|---|---|
| D-3 | BR-14 / R-201 자유 입력 연락처 거부(우회 표기) | ① 기업 로그인 → `/ko/employer/request` 상세 요청란에 `문의 010ㅡ1234ㅡ5678`(한글 모음 ㅡ) 입력 후 제출. ② PLACEMENT 공고 작성 제목에 `생산직 010•1234•5678`. 같은 결과: `010・1234・5678`, `010●1234●5678`, `010→1234→5678`, 키캡 이모지 `0️⃣1️⃣0️⃣1️⃣2️⃣3️⃣4️⃣5️⃣6️⃣7️⃣8️⃣`. 함수 단위로 `detectContacts()`가 이 6가지에 빈 배열 | `CONTACT_INFO` / `TEXT_HAS_CONTACT`로 거부 | 구인 의뢰 `{ok:true}` 리드 저장, 공고 `{ok:true}` DRAFT 저장 | `src/lib/pii-guard.ts` `SEP`(구분자를 열거한 목록이라 `ㅡ`(U+3161)·`•`(U+2022)·`・`(U+30FB)·`●`·`→` 등이 빠짐). 키캡은 `0`+U+FE0F+U+20E3에서 U+FE0F만 지워지고 결합 문자 U+20E3(`\p{M}`)이 숫자 사이에 남음(`normalizeForDetection`) | 중간: run 1 D-1과 같은 종류(구분자 목록 누락). 특히 `010ㅡ1234ㅡ5678`은 한국어 사용자가 흔히 쓰는 표기이고, 기업 자유 입력란(BR-14)은 직원 검증 전 저장됨 |

제안(참고): 숫자 묶음 사이 구분자를 "글자·숫자가 아닌 문자"(`[^\p{L}\p{N}]`, 단 `,`·`:` 등 금액·시간 예외는 지금처럼 유지)로 넓히거나 `ㅡ`를 대시로 정규화하고, 숫자 뒤 결합 문자(`\p{M}`)는 탐지용 정규화에서 지우는 방법. 오탐 회귀(항목 5의 날짜·금액·시간)는 함께 확인 필요.

## 관찰 / 기준 외 발견
| 번호 | 내용 | 재현·증거 | 영향 | 제안 |
|---|---|---|---|---|
| O-1 | 비라틴 숫자 체계·한자·분해 자모 표기 전화번호 미탐지 | `٠١٠-١٢٣٤-٥٦٧٨`(아랍-인도), `०१०-१२३४-५६७८`(데바나가리), `۰۱۰-…`(페르시아), `๐๑๐-…`(태국), `零一零 一二三四 五六七八`, `ㄱㅗㅇㅇㅣㄹㄱㅗㅇ …`, NFD로 분해한 `공일공 일이삼사 오육칠팔`, `zero one zero one two …` 모두 `detectContacts` 빈 배열; 앞 4가지는 공고·구인 의뢰 직접 호출에서도 저장됨 | 대상 사용자(베트남·러시아·우즈벡·중국)와 기업이 쓸 가능성은 낮으나 한자 숫자는 중국어 사용자에게 가능 | `\p{Nd}`를 `0-9`로 바꾸는 정규화(숫자값 매핑), 한자 숫자는 한글 숫자 단어와 같은 방식 검토 |
| O-2 | 회사명 비교의 `inc`·`corp` 제거가 단어 경계 없이 동작 | `CORPORATE_MARKERS`(`src/lib/postings/manage.ts`)의 `inc\.?`·`corp\.?`가 단어 중간도 지움. 직접 호출: 회사 "Vinco"(→`vo`) 리드에 `Novo 볼트 생산직` → `TEXT_HAS_COMPANY`(오탐); 회사 "Prince Metal"(→`premetal`) 리드에 `pre metal 생산직` → 거부(오탐); 회사 "Cheon Steel" 리드에 `Incheon Steel 협력 생산직` → `{ok:true}`(회사명이 그대로 들어있는데 통과). 요청한 "인천(Incheon)" 정상 문구는 회사 "Incheon Steel Inc."·"인천정밀"·"이투이공고정밀" 모두 통과 | 영문 회사명 리드에서 드물게 정상 문구 거부·회사명 통과. 직원이 작성·검증하는 문구라 영향 작음 | 표지어 제거를 단어 경계(`\b`, 공백·문장부호 앞뒤)에서만 하거나, 제거 전·후 두 형태를 모두 비교 |
| O-3 | 연락처 탐지는 쉼표·콜론·글자 사이 숫자를 의도적으로 묶지 않음, 구분자 4개 이상이면 미탐지 | `010,1234,5678`, `010:1234:5678`, `010번 1234번 5678`, `010a1234a5678`, `010 -_ 1234 -_ 5678` 빈 배열 | 금액·시간 오탐 방지를 위한 설계(파일 주석). 기록만 | 없음(D-3 수정 시 함께 고려) |
| O-4 | 서버가 NOT_ELIGIBLE/BLOCKED를 돌려준 뒤에도 바깥 `interest-panel`의 `data-state`는 `ELIGIBLE` | 항목 10. 안쪽 `interest-not-eligible`의 `data-code`는 정확 | 화면·사용자 영향 없음(시험 식별자만) | 없음 |
| O-5 | 시험 행이 개발 DB에 계속 쌓임 | 이번 직접 시험: `QAP2A2:*`·`QAP2A2-MASK*` 리드, D-3·O-1 통과 표기로 저장된 DRAFT 공고 10건과 구인 의뢰 B 리드 10건(연락처 비슷한 문자열 포함), 정상 문구 공고·리드, 공개 공고 5건, 기업·직원·구직자 계정. E2E 행 포함 `/api/jobs`가 상한 50건에 도달 | 플래그 on 개발 서버 `/jobs`에 시험 공고가 가득 보임(run 1 O-4와 같음) | 정리 스크립트 또는 E2E 전용 DB |
