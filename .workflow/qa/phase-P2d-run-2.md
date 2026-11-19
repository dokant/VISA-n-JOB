# QA 보고서 — Phase P2d / run 2 (재확인·회귀)

- 대상 커밋:
  - cc82f00: Q-27 실제 채널 전달 시에만 14일 전이, 콘솔 로그 링크 마스킹, 샘플 게시 버튼 숨김, 합격 점수 fmtCount, 관리자 문구를 lib에서 분리
  - 71865f3: O-4 E2E 보강
  - HEAD는 71865f3
- 기준 문서:
  - PRD R-213·R-214·R-215
  - PLAN `### P2d` QA 방법
  - DECISIONS Q-27(실제 채널로 1건 이상 전달된 확인만 비활성화·강등 근거, 워커 시작 경고, 콘솔 토큰 URL 마스킹)
  - run 1 보고서(O-1·O-2·O-4)
  - CLAUDE.md
- 일시: 2026-11-17 22:35 ~ 23:05 (KST)
- 환경:
  - Windows 11, 개발 DB(127.0.0.1:54320). `prisma migrate status` 결과 11 migrations, `20261120100000_p2d_status_check_delivery` 적용됨.
  - 포트 3000은 건드리지 않았다. 시작과 끝 모두 LISTEN 없음.
  - 저장소에서 `corepack pnpm`으로 순차 실행: lint, typecheck, test, i18n:check, qa:static.
  - build, E2E, 직접 시험은 `git archive 71865f3`를 스크래치패드 `wt`에 풀어서 했다.
    - `node_modules`는 저장소 것을 junction으로 연결해 읽기만 했다. `.env`는 복사했다.
    - pnpm과 corepack은 쓰지 않았고, CLI는 node로 직접 실행했다.
  - 서버는 `next start` 4개, 모두 `TRUST_PROXY=true`:
    - 3310: 기본
    - 3311: DEMAND_MAP
    - 3312: PUBLIC_JOBS
    - 3313: EMPLOYER_CANDIDATES
  - E2E는 `E2E_PORT=3310`으로 실행했다. 복사본 `node_modules/.bin`을 PATH 앞에 두었다.
- 직접 시험:
  - (a) Q-27, 회귀 R-213: `tsx`로 핸들러를 실행했다.
    - 대상은 개발 DB에서 **이번에 만든 시험 행으로만 scope**를 좁혔다. 시각은 `now`로 주입했다.
    - SMTP는 `selectNotificationProvider({env: 가짜 SMTP_*, transport: 모의})`처럼 **인자로만** 넘겼다. 프로세스 환경에는 `SMTP_*`가 0개였다.
    - `net.Socket.connect`, `tls.connect`, `dns.lookup`을 감시했다. DB 포트 외 호출은 **0건**이었다.
  - (b) 워커: 개발 클러스터에 **새로 만든 빈 DB `qa_p2d2_worker_tmp`**에서 띄웠다.
    - 순서: `migrate deploy` → `tsx scripts/worker.ts`(NODE_ENV 없음, SMTP 없음) → 로그와 스케줄 확인 → 종료 → DB 삭제(삭제 확인 0).
    - 개발 DB `pgboss.schedule`은 변하지 않았다.
  - (c) 화면 시험: 복사본 안의 스크래치 스펙 `qa_p2d2.spec.ts`(desktop-chromium, workers 1).
    - 직원은 실제 로그인과 TOTP를 거쳤다.
    - 공개 `/visa-check`는 JS를 끈 컨텍스트로 열었다.
  - (d) 로그 마스킹: DB 없이 콘솔 어댑터를 `NODE_ENV`가 없음, development, test, production인 4가지 경우로 실행했다. 이어서 이번 run의 모든 로그를 grep했다.
- 외부 전송 없음:
  - 실제 nodemailer transport는 생성하지 않았다.
  - 네트워크 시도 0건.
  - `.env` 값은 출력하지 않았다.
- 정리:
  1. 서버 4개를 종료했다. 3310~3313 LISTEN 0.
  2. junction을 PowerShell `(Get-Item …).Delete()`로 먼저 끊었다. `Test-Path` 결과 False.
  3. 저장소 `node_modules`를 확인했다.
     - `.pnpm`에 915개가 있다. run 1은 916개였는데, 이번 run에서 설치 명령은 실행하지 않았다.
     - `next`, `@playwright/test`, `vitest`, `tsx`, `@prisma/client`, `.bin`이 있다.
  4. 작업 트리와 로그를 삭제했다.
  5. 끝에 저장소에서 `corepack pnpm test`를 돌렸다: **83 files / 611 tests 통과**.
  6. `git status`: `.workflow/` 기존 변경 4개, 미추적 `.claude/`·`.workflow/qa/`. 개발 DB 행은 삭제하지 않았고 `.claude/`는 건드리지 않았다.
  7. 스크린샷은 스크래치패드 `shots/qa_p2d2_*.png`에 7개 있다.

## 결과 요약
- 통과: 16 / 전체: 16 (통과율 100%), 판정불가 0
- 필수 항목 실패: 0
- 결함: 없음
- 관찰: O-1 ~ O-5

## 검증 명령 (순차 실행)
| 명령 | 위치 | 종료 코드 | 결과 |
|---|---|---|---|
| `corepack pnpm test` × **5회 연속** | 저장소 | 0·0·0·0·0 | 5회 모두 83 files / 611 tests 통과. 간헐 실패 0. `tests/unit/app/api/auth/[...nextauth]/route.test.ts`(4 tests)는 5회 모두 통과했고 380~738ms 걸렸다. "checks seeker sign-ins by hashed phone"도 실패하지 않아 원인 분석은 하지 않았다(재현되지 않음) |
| `corepack pnpm lint` | 저장소 | 0 | 오류·경고 없음 |
| `corepack pnpm typecheck` | 저장소 | **2** | 오류 3건. 모두 사용자 `.next/types`의 옛 경로 `(public)/employer/candidates`에서 났다. run 1과 같은 원인 |
| `tsc --noEmit` | 작업 트리(71865f3, build 후) | 0 | 오류 없음 |
| `corepack pnpm i18n:check` | 저장소 | 0 | ko 1183 keys, 6 locales, errors 0 |
| `corepack pnpm qa:static` | 저장소 | 0 | errors 0, warnings 20. run 1의 19건에 `jobs/statusCheck.ts:229`의 `console.info`(기본 로그 싱크, 설계상 의도) 1건이 늘었다 |
| `next build` | 작업 트리 | 0 | 1회에 성공. 경고는 jose의 Edge Runtime 안내(기존)뿐. `/admin/rules`, `/admin/score-tables` 등 포함 |
| `playwright test` 전체 1차 | 작업 트리 | 1 | **268 passed / 4 failed**. 실패 4건은 모두 mobile-375의 관리자 로그인 구간(147~148번째 무렵)에서 났다: auth R-118 2건, admin-rules R-215 2건. 그 중 2건의 로그에 `Target crashed`(브라우저 렌더러 충돌)가 있다. 서버 로그에는 해당 시각의 오류가 없다 |
| 실패 스펙 재실행(auth + admin-rules, mobile-375) | 작업 트리 | 0 | 11 passed |
| `playwright test` 전체 2차 | 작업 트리 | 0 | **272 passed (2.8m)**, 실패·flaky 0(O-4 신규 테스트 포함) |
| `corepack pnpm test` (끝) | 저장소 | 0 | 83 files / 611 tests 통과 |

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| 1 | Q-27 콘솔만: 14일·28일 후 상태·등급 변화 없음, 확인 재발송, 감사 없음 | S·A 구직자 2명(마지막 확인 30일 전). provider는 `selectNotificationProvider({env:{}})`로 모든 채널이 console. T0 → T14−1ms → T14 → T28 순서로 `runStatusCheck` 실행 | Pass | T0: `sent 2, sentSimulated 2`, 플래그 `statusCheckDeliveredReal false`. T14−1ms: 변화 0. T14: `simulatedExpired 2`이고 같은 실행에서 재발송(`sent 2, sentSimulated 2`). 두 명 모두 `ACTIVE`이고 등급은 S/A 그대로. 감사 0, `statusCheckSentAt`=T14. T28도 같다(ACTIVE·S/A, 감사 0, `statusCheckSentAt`=T28). 메시지는 12통(SMS+EMAIL × 2명 × 3회). 실행마다 `status_check.simulated` warn 1줄이 남고 건수만 있다(id 없음) |
| 2 | Q-27 모의 실제 채널 → 14일 INACTIVE·S→A·감사 | (a) 혼합 S: EMAIL은 SMTP 어댑터와 모의 transport, SMS는 console(실제 라우터). (b) SMTP 전용 provider(EMAIL REAL, SMS `CHANNEL_UNSUPPORTED`)로 A 1명 | Pass | (a) T0: `sent 1, sentSimulated 0`, 플래그 true, 모의 메일 1통. T14−1ms: ACTIVE·S. T14: `inactivated 1, demoted 1` → `INACTIVE / A`, 플래그 false, `statusCheckSentAt null`. 감사 1행: `SEEKER_GRADE_CHANGE`, actor `SYSTEM`, meta `{"from":"S","to":"A","reason":"STATUS_CHECK_NO_REPLY","status":"INACTIVE"}`. T28: 변화 없음(재발송 없음). (b) T14: `inactivated 1, demoted 0`, A→A이므로 감사 0 |
| 3 | Q-27 혼합(SMS 콘솔 + 이메일 실제) → 전이 | 항목 2(a) | Pass | `deliveredReal ≥ 1`이면 플래그 true가 되고 14일에 전이된다(위 증거) |
| 4 | Q-27 실제 채널 전송 실패 → 전이 없음 | (a) 모의 transport가 `EENVELOPE`를 던지고 SMS는 console. (b) SMTP 전용 provider에 실패 transport(모든 채널 실패) | Pass | (a) T0: `sent 1, sentSimulated 1`, 플래그 false. T14: `simulatedExpired 1`이고 재발송함. `ACTIVE / S` 그대로, 감사 0. (b) `failed 1`, `statusCheckSentAt null`(claim 해제, 다음 실행에서 재시도) |
| 5 | Q-27 링크 응답 후 플래그 초기화 | 혼합 provider로 S 1명에게 발송. 발송 메시지의 링크 토큰으로 T+3일에 `confirmStillSearching`. 이후 T14 실행, 같은 토큰 재사용 | Pass | 응답 전: 플래그 true. `{"ok":true}` 뒤: `statusCheckSentAt null`, **플래그 false**, `lastActiveConfirmedAt` = T+3일. T14: 모든 카운터 0, `ACTIVE / S`. 재사용 결과 `{"ok":false,"state":"ANSWERED"}` |
| 6 | Q-27 워커 시작 경고 로그(빈 시험 DB) | 항목 (b) 환경 | Pass | 첫 줄 `notification.provider`: routes 모두 console, `smtp "disabled"`, `realChannels []`, `reason "SMTP_HOST_UNSET"`. 둘째 줄 `{"level":"warn","event":"status_check.transition_disabled","reason":"NO_REAL_CHANNEL","message":"No real notification channel (console only): … the 14-day no-reply INACTIVE / S→A transition is disabled."}`. 셋째 줄 `worker.started`에 작업 4개(`Asia/Seoul`). 시험 DB 스케줄 4행, job 0. SMTP를 켠 선택(인자 env + 모의 transport)에서는 `realChannels ["EMAIL"]`, `realChannelWarning` = null |
| 7 | Q-27 관리자 구직자 상세 표시 | 오늘 시각으로 연 확인 2건을 만들었다(실제 채널 1, 콘솔 1). ADMIN 실제 로그인 후 `/admin/seekers/{id}` 2개 화면 확인 | Pass | 실제 채널: "상태 확인 응답 대기 2026. 11. 17. 22:50 발송 · 14일 안에 응답이 없으면 비활성". 콘솔: "… 22:50 기록만(실제 채널 미전달) · 응답이 없어도 상태 유지". `qa_p2d2_seeker_detail_{real,console}_1280.png` |
| 8 | 로그 마스킹: 토큰·서명·주소·전화가 어떤 NODE_ENV에서도 나오지 않음 | (1) 콘솔 어댑터를 NODE_ENV 없음/development/test/production으로 실행. 대상은 still-searching URL(vi·ko), 상대 path, 쿼리에 토큰·이메일이 든 URL, 대문자 스킴. (2) 이번 run의 모든 로그를 grep: 서버 4개(production), E2E 3회, 스크래치 스펙, 워커(NODE_ENV 없음), Q-27·회귀 스크립트(NODE_ENV 없음). 찾은 패턴은 `eyJ…` 토큰, `~` 서명, 각 스크립트의 실제 전화번호·이메일·SMTP host·user·pass, 전화 정규식, 이메일 정규식 | Pass | (1) 실제 호출 형태(URL·path 값) 6종은 4개 환경 모두 `…/still-searching/***`, `?token=***&email=***`로 바뀌었다. 체류 링크 `/ko/seeker/me/stay`는 그대로다. production은 params가 아예 없다. 전화·이메일은 항상 `***NN`. (2) 모든 로그에서 토큰 0, 서명 0, 전화 0, 사람 이메일 0, host·user·pass 0. Q-27 로그 params 19줄은 모두 `"url":"https://…/ko/seeker/still-searching/***","days":14`. 이메일 모양 문자열은 모의 SMTP messageId `<qa-1@qa.invalid>`뿐(관찰 O-3). 예외 사례는 O-1 |
| 9 | 샘플 규칙·점수표 게시 버튼 숨김 | STAFF_VISA 로그인 후 `/admin/rules/sample-rule-1`, `/admin/score-tables/sample-score-e74-1` | Pass | 둘 다 `data-status DRAFT`이고 게시 버튼 0. 규칙 화면에 "샘플 · 실제 기준 아님" 배지와 "샘플 규칙은 구조만 보여 주는 예시입니다 …" 안내가 있다. 버튼은 "초안 저장"만 있다. `qa_p2d2_sample_{rule,table}_1280.png`. E2E `QA O-4` 테스트는 두 프로젝트 모두 통과(2차) |
| 10 | 샘플 게시 서버 거부 유지(서버 액션 직접) | 비활성 시험 비자 규칙과 시험 점수표를 실제 게시하면서 `Next-Action` 요청을 기록했다. id만 샘플 id로 바꿔 같은 쿠키로 재전송. 그 뒤 시험 규칙·점수표는 폐기했다 | Pass | 규칙과 점수표 모두 HTTP 200, 본문 `{"ok":false,"code":"SAMPLE_NOT_PUBLISHABLE"}`. 샘플 행은 `DRAFT`, `reviewedBy null`, `isSample true` 그대로 |
| 11 | 합격 점수 숫자 포맷(D-1) | 시험 점수표에 합격 점수 1200을 넣어 저장 | Pass | 상세 "합격 점수 1,200점". 샘플 E-7-4는 "없음". `qa_p2d2_score_table_pass_1280.png` |
| 12 | 규칙 화면 라벨(D-2) | `/admin/rules` 비자 선택 옵션 76개. 게시한 규칙 상세의 "검수(게시)". 점수표 목록 | Pass | 옵션 예 "E-9", "C-4", "E2ER-… (체류자격 코드 아님) · 사용 안 함". 꼬리표가 붙은 옵션은 비체류자격 59개, 사용 안 함 56개. `undefined`·`null`·`{` 같은 원시값은 0. 검수 "E2E 직원 · 2026. 11. 17. 22:54", 목록 "E2E 직원 · 2026. 11. 17. 20:59". 표시 이름이 없는 직원의 대체값 "직원"은 화면에서 확인하지 못했다(그런 검수자 행 없음). 코드 경로상 `staffName(null)` = "직원" |
| 13 | 회귀 R-213 체류 만료 경계·중복·delivery 기록 | 만료 2027-09(저장 2027-09-01) 구직자 3명: 알림 동의, 비동의, BLOCKED. KST 경계로 10회 실행: D-91 23:59:59 / D-90 00:00 / 같은 날 재실행 / D-89 / D-61 / D-60 / D-31 / D-30 / D-1 / D-0. D-61·D-60은 혼합 provider, 나머지는 console | Pass | 업무 수: D-91 0, D-90 2, 재실행 0, D-89 0, D-61 0, D-60 2, D-31 0, D-30 2, D-1 0, D-0 0. BLOCKED 0. 업무 6건 모두 `STAFF_VISA`, `dueAt 2027-09-01`, `dedupeKey STAY_EXPIRY:<id>:2027-09-01:D-{90,60,30}`. 동의자 payload `delivery`는 D-90 `SIMULATED`, D-60 `REAL`, D-30 `SIMULATED`(모두 `notified true`). 비동의자는 `optIn false, notified false`이고 delivery 키 없음. 알림 링크는 `/ru/seeker/me/stay` |
| 14 | 회귀 R-213 노쇼 | 비활성 시험 비자 구직자 3명: X(S, 노쇼 2), Y(A, 1), Z(A, 0). `matchCandidates(scope visa)` 결과, 기업 쪽 `queryCandidates` 직렬화 결과, `syncNoShowCounts`(scope) | Pass | 순서 **Z, Y, X\***(S 등급인 X가 맨 뒤, `deprioritized` X만). 기업 직렬화 3명의 키 30개에 `noShow`·`노쇼`·`deprior` 0, 연락처 키 0. 동기화는 `checked 2, updated 2`: 면접 기록이 없어 직접 넣은 노쇼 수가 0으로 복구됨. 재계산 경로가 정상 동작함 |
| 15 | 회귀 R-215 규칙 게시 → `/visa-check` 변화 → 폐기 원복, DRAFT 미사용 | JS를 끈 공개 컨텍스트로 `/ko/visa-check?visaCode=C-4&industryCode={C,F}`를 단계마다 엶. STAFF_VISA가 C-4·C·GREEN 규칙 저장 → 게시 → 폐기 | Pass | 시작 전 C-4 PUBLISHED 0. 기준선 C YELLOW, F YELLOW. **DRAFT 저장 뒤 C YELLOW**(미사용). 게시 뒤 **C GREEN**, F YELLOW. 폐기 뒤 C YELLOW. 끝에 C-4 PUBLISHED 0(공개 영향 남지 않음). `qa_p2d2_visa_check_after_publish_1280.png` |
| 16 | 회귀 P2c·P2b 핵심 + E2E 전체 | E2E 전체 2회. 항목 14의 기업 직렬화 키 검사 | Pass | 2차 272/272. 포함 스펙: employer-candidates, employer-requests, admin-matching, consent-revoke, seeker-recommended, still-searching, admin-rules, wizard, auth. 1차 실패 4건은 브라우저 충돌 구간의 관리자 로그인에서 났고, 재실행과 2차에서 통과했다(관찰 O-4). 기업 직렬화에 이름·전화·이메일·메신저 키 없음 |

## 판정불가 / 사람 확인 필요
없음.

## 결함 목록 (Fail만)
없음.

## 관찰 / 기준 외 발견
| 번호 | 내용 | 재현·증거 | 영향 | 제안 |
|---|---|---|---|---|
| O-1 | `maskLink`는 값 전체가 링크로 **시작할 때만** 마스킹한다. 문장 안에 들어간 링크(`"see https://…/still-searching/<token>"`)는 production이 아닌 환경에서 토큰과 서명이 그대로 남는다. 경로 조각이 소문자와 하이픈만으로 된 24자 이하 문자열(`abcdefgh-ijklmnop`)도 route word로 보고 남긴다 | 항목 8의 합성 입력. 현재 호출처의 params는 `url`·`path`(링크로 시작), `days`, `code`, `taskId`·`companyId`·`postingId`뿐이라 실제 경로에는 해당 없음. still-searching 토큰은 `eyJ…~서명` 형태라 route word가 될 수 없음 | 현재 없음(앞으로 템플릿 params에 문장형 링크를 넣으면 생김) | 기록만. 또는 params 문자열 안의 URL 부분도 찾아 마스킹 |
| O-2 | 콘솔 어댑터는 production이 아니면 OTP `code`를 params로 로그에 남긴다. STANDARD 4.7 개발용 예외에 따른 설계다. 워커는 OTP를 보내지 않는다 | `src/lib/otp.ts:166` `params: { code }` | 개발 환경 한정 | 기록만(run 1 O-2와 함께 운영 배포 시 NODE_ENV=production 확인) |
| O-3 | SMTP 어댑터 성공 로그의 `id`에는 SMTP messageId가 들어간다. 이 값은 `<…@발신 도메인>` 형태라 이메일 정규식에 걸린다. 수신자 주소는 아니다 | 모의 transport `<qa-1@qa.invalid>`가 로그 `id`에 남음 | 없음(발신 도메인만) | 기록만 |
| O-4 | E2E 1차에서 mobile-375 관리자 로그인 4건이 실패했다. 로그에 `Target crashed`가 있다. 실패 스펙만 재실행하면 11/11, 전체 2차는 272/272였다. P1a O-1(브라우저 자원)과 같은 계열로 보이며, 제품 코드나 서버 로그에서는 원인이 보이지 않았다 | 명령 표 | 낮음(간헐) | 계속 관찰. 반복되면 `E2E_WORKERS` 하향 검토 |
| O-5 | (이번 커밋 밖, 기존) 샘플 규칙 상세의 "초안 고치기" 폼은 비자 선택이 첫 옵션 "F-2"로 보인다. 저장 값이 `SAMPLE-1`이고 이 값이 옵션 목록에 없기 때문이다. 직원이 그대로 "초안 저장"하면 샘플의 비자가 F-2로 바뀌어 저장될 수 있다. `__sample` 표시가 남는 동안은 게시가 막힌다 | `qa_p2d2_sample_rule_1280.png`(위 "SAMPLE-1 · 모든 업종", 폼 "F-2") | 낮음 | 옵션에 없는 현재 값은 빈 선택 + 안내로 표시하거나, 샘플 편집 시 비자 선택을 강제 |

### 남긴 시험 데이터(개발 DB, 삭제 안 함)
- 구직자:
  - Q-27 시험 9명. 그 중 관리자 화면 시험용 2명(`cmwkr2qto…`, `cmwkr2qtr…`)은 확인이 열린 상태다. 실제 채널 1명은 플래그 true라서, 개발 워커가 14일 뒤 돌면 이 1명이 INACTIVE가 된다.
  - 체류 만료 시험 3명.
  - 노쇼 시험 3명.
- 업무: **OPEN StaffTask STAY_EXPIRY 6건**(만기 2027-09-01).
- VisaType 시험 코드 4개(`E2ER-…` 2개, `QA2N-…`, `QA2V-…`). 모두 비활성이다.
- 규칙·점수표:
  - 비활성 시험 비자 규칙 1건(RETIRED).
  - C-4·C 시험 규칙 1건(RETIRED, 공개 영향 없음).
  - QA 점수표 1건(RETIRED).
- 직원 계정 약 4개와 감사 행.
- E2E가 만든 행(이전 run과 같은 성격).

## run 1 관찰 처리 확인
| run 1 항목 | 확인 결과 |
|---|---|
| O-1(콘솔만으로 14일 뒤 대량 비활성화) | 해결(항목 1~7, Q-27대로) |
| O-2(워커 로그에 원클릭 토큰 URL) | 해결(항목 8. NODE_ENV와 무관하게 링크 토큰이 마스킹됨, 남은 예외는 O-1) |
| O-4(샘플 상세에 게시 버튼) | 해결(항목 9, 서버 거부 유지는 항목 10) |
| O-7(시험 행 잔존) | 그대로(위 목록) |
| O-8(사용자 `.next` 때문에 typecheck 실패) | 그대로(명령 표) |
