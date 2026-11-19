# Phase P2e 기준 재검토 run 2 (정적)

- 대상: 커밋 dc4cf0f, c28b8de (`git diff 2e26899..c28b8de`, 12개 파일)
- 기준: STANDARD v2.22(검토 중 v2.23으로 보완, 아래), run 1 보고서 R-1~R-5, DECISIONS Q-28, PLAN "승인 필요 지점", STATE.md Gate 4 기록
- 방법: 정적 열람과 QA 스크린샷(`p2e_r2_home375_tabs_{ko,en,vi,ru,uz,zh}.png`, `p2e_r2_home1280_hero_ko.png`) 확인. build·test·test:e2e·dev·start·lighthouse는 돌리지 않았고 `.next`에는 쓰지 않았다. 산출물은 고치지 않았다.

## 1. run 1 불일치 해소: 5/5

| 번호 | 내용 | 확인 | 판정 |
|---|---|---|---|
| R-1 | 환경 변수 표에 빠진 이름 | `README.md` 저장소 행에 `PRIVATE_STORAGE_DIR`가 있다. 기본값 `storage/private/`도 `src/lib/files/storage.ts:33-34`와 같다. 테스트·측정 행에 `E2E_DEMAND_URL`·`E2E_JOBS_PORT`·`E2E_CANDIDATES_PORT`가 있다. 코드의 `process.env.*` 전체와 대조했다. 표에 없는 것은 QA 전용 `P*_SHOTS`, 테스트 설정이 내부에서 만드는 `TEST_ENCRYPTION_KEY_V1`(`tests/setup/env.ts:11`), 시스템 변수 `CI`·`NODE_ENV`·`LOCALAPPDATA`뿐이다 | 해소 |
| R-2 | 사람 승인 사항 | "사람 승인 필요 (Gate 4 이후)" 표에 A-3·A-5·A-6·A-7·A-8이 담당·위치와 함께 있다. 내용은 PLAN:430-435와 같다. A-7의 "실제 규칙 문구"는 STATE(P2d run 1 Gate 4: 실제 규칙 문구 키 A-7)와 맞다 | 해소 |
| R-3 | Gate 4 법무 확인 항목 누락 | 법무 목록에 Q-12 ③(문구 "[전문가 검토 필요] 표시"는 DECISIONS:15와 같음), Q-25(결과 기록·취소 시 종료, DECISIONS:19와 같음), THIRD_PARTY_INTERVIEW 수령자 미기재(STATE P2c run 1)가 있다. 운영·배포 목록의 P1c O-7·O-9, Q-24, Q-17 ①, P1d O-9·O-10, P2a 개발 DB 초기화, Q-27/P2d도 각각 STATE·DECISIONS 기록과 같다 | 해소 |
| R-4 | N-01 알림 열거 | "OTP·프로필 완성 안내·상태 확인·체류 만료·면접 동의 요청"으로 고쳤다 | 해소 |
| R-5 | 글꼴 절·디렉터리 요약 | Noto Sans KR(ko, `preload: false`), Inter, Noto Sans SC(zh, `fontsZh.ts`)로 고쳤고 Pretendard는 "미사용 보관(SC-11)"이다. `src/lib/fonts.ts`·`globals.css:110-134`와 같다. scripts 줄에 worker·build-terms-pdf·lighthouse가, i18n 줄에 `dateTime.ts`가 들어갔다 | 해소 |

## 2. Q-28 (STANDARD 2.7 Reveal 6항, S-62): 일치

- `src/components/home/hero.tsx`: H1(`:75`)과 리드 `<p>`(`:81`)에 `reveal` 클래스, `--reveal-y`, `transitionDelay`가 없다. 배지(`:68`)와 버튼 줄(`:87-88`)은 reveal을 유지한다(6항 "다른 요소 유지"에 맞음).
- `js-reveal` 상태의 transform은 `.js-reveal .reveal` 선택자(`src/app/brand.css:46,49,453`)에만 걸린다. 따라서 H1과 리드 문단은 `transform: none`이다.
- 테스트 `tests/e2e/home.spec.ts:119` "S-62: …"는 S-62 확인 방법(클래스·`--reveal-y` 0건, computed transform `none`)을 그대로 검사하고, 히어로의 `.reveal`이 2개 이상인지도 본다. 이름 태그는 같은 파일의 S-57·S-58 describe와 같은 형식이다.
- 1280 스크린샷: H1과 리드가 제자리에 보인다.

## 3. 이번 diff 항목별 판정 (v2.23 기준)

| 번호 | 점검 항목 | 근거 | 판정 |
|---|---|---|---|
| F-01 | Q-28 히어로 H1·리드 reveal 제외 | 2.7-6, S-62 | 일치 |
| F-02 | TabsTrigger 높이 44px 이상(`min-h-11`), `lg:h-*` 축소 없음 | 3.1 tabs, B-10, S-08 | 일치 |
| F-03 | TabsTrigger 글자 13px/600, 비선택 n700, 선택 흰 바탕·navy·shadow-tab 유지 | 3.1 tabs, B-05 | 일치 (`text-caption font-semibold`, `text-xs` 없음) |
| F-04 | 좌우 패딩 <640px 12px·≥640px 16px | 3.1 tabs v2.23(HO ≤760px 12px) | 일치 (`px-3 sm:px-4`) |
| F-05 | 탭 목록이 컨테이너를 넘지 않고 숨은 가로 스크롤 없음 | 3.1 tabs v2.23, 2.6 | 일치 (`TabsList max-w-full`, 6개 스크린샷 모두 트랙 안) |
| F-06 | 좁은 폭에서 라벨이 단어 사이에서만 줄바꿈되는가 | 3.1 tabs v2.23 | **불일치 R2-1** |
| F-07 | 임의값 클래스 없음(`leading-tight`·`text-balance`·`min-w-0`은 기본 유틸) | 2.4, CLAUDE.md | 일치 |
| F-08 | next-actions 버튼 줄바꿈 변형: `h-auto min-h-13 whitespace-normal text-center` + `py-2` + `max-w-full` | 3.1 button v2.23 | 일치 (default 52px 아래로 줄지 않음, variant 그대로) |
| F-09 | next-actions 터치 영역 44px 이상 | B-10, S-08 | 일치 (`min-h-13`, 기본 `min-w-11`) |
| F-10 | 375px 넘침 검사가 `overflow-x: clip` 환경에서도 잘린 조작 요소를 잡는가 | 2.6·S-07 v2.23 | 일치 (`clippedInteractive`: 링크·버튼·탭·role=button·입력·summary, 스크롤 컨테이너·sr-only·aria-hidden·inert 제외. 완료 화면과 SEEKER_PATHS에 모두 적용) |
| F-11 | mobile-375 테스트 위치·태그 | 4.10 v2.22 N-xx | 일치 |
| F-12 | 기본 로거 `logByLevel`: warn/error는 `console.warn`, 나머지는 `console.info`, JSON 한 줄, 수신자 원문 없음 | 4.7 v2.22, 5절, S-45 | 일치 (`index.test.ts`가 수신자 이메일 미포함까지 확인) |
| F-13 | `maskLink`가 스킴 없는 `www.` 링크도 가리는가 | 4.7 v2.23 | 일치 (가리는 범위만 넓어짐. `a@www.x.test`는 제외) |
| F-14 | `scripts/lighthouse.ts` 실패 출력 | S-45(src 한정)·N-06 | 일치 (CLI 진단 출력, 비밀값 없음. CHROME_PATH 안내는 경로 틀만 있음) |
| F-15 | README 새 내용이 DECISIONS·STATE와 맞는가 | 1절 R-2·R-3 | 일치 |
| F-16 | README 환경 변수 표가 코드와 맞고 값이 없는가 | N-06, 1.2-10 | 일치 |
| F-17 | README 글꼴·디렉터리 요약이 현재 기준과 맞는가 | 2.3 v2.4, 4.2 | 일치 |
| F-18 | 새 단위 테스트 위치(`tests/unit/lib/notifications/{console,index}.test.ts`) | 4.10 | 일치 |

### 추가 판정 요청에 대한 답

- **TabsTrigger 변경과 3.1·핸드오프**: 핸드오프 `.aud__tab`은 `white-space: nowrap`(`site.css:351`)이고, ≤760px에서는 `padding: 0 12px; font-size: 12px`(`site3.css:561`)이다. 줄바꿈 허용은 핸드오프와 다르므로 기준에 적어야 한다. v2.23 3.1 tabs에 [HO→보정]으로 적었다. 줄바꿈은 허용하되 단어 사이에서만 하고, 높이는 min 44px, 패딩은 `px-3 sm:px-4`이며, 12px 글자는 쓰지 않고 13px을 유지한다. 높이·패딩·글자 크기·트랙 같은 구현의 나머지는 이 규칙과 맞는다. 맞지 않는 것은 단어 중간 분리(R2-1) 하나다.
- **next-actions 버튼**: 같은 패턴(`final-cta.tsx:8`, `demand-actions.tsx:12`)이 이미 있었지만 기준에는 없었다. v2.23 3.1 button에 "긴 번역 라벨 줄바꿈 변형"으로 적었다. next-actions는 `py-2`이고 앞의 두 곳은 `py-3`이다. 둘 다 허용 범위로 적었다(관찰 O-1).
- **mobile-375 넘침 검사(4.10/2.6)**: 테스트 위치·태그는 4.10과 맞는다. 검사 방식은 기존 S-07 확인 방법(`scrollWidth`)이 `overflow-x: clip` 때문에 넘침을 보지 못하는 공백이 있었다. v2.23 2.6·S-07에 "조작 요소가 뷰포트 밖으로 잘리지 않음"과 제외 조건을 넣었고, 구현은 이 조건과 같다.
- **README와 DECISIONS·STATE**: 1절 R-2·R-3 행 참조. 어긋난 항목은 없다.

## 4. 불일치 목록 (수정 지시)

**R2-1 375px 대상 선택 탭 라벨이 단어 중간에서 끊김** — `src/components/ui/tabs.tsx:37`, 화면 메인 "대상 선택" 탭
- 기준: STANDARD v2.23 3.1 tabs. 라벨은 단어 사이에서만 줄바꿈하고, 한 단어 안에서 끊지 않는다. 2.3 `overflow-wrap: anywhere`는 단어 하나가 탭 최대 폭보다 길 때만 작동해야 한다.
- 실제: en "Companie / s"(`p2e_r2_home375_tabs_en.png`), uz "Kompaniyal / ar"(`p2e_r2_home375_tabs_uz.png`). `min-w-0` 탭이 똑같이 줄어들 때 전역 `overflow-wrap: anywhere`(`globals.css:362`) 때문에 min-content 폭이 글자 하나 크기가 된다. 그래서 선택된 첫 탭이 단어보다 좁아진다. 세 라벨의 가장 긴 단어 폭을 더해도 트랙 폭(375 − 여백 40 − 트랙 패딩)보다 작으므로 단어 단위 줄바꿈으로 들어간다. vi·ru·ko·zh는 정상이다.
- 지시: 트리거 라벨이 단어 경계에서만 줄바꿈되게 한다. 예를 들어 트리거의 overflow-wrap을 `anywhere`가 아닌 값으로 바꿔 min-content가 가장 긴 단어 폭이 되게 할 수 있다. 방법은 빌더가 정한다. 임의값 클래스는 쓰지 않는다. 6개 언어 375px에서 단어 분리가 없고, 트랙이 넘치지 않고, 44px 이상인지 확인한다. 같은 컴포넌트를 쓰는 마이페이지·관리자 탭도 함께 확인한다. N-04 E2E에 탭 라벨의 단어 분리 검사를 더하는 것은 권장 사항이다.

## 5. 관찰 (불일치 아님)
- O-1: 줄바꿈 버튼 세로 패딩이 next-actions는 `py-2`, final-cta·demand-actions는 `py-3`이다. 둘 다 v2.23 허용 범위라 판정에는 영향이 없다. 한 상수로 모을지는 빌더가 정한다.
- O-2: 탭 라벨 `leading-tight`(1.25)는 `text-caption` 줄간격 1.5를 덮어쓴다. v2.23에서 탭 라벨에 한해 허용했다. vi 스크린샷에서 성조 부호 잘림은 보이지 않는다.

## 6. 기준 보완 v2.23 (이번 검토에서 반영)
1. 3.1 tabs: 좁은 폭에서 라벨 줄바꿈 허용([HO→보정]). 단어 사이에서만 줄바꿈하고, 트랙은 컨테이너 안, `min-h-11`, `leading-tight` 허용, `px-3 sm:px-4`, 13px 유지.
2. 3.1 button: 긴 번역 라벨 줄바꿈 변형(`h-auto min-h-{크기 높이} whitespace-normal text-center py-2|py-3`).
3. 2.6·S-07: 375px 확인에 잘린 조작 요소 검사와 제외 조건을 넣었다.
4. 4.7: `maskLink` 대상에 스킴 없는 `www.` 링크를 넣었다.
- 산출물 영향: 1번이 R2-1로 이어진다. 2~4번은 이번 구현을 기준으로 옮긴 것이다.

## 결과
- run 1 해소 5/5, Q-28 일치.
- 이번 diff 점검 17/18 일치(불일치 R2-1).
- P2e 전체(run 1 E-01~E-21 + 이번 F-01~F-18 = 39항목): 일치 38/39. 남은 불일치는 R2-1이다.
