# Phase P2d 기준 검토 — run 2 (정적)

- 대상: 커밋 cc82f00, 71865f3 (`git diff 80a647e..71865f3`, 31파일 +664/−169)
- 기준: STANDARD v2.20 → 이번 검토 중 **v2.21**로 명문화(Q-27), DECISIONS Q-27, run 1 보고서 `phase-P2d-standard-run-1.md`
- 방법: 정적만. 변경 소스·스키마·마이그레이션·테스트 열람. 실행: `pnpm lint` 오류 0, `pnpm qa:static` 오류 0·경고 20(run 1 대비 S-45 1건 증가 = `statusCheck.ts:229`, 아래 #8). messages 변경 없음(i18n 영향 없음). build/test/e2e/dev/typecheck 미실행, `.next` 미접근, 화면 렌더링 없음(관리자 문구 1줄 변경뿐이라 코드로 판정).

## 1. run 1 불일치 해소

| # | run 1 | 판정 | 근거 |
|---|---|---|---|
| D-1 | 합격 점수 `String(table.passScore)` (3.5·S-32 H-3) | **해소** | `score-tables/[id]/page.tsx:73` → `fmtCount(table.passScore, "점")`(`ko-KR` `Intl` 상수). `:123` 폼 기본값 `String(...)`은 입력값이라 대상 밖(run 1 지시대로). 단위 `점`은 run 1 수정 지시가 제시한 형태이나 H-3 허용 단위 목록(명·건·일, 분·MB)에 없었으므로 v2.21에 `점` 추가(기준화) |
| D-2 | lib 안 관리자 한국어 리터럴 (3.6) | **해소** | `lib/rules/options.ts`는 `visaTypes`(code·isStatusCode·active)만 반환, 라벨은 `_i18n/ko.ts` `visaOptions()`. `lib/rules/manage.ts reviewerNames`는 `displayName \| null`, 대체 "직원"은 `_i18n/ko.ts` `staffName()`. 관리자 페이지 6곳(rules·score-tables 목록·상세) 모두 `staffName` 경유. `src/lib/**` 문자열 리터럴 한국어 rg → 기존 `leads/tagging.ts:64`(계산용 "도", 표시 아님)만 |

**해소 2/2**

## 2. 새 변경 판정

| # | 항목 (기준) | 판정 | 근거 |
|---|---|---|---|
| 1 | Q-27 전달 결과 타입 (DECISIONS Q-27, v2.21 5절) | 일치 | `types.ts` `Delivery = REAL\|SIMULATED\|FAILED`, `SendResult`가 ok와 묶임(ok:true → REAL/SIMULATED, ok:false → FAILED). console = 항상 SIMULATED, smtp 수락 = REAL, 실패 3경로 = FAILED. `notifySeeker`가 `deliveredReal` 집계 |
| 2 | 14일 무응답 전이는 REAL에만 (Q-27) | 일치 | `statusCheck.ts` 발송 시 claim에서 `statusCheckDeliveredReal=false`, REAL ≥1이면 같은 `statusCheckSentAt` 조건으로 true. 만료 처리: false → 상태·등급 변경 없이 `statusCheckSentAt=null`만(가드 `status:ACTIVE`, 같은 SentAt, flag false), true → 기존 INACTIVE·S→A + `SEEKER_GRADE_CHANGE`(가드에 flag true 추가, 전이 시 flag 초기화). 응답(`confirmStillSearching`)도 flag 초기화. 테스트는 모의 REAL 채널(`statusCheck.test.ts:224~` Q-27 describe) |
| 3 | 체류 만료 StaffTask (C-4, 4.8 아님) | 일치 | 전달 결과와 무관하게 과제 생성, payload `{step, daysLeft, optIn, notified, delivery}` 코드·숫자만. 실패(FAILED)도 이제 payload에 기록(이전엔 성공만 갱신) — 기록 보강, 기준 위배 없음 |
| 4 | 관리자 구직자 상세 "기록만(실제 채널 미전달) · 응답이 없어도 상태 유지" (1.1, 3.5, H-3) | 일치(v2.21 용어 명문화) | 관리자 화면 전용 문구(`src/app/admin/**`, 3.6 리터럴 위치 일치). 숫자·날짜는 `fmtDateTime`만, 운영 수치 없음 → H-3 해당 없음. REAL 쪽 기존 문구 "발송 · {14}일 안에 응답이 없으면 비활성"과 대비가 명확하고 실제 동작(상태 유지)과 맞음. "비활성"은 `_i18n/ko.ts` `INACTIVE: "비활성"`과 같은 말. 용어집에 이 구분이 없어 v2.21 1.1에 "발송 / 기록만" 행 추가(관리자 전용, 구직자·기업 화면 비노출) |
| 5 | 콘솔 로그 `maskLink` (4.7, 개인정보) | 일치(v2.21 명문화) | params의 문자열 중 `http(s)://`·`/` 시작 값만 링크로 보고, 경로 조각은 24자 이하 소문자·하이픈 단어만 유지, 토큰·id·서명 조각 `***`, 쿼리 값 `***`(키만), 프래그먼트 삭제, 파싱 실패 `***`. `NODE_ENV`와 무관하게 적용(워커가 NODE_ENV 없이 돌아도 14일 유효 토큰이 로그에 남지 않음). 링크 아닌 값(개발 OTP 등)은 그대로 — v2.3 OTP 예외(비운영에서만 params 출력) 유지. 수신자 `maskRecipient` 유지. 미러 테스트 `tests/unit/lib/notifications/console.test.ts`(still-searching `a~b` → `***`, 쿼리·프래그먼트) |
| 6 | 워커 경고 로그 형식 (5절, 4.7 v2.5) | 일치(v2.21 명문화) | `realChannelWarning()` = `{level:"warn", event:"status_check.transition_disabled", reason:"NO_REAL_CHANNEL", message}` → 워커 `log()`가 `{at, ...}` JSON 한 줄. 호스트·계정·개인정보 없음. 선택 로그 `notification.provider`에 `realChannels` 추가(채널 코드만). 이벤트 이름 `{영역}.{사건}` 기존(`notification.send`, `auth.warn`, `worker.error`)과 같은 형태. 테스트 `notifications/index.test.ts:123` |
| 7 | 새 컬럼 `statusCheckDeliveredReal` (CLAUDE.md 개인정보 검토·스키마 변경 규칙) | 일치 | `Boolean NOT NULL DEFAULT false`, 알림이 실제 채널로 갔는지만 나타내는 운영 플래그 — 사람을 식별하거나 연락에 쓰이는 값이 아님 → `…Enc` 불필요, `PII_VIEW` 대상 아님, 기업 직렬화(`blindSeeker.ts` 화이트리스트)에 없음(rg: 관리자 `seekerReview.ts` select와 jobs/stillSearching만). 마이그레이션 `20261120100000_p2d_status_check_delivery` 있음. 시드는 `statusCheckSentAt`을 쓰지 않아 기본값으로 충분(시드 변경 불필요). 스키마 diff의 나머지 줄은 열 정렬 공백뿐 |
| 8 | qa:static 새 S-45 경고 `statusCheck.ts:229` (4.7 v2.5, S-45) | 일치(허용, v2.21 명문화) | `options.log ?? ((line) => console.info(line))` — 이미 run 1에서 허용한 `notifications/index.ts:63`·`smtp.ts:93`과 같은 주입 로거 패턴. 출력 줄은 `JSON.stringify` 한 줄 `{level:"warn", event:"status_check.simulated", sentSimulated, simulatedExpired, note}` — 건수와 고정 영문 설명뿐, 구직자 id·연락처·토큰 없음(코드 주석 "counts only"). 실행당 최대 1줄 |
| 9 | 샘플 게시 버튼 숨김 (R-215, BR-12) | 일치 | rules·score-tables 상세 `PublishButton`을 `!sample`일 때만 표시 — 서버 `SAMPLE_NOT_PUBLISHABLE` 거부(run 1 #13)와 화면이 일치 |
| 10 | 테스트 위치·태그 (4.10) | 일치 | 변경 테스트 모두 미러 위치(`tests/unit/lib/jobs/*`, `lib/notifications/*`), Q-27 태그 주석. E2E는 기존 `admin-rules.spec.ts`·`support/p2dDb.ts`·`seekerDb.ts` 갱신. `src/` 안 테스트 0 |
| 11 | 법령 수치·운영 수치 (4.9, S-53) | 일치 | 새 숫자 리터럴 없음(`MAX_ROUTE_WORD = 24`는 로그 마스킹 내부 상수, 운영 수치·법령 수치 아님). 14일은 `STATUS_CHECK_REPLY_DAYS` 그대로 |

**새 변경 일치 11 / 11, 새 불일치 0**

## 3. P2d 전체

run 1 28항목 중 불일치 2건(D-1·D-2)이 해소되어 **28/28 일치**, run 2 새 항목 11/11 일치 → **P2d 전체 39/39 일치**.

## 4. 관찰 (판정 밖)

- O-1 실제 채널은 EMAIL(SMTP)뿐이고 SMS는 Phase 3까지 콘솔이다. 이메일이 없는(전화만 있는) 구직자는 SMTP가 켜져도 상태 확인이 항상 SIMULATED → 14일 전이가 적용되지 않는다. Q-27 취지에 맞는 동작이지만 Gate 보고에서 "이메일 없는 구직자는 상태 확인 자동 비활성 대상 아님"을 운영자에게 알릴 것.
- O-2 `status_check.simulated` 경고 줄은 `level:"warn"`이지만 `console.info`로 나간다(기존 index·smtp 로거와 같은 방식). 5절은 출력 스트림을 정하지 않으므로 판정 밖. 로그 수집기가 스트림으로 등급을 나눈다면 `level` 필드 기준으로 거를 것.
- O-3 관리자 구직자 상세의 라벨 "상태 확인 응답 대기"는 SIMULATED에도 그대로다. 값에 "응답이 없어도 상태 유지"가 붙어 오해 소지는 작다.
- O-4 `maskLink`는 경로 조각이 24자 이하 소문자 단어면 남긴다. 현재 토큰은 base64url+`~`라 해당하지 않지만, 앞으로 소문자만으로 된 짧은 비밀 경로를 만들면 가려지지 않는다(그런 경로를 만들지 말 것).

## 5. STANDARD v2.21 변경 내역

- 머리 2.20 → 2.21, 개정 이력 2.21 행.
- 1.1 용어집 "발송 / 기록만" 행(관리자 전용, REAL = 발송, SIMULATED = 기록만(실제 채널 미전달) + "응답이 없어도 상태 유지", 구직자·기업 화면 비노출).
- 3.5 H-3 관리자 수 단위에 `점` 추가(`fmtCount(passScore, "점")`).
- 4.7 콘솔 어댑터 params 링크 항상 `maskLink`, 결과 항상 SIMULATED. 주입 가능한 로거 기본값(`options.log ?? console.info`) 허용 조건(JSON 한 줄, 건수·코드·마스킹 값만, 경고 `level:"warn"`, `event` `{영역}.{사건}`).
- 5절 알림 전달 결과 `delivery` REAL/SIMULATED/FAILED, 상태 전이는 REAL로 전달된 확인에만, `statusCheckDeliveredReal`은 운영 플래그(개인정보 아님), SIMULATED 만료는 닫기만, StaffTask payload `delivery` 코드, 실제 채널 없음 워커 경고 형식, 테스트는 모의 REAL 채널.
