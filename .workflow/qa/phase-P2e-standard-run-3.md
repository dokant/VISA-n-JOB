# Phase P2e 기준 재검토 run 3 (최종, 정적)

- 대상: 커밋 51e0dfb (`git show 51e0dfb`, 5개 파일: `src/components/ui/tabs.tsx`, `src/app/[locale]/employer/contract/page.tsx`, `tests/e2e/mobile-375.spec.ts`, `scripts/lighthouse.ts`, `README.md`)
- 기준: STANDARD v2.23(3.1 tabs·button 줄바꿈 변형, 2.6·S-07), run 2 보고서 R2-1. 이번 검토에서 v2.24로 명문화했다(6절).
- 방법: 정적 열람, QA 스크린샷 `p2e_r3_home375_tabs_{en,uz,vi}.png`·`p2e_r3_employer_contract_ru_375.png`, QA E2E 로그 `p2e_r3_e2e_full.log`(읽기만). build·test·test:e2e·dev·start·lighthouse는 돌리지 않았고 `.next`에는 쓰지 않았다. 산출물은 고치지 않았다.

## 1. run 2 불일치 해소: 1/1

| 번호 | 확인 | 판정 |
|---|---|---|
| R2-1 탭 라벨 단어 중간 분리 | `tabs.tsx:41` 트리거에서 `min-w-0`을 빼서 기본 `min-width: auto`가 되었고, `wrap-normal`을 더해 전역 `overflow-wrap: anywhere`(`globals.css:362`, body에서 상속)를 `normal`로 덮는다. 그래서 min-content가 가장 긴 단어 폭이 된다. `wrap-normal`은 Tailwind 4.3.5 기본 유틸리티라 임의값 클래스가 아니다. 스크린샷 en "Companies / Job seekers / Partner agencies", uz "Kompaniyalar / Ish izlovchilar / Hamkor agentlik", vi "Doanh nghiệp / Người tìm việc / Văn phòng đối tác"는 모두 단어 사이에서만 줄바꿈되고, 트랙 안에 있으며, 높이는 44px 이상이다. 6개 언어 E2E `N-04 / R2-1`(단어별 글자 줄 위치, 44×44, 트랙·뷰포트 안, 라벨 넘침)은 QA 로그에서 ok다. `TabsTrigger`를 쓰는 곳은 `audience-selector-client.tsx:58` 하나뿐이라 다른 화면 영향은 없다 | **해소** |

## 2. 이번 diff 항목별 판정 (v2.23/v2.24 기준)

| 번호 | 점검 항목 | 근거 | 판정 |
|---|---|---|---|
| G-01 | 탭 라벨 단어 사이 줄바꿈(`wrap-normal` + 기본 min-width) | 3.1 tabs v2.23 | 일치 |
| G-02 | 탭 목록이 컨테이너를 넘지 않음, 숨은 가로 스크롤 없음 | 3.1 tabs, 2.6 | 일치 (스크린샷 3종, E2E 6개 언어) |
| G-03 | 탭 나머지 규격 유지(`min-h-11`, `px-3 sm:px-4`, `text-caption` 600, `leading-tight`, n700, 선택 흰 바탕·navy·`shadow-tab`) | 3.1 tabs, B-05, B-10 | 일치 |
| G-04 | 계약 화면 후보 버튼 줄바꿈 변형 `h-auto min-h-13 max-w-full py-3 text-center whitespace-normal` | 3.1 button v2.23 | 일치 (default 52px 아래로 줄지 않음, variant·화살표 유지) |
| G-05 | 같은 버튼의 단어 중간 분리 없음, 터치 44px 이상 | 3.1 button("단어 중간 분리 금지는 tabs와 같다"), S-08 | 일치 (ru 스크린샷 "Смотреть анонимных / кандидатов") |
| G-06 | 375px 넘침 측정: clip을 풀고 `scrollWidth`를 잰 뒤 되돌림, `clippedInteractive` 유지 | 2.6·S-07 v2.23 | 일치 (기준보다 엄격한 방향. v2.24에 측정 방법으로 기재) |
| G-07 | 로그인한 기업 화면 375px 검사(계약·미계약, 플래그 on/off 서버) | 2.6 "공개·구직자·기업 화면" | 일치 (6개 언어 ok) |
| G-08 | 새 E2E 위치·태그(`tests/e2e/mobile-375.spec.ts`, `N-04`), 도우미는 `support/candidatesDb` | 4.10 v2.22 | 일치 |
| G-09 | `scripts/lighthouse.ts`: 잘못된 CHROME_PATH는 빌드 전 종료, 사용 브라우저 출력·`summary.json` 기록 | S-45(src 한정)·N-06 | 일치 (경로만 출력하고 비밀값은 없음. `.lighthouse/`는 `.gitignore:49`) |
| G-10 | README Gate 4 법무 목록 새 항목(기업 가입 화면 수집 고지·약관 동의 없음) | 1절 run 2 R-3 원칙(원천 기록과 일치) | 일치 (QA `phase-P2e-run-1.md:111` O-4, `run-2.md:120` O-7과 같은 내용. `employer/signup/page.tsx` 확인) |
| G-11 | diff 안 임의값 클래스·`text-xs` 없음 | 2.4, CLAUDE.md | 일치 |
| G-12 | 변경 주석이 기준 번호를 정확히 인용(v2.23 3.1 tabs/button) | 개정 이력 | 일치 |

**새 변경 일치 12 / 12, 새 불일치 0**

## 3. 불일치 목록

없음.

## 4. 관찰 (판정 밖)

- O-1: `wrap-normal`이라 단어 하나가 트랙 최대 폭보다 길면 끊기지 않고 탭이 넘친다. v2.23은 이 경우 `anywhere`가 작동하기를 바란다. 지금 6개 언어 라벨은 해당하지 않고, 넘치면 E2E `tabProblems`(트랙·뷰포트 밖 검사)가 잡는다. 라벨을 바꿀 때만 다시 보면 된다.
- O-2: `tabProblems`는 공백 단위로 단어를 나눈다. zh처럼 공백 없는 라벨이 두 줄이 되면 단어 분리로 오탐할 수 있다. 지금 zh 탭은 한 줄이라 영향이 없다.
- O-3: README 새 항목의 출처는 QA 보고서뿐이고 DECISIONS·STATE에는 아직 없다. 기록할지는 오케스트레이터가 정한다.

## 5. P2e 전체

run 1 E-01~E-21(21항목), run 2 F-01~F-18(18항목, R2-1이 해소되어 F-06 일치), run 3 G-01~G-12(12항목) → **P2e 전체 일치 51 / 51**.

## 6. STANDARD v2.24 변경 내역 (판정 변화 없음)

1. 2.6·S-07 (1): `html`·`body`의 `overflow-x: clip`을 측정 동안만 풀어 `scrollWidth`를 재는 방식을 표준 측정으로 적었다.
2. 개정 이력에 3.1 tabs 단어 사이 줄바꿈의 구현 예(`wrap-normal` + 기본 `min-width: auto`)를 적었다.

## 7. 프로젝트 전체 기준 요약 (P0a~P2e, 각 Phase 최종 run 기준)

| Phase | 최종 보고서 | 최종 run 판정 | 이후 해소 반영 최종 |
|---|---|---|---|
| P0a | phase-P0a-standard-run-2.md | 14 / 15 (S-11) | 15 / 15 (S-11은 P0b run 1에서 해소) |
| P0b | phase-P0b-standard-run-1.md | 13 / 14 (Region 코드 형식) | 14 / 14 (P0c run 1에서 해소) |
| P0c | phase-P0c-standard-run-1.md | 17 / 18 (S-50) | 18 / 18 (P1a run 1에서 해소) |
| P1a | phase-P1a-standard-run-2.md | 해소 4/4, 새 불일치 0 | 69 / 69 (점검표 60 + 규칙 9) |
| P1b | phase-P1b-standard-run-1.md | 48 / 51 (Q-09 개정 후 49 / 51) | 51 / 51 (#2·#3은 P1c run 1에서 해소) |
| P1c | phase-P1c-standard-run-3.md | 68 / 68 | 68 / 68 |
| P1d | phase-P1d-standard-run-2.md | 44 / 44 | 44 / 44 |
| P1e | phase-P1e-standard-run-3.md | 60 / 60 | 60 / 60 |
| P2a | phase-P2a-standard-run-2.md | 35 / 35 | 35 / 35 |
| P2b | phase-P2b-standard-run-2.md | 35 / 35 (추가 판정 포함 46/46) | 35 / 35 |
| P2c | phase-P2c-standard-run-3.md | 50 / 50 | 50 / 50 |
| P2d | phase-P2d-standard-run-2.md | 39 / 39 | 39 / 39 |
| P2e | phase-P2e-standard-run-3.md | 51 / 51 | 51 / 51 |
| **합계** | | | **549 / 549, 남은 불일치 0** |

- 집계 방식: 각 Phase 보고서의 판정 대상 항목 수로 세었다. "해당 없음" 항목은 넣지 않았다. P2b는 run 1 표 35항목 기준으로 세었다.
- 기준서 최종 버전: STANDARD v2.24.
