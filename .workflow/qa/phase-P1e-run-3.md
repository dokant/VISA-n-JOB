# QA 보고서 — Phase P1e / run 3 (최종 재확인)

- 대상: 커밋 7380403 (Q-16/D-1 보관→재접촉금지 허용·INVALID_TRANSITION 정리 응답, D-2 "리드 검증" 링크 44px, O-1/Q-16 터치 폭 44px·헤더 밑줄, O-4 기타 항목 요약)
- 기준 문서: PRD R-115·R-119~R-122; PLAN `### P1e`; DECISIONS Q-08, Q-14, Q-15, Q-16; STANDARD v2.10 3.3·S-08; 이전 보고 `phase-P1e-run-2.md`(D-1, D-2, O-1~O-4)
- 일시: 2026-11-17 06:20 ~ 07:00 (KST)
- 환경: Windows 11, 개발 DB 54320. 검증 명령 7종은 하나씩 순차 실행. E2E는 `E2E_PORT=3194`로 다른 시험 없이 단독 실행. 직접 시험은 E2E가 끝난 뒤 같은 빌드로 `next start` 127.0.0.1:3197(`TRUST_PROXY=true`, 쿠키 때문에 `localhost`로 접속)을 띄우고 스크래치 Playwright 스펙(workers 1)으로 수행. 직원은 `tests/e2e/support/adminDb.ts` `signInNewStaff`로 역할별 새로 만들어 실제 로그인 화면 → TOTP 설정 화면에 표시된 시크릿으로 코드 생성 → `/admin`. 서버 액션 직접 호출은 빌드 클라이언트 청크의 액션 ID(`recordCallAction` 7fbb47…, `verifyLeadAction` 7fc14b… 등)로 `Next-Action` 헤더 POST. 본문은 브라우저가 실제로 보낸 요청에서 확인한 형식(`_1_<필드>` + 루트 `0`=`[null,"$K1"]`), 세션 쿠키 포함(페이지 컨텍스트 `fetch`). `.env` 값 출력 없음, 외부 전송 없음. 3197 서버는 끝에 종료했고, 그 뒤 핵심 E2E를 `--reporter=line`으로 한 번 더 돌림. 3100~3199·3300 LISTEN 없음 확인. 스크래치 `p1e3*` 파일은 이름으로 삭제. `git status`는 `.workflow/` 기존 변경과 `qa/`뿐, HEAD 7380403.
- 진행 메모: 오케스트레이터가 "E2E 단독 실행" 단계에서 무출력 600초 정지를 알려 왔으나, 이 run의 첫 전체 E2E는 포그라운드에서 이미 끝나 있었다(210 passed, 종료 코드 0). 정지 알림 뒤 남은 서버·Playwright 프로세스가 없음을 확인했다(3100~3199 LISTEN 0. 떠 있는 chrome.exe는 사용자 브라우저라 건드리지 않음). 핵심 spec 8개는 `--reporter=line` 포그라운드로 다시 돌려 확인했다(아래 표).

## 결과 요약
- 통과: 20 / 전체: 20 (통과율 100%), 판정불가 1(아래, 집계 제외)
- 필수 항목(PRD 합격 기준) 실패: 0개
- 결함: 없음
- run 2 결함 처리: D-1 해소(보관 리드 NO_INTENT·DNC → 재접촉금지, 화면·직접 호출 모두 500/digest 없음), D-2 해소(53×44)
- run 2 관찰 처리: O-1 해소(헤더 메뉴 폭 44 이상, 밑줄은 글자 폭), O-2 그대로(설계), O-3 그대로(시험 행 잔존, 관찰 O-2), O-4 코드 반영 확인은 단위 테스트로만(아래 관찰 O-3)
- 관찰: O-1(INVALID_TRANSITION은 실제 앱에서 만들 수 없음 → 판정불가), O-2(시험 행 잔존), O-3(다이얼로그 닫기 버튼 열림 애니메이션 중 43.3px)

## 검증 명령 (순차 실행)
| 명령 | 종료 코드 | 결과 |
|---|---|---|
| `corepack pnpm lint` | 0 | 오류·경고 없음 |
| `corepack pnpm typecheck` | 0 | 오류 없음 |
| `corepack pnpm test` | 0 | **51 files / 396 tests** 통과(17.7s). run 2 대비 +1 file(`tests/unit/server/actions/admin/leads.test.ts`), +6 tests |
| `corepack pnpm i18n:check` | 0 | ko 894 keys, 6 locales, errors 0 |
| `corepack pnpm qa:static` | 0 | errors 0, warnings 17 (run 2와 같음) |
| `corepack pnpm build` | 0 | Compiled successfully, 152/152 페이지 |
| `E2E_PORT=3194 corepack pnpm test:e2e` | 0 | **210 passed (2.2m)**, 실패 0 (run 2 208 + 보관 리드 DNC 2건) |
| (재확인) `E2E_PORT=3194 corepack pnpm test:e2e --reporter=line` admin-core·quick-register·wizard-resume·wizard-focus·employer-intake·consent-revoke·referral·auth | 0 | **62 passed (1.8m)**, 실패 0 |

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| 1 | D-1 / Q-16: 보관 리드에서 화면으로 NO_INTENT 저장 → 재접촉금지 | PLACEMENT로 ARCHIVED 리드 상세 → 통화 결과 "고용 의사 없음", 다음 연락일 2026-12-01, 메모 → 저장 → 확인 다이얼로그 "저장하고 재접촉금지로 이동" (2회 실행) | Pass | POST 200, "Application error" 0, `lead-grade` data-grade=DO_NOT_CONTACT, `call-form` 0. DB `{grade:DO_NOT_CONTACT, nextActionAt:null, foreignIntent:false, archivedAt:null, lastContactedAt:갱신, CallLog 1}`, AuditLog 1행 `{from:ARCHIVED,to:DO_NOT_CONTACT,reason:CALL_NO_INTENT}`. 통화 이력 "고용 의사 없음 (재접촉금지로 이동) … E2E 직원 (매칭 담당) QA run3 보관 리드 통화". 서버 로그 오류 0 |
| 2 | D-1 / Q-16: 보관 리드에서 화면으로 DNC 저장 | 같은 방법으로 "재접촉 거부" | Pass | POST 200, 오류 화면 0, DO_NOT_CONTACT, CallLog 1, AuditLog 1행 `{from:ARCHIVED,to:DO_NOT_CONTACT,reason:CALL_DNC}`, nextActionAt null. E2E `admin-core.spec.ts` "보관 리드 → 재접촉 거부" 2/2 통과 |
| 3 | D-1: 보관 리드 서버 액션 직접 호출 | 새 ARCHIVED 리드 2개에 `recordCallAction` NO_INTENT·DNC를 `confirmFinal` 빈값 → `yes` 순서로 | Pass | 빈값: HTTP 200 `{ok:false,code:"CONFIRM_REQUIRED"}`, 리드 ARCHIVED·CallLog 0·감사 0 그대로. `yes`: HTTP 200 `{ok:true}`, 오류 digest 없음(응답의 `"digest"` 문자열은 메타데이터 경계의 `"digest":"$undefined"`), DO_NOT_CONTACT, CallLog 1, 감사 1행(CALL_NO_INTENT / CALL_DNC) |
| 4 | 재접촉금지에서 나가는 전이 → 정리된 거부 | C 리드를 직접 호출 DNC로 재접촉금지로 만들고 `requestedAt` 설정 → INTERESTED·REQUEST_RECEIVED·NO_ANSWER·NO_INTENT·DNC(모두 `confirmFinal=yes`)와 `verifyLeadAction` 직접 호출, 화면 열기 | Pass | 통화 5건 모두 HTTP 200 `{ok:false,code:"LEAD_DNC"}`, 검증 `{ok:false,code:"LEAD_STATE"}`, digest 0. DB 전후 같음(grade DO_NOT_CONTACT, CallLog 1, 감사 1행 그대로). 화면: `call-form` 0, `verify-form` 0, 오류 화면 0 |
| 5 | 화면이 오래된 상태에서 저장 → 정리된 문구(500 아님) | C 리드 상세를 연 뒤 DB에서 재접촉금지로 바꾸고, 열린 화면에서 "관심 있음" 저장 | Pass | `action-error` "재접촉금지 리드에는 통화를 기록하지 않습니다.", 오류 화면 0, CallLog 0 |
| 6 | 동시 저장 시 정리된 응답·롤백 | 같은 리드에 두 결과를 동시에 직접 호출: (C) NO_INTENT+INTERESTED, (ARCHIVED) NO_INTENT+DNC, (ARCHIVED) INTERESTED+DNC | Pass | 매번 한쪽 `{ok:true}`, 다른 쪽 `{ok:false,code:"CONFLICT"}`, 500·digest 0. 진 쪽 CallLog·감사 롤백(각 리드 CallLog 1, 감사 1행: C→DNC CALL_NO_INTENT / ARCHIVED→DNC CALL_DNC / ARCHIVED→B CALL_INTERESTED) |
| 7 | D-2: 대시보드 "리드 검증" 링크 44×44 이상 | 열린 LEAD_REVIEW 업무를 만들고 ADMIN으로 `/admin`, 1280·375(모바일 터치) boundingBox | Pass | 1280 **53×44**, 375 **53×44** (run 2 53×22), href `/admin/leads#lead-review` |
| 8 | O-1 / Q-16: 공개 화면 헤더 내비·푸터·버튼 폭·높이 44 이상, 375 가로 스크롤 없음 | 1280·375에서 `/ko`, `/vi`, 간편 등록, 기업 진단·로그인·가입, 비자 진단, about, fees, privacy, terms, guide, cases, 구직자 로그인, `/en/fees`, 375 햄버거 sheet 열린 상태의 보이는 `a[href]`·`button`·`[role=radio\|tab\|checkbox\|menuitem]`·`select`·`summary` 전부 측정 | Pass | 15개 화면 × 2폭 + sheet: 44 미만 **0건**(화면당 25~51개 측정). 제외: 20×20 체크박스 3개는 모두 label 행 안(526×44·526×66 / 301×44·301×63·301×91). 모든 화면 `scrollWidth = clientWidth`(375/375, 1280/1280). (`/ko/score`는 404라 측정 대상 2개뿐, 경로 없음으로 확인) |
| 9 | O-1: 로그인 필요한 구직자 위저드 0~7단계 | 비로그인 `/ko/seeker/register`(0단계), 6단계까지 저장된 구직자로 실제 OTP 로그인 후 `?step=1,2,3a,3b,4,5a,5b,6,7`(제목으로 화면 확인) 1280·375 | Pass | 10개 화면 × 2폭 44 미만 0건(화면당 30~75개). 제외: 2단계 확인 체크박스(label 576×45 / 335×71), 7단계 동의 4개(label 542×44·66 / 301×44·63·91). 가로 스크롤 0. ※ 7단계까지 완료한 구직자는 `/seeker/me`로 넘어가므로 6단계 구직자로 측정 |
| 10 | O-1: 마이페이지 | 같은 로그인 구직자 `/ko/seeker/me`, `/me/referral`, `/me/stay`, `/me/recommended` 1280·375 | Pass | 44 미만 0건, `stay-optin` 체크박스는 label 560×45 / 335×44 안. 가로 스크롤 0 |
| 11 | O-1: 기업 구인 의뢰 화면 | 기업 계정 실제 로그인 → `/ko/employer/request` 단계 company → job → living(입력 후 "다음") 1280·375 | Pass | 3단계 × 2폭 44 미만 0건(28~40개), `data-step` company/job/living 확인, 가로 스크롤 0 |
| 12 | O-1: 헤더 밑줄이 글자 폭 기준 | 1280 `/ko/fees`·`/ko/visa-check`·`/ko/about`에서 헤더 메뉴 각 링크에 hover 후 링크 상자, 글자 Range 폭, 밑줄 span 폭·위치 측정 | Pass | 예: "구직자" 링크 44×44, 글자 37.3, 밑줄 37.3(x 차이 0.0, 글자 아래 2.6px); "기업" 44×44, 글자 24.8, 밑줄 24.8; "비자 진단" 53×44 / 53.5 / 53.5; "수수료" 44×44 / 37.3 / 37.3. aria-current 링크도 같음. 밑줄이 링크 상자(44)가 아닌 글자 폭과 일치 |
| 13 | Q-15 관리자 화면 터치 영역(회귀) | ADMIN으로 `/admin`, `/admin/seekers?queue=ALL`, 구직자 상세, `/admin/leads`, 리드 상세, 재접촉금지 확인 다이얼로그 1280·375 | Pass | 44 미만 0건(칸반 230개, 목록 109개 포함). 확인 항목 체크박스 3개는 label 522×44 / 285×44 안. 다이얼로그 버튼 77×52·221×52, 닫기 44×44(열림 애니메이션 300ms 뒤, 관찰 O-3) |
| 14 | Q-14 확인 다이얼로그(회귀) | 화면에서 DNC 선택 → 저장 → 다이얼로그 "취소"; E2E admin-core NO_INTENT 취소·확인 | Pass | 다이얼로그 문구 "재접촉금지로 옮길까요? … 되돌릴 수 없고, 이 리드에는 다시 전화하지 않습니다." 취소 뒤 리드 C·CallLog 0. 확인 플래그 없는 직접 호출은 항목 3대로 CONFIRM_REQUIRED. E2E Q-14 시험 2/2 통과 |
| 15 | O-3 권한 거부 응답(회귀) | PLACEMENT로 seeker:review 액션 4종(changeGrade A, changeTrack CONSULT_ONLY, 확인 항목 3개 true, 전환 판정 E-7-4/2027-03-01), VISA로 recordCall(INTERESTED, NO_INTENT+확인)·verifyLead·revealLeadContact·revealSeekerContact 직접 호출 | Pass | 9건 모두 HTTP 200 `{ok:false,code:"FORBIDDEN"}`, 오류 digest 0. 구직자 grade·track·확인 항목·전환 판정 불변, 구직자 감사 0행. 리드 C·CallLog 0·전이 감사 0, B 리드 그대로, PII_VIEW 리드 0·구직자 0 |
| 16 | Q-08 권한 분리(회귀) | VISA로 `/admin/leads`·리드 상세, PLACEMENT로 구직자 상세 | Pass | VISA 두 화면 `admin-forbidden` 1, 회사명 미노출. PLACEMENT 구직자 상세 `grade-form` 0, `reveal-contact` 1(WO §11 허용) |
| 17 | R-119 카운트 = DB, 변경 추종(회귀) | ADMIN `/admin`의 신규 구직자·전화할 리드 값과 같은 순간 원시 SQL(`SeekerProfile` grade B·consultedAt null·BLOCKED 제외 / `JobLead` grade C·B이고 nextActionAt null 또는 KST 내일 0시 미만) 대조. C 리드 1, 미상담 B 구직자 1, 상담된 B 구직자 1 추가 후 새로고침 재대조 | Pass | 전 화면 `{908, 614}` = SQL `{908, 614}`, 후 `{909, 615}` = SQL, +1·+1(상담된 구직자는 0) |
| 18 | R-115 재수집 규칙(DNC 유지, 회귀) | `ingestJobLeads`로 새 리드 수집 → PLACEMENT 실제 액션으로 DNC → 같은 sourceRef를 더 늦은 postedAt·다른 제목으로 재수집. 대조: ARCHIVED 리드를 더 늦은 postedAt로 재수집 | Pass | 1차 `{created:1}`, DNC `{ok:true}`, 2차 `{updated:1}` 뒤 grade **DO_NOT_CONTACT 유지**, 제목은 "생산직 QA3 재게시"로 갱신, 전이 감사는 `C→DO_NOT_CONTACT CALL_DNC` 1행뿐. 보관 리드 재게시 → C. 단위 `transitions.test.ts` R-115/Q-16 통과 |
| 19 | R-120·R-121·R-122 핵심(회귀) | E2E admin-core 4 tests × 2 프로젝트(조건 미충족 거부·승격 감사, 관심 있음 C→B, PII_VIEW, Q-14, 보관 DNC) | Pass | 전체 실행과 재확인 실행 모두 admin-core 8/8 통과 |
| 20 | P1c·P1d 핵심 E2E(회귀) | 전체 E2E + line 재확인 | Pass | 전체 210/210, 재확인 62/62(quick-register, wizard-resume, wizard-focus, employer-intake, consent-revoke, referral, auth, admin-core) |

## 판정불가 / 사람 확인 필요
| 항목 | 내용 | 이유·대신 확인한 것 |
|---|---|---|
| U-1 | 실제 앱에서 INVALID_TRANSITION 응답·화면 문구·롤백 | Q-16 반영 뒤에는 실제 경로로 전이표가 거부하는 이동을 만들 수 없다. `gradeAfterCall`의 모든 (등급 5 × 통화 결과) 조합 12개 이동과 검증(B→A)을 `canTransition`에 넣어 보니 거부 **0건**이었다. 동시 저장 경쟁은 `transitionLead`의 `where grade=from` 보호 때문에 INVALID_TRANSITION이 아니라 CONFLICT가 된다(항목 6). 제품 코드를 바꾸지 않고 만들 방법이 없어 판정불가로 둔다. 대신 확인한 것: 단위 `tests/unit/server/actions/admin/leads.test.ts`(transitionLead를 모의로 거부시켜 recordCall·verifyLead가 `{ok:false,code:"INVALID_TRANSITION"}`, CallLog 0·감사 0·등급 유지·검증 업무 OPEN 유지) 통과, `adminActionError("INVALID_TRANSITION")` = "지금 등급에서는 이 결과로 바꿀 수 없습니다. 새로고침한 뒤 다시 확인해 주세요." 화면 오류 표시 경로는 같은 `action-error`이며 항목 5(LEAD_DNC 문구)에서 실제로 확인함 |

## 결함 목록 (Fail만)
없음.

## 관찰 / 기준 외 발견
| 번호 | 내용 | 재현·증거 | 영향 | 제안 |
|---|---|---|---|---|
| O-1 | INVALID_TRANSITION 코드는 지금 실제로 나올 수 없는 방어 코드 | 판정불가 U-1 | 없음. 앞으로 전이표나 `gradeAfterCall`가 바뀌면 다시 쓰일 수 있음 | 두 표의 일치 여부를 단위 테스트로 묶어 두면 좋음(지금 `transitions.test.ts`가 일부 확인) |
| O-2 | 시험 행이 개발 DB에 남음 | 직원 `e2e-*@example.test`(이번 직접 시험 약 10 + E2E), 리드 `E2E-ADMIN:*`(약 20, 다수 재접촉금지), `QAP1E3:*`·`QAP1E3A:*` 2건, LEAD_REVIEW 업무 1건, 구직자·기업 계정, CallLog·AuditLog | run 2 O-3과 같음. 대시보드·칸반 건수가 늘어남 | 정리 스크립트 또는 E2E 전용 DB |
| O-3 | 확인 다이얼로그 닫기 버튼이 열리는 애니메이션 중에는 43.3×43.3 | 열자마자 43.3, 100ms 43.9, 300ms 이후 44.0×44.0(1280·375 같음). 확대 애니메이션 때문 | 없음(정지 상태 44×44) | 없음(기록만) |
| O-4 | 구인 의뢰 "기타 항목" 객체 값 요약(run 2 O-4) | 이번 run은 화면으로 다시 보지 않음. `ko.test.ts` 단위 통과로만 확인 | 실데이터 영향 없음(run 2 판단과 같음) | 없음 |
