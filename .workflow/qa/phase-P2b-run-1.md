# QA 보고서 — Phase P2b / run 1

- 대상: 커밋 7e18f8d(후보 열람 자리표시를 employer 영역으로 이동), 421f244(블라인드 직렬화·기업 후보 열람·계약 동의·관리자 기업 검증), f29d7e1(약관 PDF 6개). HEAD f29d7e1
- 기준 문서: PRD R-204·R-205·R-206·R-207·R-208·R-218; PLAN `### P2b`; WO §2(BR-01·02·06·07·14·15), §7.5, §9.3, §9.4, §15-1·§15-2·§15-6·§15-8; DECISIONS PC-1·PC-11·PC-12·SC-07·Q-08·Q-24; CLAUDE.md("기업에 나가는 구직자 데이터는 blindSeeker.ts 경유")
- 일시: 2026-11-17 15:48 ~ 16:40 (KST)
- 환경: Windows 11, 개발 DB. 포트 3000은 시작·끝 모두 LISTEN 없음(건드리지 않음). lint·typecheck·test·i18n:check·qa:static은 저장소에서 `corepack pnpm` 순차. build·E2E·직접 시험은 `git archive f29d7e1`을 스크래치패드에 풀어(`node_modules`는 저장소 것을 junction으로 읽기만, `.env` 복사) **pnpm/corepack 없이** `node node_modules/next/dist/bin/next build`, `node node_modules/@playwright/test/cli.js test`(복사본 `node_modules/.bin`을 PATH 앞에)로 실행. 작업 트리 typecheck는 `node node_modules/typescript/bin/tsc --noEmit`.
- 저장소 node_modules 상태: 시작 `corepack pnpm test` **65 files / 516 tests** 통과(15:49). 정리 때 junction을 PowerShell `(Get-Item …).Delete()`로 먼저 끊고(`Test-Path` False) 확인: 최상위 37개·`.pnpm` 916개, `next`·`@playwright/test`·`vitest` 있음. 그 뒤 작업 트리 삭제. 끝 `corepack pnpm test` 65 files / 516 tests 통과.
- 직접 시험 환경: E2E(`E2E_PORT=3810`, 3810~3813)를 먼저 단독 실행·종료한 뒤 같은 빌드로 `next start` 두 개 — 플래그 off 127.0.0.1:3820(`FEATURE_EMPLOYER_CANDIDATES=false`, `TRUST_PROXY=true`), 플래그 on 127.0.0.1:3822(`FEATURE_EMPLOYER_CANDIDATES=true`, `TRUST_PROXY=true`). 브라우저는 쿠키 때문에 `localhost`로 접속.
- 시험 방식: 복사본 안 스크래치 Playwright 스펙(workers 1). 기업은 실제 이메일 로그인 화면, 직원은 `signInNewStaff`(실제 로그인 → TOTP), 구직자는 실제 OTP 로그인(`loginUi`). 구직자 픽스처는 이름·이메일·메신저 ID·학교명·전공(`QAPTWOB major text 010-7777-8888`)·이전 회사명·전화(`+821077778888`)·출생 연도·성별을 모두 채우고 고유 `convertibleVisa` 태그로 격리. 서버 액션 직접 호출은 브라우저가 실제로 보낸 요청(`Next-Action` 헤더와 본문)을 잡아 값만 바꿔 같은 세션 페이지의 `fetch`로 재전송. 연락처 판독은 `src/lib/pii-guard` `detectContacts`(PHONE_LOCAL·PHONE_INTL·EMAIL). 개발 DB 전체 구직자 직렬화는 `tsx` 스크립트(읽기 전용).
- 정리: 서버 두 개 종료(3810~3813·3820·3822 LISTEN 0), junction 해제 후 작업 트리·`.env` 복사본·스크립트·로그·PDF 추출 텍스트 삭제. `.env` 값 출력 없음, 외부 전송 없음, 개발 DB 행 삭제 없음, `.claude/` 건드리지 않음. `git status`: `.workflow/` 기존 변경 4개, 미추적 `.claude/`·`.workflow/qa/`.

## 결과 요약
- 통과: 28 / 전체: 28 (통과율 100%), 판정불가 0
- 필수 항목 실패: 0개
- 결함: 없음
- 관찰: O-1 ~ O-7 (저장소 typecheck가 사용자 `.next/types`의 옛 경로 때문에 실패 — 코드 결함 아님, O-1; 마스킹된 칸 값을 합계에서 빼서 알 수 있음, O-2)

## 검증 명령 (순차 실행)
| 명령 | 위치 | 종료 코드 | 결과 |
|---|---|---|---|
| `corepack pnpm lint` | 저장소 | 0 | 오류·경고 없음 |
| `corepack pnpm typecheck` | 저장소 | **1** | 오류 3건 모두 `.next/types/app/[locale]/(public)/employer/candidates/page.ts`·`.next/types/validator.ts`: 7e18f8d로 옮겨진 옛 경로 `src/app/[locale]/(public)/employer/candidates/page.js`를 찾음. 사용자 `.next`의 이전 생성물(지우지 않음) → O-1 |
| `tsc --noEmit` | 작업 트리(f29d7e1, `.next` 없는 상태) | 0 | 오류 없음 → 코드 자체는 타입 통과 |
| `corepack pnpm test` | 저장소 | 0 | **65 files / 516 tests** 통과(27.0s). P2a run 8 대비 +9 files, +38 tests |
| `corepack pnpm i18n:check` | 저장소 | 0 | ko 1069 keys, 6 locales, errors 0 |
| `corepack pnpm qa:static` | 저장소 | 0 | errors 0, warnings 17 (P2a와 같은 수) |
| `next build` | 작업 트리 | 0 | Compiled successfully. `/[locale]/employer/candidates`·`/[locale]/employer/contract`(app-path-routes에 있음, prerender 0 = 요청 시 렌더), `ƒ /admin/companies`, `ƒ /api/employer/candidates` |
| `E2E_PORT=3810 playwright test --reporter=line` | 작업 트리 | 0 | **244 passed (3.8m)**, 실패 0 (P2a 222 + employer-candidates 9 tests × 2 프로젝트 + 기타) |

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| 1 | R-204 / WO §15-1 모든 시드 프로필 직렬화 키 ⊆ BLIND_SEEKER_FIELDS | 단위 시험(SAMPLE 시드 + DB 전체) 통과 확인; 별도로 개발 DB의 **구직자 2,100명 전부**를 `BLIND_SEEKER_SELECT`로 읽어 `serializeBlindSeeker` 실행; API 응답 키 비교 | Pass | `{"total":2100,"keyNotSubset":0,"keySetVariants":1,"keyCount":[30],"errors":0}`. `/api/employer/candidates` 응답 후보 키 집합 1종 30개, 화이트리스트 밖 키 `[]` |
| 2 | R-204 스냅샷 키 목록 열람 | `tests/unit/lib/serializers/__snapshots__/blindSeeker.test.ts.snap` 열람, WO §7.5와 대조 | Pass | `keys 1` 스냅샷 30개(`publicId` … `convertibleAt`)가 WO §7.5 순서·이름과 같음. `values 1`은 코드값·계산값만(`stayRemainingBand:"M6_12"`, `yearsInKorea:8`, `experienceSummary:[{industry,months,role}]`, `publicId` 자음 32자) |
| 3 | R-204 자유 입력·실명·연락처·학교명·이전 회사명·출생 연도·성별 미노출 | 2,100명 직렬화 결과에 각 행의 복호된 이름·이메일·메신저 ID·학교명·전공·이전 회사명·추천 코드·DB id·userId 문자열 검색, 연락처 정규식; API·HTML·RSC에서 픽스처 숨김 값 9종 검색 | Pass | `secretLeaks:0`, `contactHits:0`(비교 대상: 이름 있는 행 1,220, 전공 텍스트 138, 이전 회사명 23, 학교명 3). API 응답에 숨김 값 0, 구직자 DB id·userId·원본 uuid 0. `select`에 `*Enc`·`major`·`birthYear`·`gender` 없음(코드 + 단위 시험). `majorField`는 모두 null — Q-24로 run 2 대상(O-3) |
| 4 | R-205 / WO §15-6 E-9·체류 만료·BLIND 철회·비활성 구직 상태 등 제외 | 같은 태그로 표시 대상 3명(S, A, 이번 달 만료) + 제외 대상 12명(E-9 FUTURE_POOL, E-10 FUTURE_POOL, CONSULT_ONLY, 지난달 만료, BLIND 철회, BLIND 동의 없음, NOT_SEARCHING, 구직 상태 null, B등급, INACTIVE, BLOCKED, 위저드 미완료) → 화면·API; 개발 DB 전체 E-9/E-10 대조 | Pass | 화면 카드 3개 = 표시 대상 3개(id 일치), 제외 12개 모두 없음. API 동일(`idsMatch:true`). 개발 DB E-9 303명·E-10 1명 중 후보 조건 통과 **0명**(전체 후보 245명) |
| 5 | R-205 필터 8종 동작 | 한 속성만 다른 9명 + 다른 태그 1명으로 API 15가지 조합; 화면 GET 폼에서 숙소 "아니요" 선택·제출 | Pass | `visa=H-2`, `stay=M0_6/M12_24/M24_PLUS`, `topik=3/5`, `industry=F`, `skill=FORKLIFT`, `dormitory=NO/YES`, `shift=NO/YES`, `convertible`, 필터 없음(9), 잘못된 값 무시(`stay=XX&topik=abc&shift=<script>` → 200, 9명) **15/15 기대 집합과 일치**. 화면 select 8개; 폼 제출 URL `?…&dormitory=NO…`, 값 유지, 화면 카드 30개 = API `dormitory=NO` 30개(순서 같음, 모두 `needDormitory:false`) |
| 6 | R-205 / R-218 / PC-11 미검증·미계약 기업은 통계만(5명 미만 마스킹) | 미검증+미계약, 검증만, 계약만 기업 3곳으로 화면·API; 통계를 eligible.ts와 별도로 작성한 DB 쿼리로 대조; 후보 0명인 시·도(BUSAN)에 S등급 1명을 넣어 소표본 칸 확인 | Pass | 세 기업 모두 카드 0, `candidate-stats` 표시, API `{"access":"STATS","stats":{total,cells,minSample}}`, 공개 id 0, 연락처 0. total 241 = 독립 계산 241, 칸 3 = 3, 불일치 0. 안내 표시: 미검증 `access-unverified`, 미계약 `access-not-contracted`+`contract-link`. 통계 열람은 열람 횟수·감사에 안 셈(버킷 0, CANDIDATE_BULK_VIEW 0). BUSAN·S 칸 `count:null`, 화면 `부산광역시 S등급 5명 미만`(`data-masked="true"`). 단, 합계에서 보이는 칸을 빼면 1이 나옴 → O-2 |
| 7 | R-205 / SC-07 플래그 off ComingSoon(200, noindex)·API 404·링크 숨김 | 3820: 비로그인·검증+계약 기업 로그인 상태로 6개 언어 페이지, API(비로그인·로그인), on 서버에서 잡은 면접 요청 액션을 off 서버로 재전송; 6개 언어 × 5화면 링크; sitemap·robots | Pass | 페이지 6개 언어 모두 200 + `coming-soon` + `<meta name="robots" content="noindex, nofollow">`(헤더 `X-Robots-Tag` 같음), 카드·통계 0. API 404 `NOT_FOUND`(두 경우). 액션 `{"ok":false,"code":"NOT_FOUND"}`, InterestRequest 0. off 링크 **0**(30화면). on 서버 로그인 상태에서는 링크 1. sitemap employer 0(on·off), robots `Disallow: /*/employer/candidates` |
| 8 | R-206 / WO §15-2 기업용 API·서버 액션 응답 전수 전화·이메일 0 | 레지스트리(`apiRegistry.ts`: 라우트 1, 액션 파일 5) 단위 하네스 통과 확인; 직접: API LIST·STATS·429·401·404 응답, 면접 요청 액션 응답(성공·중복·NOT_FOUND·INVALID·NOT_CONTRACTED·UNAUTHENTICATED), 계약 액션 응답(TERMS_REQUIRED·ALREADY_SIGNED) | Pass | 모든 응답 연락처 탐지 0, 숨김 값 0, 구직자 DB id 0. 면접 요청 응답은 `{"ok":true,"already":false}` 꼴뿐. 하네스는 레지스트리 밖 `src/app/api/employer/**`·`src/server/actions/employer/**` 파일이 있으면 실패(단위 시험 통과) |
| 9 | R-206 기업 화면 HTML·RSC에 구직자 개인정보 0 | LIST 기업 6개 언어 후보 화면 HTML과 `RSC: 1` 응답, 통계 화면 HTML, 계약 화면; 숨김 값 9종·원본 키 이름(`legalName`·`emailEnc`·`birthYear`·`gender`·`schoolName`·`referralCode`·`employerName`·`"major"`) 검색 | Pass | 6개 언어 HTML·RSC 숨김 값 0, 원본 키 이름 0, `main` 본문 연락처 0. RSC의 정규식 일치는 모두 SVG path 숫자열(`0-5.2 4.5-9.4 …`)과 사무소 대표번호 `02-6281-8901`(푸터, 플래그 off 홈에도 같음)뿐 — 그 둘을 뺀 일치 0(O-5) |
| 10 | CLAUDE.md "기업에 나가는 구직자 데이터는 blindSeeker.ts 경유" 위반 경로 탐색 | `"use server"` 파일 16개·Route Handler 6개 전수 목록; 기업 영역(`app/[locale]/employer`, `components/employer`, `api/employer`, `actions/employer`, `lib/employer`)에서 `seekerProfile` 직접 접근 grep; `lib/candidates/*`가 기업으로 내보내는 값 확인; 응답 키 비교(항목 1) | Pass | 기업 영역의 `seekerProfile` 직접 접근 0. 기업으로 가는 구직자 행은 `browse.ts queryCandidates → serializeBlindSeeker`뿐. `stats.ts`는 시·도×등급 건수만, `interest.ts`는 `{ok,already}`와 `toBlindPublicId`(버튼 상태)만. 기업 세션에서 부를 수 있는 그 밖의 액션(jobs/interest, score, visa)은 구직자 DB 값을 돌려주지 않음. 기업 세션으로 관리자 액션 재전송 → `{}`(200), DB 변화 없음 |
| 11 | R-207 101번째 열람 429(화면·API) | LIST 기업: 화면 1회 + API 99회 → API 101번째 → 화면 다시 열기; 다른 기업으로 대조 | Pass | 첫 화면 "오늘 남은 열람 99회", 99회 모두 200, 101번째 **429** `{"error":{"code":"RATE_LIMITED",…}}`, `Retry-After: 28832`(한국 자정까지). 화면 `candidates-limited` "오늘 열람 한도에 도달했습니다 … 하루 100회까지", 카드 0. 다른 기업은 그대로 열람(카드 1) |
| 12 | R-207 / PC-12 조회마다 CANDIDATE_BULK_VIEW 감사 | 위 기업의 감사 행 | Pass | 102행 = 성공 100 + 거부 2(`refused:"DAILY_LIMIT"`), actor 모두 그 기업 계정. meta 키 `filters, resultCount, publicIds`(거부는 `limit, refused, filters`), 숨김 값 0·연락처 0 |
| 13 | R-207 면접 요청 → InterestRequest(EMPLOYER) + StaffTask | 카드의 "면접 요청" 클릭 | Pass | 화면 `interview-requested`. InterestRequest 1행 `{initiator:EMPLOYER, status:RECEIVED, postingId:null}`, 대상 구직자 일치. StaffTask 1행 `{INTEREST_FOLLOWUP, OPEN, STAFF_PLACEMENT}`, payload 키 `initiator, interestRequestId`뿐. 서버 로그 알림 `{"channel":"STAFF","to":"***NT","templateKey":"staff.employerInterviewRequest"}`(개인정보 없음) |
| 14 | R-207 중복 1건 | 같은 요청 3회 동시 재전송; 새 후보로 첫 요청 4회 동시 | Pass | 재전송 3건 `{"ok":true,"already":true}`, 행 1 유지. 동시 첫 요청: `already:false` 1 + `already:true` 3, InterestRequest 1·StaffTask 1(업무 합계 2) |
| 15 | R-207 거부 경로·구직자 데이터 미노출 | 목록을 본 뒤 BLIND 철회된 후보, 형식이 틀린 id, 없는 id, 검증 없는 계약 기업 세션, 비로그인 | Pass | 철회 `NOT_FOUND`(행 0), 형식 오류 `INVALID`, 없는 id `NOT_FOUND`, 미검증 기업 `NOT_CONTRACTED`(행 0), 비로그인 `UNAUTHENTICATED`. 모든 응답 숨김 값·DB id·연락처 0 |
| 16 | R-208 이용약관 체크 필수 | 체크 없이 제출(화면); 다른 기업 세션으로 `termsAgreed:false`, `"true"`(문자열), 키 없음 직접 호출 | Pass | 화면 "이용약관에 동의해야 계약할 수 있습니다.", 포커스 `contract-terms`, `contractSignedAt` null. 직접 호출 3건 모두 `TERMS_REQUIRED`, 회사 행 불변, Consent 0 |
| 17 | R-208 위임 미동의로 계약 완료, Consent 행, 위임 별도 | 기업 A: 약관만 체크; 기업 B: 둘 다 체크; 서명 뒤 재호출 | Pass | A: 요청 본문 `[{"termsAgreed":true,"visaMandate":false,"locale":"ko"}]` → `contract-signed`, `{contractVersion:"v1", visaMandateAgreed:false}`, Consent `EMPLOYER_TERMS` 1행(v1, ko, ipHash 있음), `EMPLOYER_VISA_MANDATE` 0, 화면 "체류 업무 위임: 동의하지 않음(선택 항목)". 서명만 하고 미검증 → 후보 API `STATS`. B: `visaMandateAgreed:true`, Consent `EMPLOYER_TERMS`+`EMPLOYER_VISA_MANDATE`. 재호출 `ALREADY_SIGNED`, 행·동의 불변. 체크박스 2개(6개 언어). 비로그인 → `/ko/employer/login?next=/employer/contract` |
| 18 | R-208 PDF 6개를 열어 [전문가 검토 필요] 확인 | `public/docs/employer-terms-v1-{ko,en,vi,zh,ru,uz}.pdf`를 `pdftotext -enc UTF-8`로 텍스트 추출; 6개 언어 계약 화면의 PDF 링크를 서버에서 내려받기 | Pass | 6개 모두 `%PDF-1.4`, 2~3쪽, 추출 텍스트에 `[전문가 검토 필요]` 각 1회. ko 본문에 WO §9.4 항목: 제4조 "법정 한도 이내의 소개요금", 제5조 "추천일부터 12개월 안에 … 채용하면 … 소개요금", 제7조 위임(선택) "허가되지 않으면 다시 신청", "3개월 안에 퇴사하면 … 다시 소개". 번역 5개 모두 한국어 원문 제목 "구인 서비스 이용약관 (기업용)"과 "12개월" 포함(SC-08). 링크: ko 1개, 그 밖 언어는 자기 언어 + ko 2개, 모두 200 `application/pdf`(파일 크기 일치). vi 추출 텍스트는 성조 기호가 흩어짐(O-4) |
| 19 | R-218 기업 검증·계약 설정/해제 시 COMPANY_VERIFY 감사, 설정 전 통계만 | STAFF_PLACEMENT로 `/admin/companies`: 검증 → 계약 등록 → 검증 해제 → 재검증 → 계약 해제, 단계마다 그 기업 세션으로 API `access` 확인 | Pass | access: 시작 STATS → 검증 STATS → 계약 **LIST** → 해제 STATS → 재검증 LIST → 계약 해제 STATS. 감사 5행 `VERIFY, CONTRACT_SET(signedOn), UNVERIFY, VERIFY, CONTRACT_CLEAR`, actor = 그 직원, entity Company. 회사 행 `verifiedBy` = 직원, `verifiedAt` 있음, 해제 후 `contractSignedAt·contractVersion` null. 목록 열람마다 PII_VIEW 1행 |
| 20 | R-218 / Q-08 권한(STAFF_VISA 거부) | STAFF_VISA로 화면 열기; PLACEMENT가 보낸 검증 요청을 VISA 세션으로 재전송; 대조로 PLACEMENT 세션 재전송 | Pass | 표 0, "매칭 담당 직원과 관리자만" 안내, 회사명 미노출. 재전송 `{"ok":false,"code":"FORBIDDEN"}`, verified 불변, 감사 증가 0. 대조 `{"ok":true,…}`, verified 변경 → 직접 호출 경로가 실제로 동작함을 확인 |
| 21 | R-218 자동 생성 회사 표시 | 사업자번호 없고 계정 0인 회사(P2a 공고로 자동 생성)와 목록 표시 대조 | Pass | DB 자동 생성 후보 최근 3곳 모두 목록에 "사업자번호 없음(자동 생성)" 배지. 계정 있는 사업자번호 없는 회사(시험 기업)는 "사업자번호 없음"만 |
| 22 | BR-01 직접 연락 수단 0 | 후보·통계·계약 화면과 카드 동작, 알림 채널, 소스(`mailto:`·`tel:`·kakao 링크) 검색 | Pass | 카드 동작은 "면접 요청" 하나, 결과는 VISA n JOB 직원 업무뿐(알림 채널 STAFF 1종, 구직자·기업 쪽 알림 0). 기업 영역 소스에 `mailto:`·`tel:`·메신저 링크 0. 화면에 구직자 연락처 0(항목 9) |
| 23 | SC-06 '지원하기' 0 | 6개 언어 후보 화면 본문·HTML, `messages/*.json`·`src` 검색 | Pass | 본문 검출 0. 버튼: 면접 요청 / Request interview / Yêu cầu phỏng vấn / Запросить собеседование / 面试邀请 / Suhbat soʻrash. 소스 일치는 주석 5곳뿐 |
| 24 | 6개 언어 렌더 | on 서버 6개 언어 후보 목록·통계·계약(서명 전·후), off 서버 6개 언어 ComingSoon | Pass | 모두 200, `<html lang>` 일치, 메시지 키 노출(`employer.candidates.`·`employer.contract.`) 0. i18n:check employer.candidates 92키·contract 25키가 6개 언어에 같은 수 |
| 25 | 375 가로 스크롤 없음, 터치 44×44 | 1280·375(모바일 터치)에서 후보 목록·통계·계약(서명 전·후) × 6개 언어, off ComingSoon × 6, `/admin/companies`; 보이는 `a[href]`·`button`·`select`·`input`·`[role=checkbox]` 측정(체크박스는 감싼 label 기준) | Pass | 62개 화면 모두 `scrollWidth = clientWidth`(375/375, 1280/1280). 44 미만 **0건**(화면당 26~42개, 관리자 276개 측정) |
| 26 | 회귀 P1c 동의 철회 → 후보 즉시 제외 | `createGradeASeeker`(실제 위저드 저장) 구직자를 태그 → 기업 화면에서 확인 → 구직자 실제 OTP 로그인 `/seeker/me`에서 BLIND_PROFILE 철회 → 기업 화면 새로고침·API | Pass | 철회 전 카드 1(그 구직자), 철회 후 화면 0·API 0, Consent revokedAt 있음. E2E consent-revoke도 통과 |
| 27 | 회귀 P2a(공고·면접 신청) 및 E2E 전체 | E2E 전체 | Pass | 244/244 통과(jobs-apply·admin-core·quick-register·consent-revoke 포함) |
| 28 | 검증 명령 7종 | 위 표 | Pass | lint·test·i18n:check·qa:static·build·E2E 종료 코드 0. typecheck는 저장소에서 사용자 `.next/types` 옛 경로로 1, 작업 트리(같은 커밋, 생성물 없음)에서 0 → 코드 결함 아님(O-1) |

## 판정불가 / 사람 확인 필요
없음. (PDF는 텍스트 추출로 확인했고 사람이 화면으로 열어 보지는 않음 — vi 글자 배치는 O-4 참고.)

## 결함 목록 (Fail만)
없음.

## 관찰 / 기준 외 발견
| 번호 | 내용 | 재현·증거 | 영향 | 제안 |
|---|---|---|---|---|
| O-1 | 저장소 `pnpm typecheck` 실패: `.next/types`가 7e18f8d 전 경로 `(public)/employer/candidates`를 참조 | 오류 3건 모두 `.next/types/...`; 같은 커밋 작업 트리 tsc 0 | 사용자 개발 환경에서 typecheck가 빨갛게 보임 | 사용자가 `.next`를 지우거나 `next build`/`next dev`를 한 번 돌리면 해소(QA는 지우지 않음) |
| O-2 | 통계 마스킹 칸의 값을 합계에서 계산할 수 있음 | BUSAN·S 1명 추가 후 `total:247`, 보이는 칸 합 246 → 마스킹 칸 = 1. 합계는 5 이상이면 그대로 나옴 | 마스킹 칸이 하나뿐이면 정확한 소표본 수가 드러남(개인 식별 정보는 아님, 건수만) | PC-11 범위 안. 원하면 마스킹 칸이 하나일 때 합계도 범위로 표시하거나 두 번째로 작은 칸도 가림 — 사람 판단 |
| O-3 | `majorField`는 항상 null | 2,100명 직렬화 `majorFieldNonNull:0`, API 응답 null | WO §7.5 "전공 분야"가 기업에 안 나감 | Q-24에 따라 P2b run 2에서 코드 목록 신설 예정 |
| O-4 | vi PDF의 `pdftotext` 추출 텍스트에서 성조 기호가 앞뒤로 흩어짐 | `Đ ề ả ị ụ … i u kho n d ch v tuy n d ng` | 추출 도구 한계로 보임(Chromium PDF의 결합 문자). `[전문가 검토 필요]`·한국어 원문은 정상 추출 | 필요하면 사람이 PDF 뷰어로 vi 파일을 한 번 열어 확인 |
| O-5 | RSC 응답 전체에 연락처 정규식을 돌리면 SVG path 숫자열과 사무소 대표번호가 걸림 | 후보 화면 RSC 15건 일치 = SVG path + `02-6281-8901`(플래그 off 홈 RSC에도 같음) | R-206 하네스는 API·액션 응답만 스캔하므로 영향 없음. 화면 RSC까지 자동 스캔하려면 예외가 필요 | 기록만 |
| O-6 | 열람 한도 버킷이 거부된 열람도 셈(101번째 이후 count 102) | `RateLimitBucket.count 102` | 동작 영향 없음(다음 날 새 버킷) | 없음 |
| O-7 | 시험 행이 개발 DB에 남음 | 후보 조건을 통과하는 `QAP*` 태그 구직자(이번 시험 약 30명, BUSAN S 1명 포함 — 통계 칸이 하나 늘어남), 시험 기업·직원 계정, InterestRequest·StaffTask·Consent·AuditLog, E2E 행 | 개발 서버 통계·후보 수가 늘어남 | 정리 스크립트 또는 E2E 전용 DB(이전 관찰과 같음) |
