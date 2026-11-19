# QA 보고서 — Phase P1e / run 2 (재확인·회귀)

- 대상: 커밋 e52a176 (기준 검토 E-1~E-5, Q-14 NO_INTENT→재접촉금지 + 확인, Q-15 44px, QA O-3 FORBIDDEN 결과, O-4 위저드 hydration 대기)
- 기준 문서: PRD R-119~R-122; PLAN `### P1e`; DECISIONS Q-08, Q-14, Q-15; STANDARD v2.10 3.3·B-10·S-08·S-07·3.6·S-32·1.1; 이전 보고 `phase-P1e-run-1.md`(O-1~O-4), `phase-P1e-standard-run-1.md`(E-1~E-5)
- 일시: 2026-11-17 05:50 ~ 06:15 (KST)
- 환경: Windows 11, 개발 DB 54320. 검증 명령은 하나씩 순차 실행. E2E는 `E2E_PORT=3194`로 **다른 시험 없이 단독** 실행(전체 1회, 반복 1회). 직접 시험은 E2E가 끝난 뒤 같은 빌드로 `next start` 127.0.0.1:3197(`TRUST_PROXY=true`, 쿠키 때문에 `localhost`로 접속)을 띄우고 Playwright 스크립트(스크래치)로 수행. 직원은 `tests/e2e/support/authDb.ts`의 `createStaff`로 역할별 새로 만들고 실제 로그인 화면 → TOTP 설정 화면에 표시된 시크릿으로 코드 생성 → `/admin`. 서버 액션 직접 호출은 빌드 `server-reference-manifest.json`의 액션 ID로 `Next-Action` 헤더 POST(브라우저가 보내는 것과 같은 multipart: `_1_<필드>` 다음 루트 `0`=`[null,"$K1"]`, 세션 쿠키 포함). `.env` 값 출력 없음, 외부 전송 없음. 3197 서버는 끝에 종료(3190~3199 LISTEN 없음 확인). 스크래치 `p1e2_*` 파일은 이름으로 삭제. `git status`는 `.workflow/` 기존 변경과 `qa/`뿐, HEAD e52a176.

## 결과 요약
- 통과: 19 / 전체: 21 (통과율 90%)
- 필수 항목(PRD 합격 기준) 실패: 1개 (D-1, R-121/Q-14)
- 결함: D-1(보관 리드에 의사 없음·재접촉 거부 저장 시 서버 오류로 화면 전체가 깨짐), D-2(관리자 대시보드 "리드 검증" 링크 터치 영역 53×22px)
- run 1 관찰 처리: O-1(NO_INTENT) 해소 — 단 보관 등급은 D-1, O-2(DNC 확인) 해소, O-3(처리되지 않은 권한 오류) 해소, O-4(wizard-focus 불안정) 반복 40/40 통과, O-5(시험 행 잔존) 이번에도 해당(관찰 O-3)
- 관찰: O-1(1280px 헤더 메뉴 글자 링크 폭 44px 미만), O-2(비로그인·2FA 미완료 직접 호출은 코드 대신 리다이렉트), O-3(시험 행 잔존), O-4(구인 의뢰 "기타 항목" 표시 방식)

## 검증 명령 (순차 실행)
| 명령 | 종료 코드 | 결과 |
|---|---|---|
| `corepack pnpm lint` | 0 | 오류·경고 없음 |
| `corepack pnpm typecheck` | 0 | 오류 없음 |
| `corepack pnpm test` | 0 | 50 files / **390 tests** 통과(31.6s). run 1 대비 +1 file(`tests/unit/app/admin/koFormat.test.ts`), +4 tests |
| `corepack pnpm i18n:check` | 0 | ko 894 keys, 6 locales, errors 0 |
| `corepack pnpm qa:static` | 0 | errors 0, warnings 17 (run 1과 같음) |
| `corepack pnpm build` | 0 | Compiled successfully, 152/152 페이지, 관리자 동적 라우트 생성 |
| `E2E_PORT=3194 corepack pnpm test:e2e` | 0 | **208 passed (3.0m)**, 실패 0. admin-core 6건(3 tests × 2 프로젝트, Q-14 다이얼로그 시험 추가분 포함) 통과 |
| `E2E_PORT=3194 corepack pnpm test:e2e tests/e2e/wizard-focus.spec.ts --repeat-each=5` | 0 | **40 passed (2.3m)** (4 tests × 2 프로젝트 × 5), 실패 0 |
| (S-08 정적) `lg:(min-)?h-(8\|8.5\|9\|9.5\|10\|10.5)\b` 검색 `src` | — | 0건 |

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| 1 | Q-14 NO_INTENT·DNC 저장 전 확인 다이얼로그, 취소 시 변경 없음, 확인 시 재접촉금지 + 감사 | PLACEMENT로 C 리드 상세 열기 → 결과 NO_INTENT(그리고 새 리드로 DNC) 선택, 다음 연락일 2026-12-01 입력 → 저장. 다이얼로그에서 "취소", 다시 열어 Escape, 다시 열어 "저장하고 재접촉금지로 이동". 매 단계 DB 대조 | Pass | 선택지 문구 "고용 의사 없음 (재접촉금지로 이동)", "재접촉 거부 (재접촉금지로 이동)". 다이얼로그 `role=dialog`, "재접촉금지로 옮길까요? … 되돌릴 수 없고, 이 리드에는 다시 전화하지 않습니다." 취소·Escape 뒤 `{grade:C, lastContactedAt:null, foreignIntent:null, CallLog 0, AuditLog 0}` 그대로. 확인 뒤 NO_INTENT: `grade DO_NOT_CONTACT, CallLog 1, foreignIntent false, nextActionAt null`, AuditLog `LEAD_GRADE_CHANGE {from:C,to:DO_NOT_CONTACT,reason:CALL_NO_INTENT}` actorId=직원. DNC: 같은 결과, reason `CALL_DNC`. 확인 뒤 `call-form` 0개. 취소 후 INTERESTED로 바꿔 저장 → 다이얼로그 없이 B. NO_ANSWER → 다이얼로그 없음, C 유지 |
| 2 | Q-14 확인 플래그 없는 직접 호출 거부, DB 불변 | PLACEMENT 세션으로 `recordCallAction` 직접 호출 | Pass | NO_INTENT·DNC × (`confirmFinal` 필드 없음, 빈값) 4건 모두 `{ok:false, code:"CONFIRM_REQUIRED"}`(HTTP 200), 리드 상태·CallLog·AuditLog 불변. `confirmFinal`=`YES`·`true`·`1` → `INVALID_INPUT`, 불변 |
| 3 | Q-14 확인 플래그 있는 직접 호출 전이(C·B·A) | `confirmFinal=yes`, `nextActionAt=2026-12-01`로 NO_INTENT | Pass | C·B·A 각각 `{ok:true}`, `DO_NOT_CONTACT`, CallLog 1, foreignIntent false(B는 true→false), nextActionAt null, AuditLog 1행 `{from:C/B/A, to:DO_NOT_CONTACT, reason:CALL_NO_INTENT}`. 재접촉금지 리드에 NO_INTENT → `LEAD_DNC`, 불변. DNC 확인 → `CALL_DNC`. INTERESTED에 `confirmFinal=yes` 붙여도 정상 B. NO_ANSWER는 확인 없이 기록, lastContactedAt 미갱신 |
| 4 | Q-14 / R-121 보관(ARCHIVED) 리드에서 NO_INTENT·DNC | 보관 리드 상세(통화 기록 폼이 보임)에서 화면으로 NO_INTENT·DNC → 확인; 같은 것을 직접 호출 | **Fail** | 화면: POST 500, 페이지 전체가 "Application error: a server-side exception has occurred … Digest: 2318697109"로 바뀜. 직접 호출: HTTP 500 `1:E{"digest":"2318697109"}`. 서버 로그 `⨯ Error [LeadTransitionError]: lead grade ARCHIVED → DO_NOT_CONTACT is not allowed` 5건. 리드 ARCHIVED 그대로, CallLog 0 → **D-1** |
| 5 | O-3 STAFF_PLACEMENT의 seeker:review 액션 직접 호출 → 정리된 거부 | 조건 충족 B 구직자에 changeGrade(A)·changeTrack(CONSULT_ONLY)·updateReviewFlags(3개 true)·setConvertibility(E-7-4/2027-03-01) | Pass | 4건 모두 HTTP 200 `{ok:false, code:"FORBIDDEN"}`, digest 없음. 구직자 grade·track·확인 항목·전환 판정 불변, 감사 0행 |
| 6 | O-3 STAFF_VISA의 리드·연락처 액션 직접 호출 → 정리된 거부 | C 리드에 recordCall(INTERESTED, NO_INTENT+확인), 구인신청 받은 B 리드에 verifyLead·revealLeadContact, 구직자 revealSeekerContact | Pass | 5건 모두 HTTP 200 `{ok:false, code:"FORBIDDEN"}`, digest 없음, 응답에 담당자명·전화·이메일·구직자 전화·이메일 없음. 두 리드 상태·CallLog 0·AuditLog 0 불변, 구직자 PII_VIEW 0. 이 시험 전체 동안 서버 로그 `AuthzError` 0건(run 1은 19건) |
| 7 | O-3 비로그인·2FA 미완료 직접 호출 | 비로그인 컨텍스트, 비밀번호만 통과한(TOTP 미설정) STAFF_VISA·STAFF_PLACEMENT·ADMIN 세션으로 9개 액션을 관리자 경로·`/ko`·`/api/health`(비로그인)·`/`(2FA 미완료)로 POST | Pass | 500·digest·PII 노출·`ok:true` 0건(비로그인 27건, 2FA 미완료 역할별 27건). 관리자 경로: 비로그인 307 → `/admin/login`, 2FA 미완료 307 → `/admin/2fa/setup`. `/ko`·`/api/health`: 200 `{}`(그 경로에 등록되지 않은 액션이라 실행 안 됨). `/`: 307 → `/ko`. 구직자·두 리드 상태 불변, 감사 0. (코드가 아니라 리다이렉트로 거부 — 관찰 O-2) |
| 8 | 권한 있는 역할은 같은 호출이 동작(대조) | ADMIN 세션으로 같은 구직자 changeGrade(A), 같은 B 리드 verifyLead | Pass | `{ok:true}`, 구직자 A·감사 1행, 리드 A |
| 9 | E-1 원화 서식 | requestJson·payMin/payMax 2,500,000/3,200,000 리드 상세 | Pass | 급여 "₩2,500,000 ~ ₩3,200,000", 구인 의뢰 "월 급여 최저(세전) ₩2,500,000", "최고 ₩3,200,000". "2,500,000원" 연결 형태 없음 |
| 10 | E-2 칸반 열 "리드 등급 X" | PLACEMENT `/admin/leads` 열 제목 `#col-*` | Pass | `리드 등급 C 511`, `리드 등급 B 85`, `리드 등급 A 9`, `보관 23`, `재접촉금지 40` |
| 11 | E-5 구인 의뢰 내용 한국어 라벨(영문 키·enum·JSON 원문 없음) | (가) 12개 표준 키 + 모르는 키(`extraKey` 문자열, `nested` 객체, `flagged` true, `list` 배열, 빈값·null)를 넣은 리드, (나) 개발 DB의 실제 `source=REQUEST` 최신 리드 | Pass | (가) "직무 용접공 / 월 급여 최저(세전) ₩2,500,000 / … / 잔업 가끔 있음 / 채용 인원 3명 / 채용 시기 1개월 안 / 숙소 주거비 도움 / 식사 일부 제공 / 상시근로자 수 25명 / 희망 조건 / 그 밖의 요청 / 기타 항목 가, 나 · 예 · 추가값". 영문 키 0, enum 코드 0, `{ } [ ] "` 0. 리드 상세 전체에서 대문자 영문 토큰 0. (나) "잔업 없음, 채용 시기 바로, 숙소 제공, 식사 제공, 상시근로자 수 40명 …" 키·enum 노출 0 |
| 12 | Q-15 / E-4 터치 영역 44px (375·1280) | 375(모바일 터치)·1280에서 홈(헤더·푸터 포함), 햄버거 sheet(375), 언어 메뉴, 간편 등록, 위저드 0~7단계(로그인 구직자), 기업 진단·가입·로그인·구인 의뢰(로그인 기업), 비자 진단, 마이페이지, 관리자 로그인·2FA·대시보드·검토 큐·구직자 상세·칸반·리드 상세·확인 다이얼로그의 보이는 `a[href]`·`button`·`[role=radio]`·`[role=tab]`·`[role=checkbox]`·`select`·메뉴 항목 boundingBox 측정 | **Fail** | 높이 44 미만: **관리자 대시보드 "리드 검증" 링크 53×22px**(375·1280 모두, `src/app/admin/(staff)/page.tsx:98-103`) → **D-2**. 그 밖에 높이 미달 없음: sheet 링크 335×63·335×52, 닫기 44×44, 언어 메뉴 행 218×44, 다이얼로그 버튼 77×52·221×52·닫기 44×44, 위저드 칩·탭·푸터 링크 미검출. 제외(실제 영역 44 이상): 20×20 체크박스(`button[role=checkbox]`)는 모두 `label` 행 안 — 간편 등록·위저드 7단계 동의 행 높이 44·63·66·91, 위저드 2단계 확인 행 71(375)·45(1280), 관리자 확인 항목 3개 행 44. 폭만 44 미만: 1280 헤더 메뉴 "구직자" 37×44, "기업" 25×44, "수수료" 37×44(관찰 O-1) |
| 13 | 375px 가로 스크롤 없음 유지(관리자 제외) | 위 비관리자 화면 16개에서 `scrollWidth <= clientWidth` | Pass | 16개 모두 ok (1280도 모두 ok) |
| 14 | O-4 wizard-focus 안정성 | `--repeat-each=5` 단독 실행 + 전체 실행 | Pass | 40/40 통과, 전체 실행에서도 wizard-focus 8건 통과 |
| 15 | R-119 카운트 = DB, 변경 추종(회귀) | ADMIN `/admin` 4개 값과 같은 순간 원시 SQL(신규=B·consultedAt null·BLOCKED 제외 / 전화=C·B이고 nextActionAt null 또는 KST 내일 0시 미만 / 면접=KST 오늘) 대조. C 리드 1, 미상담 B 구직자 1, 상담된 B 구직자 1 추가 후 재대조 | Pass | 전 `{852, 595, 2}` = SQL `{852, 595, 2}`, 후 `{853, 596, 2}` = SQL, 차이 +1·+1(상담된 구직자는 0) |
| 16 | R-120 조건 미충족 거부·승격 감사(회귀) | E2E `admin-core.spec.ts:21`(2 프로젝트), 단위 `seekerReview.test.ts`, 항목 8 ADMIN 직접 호출 | Pass | E2E 화면 거부 문구·B 유지·승격 후 actorId 1행 통과(2/2). 단위 통과. ADMIN B→A 감사 1행 |
| 17 | R-121 통화 전이·칸반(회귀) | E2E `admin-core.spec.ts:62`·`:100`, 항목 1~3 | Pass | INTERESTED C→B 감사 `CALL_INTERESTED`, 칸반 이동 확인. (보관 등급의 재접촉금지 전이는 항목 4 Fail) |
| 18 | R-122 PII_VIEW·응답에 복호 값·암호문 없음(회귀) | 구직자(이름·학교·이메일·메신저·전화)·리드(담당자 3필드) 생성, DB 원본에서 `v1:` 암호문 8개 수집. ADMIN·PLACEMENT·VISA로 `/admin`, `/admin/seekers?queue=ALL`·`NEW`, `/admin/seekers/[id]`, `/admin/leads`, `/admin/leads/[id]`를 HTML·`RSC: 1`로 받아 평문 10종·암호문·`"v1:`·`…Enc` 검색. 열람 3회 후 재검사 | Pass | 40개 응답 모두 검출 0. DB 행 평문 0(암호화). 열람(ADMIN 기본·연락처, PLACEMENT 리드 연락처) → PII_VIEW 3행, meta는 필드 이름만(`["legalNameEnc","schoolNameEnc","experiences.employerNameEnc"]` 등), 반환값은 복호 원문 |
| 19 | Q-08 권한 분리(회귀) | VISA로 `/admin/leads`·`/admin/leads/[id]`, PLACEMENT로 구직자 상세 | Pass | VISA 두 화면 `admin-forbidden`, 회사명 미노출. PLACEMENT 구직자 상세 `grade-form` 0개, `reveal-contact` 1개(WO §11 허용). 액션 거부는 항목 5·6 |
| 20 | P1c·P1d 핵심 E2E(회귀) | 전체 E2E | Pass | 208/208 통과(quick-register, wizard-resume, wizard-focus, employer-intake, consent-revoke, referral, auth 등 포함) |
| 21 | 검증 명령 7종 | 위 표 | Pass | 7종 모두 종료 코드 0 |

## 결함 목록 (Fail만)
| 번호 | 항목 | 재현 방법 | 기대 | 실제 | 위치 |
|---|---|---|---|---|---|
| D-1 | 4 (R-121, Q-14) | STAFF_PLACEMENT로 보관(ARCHIVED) 리드 상세 → 통화 결과 "고용 의사 없음" 또는 "재접촉 거부" → 저장 → 확인 다이얼로그에서 "저장하고 재접촉금지로 이동". 또는 같은 리드에 `recordCallAction(outcome=NO_INTENT\|DNC, confirmFinal=yes)` 직접 호출 | 재접촉금지로 전이 + CallLog + LEAD_GRADE_CHANGE, 또는(보관에서 재접촉금지를 막기로 한다면) 정리된 거부 코드와 화면 안내 | HTTP 500, 화면 전체가 "Application error … Digest: 2318697109"로 바뀜. 서버 로그 `LeadTransitionError: lead grade ARCHIVED → DO_NOT_CONTACT is not allowed`. 통화 기록도 남지 않음. 보관 리드는 통화 폼이 보이고 INTERESTED→B는 지원하므로 정상 업무 경로 | `src/lib/admin/leadDesk.ts` `gradeAfterCall`(주석 "어느 등급에서든 DO_NOT_CONTACT")와 `src/lib/leads/transitions.ts:41-47` `LEAD_TRANSITIONS.ARCHIVED = ["C","B"]` 불일치. DNC 경로는 4beeb9f부터 같았고(run 1은 C·B·A만 시험해 놓침) 이번에 NO_INTENT도 같은 경로가 됨. 어느 쪽으로 맞출지(보관→재접촉금지 허용 vs 거부 코드)는 WO §8.2 그림에 보관→재접촉금지 화살표가 없어 판단 필요 |
| D-2 | 12 (Q-15, STANDARD 3.3·S-08 v2.10) | ADMIN(또는 리드 검증 업무가 열린 PLACEMENT)으로 `/admin` → "열린 업무"의 "리드 검증" 링크 boundingBox | 모든 화면·모든 폭에서 링크 44px 이상(Q-15: 목록형 텍스트 링크 포함) | 375·1280 모두 53×22px (`className="underline-offset-4 hover:underline"`, 높이 지정 없음) | `src/app/admin/(staff)/page.tsx:98-103` |

## 관찰 / 기준 외 발견
| 번호 | 내용 | 재현·증거 | 영향 | 제안 |
|---|---|---|---|---|
| O-1 | 1280px 헤더 메뉴 글자 링크의 **폭**이 44px 미만(높이는 44) | `/ko` 등 모든 공개 화면 1280: "구직자" 37×44, "기업" 25×44, "수수료" 37×44 (`site-nav.tsx:111` `min-h-11`) | STANDARD 3.3은 "44×44px 이상", CLAUDE.md는 "44px(`h-11`) 이상"(높이). 데스크톱 마우스 대상이라 실사용 영향은 작음 | 폭도 대상인지 오케스트레이터 판단. 대상이면 `min-w-11` 또는 좌우 패딩 |
| O-2 | 비로그인·2FA 미완료 직접 호출은 `UNAUTHENTICATED` 코드가 아니라 307 리다이렉트 | 항목 7 | 데이터·PII 영향 없음, 500 없음. `actionGuard.ts` 주석대로 `requireStaff` 리다이렉트는 그대로 둔 설계 | 없음(기록만) |
| O-3 | 시험 행이 개발 DB에 남음 | 직원 `e2e-*@example.test`(이번 직접 시험 약 12 + E2E), 리드 `sourceRef QAP1E2:*`(약 40, 그중 재접촉금지 다수), 구직자 `sourceChannel QAP1E2`, 기업 계정·위저드 구직자(터치 측정용), CallLog·AuditLog | run 1 O-5와 같은 성격. 칸반 열 건수·대시보드 카운트가 늘어남 | 정리 스크립트 또는 e2e 전용 DB |
| O-4 | 구인 의뢰 "기타 항목"은 모르는 키의 값만 이어 붙이고 객체 값은 버림 | 항목 11 (가): "기타 항목 가, 나 · 예 · 추가값", `nested` 객체는 표시 안 됨 | 현재 구인 의뢰 폼(`jobRequest.ts`)이 쓰는 키는 12개 모두 매핑되어 실데이터 영향 없음. 키 없이 값만 보여 "예"가 무엇인지 알 수 없음 | 스키마에 키가 늘면 `REQUEST_FIELDS`도 함께 갱신(테스트로 묶기 권장) |

## 판정불가 / 사람 확인 필요
- D-1의 수정 방향(보관 → 재접촉금지 허용 여부)은 WO §8.2에 명시가 없어 사람·오케스트레이터 판단 필요. 어느 쪽이든 500으로 끝나면 안 된다는 점만 결함으로 판정함.
- 관리자 확인 다이얼로그 문구·구인 의뢰 라벨의 업무 적합성은 사람 검토 대상.
