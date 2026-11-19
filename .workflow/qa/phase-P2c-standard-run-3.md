# Phase P2c 기준 검토 — run 3 (최종, 정적)

- 대상: 커밋 3603090, 6af69eb (`git diff 94d62ed..6af69eb`, 22파일 +520/−49)
- 기준: STANDARD v2.18 → 이번 검토 중 **v2.19**로 보완, DECISIONS Q-25·Q-26, run 2 보고서(`phase-P2c-standard-run-2.md`) D-4
- 방법: 정적만. 변경 소스·messages 전수 열람. `pnpm i18n:check` 6로케일 오류 0(ko 1159키). 추가 줄 금지 패턴 rg(`text-xs`·대괄호 임의값·hex·any·console·mailto/tel·toLocaleString·outline-none·`<button`) 실제 위반 0건(걸린 3줄은 주석의 화살표와 uuid 정규식 — 오탐). 스크린샷 4장 열람(`p2c_r3_name_ended_{375,1280}`, `p2c_r3_seeker_ended_{375,1280}`). build/test/e2e/dev/typecheck 미실행, `.next` 미접근.

## 1. run 2 불일치 해소

| # | 항목 | 판정 | 근거 |
|---|---|---|---|
| D-4 | 1.1 `이름 / 실명` — 기업 면접 현황 블록 | **해소** | `messages/ko.json:1780` `employer.requests.interviews.nameState.ENDED` = "이 면접 건이 끝나 이름을 더 이상 보여 드리지 않습니다." 같은 블록 라벨 "이름"·`nameNotice`·`nameState.*`와 같은 말. 스크린샷 `name_ended_375/1280`에서 "이름" 라벨 옆 같은 말로 보임. 5개 번역본 변경 없음(이미 맞음) |

**해소 1/1**

## 2. 새 변경 판정

| # | 항목 | 판정 | 근거 |
|---|---|---|---|
| 44 | 감사 meta 식별자 면제(`audit.ts`) — 4.8·BR-15 | 일치(v2.19 명문화) | 면제 = 키 `^(id|verifiedBy)$|Ids?$` **그리고** 값 cuid `^c[0-9a-z]{20,31}$`(전체 21~32자) 또는 uuid. 둘 중 하나라도 아니면 `hasContacts` 검사 유지, 배열 원소는 부모 키 상속, `FORBIDDEN_META_KEY` 검사는 면제와 무관하게 먼저. DB id는 평문 PII 아님(4.8 "평문 PII 금지"와 충돌 없음), 열람 대상 행을 남기는 것은 BR-15 취지 강화. 테스트 `auditIdentifiers.test.ts`가 식별자 키 아래 연락처 문자열·자유 문자열 거부, `phoneEnc` 키 거부를 확인. 4.8에 규칙이 없어 **기준 보완** → v2.19 4.8 항목 신설 후 일치 |
| 45 | 관리자 기업 목록 `PII_VIEW` meta `companyIds` | 일치 | `lib/admin/companies.ts:104` meta `{ fields:["nameEnc"], count, companyIds }` — 필드 이름·건수·id만, 평문 이름 없음(4.8). v2.19에 "목록 열람 PII_VIEW는 열람 행 id 목록 허용" 명시 |
| 46 | 구직자 종료 면접 배지·안내(`interview-consents.tsx`) | 일치 | 상태 `ENDED` = `interviewEnded()`(4.4 v2.18 "종료 판정 한 곳") 사용(`thirdParty.ts:82`). 배지 `neutral` + `CalendarX` 1.5·aria-hidden + 글자(S-09). 안내 `text-caption text-n500`(2.8 n500 허용). 종료 건은 동의/거부/철회 버튼 없음. ko "면접이 끝나 이 면접 건의 이름 제공도 끝났습니다." "더 답할 필요가 없습니다." — 문장당 정보 하나·40자 이내(3.5), 블록 안 "이름"만 사용(1.1). 스크린샷 `seeker_ended_375/1280` 확인 |
| 47 | 기업 종료 면접 배지(`employer/requests/page.tsx`) | 일치 | 표시 상태 `shown` = CONFIRMED + `nameState==="ENDED"` → `ENDED`(판정은 `interviewEnded` 결과인 nameState에서만 파생, 별도 판정 없음). 배지 `neutral`·`CalendarX`, 문구 `status.ENDED` "면접 종료" — 구직자 배지와 같은 말(v2.19 1.1 `면접 종료` 행) |
| 48 | dialog 닫기 X 48px(`ui/dialog.tsx`) | 일치(v2.19 명문화) | `size-12`(48px, 토큰 척도, 임의값 아님), 아이콘 `size-5`. 3.3 "44px 이상" 충족, `scale(.98)` 진입 중 축소 고려 주석. 3.1 dialog에 크기 규칙이 없어 v2.19에 48px 고정 명시 |
| 49 | `errors.auth.unauthenticated` 문구·사용처 | 일치 | ko "다시 로그인해 주세요." — 기존 3개 그룹(`ko.json:805,1680,1740`)과 같은 문장(1.1 같은 것을 같은 이름으로). 사용처 3곳(`interview-consents`, `consent-manager`, `stay-form`)은 `code==="UNAUTHENTICATED"`일 때만 이 문구, 그 밖은 기존 `error`. `role="alert"`/`text-caption text-error-text` 유지. `seeker/me/page.tsx` `ScopedIntlProvider`에 `errors.auth` 추가. run 2 O-3(마법사) 권장 키 신설로 해소 |
| 50 | 6개 언어 키 | 일치 | 새 키 4종(`errors.auth.unauthenticated`, `seeker.me.interviewConsent.state.ENDED`·`endedNote`, `employer.requests.interviews.status.ENDED`) 6로케일 모두 존재, i18n:check 0. zh 전각 구두점, 번역본도 "이름" 계열(name/имя/ism/tên/姓名) |

기타: run 2 O-4(`admin/_i18n/ko.ts` 떨어진 JSDoc) 해소 — `SIGNED_URL_NOTE` 바로 위로 이동. run 2 O-5(ko 시간 "PM 7:27")는 스크린샷에 그대로 — Q-26으로 v2.19 3.5에 기준 명시, 구현은 P2d 선행 작업이라 **P2c 판정 대상 아님**.

run 1·2 항목 1~43 중 이번 diff가 건드린 부분(employer/requests 페이지, thirdParty, 동의 화면, dialog)을 다시 열람했고 판정 변화 없음.

**P2c 전체: 일치 50 / 50** (불일치 0)

## 3. 불일치 목록

없음.

## 4. 관찰 (판정 밖)

- O-1 `agreeInterviewConsent`(`thirdParty.ts:116`)는 `status !== "CONFIRMED"`만 거부하고 `interviewEnded`(결과 기록)는 보지 않는다. 화면은 종료 건에 버튼이 없지만 서버 액션을 직접 부르면 종료된 면접 건에 새 동의 행이 생긴다. 실명 제공은 `interviewDisclosure` 조건이 막으므로 누출은 없음. 동의 기록 정합성 측면에서 `INTERVIEW_STATE`로 거부할지 빌더·QA 판단 권장(거부 `declineInterviewConsent`도 같음).
- O-2 `ID_META_KEY`가 `messengerId`에도 걸린다(`Ids?$`). 현재 meta에 이 키를 쓰는 코드 0건이라 위반 아님. v2.19 4.8에 "연락처 필드 이름은 meta 키로 쓰지 않는다"를 적었다. 정규식에서 `messengerId`를 빼거나 `FORBIDDEN_META_KEY`에 넣으면 기준과 코드가 같아진다(권장).
- O-3 새 `errors.auth.unauthenticated`의 ru "Пожалуйста, войдите снова.", uz "Iltimos, qayta kiring."은 다른 그룹(ru "Войдите снова.", uz "Qayta kiring.")과 표현이 조금 다르다. ko는 같으므로 기준 위반 아님 — 원어민 검수 때 통일 권장.
- O-4 종료되었고 이전에 동의했던 건은 "면접 종료" 배지 옆에 "{date} 동의"가 계속 보이고 철회 버튼은 없다(제공이 이미 끝나 철회 의미 없음). 기준 위반 아님.

## 5. STANDARD v2.19 변경 내역

- 머리 2.18 → 2.19, 개정 이력 2.19 행.
- 1.1 용어집 `면접 종료` 행 신설(구직자·기업 같은 말, `CalendarX`·`neutral`, 판정은 `interviewEnded` 한 곳).
- 3.1 dialog: 닫기(X) 버튼 48px(`size-12`), 44px로 줄이지 않음(진입 `scale(.98)` 중 44px 유지).
- 3.5 숫자·날짜: [Q-26] ko 시각은 24시간제 `hourCycle: "h23"`, 공통 포맷 함수에서 명시, 실행 환경 ICU/CLDR에 의존하지 않음. 구현 P2d 선행, P2c 판정 대상 아님.
- 4.8: meta 연락처 검사와 식별자 면제 규칙(키 이름 규칙 + cuid `c`+20~31자/uuid, 두 조건 모두), 목록 열람 `PII_VIEW`의 행 id 목록 허용, 연락처 필드 이름 meta 키 금지, 정규식 변경 시 테스트 동시 변경.
