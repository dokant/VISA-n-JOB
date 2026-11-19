# QA 보고서 — Phase P2c / run 3 (최종 재확인)

- 대상: 커밋 3603090(F-1 감사 meta id 예외, 종료 면접 표시 O-1/O-2, dialog X O-3, 다시 로그인 안내), 6af69eb(cuid 길이 21~32, E2E 구직자 세션 재사용, 시험 태그). HEAD 6af69eb
- 기준 문서: PRD R-209·R-210·R-211·R-212·R-216(+ 회귀 R-206); PLAN `### P2c`; DECISIONS Q-25·PC-1; run 2 보고서(F-1, O-1~O-6); CLAUDE.md(44px, 6개 언어)
- 일시: 2026-11-17 19:36 ~ 20:35 (KST)
- 환경: Windows 11, 개발 DB. 포트 3000은 시작·끝 모두 LISTEN 없음(건드리지 않음). lint·typecheck·test·i18n:check·qa:static은 저장소에서 `corepack pnpm` 순차 실행. build·E2E·직접 시험은 `git archive 6af69eb`를 스크래치패드 `qa_r3_wt`에 풀어 진행(`node_modules`는 저장소 것을 junction으로 읽기만 함, `.env` 복사, **pnpm/corepack 사용 안 함**). `node node_modules/next/dist/bin/next build`를 실행한 뒤 `next start` 4개를 띄움: 3890 기본, 3891 DEMAND_MAP, 3892 PUBLIC_JOBS, 3893 EMPLOYER_CANDIDATES, 모두 `TRUST_PROXY=true`. E2E는 `E2E_PORT=3890 node node_modules/@playwright/test/cli.js test`로 실행(복사본 `node_modules/.bin`을 PATH 앞에 둠).
- 직접 시험: 같은 서버에 복사본 안 스크래치 스펙(`qa_r3_f1.spec.ts`, `qa_r3_cm.spec.ts`, desktop-chromium, workers 1)을 돌림. 직원은 실제 로그인 → TOTP, 기업은 실제 이메일 로그인, 구직자는 실제 OTP 로그인(시험 헬퍼로 OTP 코드만 교체). 공고 검증·게시, 회사 검증, 추천, 면접 등록·확정·취소, 결과는 모두 관리자 화면 폼으로 처리.
- 연락처처럼 읽히는 id 고정값(새 행): 직원 ADMIN `cqar3stf0fb5123456789abcd`·`cqar3stf1fb5123456789abcd`, 리드 `cqar3led0fb…`, 공고 `cqar3pst0fb…`(회사는 run 2 QA가 남긴 22자 `cmqacd1b1ecdc8t3fb51zr`), 회사 `cqar3cmp0fb…`. 그 밖에 기업 계정 2개(기존 회사 2곳에 붙임)를 추가함. 모두 `hasContacts(id)=true`이고 cuid 형식이다.
- 1차 직접 시험은 시험 스크립트 문제로 중단됨. 적합 목록이 100행으로 제한되는데 F-4가 그 100행을 다 채워 대상 행이 화면에 없었음. 재실행 때는 직원 2FA 화면이 verify로 바뀌었고, 폼 초기화(O-3) 때문에 같은 단계가 다시 막힘. 스크립트를 고친 5차 실행에서 통과. 앞선 실행에서 이미 만들어진 추천(SA)과 회사 검증은 같은 결과로 이어서 확인함(해제 → 재검증).
- 정리: 서버 4개 종료(3890~3893 LISTEN 0). junction을 PowerShell `(Get-Item …).Delete()`로 먼저 끊고(`Test-Path` False) 저장소 `node_modules`를 확인함: `.pnpm` 915개, `next`·`@playwright/test`·`vitest`·`tsx`·`@prisma/client`·`.bin` 있음. 그 뒤 작업 트리와 로그를 삭제. 끝 `corepack pnpm test`: **76 files / 564 tests 통과**. 저장소에 `storage/` 없음. `.env` 값 출력 없음, 외부 전송 없음, 개발 DB 행 삭제 없음, `.claude/` 건드리지 않음. `git status`: `.workflow/` 기존 변경 4개, 미추적 `.claude/`·`.workflow/qa/`. 스크린샷은 스크래치패드 `shots/qa_r3_*.png` 14개(새 파일, 덮어쓰기 없음).

## 결과 요약
- 통과: 20 / 전체: 20 (통과율 100%), 판정불가 0
- 필수 항목 실패: 0
- 결함: 없음 (run 2 F-1 해결 확인)
- 관찰: O-1 ~ O-7

## 검증 명령 (순차 실행)
| 명령 | 위치 | 종료 코드 | 결과 |
|---|---|---|---|
| `corepack pnpm lint` | 저장소 | 0 | 오류·경고 없음 |
| `corepack pnpm typecheck` | 저장소 | **2** | 오류 3건. 모두 사용자 `.next/types/app/[locale]/(public)/employer/candidates/page.ts`·`.next/types/validator.ts`(옛 경로)에서 남. run 1·2와 같은 원인 |
| `tsc --noEmit` | 작업 트리(6af69eb, `.next` 없음) | 0 | 오류 없음 |
| `corepack pnpm test` × **5회 연속** | 저장소 | 0·0·0·0·0 | 5회 모두 76 files / 564 tests 통과. **간헐 실패 0**(run 2는 4회 중 2회 실패) |
| `corepack pnpm i18n:check` | 저장소 | 0 | ko 1159 keys(run 2 1155에서 +4: `errors.auth.unauthenticated`, `interviewConsent.state.ENDED`·`endedNote`, `interviews.status.ENDED`), 6 locales, errors 0 |
| `corepack pnpm qa:static` | 저장소 | 0 | errors 0, warnings 17(run 2와 같음) |
| `next build` | 작업 트리 | 0 | 1회에 성공 |
| `E2E_PORT=3890 playwright test --reporter=line` (전체 1회) | 작업 트리 | 0 | **262 passed (2.1m)**, 실패·flaky 0 |

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| 1 | F-1/R-209: 연락처처럼 읽히는 id의 구직자·회사·공고로 추천 실행 → 원장 1행 + RECOMMENDATION_CREATE | 직원(id `cqar3stf…fb…`)이 `/admin/matching/cqar3pst0fb…?scope=visa`에서 "추천 실행" → "추천 기록". 대상은 run 2 오판 구직자 `cmwkfhdue000f6mekb7fb506i`(25자)와 run 2 QA 구직자 `cmqaf1bd09e05dt3fb51zr`·`cmqa8687794803t3fb51zr`(22자), 회사는 22자 `cmqacd1b…`, 공고는 25자 `cqar3pst0fb…` | Pass | 3명 모두 행에 "already-recommended" 링크 표시, "Application error" 0, 원장 3행. 감사 meta 예: `{"seekerId":"cmwkfhdue000f6mekb7fb506i","companyId":"cmqacd1b1ecdc8t3fb51zr","postingId":"cqar3pst0fb5123456789abcd","interestRequestId":null,"hasNote":false}`. 서버 로그 `AuditInputError` 0 |
| 2 | F-1: 연락처처럼 읽히는 직원·리드 id가 meta에 들어가는 공고 게시 | 같은 직원으로 `/admin/postings/cqar3pst0fb…`에서 검증 → 게시 | Pass | `posting-status=PUBLISHED`, POSTING_PUBLISH meta `{"leadId":"cqar3led0fb5123456789abcd","verifiedBy":"cqar3stf0fb5123456789abcd"}` |
| 3 | F-1: 회사 목록·검증 성공(500 없음) | `/admin/companies` 열기, 25자 연락처형 id 회사 `cqar3cmp0fb…`를 검증(재실행 때는 해제 → 검증) | Pass | HTTP 200, "Application error" 0. PII_VIEW LIST meta `companyIds` 100개 안에 `cqar3cmp0fb…` 포함(3회 모두). COMPANY_VERIFY `VERIFY`/`UNVERIFY` 기록, DB `verified=true`. 22자 회사는 최신 100개 밖이라 이 목록에는 나오지 않음(O-5) |
| 4 | F-1/R-211: run 2에서 철회가 안 되던 면접 `cmqabd73ad02cet3fb51zr`(활성 동의가 남아 있던 건) → 실명 → 철회 즉시 사라짐 | 해당 구직자로 실제 로그인(375): 처음 상태 AGREED, 기업 GIVEN → "동의 철회" → 확인. 다시 "동의" → "동의 철회"를 2회 반복 | Pass | 2회 모두 철회 전 GIVEN에 실명 일치, 철회 뒤 기업 `PENDING`, HTML·API에 이름 없음, 구직자 화면 오류 0. CONSENT_REVOKE 2행 meta `interviewId:"cmqabd73ad02cet3fb51zr"`. 끝 상태 활성 동의 0 |
| 5 | F-1: 22자 회사·구직자의 새 면접 동의 → 기업 실명(PII_VIEW meta companyId) → 철회 | 추천 상세에서 면접 등록·확정 → 구직자 `cmqaf1bd…`가 `/ko/seeker/me`에서 동의 → 기업(22자 회사) `/ko/employer/requests` → 철회 | Pass | GIVEN에 실명 일치. PII_VIEW 1행 meta `companyId:"cmqacd1b1ecdc8t3fb51zr"`. 철회 뒤 HTML·API·RSC 모두 이름 없음. CONSENT_REVOKE meta `interviewId` 기록 |
| 6 | F-1: run 2 오판 id 7건(구직자 3, 공고 1, User 3) + 이후 생긴 오판 id | 개발 DB 전체 id를 `hasContacts`로 다시 훑음. 오판 id는 SeekerProfile 5, JobPosting 1, User 5, Company 1, Interview 1, Consent 2개, cuid 형식이 아닌 id 0개. 그 오판 id들을 각 meta 모양(추천 meta, `verifiedBy`, CONSENT_REVOKE, `companyIds`)으로 `assertSafeMeta`에 넣음 | Pass | 모든 조합 통과(예외 없음). 실서버로 추천까지 간 것은 항목 1의 3명. 나머지는 화면에 나오지 않음: `cmwj193vm…`은 적합 목록 100행 제한 밖, `cmwjvn6fb…`는 BLOCKED로 부적합, 공고 `cmwk437fb…`는 DRAFT, User 5개는 모두 구직자라 meta에 들어가는 곳이 없음. 직원 id 경로(`verifiedBy`·actor)는 연락처형 직원 계정으로 실서버에서 확인(항목 2) |
| 7 | F-1 반대 방향: 일반 문자열 경로의 연락처는 여전히 막힘 | 실서버: 추천 메모 "연락처 010-2345-6789 로 연락", 면접 장소 "본사 회의실 010-2345-6789", 후보 필터 `?visa=010-2345-6789`(3893, API·페이지). 단위: `assertSafeMeta`에 id가 아닌 키의 cuid, id 키 아래의 전화·이메일·대문자·공백 포함 값, `filters.visa` 전화를 넣음 | Pass | 메모: 대화상자에 "메모에 전화번호·이메일 같은 연락처를 적지 마세요." 표시, 원장 0. 장소: `PLACE_HAS_CONTACT`, 면접 0. 필터: 감사 행 0, 연락처가 기록되지 않음(다만 500 응답, O-2). 단위: 해당 입력 모두 `looks like contact information` 예외. `reason`에 넣은 cuid도 예외. 이번 실행의 감사 16행 중 전화 모양 0 |
| 8 | `pnpm test` 간헐 실패 해소 | 저장소에서 5회 연속 실행 | Pass | 5/5 통과(564 tests) |
| 9 | O-1 종료 면접 구직자 표시: "면접 종료" 배지, 안내, 버튼 0, 6개 언어 | 항목 5 면접을 다시 동의한 뒤 관리자 결과 폼에서 참석 + 불합격 저장 → `/{ko,en,vi,ru,zh,uz}/seeker/me` | Pass | 6개 언어 모두 `data-state=ENDED`, 배지 = `seeker.me.interviewConsent.state.ENDED`, 안내 = `endedNote`, 버튼 0, `<html lang>` 일치. 스크린샷 `qa_r3_seeker_ended_{ko,ru}_1280.png`, `qa_r3_seeker_ended_ko_375.png` |
| 10 | 확정 후 취소된 면접도 구직자에게 ENDED | 다른 추천(`cmwkfhdue…`)에서 면접 등록 → 확정 → 관리자 확인 대화상자로 취소 → 해당 구직자 로그인 | Pass | `data-state=ENDED`, 버튼 0, 문구 "면접 종료 / 면접이 끝나 이 면접 건의 이름 제공도 끝났습니다. 더 답할 필요가 없습니다." |
| 11 | O-2 기업 배지 "면접 종료", 6개 언어 | 같은 면접을 `/{6개 언어}/employer/requests`에서 확인 | Pass | 6개 언어 모두 `data-status=ENDED`, 배지 = `employer.requests.interviews.status.ENDED`(ko "면접 종료"), "면접 확정" 문구 0, 이름 칸 = `nameState.ENDED`, 페이지에 실명 없음. 스크린샷 `qa_r3_employer_ended_{ko,ru}_1280.png`, `_ko_375.png` |
| 12 | 375 가로 넘침 없음 | 구직자 `/ko/seeker/me`, 기업 `/ko/employer/requests`를 375 폭으로 엶 | Pass | 두 화면 모두 `scrollWidth` 375 |
| 13 | O-3 dialog 닫기(X) 44px 이상(열자마자·애니메이션 후) | 구직자 "동의 철회" 대화상자의 닫기 버튼 `boundingBox`: 보이는 즉시 1회, 700ms 뒤 1회. 1280 1번, 375 2번 | Pass | 1280: 47.51×47.51 → 48×48. 375: 47.39×47.39 → 48×48, 47.51 → 48. 스크린샷 `qa_r3_revoke_dialog_{1280,375}.png` |
| 14 | UNAUTHENTICATED → "다시 로그인해 주세요." (/me) | 로그인한 화면에서 쿠키를 지운 뒤 (a) 면접 "동의" (b) 동의 내역 "동의 철회" → "철회하기" (c) `/ko/seeker/me/stay` 저장 | Pass | (a) 알림 "다시 로그인해 주세요.", 상태 PENDING 유지 (b) 목록 알림 "다시 로그인해 주세요.", DB BLIND_PROFILE 활성 유지(1280·375 둘 다 확인). 단 알림이 열린 대화상자 뒤에 가려짐(O-1) (c) `stay-saved` "다시 로그인해 주세요." 스크린샷 `qa_r3_unauth_{interview,consents,stay}_*.png` |
| 15 | UNAUTHENTICATED → "다시 로그인해 주세요." (위저드) | 새 번호로 `/ko/seeker/register` Step 0 인증 → Step 1 입력 → 쿠키 삭제 → "다음" | Pass | 같은 URL에 머물고 알림 "다시 로그인해 주세요." 표시. `qa_r3_unauth_wizard_1280.png` |
| 16 | Q-25 결과 기록 시 실명 종료 | 항목 9의 결과 기록 전후로 기업 화면 확인. E2E `employer-requests` Q-25(결과 대기 → 불합격) | Pass | 결과 기록 뒤 HTML·API에 이름 없음, `nameState ENDED`. E2E 두 프로젝트 통과 |
| 17 | 회귀 R-206 기업 응답 연락처 0 | 기업 2곳 × `/api/employer/requests`·페이지 HTML·RSC, 후보 서버(3893) `/api/employer/candidates`·HTML·RSC를 전화 정규식, 이메일 정규식, 시험 구직자 전화번호(4명)로 검사 | Pass | 9개 응답 모두 200, 전화 0·이메일 0·구직자 번호 0 |
| 18 | 회귀 R-209~R-212·R-216 핵심 | E2E admin-matching(추천·면접·확정·업로드·서명 다운로드·취소 대화상자·본문 한도, STAFF_PLACEMENT 체류 사건 거부), employer-requests(동의 전후·철회·다른 회사·Q-25+O-1/O-2/O-3), seeker-recommended, 직접 시험 1~5·9~11 | Pass | 해당 스펙 모두 두 프로젝트에서 통과 |
| 19 | 회귀 P2b·P2a·P1 핵심 | E2E 전체 | Pass | 262/262(employer-candidates·jobs-apply·admin-core·consent-revoke·wizard·auth 포함) |
| 20 | 검증 명령 7종 통과 | 위 명령 표 | Pass | lint·test(5/5)·i18n·qa:static·build·E2E 모두 0. typecheck는 저장소에서 2지만 원인은 사용자 `.next`의 옛 경로이고, 코드는 작업 트리 tsc 0으로 통과(run 1·2와 같은 판단) |

## 판정불가 / 사람 확인 필요
없음.

## 결함 목록 (Fail만)
없음.

## 관찰 / 기준 외 발견
| 번호 | 내용 | 재현·증거 | 영향 | 제안 |
|---|---|---|---|---|
| O-1 | 확인 대화상자 안에서 실패하면(예: UNAUTHENTICATED) 대화상자가 열린 채 남는다. 오류 문구는 대화상자 뒤 목록(스크림·`aria-hidden` 영역)에 그려져 보이지 않는다. Esc나 닫기를 눌러야 "다시 로그인해 주세요."가 보인다. 면접 "동의 철회" 대화상자도 같은 구조다(`interview-consents.tsx` 확인 버튼이 대화상자를 닫지 않음) | `qa_r3_unauth_consents_1280.png`(대화상자만 보이고 문구 안 보임). Esc 뒤 알림 "다시 로그인해 주세요." 확인. `getByRole("alert")`는 대화상자가 열린 동안 0개 | 중간 이하: 사용자는 "철회하기"를 눌러도 반응이 없는 것으로 보임. 철회는 일어나지 않으므로 데이터 문제는 없음 | 실패 시 대화상자를 닫거나 오류 문구를 대화상자 안에도 표시 |
| O-2 | 기업 후보 필터의 일반 문자열이 감사 meta(`filters.visa`)로 들어가는데, 전화 모양 값이면 `AuditInputError`가 나서 **API·페이지가 500**이 된다. 연락처는 기록되지 않는다(막힘 자체는 정상). P2b부터 있던 동작으로 이번 커밋의 회귀는 아니다 | 계약 기업으로 3893 `GET /api/employer/candidates?visa=010-2345-6789` → 500, `/ko/employer/candidates?visa=…` → 500. 서버 로그 `Error [AuditInputError]: meta.filters.visa looks like contact information`. `schemas/employer/candidates.ts`의 주석("an invalid value is dropped, never an error page")과 다름. CODE 정규식 `^[A-Za-z0-9][A-Za-z0-9_-]{0,39}$`가 `010-2345-6789`를 받아들임 | URL을 손으로 바꿀 때만 생김(화면 필터는 선택식). 정상 사용자는 영향 없음 | 필터 값을 허용 코드 목록으로 검증하거나, 연락처 모양 값은 `""`로 버림 |
| O-3 | 관리자 면접 등록 폼이 서버 오류(`PLACE_HAS_CONTACT`) 뒤 **일시와 장소 입력을 모두 비운다**(React form action reset). 직원이 일시를 다시 입력해야 한다 | 장소에 전화 포함 → 제출 → 입력값 `{"at":"","place":""}`(2회 모두) | 낮음(관리자 화면 불편) | 오류 시 입력값 유지(`defaultValue`를 state로 되살림) |
| O-4 | `assertSafeMeta`는 id 키(`…Id`, `…Ids`, `id`, `verifiedBy`) 아래의 cuid 모양 문자열을 연락처 검사에서 뺀다. 따라서 전화번호 숫자를 품은 cuid 모양 값(예: `c01023456789abcdefghij`)도 통과한다 | 단위 탐침 결과 PASS. 현재 id 키 값은 모두 DB 조회 결과 또는 세션에서 온다(추천 seekerId는 적합성 조회 후 사용, CONSENT_REVOKE interviewId는 동의 행이 있을 때만 기록, companyId는 세션). 그래서 사용자 입력이 그대로 이 경로로 들어오는 곳은 찾지 못함 | 현재 노출 경로 없음 | 기록만. 앞으로 사용자 입력 id를 meta에 넣을 때 DB 조회 뒤 값을 쓰는 규칙 유지 |
| O-5 | run 2 오판 id 중 일부는 실서버 화면 경로로 시험하지 못하고 단위 탐침으로만 확인했다. 22자 회사는 `/admin/companies` 최신 100개 밖, 구직자 `cmwj193vm…`(F-4)는 매칭 적합 목록 100행 제한 밖, `cmwjvn6fb…`는 BLOCKED, 공고 `cmwk437fb…`는 DRAFT라서다. 같은 형식의 id(22자·25자 회사·공고·구직자·직원)는 실서버에서 통과(항목 1~5) | 항목 3·6 | 판정에는 영향 없음 | 매칭 적합 목록 100행 제한에 건수·페이지 표시가 없음(행이 잘린 것을 직원이 알기 어려움). 매칭 대기 목록처럼 "전체 n건 중 1–100" 표시 검토 |
| O-6 | ko 날짜 표기가 "2026. 12. 22. PM 2:00"으로 나옴("오후"가 아님) | 항목 10 문구 | run 2 O-4와 같음 | 서버 ICU·로케일 확인 |
| O-7 | 시험 행이 개발 DB에 남음(삭제하지 않음): 연락처형 id 직원 2, 리드 1, 공고 1(PUBLISHED, 비자 E2EV 3개), 회사 1, 기존 회사에 붙인 기업 계정 2, 추천 3, 면접 2(불합격 1, 취소 1), 동의·철회·감사 행, 위저드 Step 1 구직자 1. run 2의 활성 동의(`cmqabd73…`)는 이번 시험으로 철회 상태가 됨 | — | 개발 화면에 시험 데이터가 보임 | 정리 스크립트 또는 E2E 전용 DB |

## run 2 결함·관찰 처리 확인
| run 2 항목 | 확인 결과 |
|---|---|
| F-1(감사 meta id 오판 → 추천 500, 철회 불가, test 간헐 실패) | 해결(항목 1~8) |
| O-1(종료 면접에 동의 버튼 남음) | 해결(항목 9·10) |
| O-2(기업 배지 "면접 확정") | 해결(항목 11) |
| O-3(dialog X 43×43) | 해결(항목 13, 입장 애니메이션 중 47.4px 이상) |
| O-4(ko "PM") | 그대로(O-6) |
| O-5(직접 multipart 8MB) | 이번 범위 밖, 변경 없음 |
| O-6(시험 행 잔존) | 그대로(O-7) |
