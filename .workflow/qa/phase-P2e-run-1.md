# QA 보고서 — Phase P2e / run 1

- 대상 커밋:
  - dca582b (P2e 선행): 샘플 규칙 폼이 목록 밖 값을 유지(O-5), maskLink가 문장 안 링크도 마스킹(O-1), warn 로그를 console.warn으로
  - f24b425: R-217 통합 E2E, N-05 감사 묶음, N-04 375px 일괄, 플래그 기본값, README 출시 점검
  - 2e26899: R-117 수요 E2E를 행 단위 마스킹 검사로 변경(클린 DB 대응)
  - HEAD는 2e26899
- 기준 문서:
  - PRD R-217, N-01~N-06, §6 출시 기준
  - PLAN `### P2e`
  - WO §15 1~11
  - DECISIONS Q-27, Q-28, PC-2, PC-9, PC-14
  - P2d run 2 보고서(O-1, O-5)
  - CLAUDE.md
- 일시: 2026-11-17 23:45 ~ 2026-11-18 00:35 (KST)
- 환경:
  - 저장소에서 `corepack pnpm`으로 순차 실행: lint, typecheck, test ×3, i18n:check, qa:static.
  - build, E2E, Lighthouse, 직접 시험은 `git archive 2e26899`를 스크래치패드 `wt`에 풀어서 했다.
    - `node_modules`는 저장소 것을 junction으로 연결해 읽기만 했다. `.env`는 복사했다.
    - pnpm과 corepack은 쓰지 않았고, CLI는 node로 직접 실행했다. Playwright를 돌릴 때는 복사본 `node_modules/.bin`을 PATH 앞에 두었다.
  - 개발 DB(127.0.0.1:54320) 대상 서버 4개(`next start`, 모두 `TRUST_PROXY=true`):
    - 3310: 기본
    - 3311: DEMAND_MAP
    - 3312: PUBLIC_JOBS
    - 3313: EMPLOYER_CANDIDATES
  - **클린 실행**(PLAN P2e 작업 5): 개발 DB가 아닌 임시 클러스터에서 했다.
    - 클러스터: `PG_DATA_DIR=<스크래치>/pgclean`, 127.0.0.1:54329, DB `visanjob_qa_p2e`.
    - 순서: `scripts/db.ts start` → `reset`(migrate deploy 11개 + 시드) → 시작 시 행 수 확인(구직자 0, 추천 0, 감사 0, 사용자 0).
    - 서버 3330~3333에 `DATABASE_URL`을 덮어써서 띄우고 E2E 전체를 돌렸다.
    - 끝난 뒤 이 DB에는 구직자 81, 추천 16, 감사 78행이 있었다. E2E가 임시 DB에 썼다는 확인이다.
    - 이 동안 Vitest는 돌리지 않았다(포트 공유). 끝나고 클러스터를 `db.ts stop`으로 멈추고 데이터 폴더를 삭제했다.
  - 포트 3000은 건드리지 않았다. 시작과 끝 모두 LISTEN 없음.
- 외부 전송 없음:
  - SMTP는 인자로만 넘긴 가짜 설정과 모의 transport를 썼다. `net`·`tls` 연결 시도 0건.
  - Lighthouse는 로컬 서버만 측정했다.
  - `.env` 값은 출력하지 않았다. FEATURE 줄은 `=true`인 줄의 개수만 셌다(0).
- 정리:
  1. 서버 8개(3310~3313, 3330~3333)와 Lighthouse 서버(3320)를 종료했다. LISTEN 0.
  2. 임시 클러스터 54329를 멈췄다(LISTEN 0). `pgclean`을 삭제했다.
  3. junction을 PowerShell `(Get-Item …).Delete()`로 먼저 끊었다. `Test-Path` 결과 False.
  4. 저장소 `node_modules`를 확인했다. `.pnpm` 916개, `next`·`@playwright/test`·`vitest`·`.bin`이 있다.
  5. 작업 트리(스크래치 스펙 2개, tsx 스크립트 2개, `.lighthouse` 포함)와 보조 스크립트를 삭제했다.
  6. 끝에 저장소에서 `corepack pnpm test`를 돌렸다: **84 files / 620 tests 통과**.
  7. `git status`: `.workflow/` 기존 변경 4개, 미추적 `.claude/`·`.workflow/qa/`. `.claude/`는 건드리지 않았다.
  8. 스크린샷은 스크래치패드 `shots/qa_p2e_*.png`에 36개, 로그는 `logs/`에 남겼다.

## 결과 요약
- 통과: 12 / 전체: 14 (통과율 85.7%), 판정불가 0
- 필수 항목 실패: 0
  - 필수로 센 항목: R-217, WO §15 1~11, 출시 명령 4종, 플래그 4종 false.
  - 이 항목들은 모두 Pass다.
- 결함: D-1, D-2, D-3
  - 실패 항목은 N-04(D-2·D-3)와 선행 A-3(D-1)이다.
- PRD §6 "전체 통과율 95% 이상"은 이번 run 기준으로 **미달**이다(85.7%).
- 관찰: O-1 ~ O-7. Lighthouse /ko 성능 미달(Q-28 대상)은 지시대로 관찰 O-1로만 기록했다.

## 검증 명령 (순차 실행)
| 명령 | 위치 | 종료 코드 | 결과 |
|---|---|---|---|
| `corepack pnpm lint` | 저장소 | 0 | 오류·경고 없음 |
| `corepack pnpm typecheck` | 저장소 | 1 | 오류 3건. 모두 사용자 `.next/types`의 옛 경로 `(public)/employer/candidates`에서 났다(기존 O-8과 같은 원인) |
| `tsc --noEmit` | 작업 트리(2e26899, build 후) | 0 | 오류 없음 |
| `corepack pnpm test` × **3회 연속** | 저장소 | 0·0·0 | 3회 모두 84 files / 620 tests 통과. skip·todo·only 0 |
| `corepack pnpm test -- -t "WO15\|N-05\|R-006 ledger"` | 저장소 | 0 | WO15·N-05·원장 테스트 묶음 통과 |
| `corepack pnpm i18n:check` | 저장소 | 0 | ko 1183 keys, 6 locales, errors 0 |
| `corepack pnpm qa:static` | 저장소 | 0 | errors 0, warnings 22. P2d run 2보다 2건 늘었는데, `smtp.ts:107`과 `statusCheck.ts:229`의 `console.warn`이다(이번 선행 작업의 의도된 변경) |
| `next build` | 작업 트리 | 0 | `Compiled successfully`. 경고 없음 |
| `playwright test` 전체 1차(개발 DB) | 작업 트리, E2E_PORT 3310 | 1 | **285 passed / 1 failed / 10 skipped**. 실패는 `auth.spec.ts:48` [desktop]: 로그아웃 뒤 `/admin`이 `/admin/login`으로 가지 않았다(관찰 O-2) |
| `auth.spec.ts --repeat-each 5` | 작업 트리 | 0 | 80/80 통과 |
| `playwright test` 전체 2차(개발 DB) | 작업 트리 | 0 | **286 passed / 10 skipped** (2.6m). skip 10건은 mobile-375 스펙을 desktop 프로젝트에서 건너뛴 것(설계) |
| `integration.spec` + `admin-rules.spec` `--repeat-each 3` | 작업 트리 | 0 | 30/30 (R-217은 두 프로젝트 × 3 = 6/6) |
| **클린 DB** `db.ts reset` → `playwright test` 전체 | 작업 트리, 임시 54329, E2E_PORT 3330 | 0·0 | 마이그레이션 11개 적용, 시드 `{"regions":246,"industries":21,"visaTypes":19,"sampleRules":2,"sampleScoreTables":1}`. E2E **286 passed / 10 skipped** (2.8m) |
| `tsx scripts/lighthouse.ts --skip-build` (LH_PORT 3320) | 작업 트리 | 1 | CHROME_PATH 없이 실행하면 `lighthouse failed for …/ko`(O-1). headless shell 경로를 주면 측정되지만 기준에 미달한다(O-1) |
| `corepack pnpm test` (끝) | 저장소 | 0 | 84 files / 620 tests 통과 |

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| 1 | **R-217(필수)**: 간편 등록 → 프로필 완성 → 관리자 A 승격 → 기업 후보 노출 → 면접 요청 → 추천 원장 생성 Playwright 통과 | (a) `integration.spec.ts` 내용을 검토했다. (b) 개발 DB에서 전체 2회와 반복 3회, 클린 DB에서 1회 실행 | Pass | (a) 모든 단계가 프로덕션 빌드 화면을 거친다. 순서는 다음과 같다. 픽스처는 기업 계정(검증·계약, C-2/PC-2)과 후보 목록 격리용 태그(`convertibleVisa`에 비활성 VisaType)뿐이다.<br>• 간편 등록 UI → DB가 `isQuickSignup, B, completedStep 0`<br>• 위저드 Step 1~7 UI → `completedStep 7, B, JOB_MATCH`, 아직 후보 아님<br>• ADMIN이 `/admin/login` 비밀번호 → `/admin/2fa/setup` TOTP → `/admin`<br>• 상담·체류자격 확인 체크 저장(`SEEKER_REVIEW_UPDATE` 1건) → `promote-A` → 화면 "A등급", `SEEKER_GRADE_CHANGE` actor = 그 직원, 후보 자격 true<br>• 플래그 on 서버에서 기업 로그인 → 카드 1장, `data-grade A`, 화면에 이름과 전화 끝 8자리 없음<br>• 면접 요청 UI → `InterestRequest {seekerId, RECEIVED}`<br>• `/admin/matching`에서 추천 실행 → 대기 목록에서 사라짐<br>• `Recommendation` 1행 `{companyId, postingId null, staffId}`, 감사 `["RECOMMENDATION_CREATE"]`, 요청 상태 `RECOMMENDED`<br>(b) 개발 DB 2차: 두 프로젝트 모두 ok(15.9s/15.2s). 반복 6/6. 클린 DB에서도 통과 |
| 2 | **WO §15 1~11(필수)**: README 매핑표의 테스트가 실제로 있고 해당 항목을 검증하며 모두 통과 | (a) README 매핑표에서 파일과 테스트 이름 34개를 기계적으로 대조했다(이름의 `…` 앞뒤 조각이 파일 안에 있는지). (b) 1·2·10·11번은 테스트 본문을 읽었다. (c) Vitest 3회와 E2E 3회(개발 2, 클린 1)에서 통과 여부를 확인 | Pass | (a) 34/34 존재(1:1, 2:1, 3:5, 4:4, 5:5, 6:5, 7:2, 8:3, 9:4, 10:2, 11:1).<br>(b) 각 테스트의 검증 내용:<br>• 1번: 시드 SAMPLE 구직자 수와 DB 전체 행의 키를 검사<br>• 2번: 기업 응답 전체의 연락처 검사<br>• 10번: `DEMAND_MIN_SAMPLE = 5`(`src/config/limits.ts:9`) 미만 셀이 `masked:true, count:null, payBand:null`<br>• 11번: 항목 1<br>(c) Vitest 620/620 ×3. E2E 매핑 테스트(jobs-apply, employer-candidates, consent-revoke, home, employer-intake, integration)는 2차·클린 실행에서 모두 ok |
| 3 | **출시 명령(필수)**: `lint`·`test`·`test:e2e`·`build` 성공 | 명령 표 | Pass | lint 0, test 620 ×3(+끝 1회), build 0. E2E는 개발 DB 2차 286/286, 클린 DB 286/286. 1차의 1건 실패는 간헐(O-2)이고 같은 스펙을 5회 반복하면 80/80이다 |
| 4 | **플래그 4종 기본 false(필수)** | `src/config/flags.ts`, `.env.example`, `flags.test.ts`, playwright 설정, 로컬 `.env`의 `=true` 줄 수 | Pass | `isFeatureEnabled`는 값이 정확히 "true"일 때만 켠다. `.env.example`은 네 줄 모두 `=false`다. 테스트 "PRD §6 … the default E2E server sets no flag"가 통과했다. 기본 서버(3310)에서 `/jobs`·`/demand`는 ComingSoon이고 E2E 회귀가 통과했다. 로컬 `.env`의 `FEATURE_*=true` 줄은 0개 |
| 5 | **N-01**: 채팅·연락처 열람·이메일 전달·외부 링크 공유 UI/API 0건 | 빌더 체크리스트와 별개로 직접 확인했다.<br>(a) grep: `src`의 `tel:`·`mailto:`·`sms:`·`wa.me`·`t.me`·`viber:`·`kakao`·`zalo`·WebSocket·EventSource·BroadcastChannel·chat/messenger<br>(b) API 8개와 서버 액션 21개 목록에서 기업 대상 경로를 열람<br>(c) 알림 템플릿 전부(ko): otp, profileCompletion, interviewConsent, statusCheck, stayExpiry<br>(d) 실화면 스캔(1280·375): 공개 18경로 × ko/vi/uz, 로그인 구직자(추천·확정 면접 있음) 8경로, 로그인 기업(검증·계약) 4경로, 기업 API 2개. 모든 `a[href]`의 tel/mailto/sms/메신저/외부 링크, "채팅·메시지 보내기·연락처 보기" 문구, email/tel/textarea 입력을 수집 | Pass | (a) `tel:`/`mailto:`는 운영자 대표 연락처뿐이다(`site-footer.tsx:68,137`, `site-nav.tsx:196`, `home/final-cta.tsx:89`). 메신저 링크는 `seeker/referral-share.tsx`의 본인 추천 코드 공유뿐이다(PC-9 예외). 문구에는 상대방 연락처가 없고, 추천 코드와 간편 등록 URL만 있다. WebSocket·채팅은 0건이다.<br>(b) 기업 응답은 `blindSeeker`(BLIND 필드)와 `interviewDisclosure`(`["legalName"]`만)를 거친다. 공개 공고는 `BLIND_JOB_FIELDS` 16개이고 회사·연락처 필드가 없다. `/api/files/[token]`은 직원 전용이고 2FA와 `interview:manage`가 필요하다.<br>(c) 템플릿에는 운영자 링크와 일수만 있다. 기업 정보·연락처는 없다.<br>(d) 모든 페이지에서 `tel:0262818901`(푸터, 홈 본문 최종 CTA)만 나왔다. 추천 코드 페이지는 wa.me·t.me·viber 공유 링크 3개다. 기업 화면 4개는 푸터 운영자 전화뿐이다. 기업 API 2개는 200이고 전화·이메일 패턴 0건이다. 입력란은 본인 정보 입력(로그인·등록·구인 의뢰 담당자 email, 구직자 phone)뿐이다 |
| 6 | **N-02**: `pnpm i18n:check` 누락 0 | 명령 표 | Pass | `source ko: 1183 key(s), locales: 6, errors: 0` |
| 7 | **N-03**: 약관·동의서·고지 초안 전부 [전문가 검토 필요] | (a) `content/` 파일 42개에 표시 문자열이 있는지 확인. (b) 화면 렌더링: 12경로 × 6개 언어(비로그인), 로그인 기업 `/employer/request`·`/employer/contract` × 6개 언어, 간편 등록 동의서(ko, vi는 펼쳐서 확인), 구직자 면접 동의서(vi, 확정 면접) | Pass | (a) 동의서 5종 × 6개 언어(30개)와 기업 약관 6개 언어 파일은 모두 표시가 1개씩 있다. guide 비ko 5개 파일에는 없지만 페이지가 ExpertReviewMark를 렌더링한다. 가이드는 약관·동의서·고지가 아니다.<br>(b) `/privacy`·`/terms`·`/fees`·`/about`·`/guide/how-to-use`는 6개 언어 모두 `expert-review` 1개다. 라벨 `[전문가 검토 필요]`가 ko 원문(`lang="ko"`)으로 표시된다. 구인 의뢰 수집 고지(Q-12 ③)와 기업 약관도 6개 언어 모두 1개다. 간편 등록은 동의서 3개에 표시 3개가 있다(6개 언어). 면접 동의서는 vi에서 "[전문가 검토 필요] [Cần chuyên gia xem xét] …"로 나온다. 비로그인 `/employer/request`가 0개인 것은 로그인 화면으로 리디렉트되기 때문이다(로그인 후 1개) |
| 8 | **N-04**: 375px 폭에서 가로 스크롤 없음(주요 공개·구직자 화면) | (a) `mobile-375.spec.ts` 실행과 내용 검토. (b) 직접 확인: 375×812(모바일, 터치)에서 6개 언어 × 공개 18경로 + 플래그 on `/jobs`·`/demand`(120페이지)의 요소 경계를 스캔. 텍스트가 있는 요소가 뷰포트 밖으로 나가는지, 가로 스크롤 컨테이너 안이 아닌지 봤다. (c) 같은 페이지에서 `html, body {overflow-x: visible}`를 주입해 다시 측정 | **Fail** | (a) 스펙은 2차·클린 실행 모두 10/10 통과다. (b) **en·vi·uz 홈의 대상 선택 탭(`role=tablist`)에서 세 번째 탭이 375px 밖으로 잘린다.** 위치는 en "Partner agencies" [243,384], vi "Văn phòng đối tác" [274,422], uz "Hamkor agentlik" [269,405]다. tablist `scrollWidth`는 vi 401, uz 384인데 폭은 335다. 나머지 117페이지는 0건이다. `qa_p2e_home_vi_375_tabs.png`에 "Văn phòng đố"까지만 보인다. (c) `html`·`body`의 `overflow-x: clip`(globals.css:348, 361)을 풀면 문서 가로 넘침이 en +10, vi +47, uz +31px이다(ko 0). 즉 가로 스크롤바만 막혔고, 내용은 375px에 들어가지 않고 잘린다 → D-2. 그리고 `mobile-375.spec`의 판정식 `scrollWidth − clientWidth`는 clip 때문에 항상 0이라 넘침을 잡지 못한다 → D-3 |
| 9 | **N-05**: PII 열람·내보내기·등급 변경·추천·공고 공개 각각 로그 생성 테스트 | `tests/unit/lib/auditCoverage.test.ts` 본문 검토와 실행 | Pass | 6개 테스트가 실제 진입점을 거친다: `revealSeekerPii`, `auditPiiExport`(PC-14 함수 단위), `changeSeekerGrade`, `createRecommendation`, `publishPosting`. 각 테스트는 다음을 검사한다:<br>• 감사 1행과 actor·entity<br>• meta에 평문 이름·전화·이메일이 없음(`expectNoPii`)<br>• 거부된 작업은 0행: 요건 미충족 등급 변경, 미검증 공고 공개, 중복 추천<br>3회 모두 통과. R-217 E2E도 `SEEKER_GRADE_CHANGE`와 `RECOMMENDATION_CREATE`를 실제 서버 경로로 확인한다 |
| 10 | **N-06**: 키·비밀번호는 `.env`(git 제외), `.env.example`만 커밋 | `git ls-files`, `git check-ignore -v .env`, `git log --all -- .env*`, `.env.example` 전체 열람, 2e26899 트리에서 긴 비밀 값 패턴 grep | Pass | 추적되는 파일은 `.env.example`뿐이다. `.gitignore:30 .env*`가 `.env`를 제외한다. `.env` 이력은 0건이다. 비밀 값(ENCRYPTION_KEYS, HASH_KEY, AUTH_SECRET, INGEST_API_KEY, SMTP_*, SEED_ADMIN_*)은 모두 빈 값이다. `DATABASE_URL`의 `postgres:postgres`는 로컬 임베디드 initdb 기본값이라고 주석에 적혀 있다. 비밀 패턴 0건 |
| 11 | PLAN 작업 5: 전체 명령 1회 클린 실행(`db:reset` 후) | 환경의 클린 실행 절차 | Pass | 임시 DB(구직자·사용자·감사 0행)에서 reset → E2E 286/286. 2e26899가 겨냥한 "클린 DB에서 R-117 수요 E2E"(demand.spec, mobile-375 프로젝트 포함)도 통과했다. lint, test, i18n, qa:static, build는 같은 커밋에서 따로 성공했다(명령 표) |
| 12 | 선행 A-1 (P2d O-5): 샘플 규칙 폼이 목록 밖 값을 유지하고 저장은 거부 | STAFF_VISA 실제 로그인(TOTP) → `/admin/rules/sample-rule-1` → 폼 값 확인 → "초안 저장" → 오류 코드, 폼 값, DB 행을 비교. E2E "QA P2d O-5" 반복 3회 | Pass | 폼: `visaCode=SAMPLE-1 [SAMPLE-1 (현재 값 · 목록에 없음, 저장하려면 바꾸세요)]`, `messageKey=visa.rule.sample.placeholder`. 저장하면 `data-code=UNKNOWN_VISA`, "목록에 있는 비자만 고를 수 있습니다." 저장 뒤 폼은 SAMPLE-1 그대로다. DB 행은 저장 전후 전체 JSON이 같다(`same:true`, DRAFT, isSample true). `qa_p2e_sample_rule_form.png` |
| 13 | 선행 A-2 (P2d O-1): maskLink가 문장 안 링크를 마스킹 | `maskLink`에 13가지 입력. 콘솔 어댑터(development)에 문장형 params | Pass | 다음 경우 모두 토큰·서명·쿼리 값이 `***`가 됐다. 문장 부호는 유지된다(`/***,` `/***.`).<br>• 문장 중간 URL<br>• 쉼표·마침표가 뒤에 붙은 URL<br>• 괄호·따옴표 안 URL<br>• 탭 뒤 URL<br>• `x=`·`Link:`·한글 바로 뒤에 붙은 URL<br>• 상대 경로 `/ko/seeker/still-searching/…`<br>• 쿼리 `?token=…&email=…`<br>• 대문자 스킴<br>경로 단어만 있는 `/ko/seeker/me/stay`와 `3/4`는 그대로다. 콘솔 어댑터 로그는 `"text":"열기 https://a.example/ko/seeker/still-searching/*** 감사"`. 예외는 스킴 없는 `www.` 링크(O-3) |
| 14 | 선행 A-3: `level:"warn"` 로그는 console.warn으로(statusCheck 기본 싱크, SMTP 실패 기본 싱크, 워커 시작 경고) | (a) 임시 DB에서 `runStatusCheck`(log 옵션 없음, 콘솔 provider)에 console.info와 warn을 감시. (b) 워커를 임시 DB에 25초 띄우고 stdout과 stderr를 나눠 기록. (c) SMTP: `createSmtpProvider` 단독 호출, 그리고 **실행 경로** `selectNotificationProvider({env: 가짜 SMTP_*, transport: 실패 모의})`. 두 경우 모두 log 옵션 없이 실패 전송 | **Fail** | (a) Pass: `status_check.simulated` warn 1줄이 console.warn으로 갔다(info 0). (b) Pass: `status_check.transition_disabled`는 **stderr**, `notification.provider`와 `worker.started`는 stdout. (c) 단독 호출은 console.warn이다. **하지만 실제 앱·워커가 쓰는 `selectNotificationProvider` 경로에서는 실패 줄 `{"level":"warn","event":"notification.send","provider":"smtp",…}`이 console.info로 나간다** → D-1 |

## 판정불가 / 사람 확인 필요
- 판정불가 항목은 없다.
- 사람 확인이 필요한 것은 D-2와 D-3이다. N-04 문구 "가로 스크롤 없음"을 글자 그대로 읽으면 스크롤바가 생기지 않으니 충족이다. QA는 내용이 375px을 넘쳐 잘리는 것을 같은 결함으로 보고 Fail로 판정했다. 이 해석은 Gate 4에서 확인하면 된다.

## 결함 목록 (Fail만)
| 번호 | 심각도 | 위치 | 재현 | 기대 | 실제 |
|---|---|---|---|---|---|
| D-1 | 낮음 | `src/lib/notifications/index.ts:63-66` (`selectNotificationProvider`), `src/lib/notifications/smtp.ts:103-107` | `selectNotificationProvider({ env: { SMTP_HOST: "smtp.qa.invalid", SMTP_FROM: "noreply@qa.invalid" }, transport: { sendMail: () => Promise.reject(Object.assign(new Error("x"), { code: "EENVELOPE" })) } })` → `provider.send({ channel: "EMAIL", … })`를 console.info/warn 감시 하에 실행 | 실패 줄(`level:"warn"`)은 console.warn(커밋 dca582b 설명 "SMTP failure default sink") | console.info로 나간다. 원인: `selectNotificationProvider`가 `log`를 생략할 때 기본값 `(line) => console.info(line)`을 만들어 `createSmtpProvider(…, { transport, log })`로 넘긴다. 그래서 smtp.ts의 `if (options.log)` 분기가 항상 참이다. 단위 테스트 `index.test.ts:246`은 `createSmtpProvider`를 직접 호출하는 경우만 검사해 이 경로를 놓친다. 실제 SMTP를 켜면 운영 로그에서 전송 실패가 info 레벨로 묻힌다 |
| D-2 | 중간 | `src/components/ui/tabs.tsx:21`(TabsList `inline-flex max-w-full …`, 줄바꿈·스크롤 없음), 홈 `src/components/home/audience-selector-client.tsx`, `src/app/globals.css:348,361`(`overflow-x: clip`) | 375×812에서 `/en`, `/vi`, `/uz` → "Choose your path / Bạn là ai?" 섹션 탭 | 세 탭이 375px 안에 모두 보임(가로 넘침 0) | 세 번째 탭이 화면 밖으로 잘린다: en [243,384], vi [274,422], uz [269,405]. vi에는 "Văn phòng đố"까지만 보인다(`qa_p2e_home_vi_375_tabs.png`). clip을 풀면 문서 넘침이 +10/+47/+31px다. ko·ru·zh는 정상 |
| D-3 | 중간 | `tests/e2e/mobile-375.spec.ts:56-60`(`horizontalOverflow`) | html·body가 `overflow-x: clip`인 상태에서 넘치는 페이지(D-2)에 스펙을 실행 | N-04 일괄 E2E가 넘침을 잡아 실패 | `document.documentElement.scrollWidth − clientWidth`가 clip 때문에 항상 0이라 D-2가 있어도 통과한다(2차·클린 실행 10/10). 판정을 요소 경계(뷰포트 밖 요소, 가로 스크롤 컨테이너 안은 제외)로 바꾸거나, 측정할 때 clip을 풀어야 검증력이 생긴다 |

## 관찰 / 기준 외 발견
| 번호 | 내용 | 재현·증거 | 영향 | 제안 |
|---|---|---|---|---|
| O-1 | **Lighthouse /ko 성능 84**(3회 86·80·84, 기준 85 미달). LCP 3776ms(4239·3775). LCP 요소는 `<p class="reveal mt-6 max-w-155 text-lead text-white/66 is-in" style="--reveal-y:22px;transition-delay:0.08s">`(히어로 리드)다. 같은 측정의 /ko 지표: FCP 2276~2875ms, TBT 20~116ms, CLS 0.003. 다른 페이지는 /ko/about 92, /ko/fees 88, /ko/terms 93이고 접근성은 모두 100이다. 별도로, `scripts/lighthouse.ts`를 CHROME_PATH 없이 실행하면 `lighthouse failed for …/ko`로 끝났다. `--quiet` 때문에 원인이 출력되지 않는다. 같은 CLI를 Playwright 전체 chrome.exe로 실행하면 `spawn UNKNOWN`이고, headless shell(`chromium_headless_shell-1255`) 경로를 주면 정상이다 | 측정 조건: 프로덕션 빌드(2e26899), 127.0.0.1:3320, headless shell, 3회 중앙값. 측정 중 다른 서버는 없었다 | 출시 점검 명령 `pnpm lighthouse` 실패 | Q-28대로 run 2에서 히어로 리드 reveal 제외. 스크립트가 headless shell을 못 찾는 경우를 확인하고, 실패 시 원인을 출력할 것 |
| O-2 | `auth.spec.ts:48` [desktop] 간헐 실패 1회: 로그아웃 뒤 `page.goto("/admin")`이 `/admin`에 머물렀다(5s) | 1차 전체 E2E. 같은 스펙 `--repeat-each 5`는 80/80, 2차 전체와 클린 실행에서는 통과 | 낮음(간헐, 로그아웃 쿠키 반영 타이밍으로 보임) | 계속 관찰 |
| O-3 | `maskLink`는 스킴 없는 `www.example/…/eyJ…~SIG`를 마스킹하지 않는다 | 항목 13의 입력 | 현재 호출처는 모두 `https://`·`/`로 시작하는 링크라 해당 없음 | 기록만 |
| O-4 | 기업 가입(`/employer/signup`)은 이메일·사업자번호·회사명을 받는데, 화면에 수집 고지와 약관 동의가 없다(약관은 로그인 뒤 `/employer/contract`에서 받음). N-03은 "있는 초안의 표시"라서 이번 판정과는 무관하다 | `/ko/employer/signup` 입력 `bizRegNo, companyName, email, password, …`. 화면에 보이는 법적 문구는 푸터 링크뿐이다 | 법무 판단 사항 | Gate 4 법무 확인 목록에 추가 검토 |
| O-5 | 로컬 `pnpm typecheck`가 사용자 `.next/types`의 옛 경로 때문에 실패한다(기존 O-8). 작업 트리 `tsc`는 0 | 명령 표 | 출시 명령 `typecheck`가 이 PC에서만 실패 | `.next` 정리는 사용자 판단 |
| O-6 | qa:static warnings 20 → 22(console.warn 2건, 의도된 변경) | 명령 표 | 없음 | 기록만 |
| O-7 | 개발 DB에 시험 행이 남았다: E2E 전체 2회, 반복 실행, 스크래치 스펙(직원 계정, 기업 2개, 구직자 2명, 추천·면접 2건, VisaType 태그). 원장 행은 설계상 지울 수 없다. 샘플 규칙은 저장이 거부돼 변화 없음. 임시 DB는 삭제했다 | — | 없음(기존과 같은 성격) | 기록만 |

## README 매핑표 대조 (WO §15)
| # | 테스트 파일 수 / 이름 수 | 존재 | 통과 |
|---|---|---|---|
| 1 | 1 / 1 | 1/1 | Vitest ×3 |
| 2 | 1 / 1 | 1/1 | Vitest ×3 |
| 3 | 4 / 5 | 5/5 | Vitest ×3, E2E jobs-apply ok |
| 4 | 3 / 4 | 4/4 | Vitest ×3 |
| 5 | 3 / 5 | 5/5 | Vitest ×3 |
| 6 | 5 / 5 | 5/5 | Vitest ×3, E2E employer-candidates ok |
| 7 | 2 / 2 | 2/2 | Vitest ×3 |
| 8 | 3 / 3 | 3/3 | Vitest ×3, E2E consent-revoke ok |
| 9 | 4 / 4 | 4/4 | Vitest ×3, E2E home·employer-intake ok |
| 10 | 1 / 2 | 2/2 | Vitest ×3 |
| 11 | 1 / 1 | 1/1 | E2E integration ok(개발 2회, 반복 6/6, 클린 1회) |
