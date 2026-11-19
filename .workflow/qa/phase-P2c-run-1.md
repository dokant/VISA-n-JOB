# QA 보고서 — Phase P2c / run 1

- 대상: 커밋 3a3488f(P2b O-5 선행 수정), c5921f5(P2c 본 작업), 7cc2a99(admin-matching E2E). HEAD 7cc2a99
- 기준 문서: PRD R-209·R-210·R-211·R-212·R-216(+ 회귀 R-206); PLAN `### P2c`; DECISIONS PC-1·PC-13·SC-07·Q-08; CLAUDE.md(BR-01·BR-13, 44px, 6개 언어)
- 일시: 2026-11-17 17:31 ~ 17:55 (KST)
- 환경: Windows 11, 개발 DB(127.0.0.1:54320, 마이그레이션 `20261118100000_p2c_matching` 적용 확인). 포트 3000은 시작·끝 모두 LISTEN 없음(건드리지 않음). lint·typecheck·test·i18n:check·qa:static은 저장소에서 `corepack pnpm` 순차. build·E2E·직접 시험은 `git archive 7cc2a99`를 스크래치패드에 풀어(`node_modules`는 저장소 것을 junction으로 읽기만, `.env` 복사) **pnpm/corepack 없이** `node node_modules/next/dist/bin/next build`, `node node_modules/@playwright/test/cli.js test`(복사본 `node_modules/.bin`을 PATH 앞에), 작업 트리 typecheck는 `node node_modules/typescript/bin/tsc --noEmit`.
- 직접 시험 환경: E2E 전체(`E2E_PORT=3860`, 3860~3863)를 먼저 단독 실행·종료한 뒤 같은 빌드로 `next start` 세 개 — 3870(플래그 기본), 3871(`FEATURE_PUBLIC_JOBS`), 3872(`FEATURE_EMPLOYER_CANDIDATES`), 모두 `TRUST_PROXY=true`. 복사본 안 스크래치 Playwright 스펙(workers 1). 직원은 실제 로그인 → TOTP(`signInNewStaff`), 기업은 실제 이메일 로그인, 구직자는 실제 OTP 로그인. 서버 액션 변조는 브라우저가 실제로 보낸 요청(`Next-Action` 헤더·multipart 본문)을 `page.route`로 가로채 id 값만 바꾸거나, 잡은 요청을 다른 세션으로 그대로 재전송. 만료 시험은 ① 저장소의 `signFileToken`을 발급 시각을 옮겨 호출(실제 HASH_KEY로 서명 = 서버 시계와 비교) ② UI 버튼으로 받은 링크를 실제로 290초·302초 기다려 재요청, 두 방식 모두.
- 스크래치 스펙 1회는 Playwright 워커가 `0xC0000409`로 종료(테스트 시작 전, 환경 문제), 같은 스펙 재실행은 통과. OTP 60초 재전송 제한 때문에 같은 구직자 재로그인 전 `ageOtpChallenges`(E2E 지원 함수) 사용.
- 저장소 node_modules 상태: 시작 `corepack pnpm test` **74 files / 552 tests** 통과(17:31). 정리 때 junction을 PowerShell `(Get-Item …).Delete()`로 먼저 끊고(`Test-Path` False) 확인: `.pnpm` 디렉터리 915개, `next`·`@playwright/test`·`vitest`·`tsx`·`@prisma/client`·`.bin` 있음. 그 뒤 작업 트리 삭제. 끝 `corepack pnpm test` 74 files / 552 tests 통과.
- 정리: 서버 세 개 종료(3860~3863·3870~3872 LISTEN 0), junction 해제 후 작업 트리(업로드 시험 파일이 있던 작업 트리 `storage/private` 포함)·스크립트·로그 삭제. 저장소에는 `storage/` 폴더가 생기지 않음. `.env` 값 출력 없음, 외부 전송 없음, 개발 DB 행 삭제 없음(O-7), `.claude/` 건드리지 않음. `git status`: `.workflow/` 기존 변경 4개, 미추적 `.claude/`·`.workflow/qa/`.

## 결과 요약
- 통과: 32 / 전체: 32 (통과율 100%), 판정불가 0
- 필수 항목 실패: 0개
- 결함: 없음
- 관찰: O-1 ~ O-7 (O-3 동의서 "기간" 문구와 실제 동작 불일치는 Gate 4 법무 확인 권장)

## 검증 명령 (순차 실행)
| 명령 | 위치 | 종료 코드 | 결과 |
|---|---|---|---|
| `corepack pnpm lint` | 저장소 | 0 | 오류·경고 없음 |
| `corepack pnpm typecheck` | 저장소 | **2** | 오류 3건 모두 `.next/types/app/[locale]/(public)/employer/candidates/page.ts`·`.next/types/validator.ts`가 7e18f8d 전 옛 경로를 찾음 — P2b O-1과 같음(사용자 `.next` 생성물, 지우지 않음) |
| `tsc --noEmit` | 작업 트리(7cc2a99, `.next` 없는 상태) | 0 | 오류 없음 → 코드 자체는 타입 통과 |
| `corepack pnpm test` | 저장소 | 0 | **74 files / 552 tests** 통과(23.6s). 시작 기준선과 끝 확인 모두 같음 |
| `corepack pnpm i18n:check` | 저장소 | 0 | ko 1154 keys(P2b 1085 → +69), 6 locales, errors 0 |
| `corepack pnpm qa:static` | 저장소 | 0 | errors 0, warnings 17(P2b와 같은 수). 규칙 BR-09/ledger-mutation·ledger-repository·ledger-raw-sql 존재 |
| `next build` | 작업 트리 | 0 | 빌드 성공. `ƒ /admin/matching`, `ƒ /admin/matching/[postingId]`, `ƒ /admin/matching/recommendations/[id]`, `ƒ /admin/placements`, `ƒ /admin/visa-cases(/[id])`, `ƒ /api/employer/requests`, `ƒ /api/files/[token]`, `/[locale]/employer/requests`, `/[locale]/seeker/me/recommended` |
| `E2E_PORT=3860 playwright test --reporter=line` (전체 스위트) | 작업 트리 | 0 | **260 passed (3.4m)**, 실패 0 (admin-matching·employer-requests·seeker-recommended 새 스펙 포함, 데스크톱·375 두 프로젝트) |

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| 1 | R-209 앱 계층에 Recommendation update/delete 경로 없음 | `src/`·`scripts/` grep(`recommendation.(update\|delete\|upsert\|updateMany\|deleteMany\|createMany)`, 중첩 쓰기 `recommendations: { delete…/update…}`, raw SQL); `qa:static` 검출력: 작업 트리에 위반 4줄짜리 임시 파일을 넣고 qa-static 실행 후 삭제 | Pass | grep 0건, `recommendation.create`는 `src/lib/recommendations/ledger.ts:56` 한 곳, 리포지토리는 `createRecommendation`·`findRecommendation(s)`만 export. 임시 파일 → `[ERROR] BR-09/ledger-mutation` ×2(update·delete), `BR-09/ledger-repository`(ledger 밖 create), `BR-09/ledger-raw-sql`(`DELETE FROM "Recommendation"`), errors 4 → 파일 삭제 후 저장소 qa:static errors 0. 관계 4개 모두 `onDelete: Restrict` |
| 2 | R-209 DB 트리거 UPDATE/DELETE/TRUNCATE 거부 | 개발 DB 트리거 정의 조회; 방금 만든 추천 행에 각 SQL을 실행(각각 롤백되는 트랜잭션, `lock_timeout 5s`) | Pass | 트리거 `Recommendation_no_update_delete`(BEFORE DELETE OR UPDATE, ROW), `Recommendation_no_truncate`(BEFORE TRUNCATE). UPDATE·DELETE·TRUNCATE 모두 `Code 23001 … append-only ledger "Recommendation": UPDATE/DELETE/TRUNCATE is not allowed (BR-09)`, 행 그대로(note "QA note") |
| 3 | R-209 공고별 적합 구직자 | 같은 비자 태그 공고에 구직자 8명(적합 2, 비자 다름, B등급, BLIND_PROFILE 철회, INACTIVE, 트랙/등급 변경, 희망 지역 부산) → STAFF_PLACEMENT `/admin/matching/{공고}` 기본·`?scope=visa` | Pass | 기본: 2명(적합 2명만). `scope=visa`: 3명(부산 희망자 추가), 비자 다름·B·철회·INACTIVE는 두 목록 모두 없음. 화면 HTML에 실명·전화번호 0 |
| 4 | R-209 추천 실행 → 원장 + RECOMMENDATION_CREATE 감사 | 실제 대화상자(메모 입력) → 추천 실행 | Pass | Recommendation 1행(`staffId` = 로그인 직원), AuditLog `RECOMMENDATION_CREATE` 1행(actor = 직원, meta `{seekerId, companyId, postingId, interestRequestId:null, hasNote:true}` — id·코드만). 재검증 후 해당 행의 추천 버튼 0개(`already-recommended` 링크로 바뀜) |
| 5 | R-209 중복 추천 1건 | 4번의 실제 요청을 같은 세션으로 동시에 4회 재전송 | Pass | 4회 모두 200 `"already":true`, 원장 1행 유지, 감사 1행 유지 |
| 6 | R-209 비자 불일치·비적격 추천 서버 거부(요청 변조) | 적합 구직자 대화상자의 실제 요청 본문에서 `seekerId`를 바꿔 전송: 비자 다름·B등급·BLIND 철회·INACTIVE·없는 id; `postingId`를 같은 회사 DRAFT 공고로; `/admin/matching` 면접 요청 경유(`recommendForInterestAction`)에서 `interestRequestId`를 B등급 구직자의 요청으로 | Pass | 5가지 모두 `NOT_ELIGIBLE`, 각 구직자 원장 0행. DRAFT 공고 `POSTING_NOT_FOUND`, 0행. 면접 요청 경유 B등급 `NOT_ELIGIBLE`(원장 0, 요청 상태 RECEIVED 유지); 같은 방법으로 적합 구직자의 요청으로 바꾸면 `OK`·원장 1·RECOMMENDED(양성 대조) |
| 7 | R-209 추천 권한 | 5번 요청을 STAFF_VISA(TOTP 완료)·세션 없음·기업 세션으로 재전송(다른 적합 구직자 id로) | Pass | STAFF_VISA `{"ok":false,"code":"FORBIDDEN"}`, 세션 없음·기업은 결과 없음(`{}`/리다이렉트), 대상 구직자 원장 0행 |
| 8 | R-209 면접 일정·확정 | 추천 상세에서 면접 등록 → 확정; 장소에 `010-1234-5678` 넣어 등록 | Pass | `data-status` SCHEDULED → CONFIRMED. 연락처 장소 등록 거부(면접 행 1개 그대로, 장소 "QA 본사 3층 회의실"만). 확정 시 SMS는 `templateKey common.interviewConsent.sms`, params는 `/ko/seeker/me` 경로뿐(E2E 서버 로그) |
| 9 | R-210 업로드 파일이 public/·.next 밖 | 업로드 후 저장 키·실제 경로 확인, 작업 트리 `public/`·`.next/` 전체에서 파일 uuid 검색, 정적 경로 요청 | Pass | 경로 `storage\private\intro-confirm\{면접id}\{uuid}.pdf`(웹 루트 밖), `public` 0건·`.next` 0건. `/storage/private/{key}`·`/{key}` 404. 저장소 `.gitignore:39 /storage/`(`git check-ignore` 확인) |
| 10 | R-210 형식·크기 제한(가짜 확장자 포함) | 실제 업로드 폼으로 10가지 | Pass | 텍스트를 `fake.pdf`, HTML을 `x.png`, `MZ` 바이트를 `x.jpg`, SVG → 모두 `FILE_TYPE`; 빈 파일 `FILE_EMPTY`; 5MB+1 `FILE_TOO_LARGE`; 7MB는 서버 액션 본문 한도로 500(O-2); 거부 7건 뒤 저장 폴더 파일 수 변화 0. 정확히 5MB PDF·PNG 바이트를 `looks.pdf`로 → 바이트 기준으로 `.png` 키로 저장, 정상 PDF 저장 |
| 11 | R-210 유효 서명 URL 다운로드·감사 | "소개 확인서 열기" 버튼 → 다운로드, 같은 URL 재요청 | Pass | 200, 본문 `%PDF-1.4`, `Content-Type application/pdf`, `Content-Disposition attachment; filename="intro-confirm-{면접id}.pdf"`, `Cache-Control no-store`, `nosniff`, `CSP sandbox; default-src 'none'`. PII_VIEW(`fields:["introConfirmFile"]`, actor = 직원) 요청마다 1행 |
| 12 | R-210 5분 만료 403 | ① 실제 키로 발급 시각을 옮긴 토큰 ② UI로 받은 링크를 실제로 기다림 | Pass | ① 발급 299초 전 200, 300초 전 403, 301초 전 403, 1시간 전 403. ② 0초 200, 290초 200, **302초 403**. 단위 시험(`signedUrl.test.ts` 시계 주입, `route.test.ts`)도 통과 |
| 13 | R-210 변조 403 | 받은 토큰의 서명 한 글자 변경, 페이로드 `u`·`e`(+1일)·`k` 변경(서명 그대로), 서명 없음, 형식 아님 | Pass | 6가지 모두 403. 남의 직원 id로 서명한 토큰을 이 직원이 사용 → 403 |
| 14 | R-210 다른 직원·권한 없는 역할 403, 세션 없음 401 | 같은 유효 토큰을 세션별로 요청 | Pass | 다른 STAFF_PLACEMENT 403(그 직원에게 발급한 토큰은 200), ADMIN(남의 토큰) 403, STAFF_VISA 403, 기업 401, 구직자 401, 세션 없음 401(만료 토큰도 401 — 권한 먼저 확인). STAFF_VISA가 URL 발급 액션을 재전송 → `FORBIDDEN`·URL 없음, 추천 상세 화면은 권한 안내만(업로드 폼 0) |
| 15 | R-210 경로 이탈 시도 | 실제 HASH_KEY로 서명한 페이로드 `k`: `../../.env`, `intro-confirm/{id}/../../../.env`, `C:/Windows/win.ini`, 다른 purpose; URL `/api/files/..%2F..%2F.env`, `/api/files/%2e%2e/%2e%2e/.env`; 모양은 맞지만 없는 파일 | Pass | 서명이 맞아도 키 형식 검사로 403 ×4, URL 이탈 403·404(파일 내용 없음), 없는 파일 404 |
| 16 | R-211 동의 전 기업 화면·API(HTML·RSC)에 실명·연락처 0 | 면접 4건(확정 iv1·iv2·iv3, 일정 iv4) + 다른 회사 확정 면접 1건 → 두 기업으로 `/ko/employer/requests` HTML, 같은 경로 `RSC: 1`, `/api/employer/requests` | Pass | 두 기업 모두 실명 HTML 0·RSC 0·API 0, 구직자 전화 숫자·숨김 이메일 0, 전화·이메일 정규식 0, 원본 publicId 0(블라인드 id만). 상태 표시 확정 3건 PENDING, 일정 1건 NOT_ASKED |
| 17 | R-211 동의 후 해당 기업·해당 확정 면접에만 실명 | 구직자가 `/ko/seeker/me`에서 iv1·iv3 동의 → 두 기업 다시 조회; 이어서 다른 회사 면접에도 동의시킨 뒤 조회 | Pass | 기업 A: iv1·iv3만 GIVEN·실명, iv2(동의 없음) PENDING, iv4(일정) NOT_ASKED; API `disclosure`는 `{"legalName":…}` 키 하나뿐. 기업 B: 0회. B 면접에 동의한 뒤에는 B의 그 면접만 GIVEN, A 화면 변화 없음 |
| 18 | R-211 취소된 면접에는 없음 | 동의된 iv3을 직원이 "면접 취소" | Pass | iv3 NOT_ASKED·실명 없음, API 실명 1회(iv1만). 취소된 iv3에 동의 액션 재전송 → `INTERVIEW_STATE` |
| 19 | R-211 철회 즉시 사라짐, 거부 | 구직자 화면에서 iv1 "동의 철회" → 확인 대화상자; iv2 "동의하지 않음" | Pass | 철회 직후 기업 HTML·RSC·API 실명 0, iv1 PENDING. AuditLog `CONSENT_REVOKE` meta `{type:THIRD_PARTY_INTERVIEW, interviewId:iv1, reason:"REVOKE", versions:["v1"], count:1}`, Consent `revokedAt` 설정(삭제 아님). iv2 → 기업 화면 NOT_GIVEN |
| 20 | R-211 연락처는 동의 후에도 0 | 동의 상태(17번)에서 16번과 같은 수집 | Pass | 실명은 나오지만 전화 숫자·이메일·정규식 탐지 모두 0. 직렬화기는 `legalNameEnc`만 select |
| 21 | R-211 PII_VIEW 감사 | 개발 DB AuditLog 조회 | Pass | 기업 PII_VIEW(`fields:["legalName"], viewer:"EMPLOYER"`)는 동의된 면접 3건(iv1 9행, iv3 3행, B 면접 3행)에만, 동의 없는 iv2 0행. 모든 행의 `meta.companyId` = 그 면접의 회사 |
| 22 | R-211 구직자 동의 화면에 회사명·장소 없음, 동의 기록 | 구직자 `/ko/seeker/me` HTML·동의 카드 텍스트; Consent 행 | Pass | 회사명·장소·공고 제목 0회. 카드 문구 "확정된 면접마다 따로 묻습니다 … 연락처는 제공하지 않습니다", 각 건은 일시·"제조업 · 서울특별시"만. Consent 행 `version v1, locale ko, ipHash 있음, agreedAt, interviewId`. 동의서 6개 언어 모두 [전문가 검토 필요] |
| 23 | R-211 동의 액션 변조 | 구직자 1의 실제 동의 요청을 재전송: 구직자 2 세션으로 구직자 1의 iv2, 구직자 1의 iv4(일정), 세션 없음 | Pass | 다른 구직자 `NOT_FOUND`, 일정 면접 `INTERVIEW_STATE`, 세션 없음 500(변경 없음, O-5); 활성 동의 행은 본인이 실제로 동의한 건만 |
| 24 | R-212 `/employer/requests` 동작 | 비로그인 페이지·API, 구직자 세션 API, 기업 세션 화면(면접 요청 1건 추가) | Pass | 비로그인 → `/ko/employer/login?next=/employer/requests`, API 401 `UNAUTHENTICATED`, 구직자 세션 API 403. 면접 요청 "후보 QSHFRM · 요청일 · 비자앤잡 확인 중", 추천 1건·면접 목록, "지원하기" 0 |
| 25 | R-212 `/seeker/me/recommended` 플래그 off·on (PC-13, SC-07) | 같은 구직자로 3870(off)·3871(`FEATURE_PUBLIC_JOBS`); 다른 비자 구직자; 비로그인 | Pass | off: "나에게 맞는 일자리" = 준비 중 + 상담 신청, 공고 링크 0, 본인 추천 건(업종·시·도·추천일·면접 일시·상태)은 표시, noindex. on: 비자·지역·업종 맞는 공고 카드(본인 공고 포함) + 본인 추천 건에 "일자리 보기" 링크. 다른 비자 구직자는 이 공고 0·"조건에 맞는 일자리가 없습니다". 회사명·장소 0, "지원하기" 0. 비로그인 → `/ko/seeker/login?next=/seeker/me/recommended` |
| 26 | R-216 STAFF_PLACEMENT VisaCase 목록·상세·액션 거부 | STAFF_VISA가 등록·수정한 실제 요청을 잡아 STAFF_PLACEMENT 세션으로 재전송; 세 화면 HTML·RSC | Pass | `/admin/visa-cases`, `/admin/visa-cases/{id}`, `?seekerId=` 모두 권한 안내(`admin-forbidden`)만, 표·상태·등록 폼 0, HTML·RSC에 사건 id 0. 등록 재전송·수정 재전송(FILED→CLOSED) 모두 `FORBIDDEN`, 사건 수 1·상태 FILED 그대로. STAFF_PLACEMENT의 구직자 상세에도 사건 id·수임료 0. lib `getVisaCase`도 assertCan(단위 시험 통과) |
| 27 | R-216 고유식별정보 필드 없음(BR-13) | 스키마 grep(passport·외국인등록·주민·arcNo 등), 폼 입력 이름 | Pass | VisaCase 열: id·seekerId·companyId·caseType·targetVisa·status·mandateSignedAt·fee·createdAt·updatedAt. 폼 입력 이름 `visaCaseId, caseType, targetVisa, status, companyId, mandateSignedAt, fee`. 스키마에서 해당 단어는 금지 주석 2줄뿐 |
| 28 | R-216 기본 CRUD·계약 권한 | STAFF_VISA 체류 사건 등록·수정, 계약 화면 역할별 | Pass | 등록 OPEN → 수정 FILED 저장, 목록에 표시. `/admin/placements` STAFF_PLACEMENT 화면 표시, STAFF_VISA 권한 안내. 삭제 기능 없음(단위 시험 "no delete function") |
| 29 | 회귀 R-206 기업 응답 연락처 0(새 `/api/employer/requests` 포함) | 하네스(`employerApiLeak.test.ts`) — 레지스트리에 `/api/employer/requests`와 실명 예외 `EMPLOYER_NAME_DISCLOSURE` 등록 확인; 실제 서버: 기본 서버 `/api/employer/requests`·페이지·RSC, 후보 서버 `/api/employer/candidates`·`/ko/employer/candidates` 페이지·RSC·`/api/employer/requests` | Pass | 단위 하네스 통과. 실서버 7개 응답 모두 200, 전화 0·이메일 0·구직자 전화 숫자 0·숨김 이메일 0 |
| 30 | "지원하기" 0, 6개 언어, 375 가로 스크롤 없음, 터치 44×44 | 6개 언어 × `/seeker/me`(동의 카드 있음)·`/seeker/me/recommended`·`/employer/requests` × 375·1280 × 플래그 off·on(72화면); 관리자 새 화면 7개 × 1280·375; `main` 안 링크·버튼·입력 크기 측정 | Pass | 72화면 모두 가로 넘침 0, 44px 미만 요소 0, 메시지 키 노출 0, "지원하기"/Apply 0, `<html lang>` 일치. 비한국어 화면의 한글은 직원 입력 데이터(공고 제목·직무·장소)뿐(O-6). 새 키 69개 5개 언어 누락 0·한국어 복사 0. 관리자 7화면 모두 200·넘침 0·44px 미만 0 |
| 31 | 3a3488f(P2b O-5) API `convertibleVisa` VisaType 밖 값 null | 단위 시험·E2E 실행 | Pass | `blindSeeker.test.ts`·`employerApiLeak.test.ts`·`statsMasking.test.ts` 포함 552 통과, E2E employer-candidates 통과 |
| 32 | 회귀 P2b 후보·통계, P2a 공고, P1e 관리자 + 검증 명령 7종 | E2E 전체 1회 + 위 명령 표 | Pass | E2E 260/260(employer-candidates·jobs-apply·admin-core·demand·consent-revoke·wizard 포함). lint·test·i18n:check·qa:static·build·E2E 종료 코드 0, typecheck는 저장소 2(사용자 `.next/types`)·작업 트리 0(O-1) |

## 판정불가 / 사람 확인 필요
없음. (O-3은 기준 밖 법무 확인 사항)

## 결함 목록 (Fail만)
없음.

## 관찰 / 기준 외 발견
| 번호 | 내용 | 재현·증거 | 영향 | 제안 |
|---|---|---|---|---|
| O-1 | 저장소 `pnpm typecheck` 실패(P2b O-1과 같음) | 오류 3건 모두 `.next/types/...(public)/employer/candidates`; 작업 트리 tsc 0 | 사용자 개발 환경에서만 빨갛게 보임 | 사용자가 `.next`를 지우거나 `next build`/`next dev` 한 번 실행 |
| O-2 | 5MB를 훨씬 넘는 파일(7MB)을 올리면 직원 화면이 "Application error: a server-side exception…"(500)으로 바뀜 | 추천 상세에서 7MB PDF 업로드 → 서버 액션 본문 한도(`SERVER_ACTION_BODY_LIMIT` 6mb) 초과, digest `1266046771@E394`. 파일은 저장 안 됨 | 기능·보안 영향 없음. 5MB+1~6MB는 `FILE_TOO_LARGE` 안내가 나오지만 6MB 초과는 오류 화면 | 업로드 전에 클라이언트에서 크기 확인해 같은 안내를 보이기 |
| O-3 | 동의서 "기간: 이 면접 건이 끝날 때까지"인데, 면접일이 지나고 결과(불합격·참석)를 기록해도 기업 화면에 실명이 계속 보임 | 동의한 확정 면접의 `scheduledAt`을 30일 전으로, `attended:true, result:REJECTED`로 바꾼 뒤 기업 API → 실명 그대로. 공개 조건은 `status=CONFIRMED` + 미철회 동의뿐 | 동의서 문구와 실제 제공 기간이 다름(PC-1 자체는 충족) | Gate 4 법무: 결과 기록·면접일 경과 시 공개 종료할지, 문구를 바꿀지 결정 |
| O-4 | `/admin/matching`의 "추천 전 면접 신청·요청"은 오래된 순 100건만 보여 줘서, 대기 건이 100건을 넘으면 새 요청이 화면에 나오지 않음 | 개발 DB RECEIVED 133건(SEEKER 115·EMPLOYER 18) → 새로 만든 요청 2건 모두 목록에 없음, 제목 "(100건)" | 운영에서 적체가 생기면 새 요청을 놓칠 수 있음(현재 개발 DB는 E2E 누적 때문) | 전체 건수 표시·페이지 나눔 또는 공고·기업별 필터 |
| O-5 | 세션 없이 구직자 동의 액션을 호출하면 500, 기업·구직자 세션으로 `/api/files/*`는 403이 아닌 401 | 재전송 결과 | 데이터 노출·변경 없음. 401/403 구분은 "직원 2FA 세션 없음 = 401" 설계대로 | 기록만 |
| O-6 | 비한국어 기업·구직자 화면에 직원이 입력한 한국어(공고 제목·직무·면접 장소)가 그대로 나옴 | en·vi·ru·zh·uz `/employer/requests`·`/seeker/me/recommended` | P2a 공고와 같은 데이터 성격(번역 키 누락 아님) | 기록만 |
| O-7 | 시험 행이 개발 DB에 남음(삭제하지 않음) | 기업 5곳·공고 6건(DRAFT 1)·구직자 약 20명·추천 6건·면접 약 12건·동의·체류 사건 3건·면접 요청 6건·직원 계정·감사 행. 개발 DB RECEIVED 면접 요청이 늘어 O-4가 더 드러남 | 개발 서버 매칭·통계 화면에 시험 데이터가 보임 | 정리 스크립트 또는 E2E 전용 DB(이전 관찰과 같음) |
