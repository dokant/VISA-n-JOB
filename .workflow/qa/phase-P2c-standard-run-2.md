# Phase P2c 기준 검토 — run 2 (정적)

- 대상: 커밋 04a4fbf, 94d62ed (`git diff 7cc2a99..94d62ed`, 29파일 +653/−119)
- 기준: STANDARD v2.17 → 이번 검토 중 **v2.18**로 보완, DECISIONS Q-25·Q-14·PC-1, run 1 보고서(`phase-P2c-standard-run-1.md`) D-1~D-3
- 방법: 정적만. `pnpm lint` 오류 0, `pnpm i18n:check` 6로케일 오류 0(ko 1155키), `pnpm qa:static` 오류 0·경고 17(기존과 같음, 새 경고 0). 추가 줄 금지 패턴 rg(`text-xs`·대괄호 임의값·hex/rgb·any·console·mailto/tel·toLocaleString·outline-none·`<button`) 0건. 변경 소스 전수 열람. 스크린샷 8장 열람(`p2c_r2_admin_forms_{1280,375}` 포함 — 직접 확인). build/test/e2e/dev/typecheck 미실행, `.next` 미접근.

## 1. run 1 불일치 해소

| # | 항목 | 판정 | 근거 |
|---|---|---|---|
| D-1 | 3.1 form 간격 22px·7px | **해소** | `matching-forms.tsx` 88·129·131·260·263, `placement-forms.tsx` 25·87·127, `visa-case-forms.tsx` 45·148·189 = `gap-5.5`, 필드 묶음 전부 `gap-1.75`, 업로드 폼(단일 필드) `gap-1.75`. 남은 `gap-2`는 버튼 줄·입력+버튼 가로 줄(대상 아님). 스크린샷 `admin_forms_1280` 필드 사이 22px(431→453), `admin_forms_375` 라벨-입력 7px·필드 간 22px 확인 |
| D-2 | 1.1 구직자 화면 "블라인드 공고" | **해소** | `seeker.recommended.postingsNote` ko "…맞는 추천 일자리입니다", en/vi/ru/zh/uz 모두 "추천" 계열로 변경. 구직자 messages에 "블라인드 공고" 0건 |
| D-3 | 3.6·S-31 문자열 이어 붙이기 | **해소** | `employer/requests/page.tsx:97-102` ICU 키 `recommendedAtWithPosting`(6로케일, zh는 전각 `：`) / 없으면 `recommendedAt`. 옛 키 `posting` 6로케일 삭제, 코드 참조 0 |

**해소 3/3**

## 2. 새 변경 판정

| # | 항목 | 판정 | 근거 |
|---|---|---|---|
| 37 | 4.5·S-40 구직자 서버 액션 try/catch 형식 | 일치 | `seeker/me.ts` 3개(`changeConsent`·`answerInterviewConsent`·`saveStaySettings`), `seeker/register.ts` `saveRegistrationStep`: 초기값 없는 `let actor: SeekerActor;` + `try` 첫 문장 `requireSeeker()` + `AuthzError`만 `{ ok:false, code }`, 나머지 `throw e` (v2.13 형식 그대로). `requireSeeker()` 호출 5곳 모두 같은 형식. 클라이언트는 실패 시 일반 오류 문구(마법사는 `errors.auth.unknown` 대체 — 5절 "알 수 없는 코드는 그룹의 unknown" 허용, 아래 O-3) |
| 38 | 업로드 폼 클라이언트 크기 검사·오류 표시 | 일치 | `INTRO_CONFIRM_MAX_BYTES`(limits) 선택 즉시·제출 전 두 번 검사 → `FILE_TOO_LARGE`, 서버 거부 본문은 `unstable_rethrow` 후 `UPLOAD_FAILED`(redirect 통과). 문구는 `_i18n/ko.ts`(관리자 리터럴 허용), 숫자는 limits에서 `MB` 파생(v2.17 3.5 허용). 오류 `role="alert"` `text-caption text-error-text`, 안내 `text-caption text-n500` + `aria-describedby`. 초과 시 올리기 버튼 disabled(스크린샷 `upload_too_large_1280`: 안내 아래 붉은 오류) |
| 39 | 면접 취소 다이얼로그(3.1 dialog, destructive) | 일치(v2.18 명문화) | shadcn `Dialog`(`closeLabel="닫기"`), 제목·설명, 닫기 `outline`, 확인 `variant="destructive"`(button.tsx cva에 정의, S-10), 크기 default 52px·트리거 sm 44px. 스크린샷 `cancel_dialog_375` 스크림·흰 셸·빨간 확인 버튼 확인. 문장 3개 모두 40자 이내 |
| 40 | 매칭 목록 페이지 이동(터치 44, H-3) | 일치 | 이전/다음 `Link`에 `link` 상수(`inline-flex min-h-11 min-w-11`), `<nav aria-label>`. 숫자 전부 `fmtCount`(ko-KR `Intl`) + `건`(H-3), `페이지 n / m`은 단위 없는 `fmtCount`. 페이지 크기 `ADMIN_LIST_MAX`(limits), 숫자 리터럴 0 |
| 41 | 실명 종료 안내 문구(6개 언어, 1.1) | **불일치 D-4**(v2.18 기준 보완 후) | 6로케일 키 존재·i18n:check 0, 아이콘 `CalendarX` 1.5·aria-hidden + 글자(S-09) 일치. 그러나 ko "면접 건이 종료되어 **실명**을…"만 같은 블록의 "이름"(열 라벨·`nameNotice`·`nameState.*` 4개)과 다른 말. 5개 번역본은 모두 형제 문구와 같은 말(name/имя/ism/tên/姓名). 1.1 "같은 것을 같은 이름으로"는 있으나 실명/이름 행이 없어 **기준 보완 필요** → v2.18 1.1 행 신설 후 판정 |
| 42 | `SERVER_ACTION_BODY_LIMIT` 파생(S-53) | 일치(v2.18 명문화) | `limits.ts:237` = `INTRO_CONFIRM_MAX_BYTES + SERVER_ACTION_FORM_OVERHEAD_BYTES`(숫자, 따로 적은 값 없음), `next.config.ts`는 import만, `storage.test.ts:86-87` 관계 단위 테스트, E2E도 같은 상수로 초과 본문 생성. run 1 O-3 해소 |
| 43 | 4.4·PC-1 실명 조건 Q-25 | 일치(v2.18 반영) | `loadInterviewDisclosure` where에 `OR: [{result:null},{result:{notIn:DISCLOSURE_ENDING_RESULTS}}]`(NULL 보존), 상태 CONFIRMED 유지, `interviewEnded`를 기업 상태 계산이 같이 사용, `apiRegistry` 조건 문구 갱신. 기업 영역 새 select는 `result`·`confirmedAt`(비식별)뿐 — S-37 우회 0 |

run 1 항목 1~36 중 D-1~D-3 외 33개는 이번 diff가 건드린 부분(employer/requests 페이지, interviewDisclosure, matching 목록, 관리자 폼)을 다시 열람했고 판정 변화 없음(3번 PC-1은 조건이 더 엄격해짐 → 43번).

**P2c 전체: 일치 42 / 43** (불일치 D-4)

## 3. 불일치 목록

### D-4 기업 면접 현황의 "실명"/"이름" 혼용 (1.1 v2.18 `이름 / 실명` 행)
- 위치: `messages/ko.json:1776` `employer.requests.interviews.nameState.ENDED` "면접 건이 종료되어 실명을 더 이상 표시하지 않습니다."
- 기준: 기업 면접 현황 블록의 면접 건별 이름 제공 표시는 "이름"(같은 블록 `interviews.name` "이름", `nameNotice` "이름만 보여 드립니다", `nameState.*` "이름 제공").
- 수정: ko만, 예 "이 면접 건이 끝나 이름을 더 이상 보여 드리지 않습니다." (5개 번역본은 이미 맞음 — 바꾸지 않아도 됨). 스크린샷 `name_ended_375`에서 "이름" 라벨 바로 아래 "실명을…"으로 보임.

## 4. 관찰 (판정 밖)

- O-1 Q-25 해석: "결과 대기"(`PENDING`) 기록은 종료로 보지 않음(빌더 해석, `interviewDisclosure.ts` 주석). Q-25 문언 "면접 결과가 기록되면"과 대체로 맞으나 Gate 4 법무 확인 목록(동의 기간 해석)에 함께 올리길 권장. v2.18 4.4에 이 해석을 적었다.
- O-2 `DISCLOSURE_ENDING_RESULTS`는 `INTERVIEW_RESULTS`와 따로 적힌 목록(주석 + `thirdParty.test.ts:316` 동기 테스트로 묶임). 기준 위반 아님.
- O-3 마법사(`wizard-shell.tsx`)는 `UNAUTHENTICATED`를 `errors.register/auth`에서 못 찾아 `errors.auth.unknown`("문제가 생겼습니다…")을 보인다. 5절 허용 범위지만 다른 그룹에 "다시 로그인해 주세요."(`unauthenticated`) 문구가 있으니 `errors.auth.unauthenticated` 추가 권장.
- O-4 `src/app/admin/_i18n/ko.ts:248-249` 옛 JSDoc "/** R-210 서명 URL 안내 (값은 limits.ts). */"가 새 `INTRO_CONFIRM_HINT` JSDoc 위에 떨어져 있어 `SIGNED_URL_NOTE`와 분리됨(주석 위치만).
- O-5 run 1 O-2(날짜 "PM 06:30", "오후" 기대)는 이번 스크린샷에도 그대로 — 실행 환경 ICU 확인 대상(QA).
- O-6 페이지 이동 링크 문구 "이전 100건"/"다음 100건"은 마지막 페이지의 실제 건수와 다를 수 있음(문구 정확성, 기준 밖).

## 5. STANDARD v2.18 변경 내역

- 머리 2.17 → 2.18, 개정 이력 2.18 행.
- 1.1 용어집 `이름 / 실명`(`legalName`) 행 신설(D-4 근거).
- 3.1 dialog 사용처: 되돌릴 수 없는 상태 전이(관리자 면접 취소, 리드 NO_INTENT 등)는 확인 dialog 필수, 확인 버튼 `destructive`·닫기 `outline`(Q-14 취지, 39번 근거).
- 4.4 `interviewDisclosure.ts` 조건에 Q-25 종료(최종 결과·취소), 종료 판정 한 곳(`interviewEnded`), `EMPLOYER_NAME_DISCLOSURE.condition` 동기화.
- S-53: 다른 운영 수치에서 정해지는 설정값은 `limits.ts` 안 파생식 + 단위 테스트(42번 근거).
