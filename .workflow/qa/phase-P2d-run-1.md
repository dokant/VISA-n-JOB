# QA 보고서 — Phase P2d / run 1

- 대상: 커밋 dc12a09(선행 A: ko 24시간제, 종료 면접 동의 거부, 연락처 meta 키, 다이얼로그 안 오류, 후보 필터 코드, 매칭 전체 건수), bdc5f07(R-214 알림 어댑터, R-213 예약 작업, R-215 규칙·점수표 관리), 5591566(still-searching 토큰 구분자 "~"), 6e93c40·80a647e(시험 보강). HEAD 80a647e
- 기준 문서: PRD R-213·R-214·R-215; PLAN `### P2d`(QA 방법: D-91/D-90/D-89 경계, 관리자 화면 게시 1회 후 `/visa-check` 변화, 더미 규칙); DECISIONS Q-26(ko 24시간제)·C-4/PC-4(StaffTask); CLAUDE.md(BR-12 하드코딩 금지, 6개 언어, 44px)
- 일시: 2026-11-17 21:15 ~ 21:45 (KST)
- 환경: Windows 11, 개발 DB. 포트 3000은 시작·끝 모두 LISTEN 없음(건드리지 않음). lint·typecheck·test·i18n:check·qa:static은 저장소에서 `corepack pnpm`으로 순차 실행. build·E2E·직접 시험은 `git archive 80a647e`를 스크래치패드 `wt`에 풀어 진행함. `node_modules`는 저장소 것을 junction으로 읽기만 했고, `.env`를 복사했으며, **pnpm/corepack은 쓰지 않음**. CLI는 node로 직접 실행함. 서버는 `next start` 4개: 3310 기본, 3311 DEMAND_MAP, 3312 PUBLIC_JOBS, 3313 EMPLOYER_CANDIDATES, 모두 `TRUST_PROXY=true`. E2E는 `E2E_PORT=3310`으로 실행했고, 복사본 `node_modules/.bin`을 PATH 앞에 둠.
- 직접 시험:
  - (1) R-213 핸들러를 개발 DB에서 **이번에 만든 시험 행으로만 scope**를 좁혀 실행함. `now` 주입, 모의 provider 사용(`wt/qa_tmp/r213.ts`).
  - (2) R-214는 DB 없이 시험함. `SMTP_*`는 프로세스 환경에 넣지 않고 함수 인자로만 넘김. 모의 transport를 썼고 `net`/`tls`/`dns` 호출을 감시함.
  - (3) 워커는 개발 클러스터에 **새로 만든 빈 DB `qa_p2d_worker_tmp`**에 띄움. pg-boss 스케줄 등록을 확인한 뒤 종료하고 DB를 지움. 예약 작업은 0건 실행됨. 개발 DB의 `pgboss.schedule`은 바뀌지 않음.
  - (4) 화면 시험은 복사본 안 스크래치 스펙 `qa_p2d_*.spec.ts`로 함(desktop-chromium, workers 1). 직원은 실제 로그인 + TOTP, 기업은 이메일 로그인, 구직자는 OTP 로그인(시험 헬퍼로 코드만 교체).
- 외부 전송 없음. SMTP 환경변수 설정 없음, 실제 nodemailer transport 생성 0, 네트워크 시도 0.
- 정리:
  - 서버 4개와 워커를 종료함(3310~3313 LISTEN 0).
  - junction을 PowerShell `(Get-Item …).Delete()`로 먼저 끊음(`Test-Path` False). 그 뒤 저장소 `node_modules`를 확인함: `.pnpm` 916개, `next`·`@playwright/test`·`vitest`·`tsx`·`@prisma/client`·`.bin` 있음.
  - 그다음 작업 트리와 로그를 삭제함.
  - 끝에 저장소에서 `corepack pnpm test`를 돌림: **83 files / 602 tests 통과**.
  - `git status`: `.workflow/` 기존 변경 4개, 미추적 `.claude/`·`.workflow/qa/`.
  - `.env` 값 출력 없음, 개발 DB 행 삭제 없음, `.claude/` 건드리지 않음.
  - 스크린샷은 스크래치패드 `shots/qa_p2d_*.png` 21개.

## 결과 요약
- 통과: 24 / 전체: 24 (통과율 100%), 판정불가 0
- 필수 항목 실패: 0
- 결함: 없음
- 관찰: O-1 ~ O-8 (O-1은 운영 전에 결정이 필요함)

## 검증 명령 (순차 실행)
| 명령 | 위치 | 종료 코드 | 결과 |
|---|---|---|---|
| `corepack pnpm test` (시작 기준선) | 저장소 | 0 | 83 files / 602 tests 통과 |
| `corepack pnpm lint` | 저장소 | 0 | 오류·경고 없음 |
| `corepack pnpm typecheck` | 저장소 | **2** | 오류 3건. 모두 사용자 `.next/types/app/[locale]/(public)/employer/candidates/page.ts`·`.next/types/validator.ts`(옛 경로)에서 남. P2c run 1~3과 같은 원인 |
| `tsc --noEmit` | 작업 트리(80a647e, build 후) | 0 | 오류 없음 |
| `corepack pnpm i18n:check` | 저장소 | 0 | ko 1183 keys, 6 locales, errors 0 |
| `corepack pnpm qa:static` | 저장소 | 0 | errors 0, warnings 19(P2c 17 + `notifications/index.ts:57`·`smtp.ts:92`의 `console.info` 2건. 어댑터 로그는 설계상 의도) |
| `corepack pnpm test` × **3회 연속** | 저장소 | 0·0·0 | 3회 모두 83 files / 602 tests 통과(기준선 포함 4/4, 간헐 실패 0) |
| `next build` | 작업 트리 | 0 | 1회에 성공. `/admin/rules`·`/admin/rules/[id]`·`/admin/score-tables`·`/admin/score-tables/[id]` 포함 |
| `E2E_PORT=3310 playwright test --reporter=line` (전체 1회) | 작업 트리 | 0 | **270 passed (2.4m)**, 실패·flaky 0(admin-rules·still-searching 신규 스펙 포함) |
| `corepack pnpm test` (끝) | 저장소 | 0 | 83 files / 602 tests 통과 |

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| 1 | R-213 30일 상태 확인 발송(시간 주입) | `runStatusCheck(2027-05-10T01:00Z, scope=시험 4명, 모의 provider)`. 대상: S(마지막 확인 정확히 30일 전, vi), S(30일−1분), NOT_SEARCHING(40일), A(31일). 같은 시각에 재실행함. 실패 provider로 1명 시험 | Pass | 1차 `sent 2`: 30일 S(vi)와 31일 A(ko)에 SMS+EMAIL 각 1통. 템플릿 `common.statusCheck.{sms,email}`, 링크 `/{vi\|ko}/seeker/still-searching/<token>`, `days 14`. 30일−1분과 NOT_SEARCHING은 `statusCheckSentAt null`. 재실행 `sent 0`(중복 없음). 실패 provider는 `failed 1`이고 `statusCheckSentAt`가 null로 되돌아감(다음 실행에서 재시도) |
| 2 | R-213 원클릭 링크: 페이지 열람만으로 변경 없음, 1회용, 재사용·위조·만료 거부 | 실서버 3310. 열린 확인 1건의 토큰으로 페이지 2회 + GET 1회 → DB 비교. 다른 컨텍스트(375)에서 같은 링크를 연 채로 첫 컨텍스트가 "네" → 두 번째 컨텍스트에서 남은 버튼을 누름. 위조(다른 구직자 payload + 원 서명), 이전 확인 토큰, 15일 전 발송 토큰, `abc`, `%E0%A4%A`, "." 구분자 토큰 | Pass | 열람 3회 뒤 `statusCheckSentAt`·`lastActiveConfirmedAt` 그대로. `x-robots-tag: noindex, nofollow`. 응답 뒤 `statusCheckSentAt null`, 확인 시각 갱신. **재사용**: 결과 `answered`, `lastActiveConfirmedAt` 변화 없음, 새로고침하면 `ANSWERED`(버튼 없음). 위조 `INVALID`, 만료 `EXPIRED`(행은 변경 없음), 이전 확인 `ANSWERED`(변경 없음), `abc`·"." 구분자 `INVALID`, `%E0%A4%A`는 HTTP 400. 500·"Application error" 0. 페이지 HTML에 전화·이메일 없음. 6개 언어 h1·`<html lang>` 일치. `qa_p2d_still_ask_375.png`, `qa_p2d_still_done_1280.png` |
| 3 | R-213 14일 무응답 → INACTIVE + S→A 강등 + 감사 | 항목 1의 두 명을 발송 + 14일 − 1ms에 실행 → 발송 + 14일에 실행 | Pass | 14일−1ms: 둘 다 ACTIVE. 14일: `inactivated 2, demoted 1`. S는 `INACTIVE / A`, A는 `INACTIVE / A`. 둘 다 `statusCheckSentAt null`. 감사 1행: actor `SYSTEM`, `SEEKER_GRADE_CHANGE`, meta `{"from":"S","to":"A","reason":"STATUS_CHECK_NO_REPLY","status":"INACTIVE"}`. A→A는 감사 없음 |
| 4 | R-213 체류 만료 D-90/60/30 경계(KST), 행정사 업무, 중복 없음 | 만료 2027-03(저장 2027-03-01) 구직자 3명: 알림 동의, 비동의, BLOCKED. `runStayExpiryAlerts`를 KST 경계로 10회 실행: 11-30 23:59:59 KST(D-91) / 12-01 00:00 KST(D-90) / 같은 날 재실행 / D-89 / D-61 / D-60 / D-31 / D-30 / D-1 / D-0 | Pass | D-91: 업무 0. D-90(KST 자정 정각): 업무 2(동의·비동의). 알림은 동의자(ru)에게만 SMS+EMAIL `days=90`. 같은 날 재실행·D-89·D-61: 0. D-60: +2. D-31: 0. D-30: +2. D-1·D-0: 0. BLOCKED는 0. 업무 6건 모두 `STAY_EXPIRY`, `assigneeRole STAFF_VISA`, `dueAt 2027-03-01`, `dedupeKey STAY_EXPIRY:{id}:2027-03-01:D-{90\|60\|30}`, payload는 코드·숫자만(`notified` 동의자 true, 비동의자 false). `STAY_EXPIRY` 업무를 만드는 다른 코드 0건(grep) |
| 5 | R-213 노쇼 2회 이상 우선순위 하향, 기업에 노출 안 됨 | 같은 시험 비자 구직자 3명: X는 S 등급 + 노쇼 2, Y는 A + 노쇼 1, Z는 A + 0. 결과 기록은 관리자 폼이 쓰는 `recordInterviewResult`로 함. 새 공고 `/admin/matching/{id}?scope=visa`, `/admin/seekers/{X}`를 엶. 기업(3313) 후보 API·HTML, 요청 API | Pass | `noShowCount` X 2·Y 1·Z 0. 정렬은 **Y, Z, X**(S 등급인 X가 맨 뒤). `no-show-mark` 1개 "노쇼 2건 · 우선순위 낮춤". 구직자 상세는 "2건 · 추천 우선순위 낮춤(내부 표시)". 기업 후보 API 200, 3명 모두 있고 `noShow`·"노쇼" 문자열 0. HTML·요청 API도 0. `qa_p2d_noshow_matching_1280.png` |
| 6 | R-213 워커 기동 로그(스케줄 등록, 어댑터 선택) | `DATABASE_URL`=빈 시험 DB로 `tsx scripts/worker.ts` 실행 → 로그와 `pgboss.schedule` 확인 → 종료 | Pass | 로그 1행 `notification.provider` `{"EMAIL":"console","SMS":"console","STAFF":"console"}, smtp "disabled", reason "SMTP_HOST_UNSET"`. 다음 행 `worker.started`에 작업 4개(`leads.archive-stale 15 3`, `seekers.status-check 0 10`, `seekers.stay-expiry 30 10`, `seekers.no-show-sync 45 3`, 모두 `Asia/Seoul`). 시험 DB `pgboss.schedule` 4행, `pgboss.job` 0행. 개발 DB 스케줄은 바뀌지 않음(1행, 2026-11-16 그대로) |
| 7 | R-214 콘솔 어댑터, SMTP 미설정 시 비활성(발송 시도 0, 네트워크 0) | 프로세스 환경 `SMTP_*` 0개 상태에서 `getNotificationProvider()`로 EMAIL·SMS 발송. 부분 설정 4종을 인자로 넘김. `net.Socket.connect`·`tls.connect`·`dns.lookup` 감시 | Pass | provider `console`, EMAIL·SMS 모두 console `ok`. 로그 수신자는 `***st`·`***78`(마스킹). 부분 설정 사유: `SMTP_HOST_UNSET`·`SMTP_FROM_UNSET`·`SMTP_AUTH_INCOMPLETE`·`SMTP_PORT_INVALID`(모두 비활성). **네트워크 시도 0건**(전체 스크립트 기준) |
| 8 | R-214 모의 transport 렌더(6개 언어), 로그에 비밀값 없음 | 인자 env(가짜 host·user·pass) + 모의 transport로 `common.statusCheck.email`·`common.stayExpiry.email` × 6개 언어. 템플릿 없음, SMS 채널, 주소가 담긴 transport 오류도 시험 | Pass | 12통 모두 `ok`. 제목 12개가 모두 다르고 언어별 문구가 맞음(예: vi "Bạn vẫn đang tìm việc chứ?", uz "Hali ham ish qidiryapsizmi?"). 본문에 링크·일수 있음, 남은 `{변수}` 0. 라우팅은 EMAIL→smtp, SMS·STAFF→console. 선택·발송 로그에 host·user·pass·주소·전화 문자열 0. 템플릿 없음은 `TEMPLATE_MISSING`, SMS는 `CHANNEL_UNSUPPORTED`. transport 오류는 `SEND_FAILED`이고 로그는 `error:"EENVELOPE"`만 남음(주소 없음). production 콘솔 로그에 params 없음 |
| 9 | R-215 초안 → 게시(reviewedBy/At) → 이전 버전 RETIRED, 감사 | STAFF_VISA 실제 로그인 → `/admin/rules`에서 C-4·제조업(C)·GREEN 더미 규칙 저장 → 게시 대화상자 → 게시 → "새 버전 만들기" → 판정 RED로 저장 → 게시 → 폐기 | Pass | v1 DRAFT → PUBLISHED, `reviewedBy`=로그인한 직원, `reviewedAt` 기록. 화면에 "E2E 직원 · 2026. 11. 17. 21:30". v2 게시 → v1 `RETIRED`, 같은 `ruleKey`, 버전 1·2. 감사 3행: `{"change":"PUBLISH","version":1,"retiredIds":[]}`, `{"change":"PUBLISH","version":2,"retiredIds":[v1]}`, `{"change":"RETIRE","version":2}`, actor 모두 해당 직원. `qa_p2d_rule_publish_dialog_1280.png`, `qa_p2d_rule_published_1280.png` |
| 10 | R-215 DRAFT 미사용 + 게시 후 `/visa-check` 결과 변화(PLAN QA 방법) | JS 끈 공개 컨텍스트에서 `/ko/visa-check?visaCode=C-4&industryCode=C`를 단계마다 엶. 대조군으로 업종 F | Pass | 기준선 YELLOW "확인 필요". **DRAFT 저장 뒤 YELLOW 그대로**. v1 게시 뒤 **GREEN "가능성 높음"**(업종 F는 YELLOW 유지). v2 DRAFT 동안 GREEN 그대로. v2 게시 뒤 **RED "어려움"**. 폐기 뒤 YELLOW로 돌아옴. **시험 규칙은 v1·v2 모두 RETIRED로 남겨 공개 계산에 남지 않음(삭제 안 함)**. `qa_p2d_visa_check_after_publish_1280.png` |
| 11 | R-215 샘플 게시 거부(서버 액션 직접 포함) | 항목 9의 게시 요청(`Next-Action` 헤더·본문)을 기록한 뒤, id만 `sample-rule-1`로 바꿔 STAFF_VISA 쿠키로 재전송 | Pass | 응답 `SAMPLE_NOT_PUBLISHABLE`, `sample-rule-1`은 DRAFT 그대로. 화면에 "샘플 · 실제 기준 아님" 배지와 안내 문구 |
| 12 | R-215 STAFF_PLACEMENT 거부(화면 + 서버 액션 직접) | STAFF_PLACEMENT 실제 로그인 → `/admin/rules`, `/admin/rules/{v2}`. 기록한 게시 액션을 v2(DRAFT)로 바꿔 STAFF_PLACEMENT 쿠키로 직접 POST. 로그인 없는 컨텍스트로도 직접 POST | Pass | 두 화면 모두 `admin-forbidden`. 직접 호출 응답 `{"ok":false,"code":"FORBIDDEN"}`, v2는 DRAFT, v1은 PUBLISHED 그대로. 익명은 307 → `/admin/login`, 변경 없음. 점수표 화면 거부는 E2E admin-rules(두 프로젝트)로 확인 |
| 13 | 선행 A: ko 24시간제(전 화면 grep + 실화면) | grep: `src` 전체에서 `toLocale*String`·`Intl.DateTimeFormat`·`hour12`·`timeStyle`·`format.dateTime` 사용처. 실화면: 면접 시각 2026-12-22 18:30 KST를 기업 `/ko/employer/requests`, 구직자 `/ko/seeker/me`, 관리자 추천 상세에서 확인 | Pass | 시각을 표시하는 코드는 `src/i18n/dateTime.ts`(h23 부품 조립) 하나뿐. 나머지 `Intl.DateTimeFormat`은 `en-CA` 날짜 키·연도 계산·월 표시라 시각 표시가 아님. 기업 "2026. 12. 22. 18:30", 구직자 "2026. 12. 22. 18:30 면접", 관리자 "18:30", 모두 PM·AM·오전·오후 0. 관리자 규칙 화면도 "21:30". `qa_p2d_24h_{employer_ko,seeker_ko,admin}_1280.png` |
| 14 | 선행 A: 종료 면접 동의 서버 차단 | 구직자 화면에 "동의" 버튼이 보이는 상태에서 서버 쪽에서 결과(불합격)를 기록 → 화면을 새로 고치지 않고 "동의"를 누름 | Pass | 알림 "면접이 끝나 이 면접 건의 이름 제공도 끝났습니다. 더 답할 필요가 없습니다.", 동의 행 0(활성 0). 새로고침하면 `ENDED`. `qa_p2d_ended_agree_refused_1280.png` |
| 15 | 선행 A: 감사 meta 연락처 키 금지 | `assertSafeMeta`에 키 `phone`·`email`·`messengerId`(cuid 값)·`messengerType`·`contactPhone`·`seekerEmail`·`phoneHash`·중첩 `kakaoId`·`mobile`·`whatsapp`을 넣음. 정상 키 4종을 대조군으로 넣음. `writeAudit` meta 리터럴에 연락처 키가 있는지 grep | Pass | 연락처 키 10종 모두 `must not be logged`(id 예외보다 먼저 거부). `seekerId`·`filters`·`resultCount`·`change/version/retiredIds`는 통과. grep 0건 |
| 16 | 선행 A: 다이얼로그 안 오류 | 쿠키를 지운 뒤 (a) 동의 내역 BLIND_PROFILE "동의 철회" → "철회하기"(1280·375), (b) 면접 동의 "동의 철회" → 확인 | Pass | (a)(b) 모두 대화상자가 열린 채 그 **안에** `role=alert` "다시 로그인해 주세요."(`consent-dialog-error`·`interview-consent-dialog-error`가 dialog 안에 1개). 동의는 활성 그대로. `qa_p2d_dialog_error_{1280,375}.png`, `qa_p2d_iv_revoke_dialog_error_1280.png`. (run 3 O-1 해결) |
| 17 | 선행 A: 후보 필터 이상값 500 없음 | 계약 기업으로 3313에서 `visa=010-2345-6789`, `convertible=a@b.com`, `industry=<script>`, `visa=Z×300`, `visa=E-9&industry=010.1234.5678`를 API·페이지 각각 호출 | Pass | 10개 응답 모두 200(run 3 O-2는 500이었음). CANDIDATE_BULK_VIEW meta `filters`에서 모르는 값은 빠짐(`{}` 또는 `{"visa":"E-9"}`), 전화·이메일 모양 0 |
| 18 | 선행 A: 면접 폼 입력 유지 | 관리자 추천 상세 면접 등록에 일시 `2026-12-24T14:05`, 장소 "본사 회의실 010-2345-6789" → 저장 | Pass | `PLACE_HAS_CONTACT` 알림. 입력값이 `{at:"2026-12-24T14:05", place:"본사 회의실 010-2345-6789"}` 그대로 남음. 면접 행은 늘지 않음(1). (run 3 O-3 해결) |
| 19 | 선행 A: 매칭 적합 건수 표시 | 적합자 408명인 기존 공고 `/admin/matching/cmwjtojix…?scope=visa`. 시험 공고(3명) | Pass | "적합 구직자 전체 408명 · 상위 100명 표시", `data-total=408`, 행 100, 안내 "목록은 한 번에 100명까지 보여 줍니다…". 3명 공고는 "적합 구직자 전체 3명"(잘림 안내 없음). `qa_p2d_matching_total_1280.png` |
| 20 | 법령 수치 하드코딩 0, '지원하기' 0 | `git diff 6af69eb 80a647e -- src prisma messages`에 추가된 숫자 리터럴·비자 코드 리터럴·`passScore`/`points` 확인. `지원하기`를 `src`·`messages`·`content`에서 grep | Pass | 새 수치는 운영 수치만: `STATUS_CHECK_REPLY_DAYS 14`·D-90/60/30(WO §7.7), 크론, 배치 200, JSON 20,000자, SMTP 포트 587/465. 비자 점수·요건 값 0. 점수표 기본 이름도 DB 값을 읽음(`E74_SLUG`). '지원하기'는 "쓰지 않는다"는 주석 6곳뿐, 화면 문구 0 |
| 21 | 6개 언어 | `i18n:check`. still-searching 6개 언어 화면, 알림 템플릿 6개 언어(항목 8) | Pass | errors 0(1183 keys). 6개 언어 h1·`lang` 일치, 이메일 12종 렌더 |
| 22 | 375 가로 스크롤 없음, 터치 44×44 | 375 모바일 컨텍스트에서 still-searching(ko·ru), `/admin/rules`, 규칙 상세(RETIRED, SAMPLE), `/admin/score-tables`, 점수표 상세(SAMPLE E-7-4)의 `scrollWidth`와 모든 a·button·select·input·textarea·summary(인라인 링크 제외) 크기 측정 | Pass | 7개 화면 모두 넘침 0, 44px 미만 0(측정 요소 14~37개). still-searching 버튼 217×52. 신규 E2E(두 프로젝트)도 375에서 버튼 44 이상 확인 |
| 23 | 회귀: P2c(동의·실명·원장), P2b(후보·누출 0), E2E 전체 | E2E 전체 1회. 직접 시험: 기업 후보 API·HTML, 요청 API·HTML, RSC를 전화·이메일 정규식, 구직자 번호, 실명, 숨긴 이메일로 검사 | Pass | E2E 270/270(employer-requests·employer-candidates·admin-matching·consent-revoke·seeker-recommended·wizard·auth 포함). 직접 검사 응답 모두 200, 전화 0·이메일 0·번호 0·실명 0(동의 전) |
| 24 | 검증 명령 7종 | 위 명령 표 | Pass | lint·test(4/4 + 끝 1회)·i18n·qa:static·build·E2E 모두 0. typecheck는 저장소에서 2지만 원인은 사용자 `.next`의 옛 경로이고, 작업 트리 `tsc` 0으로 통과(P2c와 같은 판단) |

## 판정불가 / 사람 확인 필요
없음. 다만 O-1은 운영 전에 사람 결정이 필요하다.

## 결함 목록 (Fail만)
없음.

## 관찰 / 기준 외 발견
| 번호 | 내용 | 재현·증거 | 영향 | 제안 |
|---|---|---|---|---|
| O-1 | **실제 채널 없이 상태 확인이 돌면 구직자가 대량으로 비활성화된다.** 콘솔 어댑터는 항상 `ok:true`를 돌려준다. `notifySeeker`는 이것을 "전달됨"으로 세고, `runStatusCheck`는 `statusCheckSentAt`를 확정한다. SMTP가 없고(A-3 미승인) SMS 실제 어댑터도 없는(Phase 3) 상태에서 워커를 운영 DB에 띄우면 메시지를 실제로는 아무도 받지 못한다. 그런데도 14일 뒤 마지막 확인 30일 경과자가 모두 INACTIVE가 되고 S는 A가 된다 | `src/lib/notifications/console.ts`(항상 ok). 항목 1: 콘솔과 같은 성공 provider로 `sent`가 집계되고, 항목 3: 14일 뒤 INACTIVE·강등. 워커 로그는 `smtp "disabled"`인데도 작업은 등록됨(항목 6) | 높음(운영 데이터). PRD 기준(콘솔 어댑터, SMTP 미설정 시 비활성)은 충족 | production에서는 콘솔 전달을 "미전달"로 보거나, 실제 채널이 없으면 `seekers.status-check`를 등록·실행하지 않게(또는 플래그로) 막을지 사람이 결정 |
| O-2 | 워커는 `tsx scripts/worker.ts`로 돌고 `NODE_ENV`를 정하지 않는다. 그래서 콘솔 어댑터가 production 분기로 가지 않고 `params`를 로그에 쓴다. 상태 확인의 `params.url`에는 14일 동안 유효한 원클릭 토큰이 들어 있다(OTP처럼 쓰는 사람 확인 수단) | 항목 7: 기본 로그에 `"params":{"url":…,"days":14}`. 콘솔 어댑터는 `env === "production"`일 때만 params를 뺌 | 중간 이하(로그 열람자가 남의 "구직 중" 응답을 대신 누를 수 있음. 바뀌는 것은 확인 시각뿐) | 워커 실행 시 NODE_ENV 지정 또는 콘솔 로그에서 `url` 마스킹 |
| O-3 | 규칙에 고를 수 있는 안내 문구가 2개뿐이다(`visa.result.needsReview`, `visa.rule.sample.placeholder`). 그래서 GREEN·RED 규칙을 게시해도 공개 결과에는 "가능성 높음" 아래에 "등록된 판정 기준과 일치하지 않아 행정사 확인이 필요합니다."가 나온다(판정과 문구가 어긋남) | 항목 9 `messageKeys`, 화면 "판정 가능성 높음 / 안내 문구 등록된 판정 기준과 일치하지 않아…" | 실제 값 입력(A-6) 전에는 공개 영향 없음 | 행정사가 판정별 안내 문구(6개 언어, A-7 검수)를 정할 때 키 추가. 추정해서 만들지 않음(BR-12) |
| O-4 | 샘플 규칙 상세 화면에도 "게시" 버튼이 보인다. 누르면 서버가 `SAMPLE_NOT_PUBLISHABLE`로 거부한다. 화면에 "__sample 표시를 지운 뒤 저장해야 게시" 안내가 있다 | 항목 11 `samplePageHasPublishButton 1` | 낮음 | 기록만(또는 샘플이면 버튼 비활성) |
| O-5 | 이전 확인의 토큰(같은 구직자, 이미 응답함)은 `ANSWERED`로 표시된다. 만료 문구가 아니다. 변경은 없다 | 항목 2 `stale → ANSWERED` | 없음 | 기록만 |
| O-6 | 직접 시험 스크립트 문제로 2회 재실행했다. 링크 스펙은 상태 읽기 대기 시간 초과 때문에 토큰을 새로 만들어 재실행했다. 선행 A 스펙의 동의 철회 단계는 새로고침 직후 클릭이 겹쳐서 별도 스펙으로 다시 시험했고 1280·375 모두 통과했다. 제품 결함 아님 | — | 없음 | — |
| O-7 | 시험 행이 개발 DB에 남음(삭제하지 않음). 상태 확인 시험 구직자 7명과 링크용 3명. 체류 만료 시험 3명과 **OPEN StaffTask STAY_EXPIRY 6건**(만기 2027-03-01, 직원 업무 목록에 보일 수 있음). 노쇼·선행 A·누출 시험의 기업 4·공고 5·구직자 약 9·추천·면접. 비활성 VisaType 시험 태그(`E2EV-…`). C-4 더미 규칙 v1·v2(**둘 다 RETIRED**, 공개 영향 없음). 직원 계정 약 6개. 감사 행 | 항목 1~5·9~19 | 개발 화면에 시험 데이터가 보임 | 정리 스크립트 또는 E2E 전용 DB(이전 run과 같음) |
| O-8 | `corepack pnpm typecheck`는 사용자 `.next/types`의 옛 경로 때문에 계속 실패한다 | 명령 표 | 코드 영향 없음 | 사용자 `.next` 삭제 또는 재빌드(사람 판단) |

## P2c run 3 관찰 처리 확인
| run 3 항목 | 확인 결과 |
|---|---|
| O-1(대화상자 안 실패 문구가 가려짐) | 해결(항목 16) |
| O-2(후보 필터 전화 모양 값 → 500) | 해결(항목 17) |
| O-3(면접 폼 서버 오류 뒤 입력 비워짐) | 해결(항목 18) |
| O-5(매칭 목록 100행 제한 표시 없음) | 해결(항목 19) |
| O-6(ko "PM 2:00") | 해결(항목 13, Q-26) |
| O-7(시험 행 잔존) | 그대로(O-7) |
