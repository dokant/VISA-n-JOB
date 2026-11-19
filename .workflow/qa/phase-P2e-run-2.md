# QA 보고서 — Phase P2e / run 2 (재확인·회귀)

- 대상 커밋:
  - dc4cf0f: 히어로 H1·리드 reveal 제외(Q-28), 탭 375px 줄바꿈(D-2), N-04 E2E 잘린 조작 요소 검사(D-3), provider 선택 경로 SMTP 실패 warn(D-1), README R-1~R-5, lighthouse 실패 원인 출력(O-1), maskLink `www.` 링크(O-3)
  - c28b8de: 구직자 next-actions 버튼이 긴 라벨을 줄바꿈(ru 체류 알림 버튼 4px 넘침)
  - HEAD는 c28b8de. 저장소 작업 트리의 src·tests·scripts·prisma·messages·content·README·package.json은 c28b8de와 같다(`git diff --stat` 0줄)
- 기준 문서:
  - PRD R-217, N-01~N-06, §6 출시 기준
  - PLAN `### P2e`, "사람의 승인이 필요한 지점"
  - WO §15 1~11
  - DECISIONS Q-12, Q-25, Q-27, Q-28
  - STATE 기록(Gate 4 항목)
  - P2e run 1 보고서(D-1~D-3, O-1, O-3)
  - P2e 기준 검토 run 1(R-1~R-5)
  - CLAUDE.md
- 일시: 2026-11-18 06:00 ~ 07:35 (KST)
  - 중간에 무출력 600초로 한 번 정지됐다. 원인은 `db.ts start`가 띄운 Postgres가 `| tail` 파이프를 잡고 있던 것이다.
  - 재개한 뒤 남은 프로세스를 확인했다(남은 것은 개발 DB 54320뿐). 이후 긴 명령은 로그 파일로 돌리고 진행 상황을 주기적으로 출력했다.
- 환경:
  - 저장소에서 `corepack pnpm`으로 순차 실행: lint, typecheck, test ×3, i18n:check, qa:static, 끝 test 1회(`--reporter=dot`).
  - build, E2E, Lighthouse, 직접 시험은 `git archive c28b8de`를 스크래치패드 `wt`에 풀어서 했다.
    - `node_modules`는 저장소 것을 junction으로 연결해 읽기만 했다. `.env`는 복사했다.
    - pnpm과 corepack은 쓰지 않았고, CLI는 node로 직접 실행했다. Playwright를 돌릴 때는 복사본 `node_modules/.bin`을 PATH 앞에 두었다.
  - **이번 run의 서버와 E2E는 모두 임시 클러스터를 썼다.** 개발 DB(54320)에는 연결만 유지됐고 쓰지 않았다.
    - 클러스터: `PG_DATA_DIR=<스크래치>/pgclean`, 127.0.0.1:54329, DB `visanjob_qa_p2e2`. `DATABASE_URL`은 환경 변수로 덮어썼다.
    - 54329는 Vitest 테스트 클러스터와 같은 포트다. 그래서 `test:coverage`를 돌리기 전에 임시 클러스터를 `db.ts stop`으로 멈췄다. coverage가 끝나고 54329가 닫힌 것을 확인한 뒤 다시 `start`했다.
  - 서버:
    - E2E: 3330~3333
    - Lighthouse: 3340
    - 직접 시험(`next start`, `TRUST_PROXY=true`): 3330 기본, 3331 DEMAND_MAP, 3332 PUBLIC_JOBS, 3333 EMPLOYER_CANDIDATES
    - 변이 시험: 3330~3333(Playwright webServer)
    - Lighthouse 실패 경로 시험: 3341
    - Lighthouse 측정 중에는 다른 서버와 E2E가 없었다.
  - 포트 3000은 건드리지 않았다. 시작과 끝 모두 LISTEN 없음.
- 외부 전송 없음:
  - SMTP는 인자로만 넘긴 가짜 설정(`smtp.qa.invalid`)과 모의 transport를 썼다. `net`·`tls` 연결 시도 0건.
  - Lighthouse는 로컬 서버만 측정했다.
  - `.env` 값은 출력하지 않았다. FEATURE 줄은 `=true`인 줄의 개수만 셌다(0).
- 정리:
  1. 서버를 PID로 하나씩 종료했다. 3330~3341 LISTEN 0.
  2. 임시 클러스터를 `db.ts stop`으로 멈췄다(54329 LISTEN 0). `pgclean`을 삭제했다.
  3. junction을 PowerShell `(Get-Item …).Delete()`로 먼저 끊었다. `Test-Path` 결과 False.
  4. 저장소 `node_modules`를 확인했다. `.pnpm` 항목 916개(디렉터리 915 + `lock.yaml`), `next`·`@playwright/test`·`vitest`·`.bin`(42개)이 있다.
  5. 작업 트리(스크래치 스펙·변이 파일 포함)와 보조 스크립트(`qa/`, `env.sh`)를 삭제했다.
  6. 내가 실수로 띄운 `python -`(stdin 대기, PID 29972, 부모가 내 셸) 하나만 종료했다.
  7. 끝에 저장소에서 `corepack pnpm test --reporter=dot`를 돌렸다: **84 files / 622 tests 통과**.
  8. `git status`: `.workflow/` 기존 변경 4개, 미추적 `.claude/`·`.workflow/qa/`. `.claude/`는 건드리지 않았다.
  9. 스크린샷 35개는 스크래치패드 `shots/qa_p2e2_*.png`, 로그는 `logs/`에 남겼다.

## 결과 요약
- 통과: 20 / 전체: 21 (통과율 95.2%), Fail 0, 판정불가 1(항목 21)
  - 판정불가를 빼고 세면 20/20(100%)이다.
- 필수 항목: 4/4 통과(100%), 실패 0
  - 필수로 센 항목: R-217, WO §15 1~11, 출시 명령, 플래그 4종 false.
- run 1 결함 D-1·D-2·D-3은 모두 해소됐다. 새 결함은 없다.
- PRD §6 "전체 통과율 95% 이상"을 충족한다(95.2%). Lighthouse /ko 성능 중앙값은 88이다(Q-28 기준 85 이상).
- 관찰: O-1 ~ O-8. 이 중 O-1(ru 기업 계약 화면 375px 넘침)은 N-04 범위(주요 공개·구직자 화면) 밖이라 결함으로 세지 않았다. 다만 화면이 실제로 잘리므로 Gate 4 전에 고치기를 권한다.

## 검증 명령 (순차 실행)
| 명령 | 위치 | 종료 코드 | 결과 |
|---|---|---|---|
| `corepack pnpm lint` | 저장소 | 0 | 오류·경고 없음 |
| `corepack pnpm typecheck` | 저장소 | 2 | 오류 3건. 모두 사용자 `.next/types`의 옛 경로 `(public)/employer/candidates`에서 났다(기존 O-8과 같은 원인, O-4) |
| `tsc --noEmit` | 작업 트리(c28b8de) | 0 | 오류 없음(1502 파일, 16.1s) |
| `corepack pnpm test` × **3회 연속** | 저장소 | 0·0·0 | 3회 모두 84 files / **622 tests** 통과. skip·todo·only 0 |
| **클린 실행** `db.ts reset` | 작업 트리, 임시 54329 | 0 | 마이그레이션 적용 완료. 시드 `{"regions":246,"industries":21,"visaTypes":19,"sampleRules":2,"sampleScoreTables":1,"admin":"skipped","sampleSeekers":"skipped"}`. 직후 행 수: 구직자 0, 추천 0, 감사 0, 사용자 0, 기업 0, 면접 요청 0 |
| eslint | 작업 트리 | 2 | 환경 문제다. junction 경로에서 `eslint-plugin-react-hooks`를 찾지 못했다(O-6). 소스가 같은 저장소 lint는 0 |
| `vitest run --coverage` | 작업 트리 | 0 | 84 / 622 통과. 테스트 클러스터는 `wt/.pgdata-test`에 새로 만들었다 |
| `i18n-check` | 작업 트리 | 0 | ko 1183 keys, 6 locales, errors 0(저장소도 같음) |
| `qa-static` | 작업 트리 | 0 | errors 0, warnings 21(저장소도 같음). run 1의 22보다 1건 줄었다. smtp.ts의 분기 2줄이 `logByLevel` 1곳으로 합쳐졌기 때문이다(O-5) |
| `next build` | 작업 트리 | 0 | 170 static pages 생성. jose `CompressionStream` Edge Runtime 경고가 1종 나왔다(O-3) |
| `playwright test` 전체 | 작업 트리, 임시 DB, E2E_PORT 3330 | 0 | **288 passed / 10 skipped** (7.0m). skip 10건은 mobile-375 스펙을 desktop 프로젝트에서 건너뛴 것(설계). 끝난 뒤 임시 DB 행 수: 구직자 81, 추천 16, 감사 78, 사용자 163(E2E가 임시 DB에 썼다는 확인) |
| `tsx scripts/lighthouse.ts --skip-build` (LH_PORT 3340, **CHROME_PATH 없음**) | 작업 트리, 임시 DB | 0 | 스크립트가 headless shell(`chromium_headless_shell-1255`)을 스스로 찾았다. 결과 표는 항목 17 |
| 변이 시험 `playwright test mobile-375.spec.ts --project=mobile-375` | 작업 트리(탭·next-actions 수정을 임시로 되돌림) | 1 | 4건 실패(기대대로, 항목 16). 원복 후 두 파일이 c28b8de와 바이트 단위로 같음(`cmp`) |
| `corepack pnpm test --reporter=dot` (끝) | 저장소 | 0 | 84 / 622 통과 |

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| 1 | **R-217(필수)** 통합 Playwright 통과 | 클린 DB E2E 전체 | Pass | `integration.spec.ts:114` "R-217 / WO15-11 …"이 desktop·mobile-375 모두 ok. 임시 DB에 추천 16행이 생겼다 |
| 2 | **WO §15 1~11(필수)** README 매핑표의 테스트가 존재하고 통과 | README 매핑표를 스크립트로 기계 대조했다(`…` 앞뒤 조각이 해당 파일에 있는지). Vitest ×3과 coverage, 클린 E2E 결과를 확인 | Pass | 대조 33/33 존재(항목별 1·1·5·4·5·5·2·3·4·2·1, run 1과 같은 분포). Vitest 622 ×4 통과. E2E 매핑 테스트(jobs-apply, employer-candidates, consent-revoke, home, employer-intake, integration) 모두 ok |
| 3 | **출시 명령(필수)** `lint`·`test`·`test:e2e`·`build` 성공 | 명령 표 | Pass | lint 0(저장소), test 0 ×4, build 0, E2E 288/288(skip 10은 설계) |
| 4 | **플래그 4종 기본 false(필수)** | `src/config/flags.ts`, `.env.example`, 로컬 `.env`의 `=true` 줄 수, 기본 서버 E2E | Pass | `isFeatureEnabled`는 값이 정확히 "true"일 때만 켠다. `.env.example` 4줄 모두 `=false`. 로컬 `.env`의 `FEATURE_*=true`는 0줄. 클린 E2E의 SC-07 기본값 회귀(demand.spec "flag off (default)" 등)가 통과했다 |
| 5 | N-01 직접 연락 수단 0건(회귀) | 두 커밋의 변경 파일 목록 검토. `qa:static`, WO15-02 테스트. 독립 375px 스캔(항목 15)에서 링크 수집 | Pass | 변경 파일은 hero, tabs, next-actions, notifications(로그 레벨·마스킹), README, 테스트, lighthouse 스크립트뿐이다. 연락 경로는 바뀌지 않았다. qa:static errors 0, WO15-02 통과 |
| 6 | N-02 `i18n:check` 누락 0 | 명령 표 | Pass | `source ko: 1183 key(s), locales: 6, errors: 0` |
| 7 | N-03 [전문가 검토 필요] 표시(회귀) | 클린 E2E의 static-pages, employer-intake 스펙. 기업 계약 화면 스크린샷 | Pass | E2E 통과. `qa_p2e2_employer_contract_ru_375_top.png`에 "[전문가 검토 필요] [Требуется проверка эксперта]"가 보인다 |
| 8 | **N-04** 375px 가로 스크롤 없음(주요 공개·구직자 화면) | (a) 클린 E2E의 mobile-375 스펙. (b) 빌더 스펙과 별개로 직접 쓴 스캔(항목 15) | Pass | (a) 10/10 ok. (b) 공개·구직자 화면 0건. 조건을 바꿔서도 확인했다: `html, body {overflow-x: visible}`를 주입한 문서 넘침, 텍스트·조작 요소가 뷰포트 밖에 있는지 |
| 9 | N-05 감사 로그 묶음 | `auditCoverage.test.ts`가 Vitest 4회와 coverage 1회에 포함됨 | Pass | 5회 모두 통과 |
| 10 | N-06 비밀 값 | `git ls-files`의 `.env*`, README 환경 변수 절 | Pass | 추적되는 파일은 `.env.example`뿐이다. README 환경 변수 표는 이름만 있다(값은 예시 포트·자리표시자뿐) |
| 11 | PLAN 작업 5: 전체 명령 1회 클린 실행(`db:reset`부터) | 명령 표의 클린 실행 | Pass | 같은 커밋(c28b8de), 같은 임시 DB에서 순서대로 실행했다: reset → lint(저장소, 소스 동일) → tsc → test:coverage → i18n → qa:static → build → test:e2e → lighthouse. 모두 종료 코드 0이다 |
| 12 | 선행 A-1 회귀(샘플 규칙 폼 O-5) | 클린 E2E의 admin-rules 스펙 | Pass | "QA P2d O-5"를 포함한 admin-rules.spec 전부 ok |
| 13 | 선행 A-2 회귀 + O-3(maskLink `www.`) | `console.test.ts` "maskLink masks a scheme-less www. link too (QA P2e O-3)"를 포함한 Vitest. D-1 직접 시험의 로그 줄 | Pass | 테스트 4회 통과. 직접 시험의 SMTP 로그에서 수신자는 `"to":"***id"`로 가려졌고 이메일 원문은 0건이다 |
| 14 | **D-1** `selectNotificationProvider` 경로의 SMTP 실패 warn이 console.warn | 스크래치 tsx 스크립트로 `selectNotificationProvider({ env: {SMTP_HOST:"smtp.qa.invalid", SMTP_FROM, NODE_ENV:"production"}, transport })`를 **log 옵션 없이** 호출했다. 모의 transport 3종(EENVELOPE 거부, ECONNREFUSED 거부, 성공)으로 EMAIL을 보내며 console.info·warn을 가로채고 `net.connect`·`tls.connect` 호출 수를 셌다 | Pass | 거부 2종은 `warn {"level":"warn","event":"notification.send","provider":"smtp",…,"ok":false,"error":"EENVELOPE"}`(그리고 ECONNREFUSED)로 나갔고 결과는 `delivery:"FAILED"`다. 성공은 `info …"ok":true,"id":"m1"`이고 `delivery:"REAL"`이다. 시작 줄 `notification.provider`는 info다. 연결 시도 0건 |
| 15 | **D-2** 375px 6개 언어 홈 탭이 모두 화면 안, 44×44 이상, 넓은 화면 모양 유지. 그리고 다른 화면의 잘린 조작 요소 독립 표본 검사 | 스크래치 Playwright 스펙(빌더 스펙과 별개)을 썼다.<br>(a) 375×812(모바일, 터치)에서 6개 언어 홈의 `role=tablist` 측정, 세 번째 탭 탭(tap), 스크린샷.<br>(b) 1280에서 같은 측정.<br>(c) 화면 168개 스캔: 텍스트가 직접 있거나 조작 가능한 모든 요소 중 뷰포트 밖에 있는 것(가로 스크롤 컨테이너 안, sr-only, aria-hidden은 제외). 여기에 clip을 해제한 문서 넘침을 더했다. 대상은 다음과 같다.<br>• 공개 16경로(404 포함) + 플래그 on `/jobs`·`/demand` × 6개 언어<br>• 로그인 구직자: 등록 완료와 `/seeker/me`, referral, stay, recommended, register × 6개 언어(비자 E-9·F-4·D-2를 섞음)<br>• 검증·계약 기업: candidates, requests, contract, request × 6개 언어 | Pass | (a) 탭 18개가 모두 [25, 350] 안에 있다. 높이 44, 최소 폭 48(ko "기업"). tablist `scrollWidth = clientWidth`(en·vi·uz 333/333). 라벨 넘침 0. 세 번째 탭을 탭하면 `data-state=active`가 된다. en·vi·uz는 라벨이 탭 안에서 두 줄로 줄바꿈된다(`qa_p2e2_home_vi_375_tabs.png`: "Doanh / nghiệp", "Người / tìm việc", "Văn phòng / đối tác"). ko·ru·zh는 한 줄이다.<br>(b) 1280에서는 6개 언어 모두 한 줄(top 같음)이다. 탭 44px, px 16px, 트랙은 pill에 4px 패딩, 배경 rgb(241,243,246)으로 run 1 이전 모양과 같다(`qa_p2e2_home_*_1280_tabs.png`).<br>(c) 공개·구직자 144페이지는 0건이다. 기업 24페이지 중 **ru `/employer/contract`(계약 완료, 후보 플래그 on)만 문서 넘침 +26px**이다. 여기서 텍스트·조작 요소 자체는 뷰포트 안에 있지만 카드 오른쪽이 잘린다. N-04 범위 밖이라 관찰 O-1로 기록했다 |
| 16 | **D-3** mobile-375 스펙이 넘침을 실제로 잡음 | 작업 트리 복사본에서만 변이를 넣었다. `tabs.tsx` TabsTrigger 클래스를 수정 전(`h-11 … px-4 … whitespace-nowrap`)으로, `next-actions.tsx`의 `WRAP`을 `""`로 되돌렸다. 그 상태로 다시 빌드하고 mobile-375 스펙을 실행한 뒤 원복했다 | Pass | **4건 실패**, 모두 기대한 위치다:<br>• `/en clipped button "Partner agencies" [243,384]`<br>• `/vi … "Văn phòng đối tác" [274,422]`<br>• `/uz … "Hamkor agentlik" [269,405]`<br>• `/ru/seeker/register/complete` `a "Напоминание о сроке пребывания" [45,379]`<br>ko·ru·zh 공개, ko·vi 구직자, 플래그 목록 6건은 통과했다. 원복 후 두 파일은 `git show c28b8de:<file>`과 `cmp` 결과가 같다. 원본 코드는 클린 E2E에서 10/10 통과 |
| 17 | **Q-28** 히어로 H1·리드 reveal 없음, Lighthouse /ko 3회 중앙값 85 이상, about·fees·terms | (a) `hero.tsx` 검토와 E2E "S-62"(두 프로젝트). (b) 다른 서버가 없는 상태에서 Lighthouse 3회(mobile 기본 프리셋, 프로덕션 빌드, headless shell) | Pass | (a) H1·리드에 `reveal`·`--reveal-y`·`transitionDelay`가 없다. S-62는 `js-reveal` 상태에서 `transform:none, opacity:1`과 히어로의 다른 `.reveal` 2개 이상을 확인하고 desktop·mobile 모두 ok다.<br>(b) 결과:<br>• **/ko 성능 88**(89·83·88), 접근성 100, LCP 3500ms. LCP 요소는 `<p class="mt-6 max-w-155 text-lead text-white/66">`이다(reveal 없음). FCP 1390·2897·1837ms, TBT 291·42·150ms, CLS ≤0.003<br>• /ko/about 93(93·93·95)<br>• /ko/fees 95(95·94·96)<br>• /ko/terms 93(95·91·93)<br>• 접근성은 모두 100이다. 스크립트는 "all pages meet the thresholds"로 종료 코드 0이다 |
| 18 | README R-1~R-5: 환경 변수 이름만, 사람 승인 목록·법무/운영 확인 목록이 DECISIONS·STATE와 일치 | (a) `src`·`scripts`·`prisma`·`tests`·설정 파일의 `process.env.X`/`env.X`를 모두 뽑아 README 설정 절과 대조. (b) 승인 표를 PLAN "사람의 승인이 필요한 지점"과 대조. (c) 법무·운영 목록을 DECISIONS(Q-12, Q-17, Q-20~23, Q-24, Q-25, Q-27)와 STATE의 Gate 4·배포 전 기록과 대조. (d) R-4 알림 열거, R-5 글꼴 절 | Pass | (a) 빠진 이름은 `CI`, `LOCALAPPDATA`, `NODE_ENV`(일반 런타임 변수), `P*_SHOTS`(QA 전용, R-1에서 빼도 된다고 함), `TEST_ENCRYPTION_KEY_V1`(`tests/setup/env.ts`가 스스로 설정하는 내부 값)뿐이다. R-1이 지적한 `PRIVATE_STORAGE_DIR`, `E2E_DEMAND_URL`, `E2E_JOBS_PORT`, `E2E_CANDIDATES_PORT`는 들어갔다. 표에는 값이 없다.<br>(b) A-3·A-5·A-6·A-7·A-8 다섯 줄이 있다. 내용·담당·위치가 PLAN 표와 맞는다. A-7의 "실제 규칙 문구"는 STATE P2d 기록 "실제 규칙 문구(A-7)"와 맞는다. A-1·A-2(완료), A-4·A-9(출시 승인 대상 아님)를 뺀 것은 R-2 지시 범위와 같다.<br>(c) 법무 3개: Q-12 ③ 체크박스, Q-25 기간 해석, THIRD_PARTY_INTERVIEW 수령자 미기재(STATE P2c run 1). 운영 7개: P1c O-7, O-9·TRUST_PROXY·SITE_URL, Q-24, Q-17 ①, P1d O-9·O-10, 개발 DB 초기화(P2a), Q-27·SMS(P2d). 모두 원천 기록과 문구가 맞는다.<br>(d) 이메일 전달 행에 "OTP·프로필 완성 안내"가 추가됐다. 글꼴 절은 Noto Sans KR(ko, `preload:false`), Inter, Noto Sans SC(zh만, `fontsZh.ts`)이고 Pretendard는 "미사용 보관(SC-11)"이다. `src/lib/fonts.ts`와 맞는다. 디렉터리 요약에 worker·build-terms-pdf·lighthouse·dateTime이 있다 |
| 19 | 구직자 next-actions 버튼 줄바꿈(375·1280) | 항목 15 스펙에서 6개 언어 등록 완료와 `/seeker/me`를 375·1280으로 측정하고 스크린샷 | Pass | 375에서는 모든 버튼이 [45, ≤330] 안에 있다. ru 두 버튼만 두 줄(285×60)이고 나머지는 한 줄 52px이다. `qa_p2e2_complete_ru_375.png`에서 "Напоминание о сроке / пребывания"가 pill 안에서 가운데 정렬된다. 1280에서는 6개 언어 모두 한 줄, 같은 top, 높이 52이고 버튼이 가로로 이어진다(ru 301·334px, `qa_p2e2_me_ru_1280.png`, `qa_p2e2_complete_ru_1280.png`) |
| 20 | run 1 O-1: `pnpm lighthouse`가 CHROME_PATH 없이 측정됨 | 항목 17 실행을 CHROME_PATH 없이 함 | Pass | `lighthouse: Chrome C:\Users\cirru\AppData\Local\ms-playwright\chromium_headless_shell-1255\…\chrome-headless-shell.exe`가 출력되고 측정이 끝까지 진행됐다(run 1에서는 `lighthouse failed`로 끝났다) |
| 21 | run 1 O-1: Lighthouse가 실패하면 원인을 출력 | `CHROME_PATH=C:\nonexistent\chrome.exe`, `--runs 1`로 실행해 실패를 유도 | **판정불가** | 실패가 재현되지 않았다. 존재하지 않는 경로를 줬는데도 Lighthouse가 다른 Chrome으로 측정을 끝냈다. 성능 81~83이 나와 "BELOW THRESHOLD"로 종료 코드 1이었고, 실패 원인 블록은 출력되지 않았다. 코드 검토로는 `r.status !== 0 \|\| r.error`일 때 사유·Chrome 경로·힌트·로그 끝 40줄을 출력한다. 하지만 실제 출력은 보지 못했다. 이 실행에 대해서는 O-2 참조 |

## 판정불가 / 사람 확인 필요
- 항목 21: Lighthouse 실패 원인 출력은 실패를 재현하지 못해 판정불가다. 출시 기준 항목은 아니다.
- O-1(ru 기업 계약 화면 넘침)은 N-04 문구("주요 공개·구직자 화면") 밖이라 결함으로 세지 않았다. 다만 run 1의 D-2와 같은 종류(clip이 가린 내용 넘침)다. 결함으로 볼지는 Gate 4에서 정하면 된다.

## 결함 목록 (Fail만)
| 번호 | 심각도 | 위치 | 재현 | 기대 | 실제 |
|---|---|---|---|---|---|
| — | — | — | — | — | 없음. run 1의 D-1·D-2·D-3은 항목 14·15·16에서 해소를 확인했다 |

## 관찰 / 기준 외 발견
| 번호 | 내용 | 재현·증거 | 영향 | 제안 |
|---|---|---|---|---|
| O-1 | **ru `/employer/contract`(계약 완료 + 검증 + `FEATURE_EMPLOYER_CANDIDATES=true`)가 375px에서 26px 넘친다.** 서명 완료 카드의 "Смотреть анонимных кандидатов →" 버튼(`whitespace-nowrap`, 329.5px)이 `grid gap-8`(`src/app/[locale]/employer/contract/page.tsx:57`)의 트랙을 379.5px로 늘린다. 그래서 다운로드 줄, 약관 article 카드, 서명 완료 카드가 모두 [20, 400]이 된다. `html, body`의 `overflow-x: clip` 때문에 스크롤바는 없지만, 카드 오른쪽 테두리·패딩(25px)이 잘리고 본문과 버튼이 화면 끝(375)에 붙는다 | 375×812에서 검증·계약 기업으로 로그인 → 3333(후보 플래그 on) `/ru/employer/contract`. `qa_p2e2_employer_contract_ru_375_signed.png`, `_top.png`. 측정: 그리드 박스 [20,355], `gridTemplateColumns: 379.5px`. 미계약 상태와 다른 5개 언어는 0이다 | 플래그 on 이후 ru 기업의 계약 화면이 잘려 보인다. mobile-375 스펙은 기업 화면을 다루지 않아 잡히지 않는다 | 버튼에 줄바꿈 허용(next-actions의 `WRAP`과 같은 방식) 또는 그리드 항목에 `min-w-0`. 기업 로그인 화면을 375px 일괄 검사에 넣는 것을 검토 |
| O-2 | `CHROME_PATH`에 없는 파일을 줘도 `scripts/lighthouse.ts`는 실패하지 않는다. "Chrome: C:\nonexistent\chrome.exe"라고 출력한 채 다른 브라우저(chrome-launcher의 대체)로 측정했고, 점수가 81~83으로 headless shell(88~95)과 달랐다 | 항목 21의 실행(이때 `.next`는 변이 빌드였으니 점수 자체는 판정에 쓰지 않음) | 잘못된 CHROME_PATH에서 측정 브라우저가 출력과 다를 수 있다 | `existsSync(chrome)`가 거짓이면 측정 전에 중단하고 알리는 것을 검토 |
| O-3 | 작업 트리 `next build`에서 jose `deflate.js`의 `CompressionStream` Edge Runtime 경고가 나왔다(`@auth/core/jwt.js` 경유). 종료 코드는 0이다. run 1에서는 "경고 없음"이었다 | `logs/c_build.log` 7~25행 | 빌드 성공에는 영향 없음. junction 경로 해석 차이일 수도 있다 | 기록만. 사용자 환경 빌드에서 같은 경고가 나는지 확인 |
| O-4 | 로컬 `pnpm typecheck`가 사용자 `.next/types`의 옛 경로 때문에 실패한다(기존). 작업 트리 `tsc`는 0 | 명령 표 | 출시 명령 `typecheck`가 이 PC에서만 실패 | `.next` 정리는 사용자 판단 |
| O-5 | qa:static warnings 22 → 21 | 명령 표 | 없음 | 기록만 |
| O-6 | 작업 트리(junction)에서 eslint가 `eslint-plugin-react-hooks`를 찾지 못했다. QA 환경 문제다 | `logs/c_lint.log` | 없음. 소스가 같은 저장소 lint는 0 | 기록만 |
| O-7 | run 1 O-4(기업 가입 화면에 수집 고지·약관 동의 없음)는 DECISIONS·STATE에 기록되지 않아 README 법무 목록에도 없다. README는 원천 기록과 일치하므로 판정에는 영향이 없다 | — | 법무 판단 사항이 목록에서 빠질 수 있다 | 오케스트레이터가 Gate 4 법무 목록에 넣을지 판단 |
| O-8 | Lighthouse /ko 실행별 편차: 89·83·88(중앙값 88). 1회는 85 미만이었다 | 항목 17 | 측정 환경에 따라 중앙값이 기준 근처일 수 있다 | 기록만 |

## README 매핑표 대조 (WO §15)
| # | 이름 수 | 존재 | 통과 |
|---|---|---|---|
| 1 | 1 | 1/1 | Vitest ×4 + coverage |
| 2 | 1 | 1/1 | Vitest ×4 + coverage |
| 3 | 5 | 5/5 | Vitest, E2E jobs-apply ok |
| 4 | 4 | 4/4 | Vitest |
| 5 | 5 | 5/5 | Vitest |
| 6 | 5 | 5/5 | Vitest, E2E employer-candidates ok |
| 7 | 2 | 2/2 | Vitest |
| 8 | 3 | 3/3 | Vitest, E2E consent-revoke ok |
| 9 | 4 | 4/4 | Vitest, E2E home·employer-intake ok |
| 10 | 2 | 2/2 | Vitest |
| 11 | 1 | 1/1 | E2E integration ok(클린 DB, 두 프로젝트) |
