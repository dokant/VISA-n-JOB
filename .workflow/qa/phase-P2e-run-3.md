# QA 보고서 — Phase P2e / run 3 (재확인·회귀)

- 대상 커밋: 51e0dfb (HEAD)
  - 탭 라벨은 단어 사이에서만 줄바꿈(R2-1)
  - ru `/employer/contract`의 후보 버튼 줄바꿈(run 2 O-1)
  - N-04 E2E를 로그인 기업 화면까지 넓히고, clip을 해제한 상태로 넘침 측정
  - README Gate 4 법무 목록에 기업 가입 고지 추가(run 2 O-7)
  - `scripts/lighthouse.ts`는 쓸 수 없는 CHROME_PATH를 받으면 측정 전에 멈춤(run 2 O-2)
- 저장소 작업 트리의 src·tests·scripts는 51e0dfb와 같다. 복사본의 파일을 `git show 51e0dfb:<file>`과 `cmp`로 비교한 결과도 같다.
- 기준 문서: PRD R-217·N-01~N-06·§6, PLAN `### P2e`, STANDARD v2.23 3.1 tabs, P2e 기준 재검토 run 2(R2-1), P2e QA run 2(O-1·O-2·O-7, 항목 21 판정불가)
- 일시: 2026-11-18 13:49 ~ 14:30 (KST)
- 환경: 통합 QA(`integration-run-1.md`)와 같은 실행을 썼다.
  - 저장소에서 `corepack pnpm`을 순차로 실행했다.
  - 복사본은 스크래치패드 `wt`에 `git archive 51e0dfb`로 풀었다.
    - `node_modules`는 junction으로 연결해 읽기만 했다.
    - pnpm과 corepack은 쓰지 않았다.
  - 임시 클러스터: `PG_DATA_DIR=<스크래치>/pgint`, 127.0.0.1:54329, DB `visanjob_integ`
  - 서버 포트: E2E 3350~3353, Lighthouse 3360·3361

## 결과 요약
- 통과: 8 / 전체: 8 (통과율 100%), Fail 0, 판정불가 0
- run 2의 판정불가 항목 21(Lighthouse 실패 원인 출력)도 이번에 실제 출력으로 확인했다(항목 7).
- 필수 항목: 해당 없음
  - 이번 재확인 항목은 모두 run 2 관찰과 기준 불일치에 대한 것이다.
  - 출시 기준 항목은 통합 보고서에서 판정한다.
- 이번 run 범위 밖에서 새 결함 1건을 발견했다(관찰 O-1). 통합 보고서 결함 I-1로 올렸다.
  - 내용: 관리자 로그아웃이 동시에 진행 중인 요청 때문에 되살아난다.
  - 영향: 클린 E2E 1회차의 유일한 실패 원인이다.

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| 1 | **R2-1** 375px 6개 언어 홈 탭: 단어 중간 분리 없음, 44px 이상, 트랙(tablist) 안 | 빌더 스펙과 별개로 스크래치 Playwright 스펙을 썼다(375×812, 모바일·터치). 각 탭의 공백 단위 단어마다 Range `getClientRects()`의 줄(top) 수를 셌다. 탭 박스, tablist 경계, 라벨 넘침을 측정하고 세 번째 탭을 눌렀다. 스크린샷을 남겼다 | Pass | 18개 탭 모두 `splitWords: []`, 높이 44, 폭 48~127, tablist·뷰포트 안(25~350), `listOverflow 0`, 라벨 넘침 없음. 세 번째 탭은 `data-state=active`가 된다. 스크린샷: en "Job / seekers", "Partner / agencies"; vi "Doanh / nghiệp", "Người / tìm việc", "Văn phòng / đối tác"; uz "Ish / izlovchilar", "Hamkor / agentlik". 모두 단어 사이에서만 줄이 바뀐다(`int_tabs_{en,vi,uz}_mobile-375.png`). ko·ru·zh는 한 줄이다 |
| 2 | R2-1 넓은 화면 회귀 | 같은 스펙을 desktop-chromium(1280)에서 실행 | Pass | 6개 언어 18개 탭 모두 높이 44, 단어 분리 0, tablist 안에 있다 |
| 3 | 같은 Tabs 컴포넌트를 쓰는 다른 화면 | `grep -rln "ui/tabs" src` | Pass | 사용처는 `src/components/home/audience-selector-client.tsx` 하나다. 마이페이지·관리자에는 없다 |
| 4 | **run 2 O-1** ru `/employer/contract`(검증·계약 완료, 후보 플래그 on) 375px 넘침 0 | 스크래치 스펙: 검증·계약 기업을 만들어 3353(FEATURE_EMPLOYER_CANDIDATES)에서 로그인했다. 6개 언어 계약 화면에서 `html, body`의 overflow-x를 visible로 바꾸고 `scrollWidth - clientWidth`와 main 안 요소의 최대 right를 쟀다. 후보 버튼 박스도 쟀다 | Pass | 6개 언어 모두 `over 0`, 최대 right 375(전폭 배경 띠). ru 버튼은 [45, 330], 높이 68(두 줄)이다. 나머지 언어는 한 줄 52px이다. `int_contract_ru_375.png`에서 카드 테두리가 잘리지 않는다. 클린 E2E의 mobile-375 기업 화면 6건도 ok다 |
| 5 | **mobile-375 확장 검사가 실제로 잡는지**(기업 화면, clip 해제 측정, 단어 분리) | 변이 시험을 복사본에서만 했다. `tabs.tsx`와 `employer/contract/page.tsx`를 c28b8de 판으로 되돌렸다. 그 상태에서 `playwright test mobile-375.spec.ts --project=mobile-375`(webServer가 새로 빌드)를 실행한 뒤 51e0dfb 판으로 원복하고 `cmp`로 확인했다 | Pass | **2건 실패, 둘 다 기대한 위치다:**<br>• R2-1 테스트: `en "Companies" word split: Companie / s`, `uz "Kompaniyalar" word split: Kompaniyal / ar`(run 2 기준 검토 R2-1과 같은 증상)<br>• 기업 화면(ru): `http://localhost:3353/ru/employer/contract (+26px)`(run 2 O-1과 같은 26px)<br>나머지 15건은 통과했다. 원복 후 두 파일은 51e0dfb와 같다. 원본 코드는 클린 E2E에서 mobile-375 17/17 ok다 |
| 6 | **run 2 O-7** README Gate 4 법무 목록에 기업 가입 고지 | README 189~192행 열람 | Pass | "기업 가입 화면(`/employer/signup`)에 개인정보 수집 고지·약관 동의가 없음(QA P2e run 1 O-4, run 2 O-7)…"이 추가됐다. 기존 3줄(Q-12 ③, Q-25, THIRD_PARTY_INTERVIEW 수령자)은 그대로다 |
| 7 | **run 2 O-2 / 항목 21** 잘못된 CHROME_PATH는 측정 전에 즉시 실패, 실패하면 원인 출력 | 복사본에서 `tsx scripts/lighthouse.ts`를 실행했다(빌드 단계 포함, `--runs 1`). CHROME_PATH 세 가지 값을 줬다: ① 없는 파일 ② 디렉터리 ③ `.exe`가 아닌 파일. 그리고 ④ 실행은 되지만 Chrome이 아닌 `node.exe`를 `--skip-build`로 줬다 | Pass | ①~③은 모두 종료 코드 1이고 약 650ms 만에 끝났다. 출력은 `CHROME_PATH …: file not found` / `not a file` / `not an executable (.exe) file`이다. `.next/BUILD_ID` 시각이 바뀌지 않아 빌드 전에 멈췄음을 확인했다. ④는 `lighthouse failed for …/ko (exit status 1)`, `Chrome: …node.exe (CHROME_PATH)`, Hint 블록, `--- lighthouse log (last 40 lines) ---`(`node.exe: bad option: --disable-extensions` 등)를 출력하고 종료 코드 1이다. 서버 포트 3361도 닫혔다. run 2에서 판정불가였던 실패 원인 출력이 이번에 확인됐다 |
| 8 | 회귀: 클린 실행 명령 | 통합 보고서의 명령 표 | Pass | lint 0(저장소), tsc 0(복사본), test 622 통과(저장소), coverage 622 통과, i18n 0, qa:static errors 0, build 0. E2E 1회차는 294 passed / 1 failed / 17 skipped다. 실패한 1건은 R-118 로그아웃 경합(O-1)으로, 이번 커밋이 바꾼 파일과 관계없다. E2E 2회차(원복 후 다시 빌드)는 295 passed / 0 failed다. 실행 중에 Lighthouse /ko 성능이 84, 86, 86으로 기준 경계에 있었다(통합 보고서 참조) |

## 판정불가 / 사람 확인 필요
- 없음.

## 결함 목록 (Fail만)
| 번호 | 심각도 | 위치 | 재현 | 기대 | 실제 |
|---|---|---|---|---|---|
| — | — | — | — | — | 이번 재확인 범위 안에는 결함이 없다 |

## 관찰 / 기준 외 발견
| 번호 | 내용 | 재현·증거 | 영향 | 제안 |
|---|---|---|---|---|
| O-1 | **관리자 로그아웃이 진행 중인 요청 때문에 되살아난다(간헐).** 클린 E2E 1회차에서 `auth.spec.ts:48`(desktop)이 실패했다. 로그아웃 후 `/admin` 접근이 `/admin/login`으로 가지 않고 대시보드를 보여 줬다. trace 네트워크를 보면 순서가 이렇다: 로그아웃 POST(303)가 `authjs.session-token`을 비운다 → 그 직후 응답이 돌아온 `/admin/placements·visa-cases·rules·score-tables?_rsc` 프리페치 4건이 `Set-Cookie: authjs.session-token=<값>`으로 세션을 다시 심는다 → 다음 `GET /admin`이 200(대시보드)이다. 세션은 JWT 전략(`src/lib/authConfig.ts:46`)이다. `signOutStaff`(`src/server/actions/admin/auth.ts:57`)는 쿠키만 지우고, 미들웨어가 매 응답마다 토큰을 갱신해 다시 보낸다 | 스크래치 스펙(desktop, localhost:3350): ① 로그아웃 전 쿠키를 저장 → 로그아웃 → 쿠키 없음 `/admin/login` → 저장한 쿠키를 다시 넣으면 `/admin` 대시보드(`REPLAY … "urlReplay":"…/admin","dash":1`). ② 관리자 RSC 요청 27건을 띄우면서 로그아웃 6회 → 1회는 `/admin`이 열렸다(`RACE ["/admin","/admin/login",…]`). `auth.spec.ts:48` 단독 ×16은 모두 통과했다(부하가 있을 때만 드러남). STATE P2c run 2 "auth.spec:48 mobile 간헐"과 같은 테스트다 | 공용 PC에서 직원이 로그아웃해도 세션이 남을 수 있다(2FA를 마친 세션). 로그아웃한 토큰도 만료(직원 8시간)까지 유효하다. 출시 명령 `test:e2e`가 간헐로 실패한다 | 통합 보고서 결함 I-1. 로그아웃 시 서버 쪽 무효화를 검토한다(예: 사용자별 세션 버전·`tokenVersion`을 JWT 콜백에서 대조). 또는 로그아웃 이후 갱신 응답이 쿠키를 다시 쓰지 못하게 한다 |
| O-2 | README "WO §15 매핑" 아래 N-04 설명이 "공개 화면 6개 언어, 플래그 on 목록, 로그인 구직자 화면"에서 멈춰 있다. 이번에 넣은 로그인 기업 화면과 탭 단어 분리 검사가 빠졌다 | README 155행 | 문서만의 문제다 | 한 줄 보충 |
| O-3 | 스크래치패드 밖 `%TEMP%`에 `lighthouse.*` 임시 폴더 7개가 남아 있다. 이전 실행들의 chrome-launcher 잔여물이다. 이번 실행에서 생긴 `lighthouse.m36Dq8`만 지웠다 | `ls %TEMP%\lighthouse.*` | 없음 | 사용자 판단으로 정리 |

## 정리
- 통합 보고서의 정리 절과 같다.
- 스크래치 스펙(`zz-qa-int`, `zz-qa-logout`)은 복사본 안에만 있었고, 복사본과 함께 지웠다.
