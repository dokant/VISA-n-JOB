# QA 보고서 — Phase P2c / run 2 (재확인·회귀)

- 대상: 커밋 04a4fbf(D-1~D-3, Q-25, O-2/O-4/O-5, 면접 취소 확인 대화상자), 94d62ed(admin-matching E2E 본문 한도 우회). HEAD 94d62ed
- 기준 문서: PRD R-209·R-210·R-211·R-212·R-216(+ 회귀 R-206); PLAN `### P2c`; DECISIONS Q-25·PC-1; run 1 보고서(O-2·O-4·O-5), 기준 검토 run 1(D-1~D-3, O-1·O-4); CLAUDE.md(44px, 6개 언어)
- 일시: 2026-11-17 18:35 ~ 19:35 (KST)
- 환경: Windows 11, 개발 DB(127.0.0.1:54320). 포트 3000은 시작·끝 모두 LISTEN 없음(건드리지 않음). lint·typecheck·test·i18n:check·qa:static은 저장소에서 `corepack pnpm` 순차. build·E2E·직접 시험은 `git archive 94d62ed`를 스크래치패드에 풀어(`node_modules`는 저장소 것을 junction으로 읽기만, `.env` 복사) **pnpm/corepack 없이** `node node_modules/next/dist/bin/next build`, `next start` 4개(3880 기본, 3881 DEMAND_MAP, 3882 PUBLIC_JOBS, 3883 EMPLOYER_CANDIDATES, 모두 `TRUST_PROXY=true`)를 직접 띄운 뒤 `E2E_PORT=3880 node node_modules/@playwright/test/cli.js test`(복사본 `node_modules/.bin`을 PATH 앞에, 서버 재사용). 직접 시험은 같은 서버에 복사본 안 스크래치 스펙(`qa_r2_*.spec.ts`, workers 1). 직원은 실제 로그인 → TOTP, 기업은 실제 이메일 로그인, 구직자는 실제 OTP 로그인, 결과·취소는 관리자 화면 폼으로 기록.
- 서버 액션 직접 호출: 빌드 산출물 `server-reference-manifest.json`의 액션 id 50개를 클라이언트 청크의 `createServerReference(…, "이름")`으로 이름과 대응시킨 뒤 `Next-Action` 헤더 + 본문(인자 0개 `[]`, 1개 `[{locale:"ko"}]`, (prev, FormData)형은 multipart `0=["$undefined","$K1"]`)으로 전송.
- 빌드 1회차는 `next/font` Google 글꼴 받기 실패(`Cannot read properties of null`, 네트워크)로 종료 코드 1, 곧바로 재실행 성공(코드 문제 아님).
- 저장소 node_modules 상태: 시작 `corepack pnpm test` 기준선 1회차 **1 failed / 558 passed**(아래 F-1), 같은 명령 재실행 2회 중 1회 통과·1회 같은 실패. 정리 때 junction을 PowerShell `(Get-Item …).Delete()`로 먼저 끊고(`Test-Path` False) 확인: `.pnpm` 디렉터리 915개, `next`·`@playwright/test`·`vitest`·`tsx`·`@prisma/client`·`.bin` 있음. 그 뒤 작업 트리 삭제. 끝 `corepack pnpm test` **75 files / 559 tests 통과**.
- 정리: 서버 4개 종료(3880~3883 LISTEN 0), junction 해제 후 작업 트리(업로드 시험 파일이 있던 작업 트리 `storage/private` 포함)·스크립트·로그 삭제. 저장소에 `storage/` 폴더 없음. 증거 스크린샷은 스크래치패드 `shots/qa_r2_*.png`(기존 `p2c_*` 덮어쓰지 않음). `.env` 값 출력 없음, 외부 전송 없음, 개발 DB 행 삭제 없음, `.claude/` 건드리지 않음. `git status`: `.workflow/` 기존 변경 4개, 미추적 `.claude/`·`.workflow/qa/`.

## 결과 요약
- 통과: 18 / 전체: 21 (통과율 86%), 판정불가 0
- 필수 항목 실패: 3개 (항목 15·16·21 — 원인은 모두 F-1 하나)
- 결함: F-1
- 관찰: O-1 ~ O-6

## 검증 명령 (순차 실행)
| 명령 | 위치 | 종료 코드 | 결과 |
|---|---|---|---|
| `corepack pnpm lint` | 저장소 | 0 | 오류·경고 없음 |
| `corepack pnpm typecheck` | 저장소 | **2** | 오류 3건 모두 사용자 `.next/types/app/[locale]/(public)/employer/candidates/page.ts`·`.next/types/validator.ts`(옛 경로) — run 1 O-1과 같음 |
| `tsc --noEmit` | 작업 트리(94d62ed, `.next` 없는 상태) | 0 | 오류 없음 → 코드 자체는 타입 통과 |
| `corepack pnpm test` | 저장소 | **1 / 0 (간헐)** | 75 files / 559 tests. 전체 실행 4회 중 2회 `employerApiLeak.test.ts > WO15-02 / R-206 …` 실패: `AuditInputError: meta.seekerId looks like contact information` (`src/lib/audit.ts:71` ← `src/lib/recommendations/ledger.ts:66` ← `matchingFixtures.ts:73`). 이 파일만 8회 반복 시 8/8 통과(무작위 id에 달림, F-1). 끝 확인 1회 통과 |
| `corepack pnpm i18n:check` | 저장소 | 0 | ko 1155 keys(run 1 1154 → +1 `nameState.ENDED`, `recommendedAtWithPosting` 추가·`posting` 대체), 6 locales, errors 0 |
| `corepack pnpm qa:static` | 저장소 | 0 | errors 0, warnings 17(run 1과 같은 수) |
| `next build` | 작업 트리 | 0 (재시도) | 1회차 Google 글꼴 네트워크 실패, 2회차 성공. `ƒ /admin/matching` 등 run 1과 같은 경로 |
| `E2E_PORT=3880 playwright test --reporter=line` (전체) | 작업 트리 | 0 | **262 passed (2.5m)**, 실패·flaky 0 (run 1 260 → +2: Q-25, 본문 한도 우회) |
| `auth.spec.ts:48 --project=mobile-375 --repeat-each=3` | 작업 트리 | 0 | 3 passed (E2E 간헐 실패는 없었으나 지시대로 확인) |

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| 1 | Q-25 결과 대기(PENDING)·참석만 기록 시 실명 유지 | 한 추천에 확정 면접 6건(H·R·N·P·C·X), 구직자가 `/ko/seeker/me`에서 H·R·N·P·C 동의 → 관리자 결과 폼으로 P에 참석+결과 대기, 이어 참석+결과 미입력 | Pass | 두 경우 모두 기업 API `P=GIVEN+name`, HTML·RSC·API 이름 수 변화 없음(10·5·5). DB `{attended:true,result:"PENDING"}` / `{attended:true,result:null}` |
| 2 | Q-25 HIRED·REJECTED·NO_SHOW 기록 → HTML·RSC·API에서 즉시 사라짐, 종료 안내, 이후 PII_VIEW 증가 없음 | 관리자 화면에서 H=채용, R=불합격, N=불참+노쇼 저장 직후 기업 `/ko/employer/requests` HTML, 같은 경로 `RSC: 1`, `/api/employer/requests`; 각 건 PII_VIEW 행 수를 기록 전·재조회 3회 후 비교 | Pass | 한 건마다 HTML 2·RSC 1·API 1씩 줄어듦(10→8→6→4), 해당 건 `nameState ENDED`, `disclosure null`, 카드 안 실명 요소 0, 안내 "면접 건이 종료되어 실명을 더 이상 표시하지 않습니다." PII_VIEW H 10→10, R 19→19, N 28→28 |
| 3 | Q-25 확정 후 취소 → ENDED | C를 관리자 확인 대화상자로 취소 | Pass | 기업 API `C=ENDED`, 이름 수 1(P만), PII_VIEW C 37→37. 관리자 항목 `CANCELLED:NOT_ASKED` |
| 4 | Q-25 결과 기록 뒤 구직자가 다시 동의해도 기업에 아무것도 안 나감 | ① 동의 없던 X에 불합격 기록 → 구직자 화면에 남은 "동의" 버튼 클릭 ② H를 "동의 철회" → 다시 "동의" | Pass | ① Consent 행 1개 생김, 기업 `X=ENDED`, 이름 수 1 그대로, PII_VIEW X 0→0 ② H `ENDED` 유지, PII_VIEW H 10→10. 구직자 화면 관찰은 O-1 |
| 5 | O-2 5MB+1 파일 즉시 거부 | 추천 상세에서 5MB+1 PDF 선택(요청 감시) | Pass | 선택 즉시 `FILE_TOO_LARGE` "파일이 너무 큽니다. 5MB 이하로 올려 주세요.", 올리기 버튼 disabled, 서버 액션 요청 0건(비활성 버튼 강제 클릭도 0건). 작은 파일로 바꾸면 오류 사라지고 버튼 활성. 안내 문구 "PDF·JPG·PNG, 5MB 이하." |
| 6 | O-2 클라이언트 우회 한도 초과 → 500 화면 없이 UPLOAD_FAILED, 저장 0 | 정상 작은 PDF를 고른 뒤 브라우저가 실제로 보내는 요청 본문을 `page.route`로 파일 부분만 키워 전송: 5.5MB, 한도(6,291,456)+1KB, 7MB, 20MB | Pass | 5.5MB: 서버 바이트 검사 `FILE_TOO_LARGE`(HTTP 200). 한도+1KB·7MB·20MB: HTTP 500(서버 로그 `Body exceeded 6291456 limit`, statusCode 413)이지만 화면은 `UPLOAD_FAILED` 한 줄, "Application error" 0, 면접 항목 그대로. 4회 모두 저장 폴더 파일 0→0, DB `introConfirmFile null`. `SERVER_ACTION_BODY_LIMIT = INTRO_CONFIRM_MAX_BYTES + 1MB`(5,242,880 + 1,048,576) 파생 확인 |
| 7 | R-210 회귀: 정확히 5MB 저장 | 5,242,880바이트 PDF 업로드 | Pass | 오류 0, `intro-uploaded` 표시, 저장 파일 1, 키 `intro-confirm/{면접id}/{uuid}.pdf` |
| 8 | O-5 구직자 서버 액션 4개 세션 없음·다른 역할 → 정리된 거부 | `changeConsent`·`answerInterviewConsent`·`saveStaySettings`·`saveRegistrationStep`을 세션 없음, 기업 세션, ADMIN(2FA 완료) 세션, 실제 구직자(대조)로 호출 | Pass | 세션 없음 4개 모두 200 `{"ok":false,"code":"UNAUTHENTICATED"}`, 기업·ADMIN 4개 모두 200 `FORBIDDEN`, 구직자 대조 `VALIDATION`(빈 입력). 5xx 0 |
| 9 | O-5 기업·관리자·jobs 액션 포함 전체 세션 없이 호출 시 500 없음 | 빌드의 서버 액션 50개 전부 세션 없이 호출; 교차 역할(구직자 → 기업·관리자·jobs 7개, 기업 → 관리자 3개·jobs) | Pass | **50개 중 5xx 0**. 관리자 액션 31개(로그인·TOTP 포함) 307 → `/admin/login`; `requestCandidateInterviewAction`·`signContractAction`·`submitJobRequestAction`·`requestInterestAction` `UNAUTHENTICATED`; 공개 액션은 입력 검증 코드(`VALIDATION`·`INVALID_PHONE`·`OTP_INVALID`·`INVALID_CREDENTIALS`·`status:"invalid"`·`notReady`). 교차 역할: 구직자 → 기업 액션 `FORBIDDEN`, 관리자 액션 307, 기업 → `requestInterestAction` `FORBIDDEN` |
| 10 | O-4 매칭 대기 목록 최신순·페이지·건수, 새 요청 1페이지 | 새 면접 요청 생성 → STAFF_PLACEMENT `/admin/matching`; DB `RECEIVED` 정렬(createdAt desc, id asc)과 화면 `data-interest-id` 순서 비교, 다음·이전, `?page=999/0/-1/abc/1.5`, 전 페이지 합 | Pass | DB 164건 = 제목 "(164건)", "최신순 · 전체 164건 중 1–100건 표시", 1페이지 100행 = DB 앞 100건과 순서 일치, 첫 행이 새 요청. "다음 100건"(81×44) → `?page=2` 64행 = DB 101~164, 겹침 0, "페이지 2 / 2", 이전 → 1페이지. 999 → 마지막 페이지, 0·-1·abc·1.5 → 1페이지(오류 없음). 전 페이지 164행·중복 0·DB 순서와 완전 일치 |
| 11 | 면접 취소 확인 대화상자: 닫기 시 유지, 확인 시 CANCELLED | 추천 상세 "면접 취소" → 아래 "닫기", Esc, 오른쪽 위 닫기(X) 각각 → 마지막에 "면접 취소" 확인 | Pass | 대화상자 문구 "면접을 취소할까요? 취소한 면접은 되돌릴 수 없습니다 … 기업 화면의 실명 표시도 이 면접 건에서는 끝납니다." 세 가지 닫기 후 DB·화면 모두 CONFIRMED. 확인 후 `data-status CANCELLED`, DB CANCELLED. 버튼 크기 닫기 76×51, 면접 취소 106×51, X 43×43(O-3) |
| 12 | D-1 새 관리자 폼 간격(필드 간 22px, 라벨-입력 7px) | 실제 화면 `getComputedStyle` row/column-gap + 라벨 아래 → 입력 위 거리 측정: 면접 등록·결과·소개 확인서·추천 실행(대화상자)·계약 등록·체류 사건 등록·수정 | Pass | 모든 폼 `form row=22px`, 필드 그리드 22px/22px, 라벨 묶음 7px, 라벨→입력 실측 7px. 소개 확인서 폼(라벨+입력 한 묶음)은 7px. 계약 수정 폼은 개발 DB에 계약이 없어 화면에 없었음(소스 `placement-forms.tsx:127` `gap-5.5`, 공용 Fields 같은 컴포넌트) |
| 13 | D-2 구직자 "추천 일자리" 6개 언어 | 3882(FEATURE_PUBLIC_JOBS) 서버에서 같은 구직자로 6개 언어 `/seeker/me/recommended` | Pass | 6개 언어 모두 `seeker.recommended.postingsNote` 문구가 화면에 그대로 표시, "블라인드 공고" 0. ko "내 비자로 가능하고 희망 지역·업종에 맞는 추천 일자리입니다. …". 플래그 off 서버에서는 이 안내 자체가 없음(공고 영역 ComingSoon). 남은 "블라인드 정보"(`mineLead`)는 구직자 자신의 프로필 설명으로 D-2 대상 아님 |
| 14 | D-3 "추천일 · 공고" 한 ICU 키, 언어별 구분자 | 6개 언어 `/employer/requests`의 해당 줄을 `recommendedAtWithPosting` 템플릿 정규식과 대조 | Pass | 6개 모두 일치. 예: ko "추천일 2026. 11. 17. · 공고: …", zh "推荐日 2026年11月17日 · 职位：…"(전각 콜론), vi "Ngày giới thiệu 17 thg 11, 2026 · Tin tuyển dụng: …" |
| 15 | R-209 추천 실행 → 원장 1행 + RECOMMENDATION_CREATE 감사 (적합 구직자 누구에게나) | E2E·직접 시험의 정상 추천 + **id 문자열 탐침**: 개발 DB id 5,371개를 연락처 탐지기(`hasContacts`)로 검사한 뒤, 탐지되는 모양의 id를 가진 적합 구직자·회사를 만들어 실제 화면에서 추천 | **Fail** | 일반 id는 정상(Q-25 시험 원장 1행 등). 그러나 `meta.seekerId`가 탐지되는 구직자는 추천 대화상자 확인 시 직원 화면 "Application error: a server-side exception…"(digest 2873994217), 원장 0행. 회사 id가 탐지되면 `createRecommendation` 자체가 `meta.companyId looks like contact information`. → F-1 |
| 16 | R-211 철회 시 즉시 사라짐 (모든 면접 건) | 같은 탐침: 탐지되는 모양의 면접 id로 확정 면접 → 구직자 동의 → "동의 철회" 확인 | **Fail** | 구직자 화면 "Application error"(digest 323311558), 서버 `meta.interviewId looks like contact information`, **활성 동의 1행 그대로**(철회 안 됨). → F-1 |
| 17 | 회귀 R-206 기업 응답 연락처 0 | 실서버 7개 응답(기본 서버 `/api/employer/requests`·페이지 HTML·RSC, 후보 서버 `/api/employer/requests`·`/api/employer/candidates`·`/ko/employer/candidates` HTML·RSC) × 1280·375; 단위 하네스 | Pass | 14개 응답 모두 200, 전화 정규식 0·이메일 정규식 0·구직자 전화 숫자 0·숨김 이메일 0. 실명은 동의된 진행 중 면접 1건에만(API·RSC 1, HTML 2), 후보 화면 0. 단위 하네스(Q-25 종료 건 포함)는 F-1 때문에 간헐 실패 외에 단정 통과 |
| 18 | 새 화면 6개 언어·375 가로 넘침·터치 44px | 6개 언어 × `/employer/requests`(ENDED 건 + 진행 건)·`/seeker/me`(결과 기록 뒤) × 1280·375 | Pass | 24화면 넘침 0, `main` 안 44px 미만 0, `<html lang>` 일치, 메시지 키 노출 0, ENDED 문구 = 각 언어 메시지 |
| 19 | 회귀 R-209~R-212·R-216 핵심 | E2E admin-matching(추천·면접·확정·업로드·서명 다운로드·취소 대화상자, STAFF_PLACEMENT 체류 사건 거부), employer-requests(동의 전후·철회·다른 회사·Q-25), seeker-recommended; 직접 시험 1~11 | Pass | E2E 해당 스펙 전부 두 프로젝트 통과. 직접 시험에서도 추천 상세·결과 폼·동의/철회 정상(F-1 해당 id 제외) |
| 20 | 회귀 P2b·P2a·P1 핵심 | E2E 전체 | Pass | 262/262 (employer-candidates·jobs-apply·admin-core·consent-revoke·wizard·auth 포함) |
| 21 | 검증 명령 7종 통과 | 위 명령 표 | **Fail** | lint·i18n:check·qa:static·build(재시도)·E2E 0. `pnpm test` 전체 4회 중 2회 실패(F-1이 무작위 id에서 드러남). typecheck 저장소 2는 run 1 O-1과 같은 사용자 `.next` 문제(작업 트리 tsc 0) |

## 판정불가 / 사람 확인 필요
없음.

## 결함 목록 (Fail만)
| 번호 | 요구사항 | 재현 방법 | 기대 | 실제 | 위치 |
|---|---|---|---|---|---|
| F-1 | R-209, R-211(철회), 검증 명령 `pnpm test` | ① 개발 DB에서 연락처 탐지기 오탐 id 확인: SeekerProfile 2,672개 중 3개(`cmwj193vm000a6mewt3fb51zr`, `cmwjvn6fb00096mac00dcf12p`, `cmwkfhdue000f6mekb7fb506i`), JobPosting 1개(`cmwk437fb00ri6mh8j1nkpmt8`), User 3개 — 모두 `MESSENGER_ID`(`fb` + 숫자)로 판정. ② 이런 id의 적합 구직자를 공고 적합 목록에서 "추천 실행" ③ 이런 id의 회사로 추천 생성 ④ 이런 id의 확정 면접에 동의 후 "동의 철회" ⑤ `corepack pnpm test` 여러 번 | 추천은 원장 1행+감사로 기록, 철회는 즉시 반영. 감사 meta의 내부 id(cuid)는 연락처가 아님 | `writeAudit`의 `assertSafeMeta`가 meta 안 모든 문자열에 `hasContacts`를 적용해 cuid를 메신저 id로 오인, `AuditInputError` 던짐. ② 직원 화면 "Application error"(500), 원장 0 → **그 구직자는 영구히 추천 불가** ③ 그 회사·공고는 영구히 추천 불가 ④ 구직자 화면 "Application error", **동의가 철회되지 않음**(기업에 실명 계속 제공) ⑤ 단위 시험이 무작위 id에 따라 2/4 실패. 개발 DB 비율로 id 하나당 약 0.1%, 추천 한 건에 id 4개(seekerId·companyId·postingId·interestRequestId)가 들어가 건당 약 0.3~0.5% | `src/lib/recommendations/ledger.ts:66-77`(RECOMMENDATION_CREATE meta seekerId·companyId·postingId·interestRequestId), `src/lib/consent/thirdParty.ts:146-151`(CONSENT_REVOKE meta interviewId), `src/lib/serializers/interviewDisclosure.ts:102`(PII_VIEW meta companyId), 검사 `src/lib/audit.ts:69-72`. 같은 문제는 이미 `src/lib/admin/companies.ts:102` 주석("cuids can look like phone numbers to the audit meta contact check")에서 알려져 있었음. 수정 방향(참고): id 필드를 meta에서 빼고 entityId로만 두거나, 알려진 id 키는 cuid 형식 검사 후 연락처 검사 제외. 회귀 시험은 탐지되는 id를 고정값으로 넣는 단위 시험 권장 |

## 관찰 / 기준 외 발견
| 번호 | 내용 | 재현·증거 | 영향 | 제안 |
|---|---|---|---|---|
| O-1 | 결과가 기록된(종료된) 면접도 구직자 `/seeker/me` "면접 기업에 이름 제공" 카드에 그대로 남음. 동의한 건은 "동의함 + 동의 철회", 동의 안 한 건은 "응답 대기 + 동의 / 동의하지 않음" 버튼이 계속 보임. 종료 표시 없음(취소된 건은 목록에서 빠짐) | 항목 4; `listInterviewConsentRequests`가 `status CONFIRMED`만 거르고 result는 보지 않음. 스크린샷 `qa_r2_seeker_after_results_1280.png`, `qa_r2_seeker_me_after_result_375.png` | 혼란 정도 **중간**: 이미 끝난 면접에 "동의"를 누르게 유도되고, 눌러도 기업에 아무것도 안 가므로 구직자는 제공된 것으로 오해할 수 있음. "동의 철회"가 남는 것은 무해(이미 제공 종료). 개인정보 노출은 없음 | 결과 기록·취소된 건은 목록에서 빼거나 "면접이 끝나 이름 제공이 종료되었습니다"로 바꾸고 동의 버튼을 숨김(6개 언어) |
| O-2 | 기업 화면 ENDED 카드의 상태 배지는 여전히 "면접 확정" | `qa_r2_employer_requests_ko_375.png` | 경미(이름 칸 안내로 종료가 드러남) | 결과 기록 시 상태 표시를 "면접 종료" 등으로 |
| O-3 | 면접 취소 대화상자 오른쪽 위 닫기(X) 43×43 | 항목 11 측정 | 관리자 화면, 1px 모자람(CLAUDE.md 44px) — 공용 `DialogContent` 닫기 버튼이면 다른 대화상자도 같음 | 공용 닫기 버튼 `size-11` 확인 |
| O-4 | 날짜 표기 "2026. 11. 22. PM 6:58"(ko인데 "오후"가 아님) | 기업·구직자 화면 | 기준 검토 run 1 O-2와 같음 | 서버 ICU 데이터·로케일 전달 확인 |
| O-5 | 브라우저를 거치지 않은 직접 multipart 요청(인자 `0` 필드가 맨 앞, 8MB 파일)은 본문 한도 오류 없이 액션이 실행되어 `INVALID_INPUT`(200) | 직원 쿠키로 `page.request.post` | 저장 0, 500 없음 — 영향 없음(서버 바이트 검사가 최종 방어) | 기록만 |
| O-6 | 시험 행이 개발 DB에 남음(삭제하지 않음): 기업·회사 약 12, 구직자 약 15(탐지 id 구직자 1·회사 1·면접 1 포함), 추천·면접·동의·면접 요청·체류 사건 1·직원 계정·감사 행. 업로드 파일은 작업 트리와 함께 삭제됨(DB `introConfirmFile` 키 1건은 남음) | — | 개발 화면에 시험 데이터 보임 | 정리 스크립트 또는 E2E 전용 DB(이전 관찰과 같음) |

## run 1 관찰·기준 불일치 처리 확인
| run 1 항목 | 확인 결과 |
|---|---|
| QA O-2(6MB 초과 500 화면) | 해결(항목 5·6) |
| QA O-3 → Q-25(결과 기록 후 실명) | 해결(항목 1~4), 구직자 화면은 O-1 |
| QA O-4(오래된 순 100건) | 해결(항목 10) |
| QA O-5(세션 없는 구직자 액션 500) | 해결(항목 8·9) |
| 기준 D-1·D-2·D-3 | 해결(항목 12·13·14) |
| 기준 O-1(schema 주석 경로) | 해결: `schema.prisma:480` `src/lib/recommendations/interviews.ts` |
| 기준 O-3(본문 한도 따로 적힘) | 해결: 파생식 |
| 기준 O-4(취소 확인 없음) | 해결(항목 11) |
