# Phase P1d — 기준 일치 검토 (run 1, 정적 검토)

- 대상 커밋: `c2bb5d8`(pii-guard P-1~P-5), `032f363`(P1d). 범위는 `git diff 601992f..032f363`이고 55개 파일이다.
- 기준
  - `.workflow/STANDARD.md` v2.8
  - PRD R-114·R-115·R-116·R-124·R-125·R-129, PLAN "### P1d"
  - DECISIONS SC-05~07·SC-12·Q-07·Q-12
  - CLAUDE.md: 44px(`h-11`) 이상, 임의값 클래스·`text-xs` 금지
- 검토자: wf-standard(모드 B), 2026-11-16.
- 실행한 확인
  - `lint`: 오류 0, 경고 0.
  - `qa:static`: 오류 0, 경고 17. P1c run 3과 같은 기존 경고이고 새 경고는 없다.
  - `i18n:check`: 6개 로케일 오류 0, ko 키 894개.
  - 변경 파일 대상 정적 검사: S-02·S-05·S-06·S-36·S-42·S-44·S-45·S-48(4.9-1)·S-53·S-24·S-69.
  - 375px 스크린샷 6장(`p1d_*.png`): 진단 입력·결과, 의뢰 2/3·3/3(pii 거부)·완료. `request_step1`은 로그인 화면이 찍혔다. fullPage라 고정 내비·건너뛰기 링크가 중간에 찍혔다.
  - build·test·e2e·dev·start는 **실행하지 않았다**. `.next`에는 쓰지 않았다.

## 1. 결과 요약

- **일치 39 / 44** (점검표 34항목 + 3·1절 규칙과 DECISIONS 10항목). 처음 판정은 40 / 44였고, v2.9 반영 뒤 1.1 용어 항목이 불일치(N-5)로 바뀌었다(8절).
- 불일치 6건: N-1~N-6. N-6은 P1a 산출물이고, Q-13 결정으로 이번에 수정 지시에 넣었다(점검 합계 39 / 44에는 포함하지 않음). 이 중 N-1(Q-12 ③)은 run 2 수정 대상으로 이미 정해져 있어 기록만 한다.
- 빌더가 밝힌 해석 5건은 모두 **수용**한다(2절).
- 기준 보완 제안 7건(5절). 반영 여부는 오케스트레이터가 정한다.

## 2. 빌더 해석 판정

| 해석 | 판정 | 근거 |
|---|---|---|
| `src/lib/jobs/archiveLeads.ts`(PLAN은 `archive-leads.ts`) | 수용 | 4.3 "`src/lib/**` 신규 파일 = camelCase"를 따른다. WO가 이름을 지정한 파일도 아니다. |
| 테스트를 `tests/unit/{src 미러}/…`에 둠(PLAN은 `tests/unit/{ingest,dnc,…}.test.ts`) | 수용 | 4.10 미러 규칙을 따른다. PLAN도 같은 줄에 "STANDARD 4.10: src 경로 미러"라고 적었다. 미러 대상은 `app/api/ingest/job-leads/route`, `lib/leads/{ingest,tagging,transitions}`, `lib/jobs/{boss,archiveLeads}`, `lib/employer/{diagnosis,jobRequest}`, `schemas/employer/request`, `server/actions/employer/request`다. 픽스처 `leadFixtures.ts`·`employerFixtures.ts`는 4.10 [v2.5] 형식이다. |
| DNC 테스트를 route·ingest·transitions 테스트에 나눠 둠 | 수용 | R-115 태그가 세 곳에 있다. `route.test.ts:143`(재수집 뒤에도 등급 유지), `ingest.test.ts:75`, `transitions.test.ts:21`. |
| `rateLimit429.test.ts`(대응하는 src 파일 없음) | 수용(기준 보완 P-3) | 세 진입점을 묶는 교차 테스트다. PLAN이 이 이름을 정했고 R-129 태그도 있다. 4.10에는 이런 교차 테스트를 둘 자리가 없다. |
| OutcomeCard `visas` prop 추가 | 수용(기준 보완 P-4) | 3.4 순서 ①~⑤를 유지한다. ② 자리에 VisaLabel 목록을 넣고, `showCode=isStatusCode`를 그대로 쓴다. ④ 참고 문구를 끄는 prop은 여전히 없다(S-17). |
| `textarea.tsx` 신규 | 수용 | 3.1 "input, textarea, label" 행에 이미 있는 컴포넌트다. 모양은 Input과 같다: `rounded-sm`, `border-input`, `px-3.5`, `text-control font-medium text-navy`, hover `n500`, 포커스 `border-brand-blue ring-4 ring-brand-blue/13`, 오류 `ring-error/10`. 높이는 rows에 따르고 `min-h-28`이다. |
| 구인 의뢰 3화면 각 ≤7문항 | 수용 | 회사 정보 6문항: 회사 이름, 시·도/시·군·구(1), 상시근로자, 담당자 이름, 휴대폰, 이메일. 일자리 조건 6문항: 급여 최저/최고를 1로 셈, 2로 세도 7. 생활 조건 4문항. 무료 채용 진단은 한 화면 5문항이고, 외국인 현황 반복 그룹을 1로 셌다. |

## 3. 점검표 판정

| 번호 | 판정 | 근거 |
|---|---|---|
| S-02 | 일치 | 변경 파일에 `#hex`·`rgb(`·기본 팔레트 유틸이 0건이다. |
| S-05 | 일치 | `text-[`·`text-xs`가 0건이다. 오류 문구는 `text-caption`, 입력란은 `text-control`이다. |
| S-06 | 일치 | 대괄호 임의값은 `transition-[border-color,box-shadow]`(2.4 허용) 하나뿐이다. `mb-1.75`(7px)는 배수 유틸이다. |
| S-07 | 일치(육안) | 스크린샷 5장에 가로 넘침이 없다. 수치 측정은 QA 소관이다. |
| S-08 | 일치 | Button 기본 52px, NativeSelect·Input 48px, ChipGroup(기존 44px), 삭제 버튼은 `ghost` 기본 크기다. 스크린샷과도 맞다. |
| S-09 | 일치 | 의뢰 상태 배지는 아이콘 + 글자다(`job-request-list.tsx:48-51`). 판정은 OutcomeCard다. |
| S-10 | 일치 | 새 ui 컴포넌트는 `textarea`(3.1 목록 안)뿐이다. |
| S-11 | 일치 | lucide만 쓰고 `strokeWidth={1.5}`다. |
| S-14 / 3.3 문항 ≤7 | 일치 | 2절 참고. |
| S-16 | 일치 | 진단 비자 옵션은 `{code} {name}` 문자열이다(3.2 VisaLabel ①, `diagnosis/page.tsx:46-48`). `isStatusCode`로 걸러 OTHER·NONE·UNKNOWN은 제외한다. 결과는 VisaLabel(`showCode`)이다. 스크린샷에서 G-1 "기타"는 체류자격 코드가 있는 행이라 코드 칩이 나오는 것이 맞다. |
| S-17 | 일치 | 결과 카드 ④ "참고용, 행정사 확인 필요"가 그룹마다 보인다(스크린샷). |
| S-18 | 일치 | 결과 머리에 `visa.outcomeReviewNote`("[전문가 검토 필요] 판정 라벨 문구는 제안 문구입니다")를 둔다(`diagnosis-form.tsx:93`). 라벨은 3.4 3종 그대로다. |
| S-23 | 일치 | 새 ko 문구에 금지 표현이 0건이다. "상시근로자 수"는 기업 인원을 뜻하는 법정 용어이고 구직자 호칭이 아니다. |
| S-24 | 일치 | `mailto:`·`tel:`·메신저 링크가 0건이다. 담당자 연락처는 `contact*Enc`(직원 전용)에 저장한다. |
| S-29 | 일치 | `i18n:check` 오류 0. |
| S-30 | 일치 | `employer.diagnosis.*`, `employer.request.*`, `errors.employer.*`, `errors.field.{invalidNumber,duplicateVisa,payRange,contactInfo}`, `meta.employerDiagnosis/employerRequest`, `option.{ENUM}`. 3.6과 5절 형식이다. |
| S-31 | 일치 | lint 통과, JSX 리터럴 0건이다. |
| S-32 | 일치 | 접수일은 `format.dateTime(…, { dateStyle: "medium" })`다. |
| S-34 | 일치(보완 P-1) | 새 `src/` 최상위 폴더는 없다. `lib/employer/`, `lib/leads/`, `lib/jobs/` 내용은 트리에 적어 둘 필요가 있다. |
| S-35 | 일치 | components·app 파일은 kebab-case, lib·schemas·server 파일은 camelCase다. |
| S-36 | 일치 | `any` 0건이다. |
| S-40 | 일치(보완 P-2) | 수집 route는 `// rbac: public`(4.5 `/api/ingest/*`)이다. `submitJobRequestAction` 첫 문장은 `requireEmployer()`이고, 내부에서 `assertCan(…, "employer:selfService")`를 부른다. `submitDiagnosis`에는 `// rbac: public` 주석이 있다. 다만 4.5 공개 예외 목록에 "무료 채용 진단"이 없고 `requireEmployer()` 인정 문구도 없다. 코드 주석은 "STANDARD 4.5 공개 예외"를 인용하지만 목록에 해당 항목이 없다. R-124·Q-07(메인 주 CTA)로 보면 공개가 맞으므로 기준 쪽을 보완한다. |
| S-42 | 일치 | `z.object`는 `src/schemas/{employer,ingest}/`에만 있다. |
| S-43 | 일치 | 회사명은 `Company.nameEnc`, 담당자는 `contactNameEnc/PhoneEnc/EmailEnc` + `contactPhoneHash`다. `rawJson`에서는 연락처 키를 제거하고 `maskContacts`를 거친다. 금지 식별번호 필드는 0건이다. |
| S-44 | 일치 | 직접 `encrypt(`·`decrypt(` 호출이 0건이다. |
| S-45 | 일치 | `src/` 변경분에 `console.*`가 0건이다. `scripts/worker.ts`는 JSON 한 줄 로그이고 PII가 없다(5절). |
| S-46 | 일치 | 모든 등급 이동은 `transitionLead`를 거치고, 같은 트랜잭션에서 `LEAD_GRADE_CHANGE`를 쓴다. B로 바로 생성할 때는 `auditLeadCreatedAt`을 쓴다. |
| S-48 | 일치 | 4.9-1 비자 코드 리터럴이 0건이다. 진단 대상 비자는 `VisaType.isStatusCode && registrable` 데이터에서 온다. 판정은 PUBLISHED 규칙의 `evaluateRules`만 쓴다. 지역·업종 매칭은 Region·Industry 표 데이터를 쓴다. |
| S-50 | 일치 | 2절 참고. `src/` 안 테스트는 0건이다. |
| S-52 | 일치 | `{ error: { code, message } }` 형식이다. 400 `VALIDATION`/`BATCH_TOO_LARGE`, 401 `UNAUTHENTICATED`, 429 `RATE_LIMITED`(+`Retry-After`), 200 `{created, updated, rejected}`. |
| S-53 | **불일치 N-4** | 아래 4절. 그 밖의 운영 수치(수집·진단·의뢰 속도 제한, 배치 200, 보관 30일·배치·cron·시간대, 외국인 행 10, 목록 20)는 `limits.ts`에 있고 messages에 숫자로 중복되지 않는다. 스키마 상한(길이, 1,000,000 등)은 저장 보호용 리터럴로 허용 범위다. |
| S-63 | 일치 | `text-n400` 0건이다. 파랑 글자는 사용하지 않는다. |
| S-64 | 일치 | 기업 행동(진단 제출, 구인 의뢰, 의뢰 제출)은 `brand`/`default`이고 오렌지는 0건이다. |
| S-69 | 일치 | `textarea.tsx`의 `outline-none`은 `focus-visible:ring-4` 글로와 함께 쓴다(Input과 같다). |

## 4. 규칙·결정 판정 (점검표 밖)

| 항목 | 판정 | 근거 |
|---|---|---|
| 2.1.4 판정색 사용처 | **불일치 N-2** | 아래 |
| 3.1 input/textarea 모양 | 일치 | 2절 textarea 참고 |
| 3.1 form 간격 22px / 필드 내부 7px | 일치 | `gap-5.5`, legend `mb-1.75` |
| 3.3 라벨·"(필수)"·첫 오류 포커스 | 일치 | FormField `required`이고 스크린샷에 "(필수)"가 보인다. `shouldFocusError`와 `trigger(…, {shouldFocus:true})`를 쓴다. 서버 거부 시에는 해당 화면으로 돌아가 `setError`한다. 시·군·구와 급여 최고는 `aria-label`만 붙어 있는데, P1c 위저드 `sigungu`와 같은 방식이다. |
| 3.4 OutcomeCard 구성 | 일치 | 2절 참고 |
| 3.5 [전문가 검토 필요] (Q-12 ③) | **불일치 N-1** | 아래(기록만) |
| 1.1 용어 | **불일치 N-5**(v2.9 기준, 8절). 처음 판정은 일치(보완 P-5) | "무료 채용 진단", "구인 의뢰"를 쓰고, "인력 요청"·"사업주"는 0건이다. "비자앤잡 담당자"는 P1a부터 통과한 표기다. 기업 측 연락 담당자도 "담당자"로 쓴다. 다만 1.1 "직원/담당자 = 관리자 화면 전용"과 어긋나 보이므로 기준 문구를 보완한다. |
| Q-12 ① 수요 지도 집계 출처 한정 | **불일치 N-3** | 아래 |
| Q-12 ② 숫자 KSIC 미태깅 | 일치 | `tagging.ts` `tagIndustry`는 글자로 시작하는 코드와 업종명만 매칭하고, 나머지는 null이다. |
| SC-05 운영 수치 위치 | 일치 | S-53 행 참고(N-4 제외). |

## 5. 불일치 목록 (수정 지시)

| # | 위치 | 기준 | 실제 상태 | 수정 방향 |
|---|---|---|---|---|
| N-1 | `messages/*.json` `employer.request.notice`, `request/page.tsx:114` | DECISIONS Q-12 ③, STANDARD 3.5 "[전문가 검토 필요]: …고지 초안…", SC-08 | 담당자 개인정보 수집 고지에 [전문가 검토 필요] 표시가 없다 | run 2에서 처리하기로 이미 정해짐. 고지에 `ExpertReviewMark`(또는 표시 문구)를 붙이고, 번역본은 SC-08에 따라 한국어 원문을 병기한다 |
| N-2 | `src/components/employer/job-request-form.tsx:128` | 2.1.4 "판정색은 판정 결과·리드 상태 표시 외에 쓰지 않는다"(success 계열은 GREEN 카드와 성공 토스트용) | 접수 완료 패널이 `border-success bg-success-subtle text-success-subtle-foreground`다. `src/`에서 OutcomeCard 밖에 판정색을 쓰는 곳은 여기 하나다 | 완료 패널을 일반 card 모양(흰 바탕, `--border`, `shadow-1`)이나 NoticeBox로 바꾼다. 아이콘 `CircleCheck`는 그대로 둔다. 또는 sonner 토스트를 쓴다 |
| N-3 | `src/lib/demand/aggregate.ts:164-167` (`getDemandAggregate` where) | DECISIONS Q-12 ① "집계를 수집 출처(WORK24_API/AGENT/MANUAL)로 한정" | `grade`와 기간으로만 거른다. 그래서 DIAGNOSIS·REQUEST 리드(C·B)가 수요 지도에 섞인다. 고지는 "공공 채용정보를 바탕으로"라고 되어 있다 | `source: { in: INGEST_SOURCES }` 조건을 추가하고 테스트도 추가한다. Q-12 반영 위치가 "P1d run 2"이므로 N-1과 함께 처리할 수 있다 |
| N-5 | `messages/*.json` `employer.request.notice` | STANDARD v2.9 1.1: 기업 화면의 운영자 측 표기는 "비자앤잡 담당자"(반복 시 "담당자"), "직원"은 관리자 화면 전용 | "담당자 연락처는 **비자앤잡 직원**만 봅니다." | "비자앤잡 담당자"로 바꾼다. 예: "입력한 담당자 연락처는 비자앤잡 담당자만 봅니다." 기업 측 담당자와 헷갈리지 않게 문장을 다듬는다. 6개 언어 모두 바꾼다. N-1 고지 수정과 같은 키다 |
| N-6 | `messages/*.json` `public.about.contact.body` (P1a 산출물) | STANDARD v2.9 1.1 + Q-13: 운영자 측 표기는 공개·기업·구직자 화면 모두 "비자앤잡 담당자"가 기본이고, 같은 문맥에서 반복할 때만 "담당자"를 허용한다 | "상담은 대표전화로 신청해 주세요. **담당자가** 안내해 드립니다." 같은 블록에 "비자앤잡 담당자"가 없다 | "비자앤잡 담당자가 안내해 드립니다."로 바꾼다. 6개 언어 모두 고친다 |
| N-4 | `src/lib/leads/ingestAuth.ts:12` `MIN_KEY_LENGTH = 32` (확정: run 2에서 `limits.ts`로 이동, P-7 미채택) | S-53 "운영 수치 = 운영자가 바꿀 수 있는 정책 값(…비밀번호 길이·OTP 길이…)… `limits.ts` 한 곳에만" | 수집 API 키의 최소 길이(보안 정책 값)가 모듈 상수로 들어 있다. `.env.example`에도 "at least 32" 문구가 있다 | `limits.ts`로 옮긴다(예 `INGEST_API_KEY_MIN_LENGTH`). 오케스트레이터가 이 값을 "형식 상한"으로 본다면 S-53 예외 목록에 추가하는 것(P-7)으로 대신한다. 경미 |

## 6. 기준 보완 제안 (v2.9 후보, 반영은 지시를 따름)

- **P-1 (4.2 트리)** 다음 항목을 트리에 추가한다.
  - `lib/employer/(diagnosis, jobRequest, session)`
  - `lib/leads/(ingest, ingestAuth, tagging, transitions)`
  - `lib/jobs/(boss, archiveLeads)`: pg-boss 스키마 `pgboss`, 핸들러 `(now) => Promise<Result>`
  - `schemas/{employer,ingest}/`
  - `scripts/worker.ts`(`pnpm worker`)
- **P-2 (4.5)** 두 가지를 적는다.
  - 공개 예외에 "무료 채용 진단 제출(R-124, 비로그인. 로그인 기업이면 회사에 연결)"을 추가한다.
  - `requireEmployer()`(`src/lib/employer/session.ts`: 세션 + `assertCan(role, "employer:selfService")` + DB 기업 연결 확인)를 첫 문장 검사로 인정한다. `requireSeeker()`(B-7)와 같은 방식이다.
- **P-3 (4.10)** 여러 진입점을 묶는 교차 테스트는 주 모듈 폴더에 `{모듈}{주제}.test.ts`로 둔다(예 `tests/unit/lib/rateLimit429.test.ts`). PRD 태그는 필수로 한다.
- **P-4 (3.2/3.4 OutcomeCard)** R-124 채용 진단은 결과·문구가 같은 비자를 카드 한 장으로 묶는다(`visas` prop). ② 자리에는 VisaLabel 목록을 둔다. 나머지 순서와 ④ 상시 표시는 그대로다.
- **P-5 (1.1 용어)** 기업 화면 표기를 정한다.
  - 운영자 측은 "비자앤잡 담당자"(연락 주체가 비자앤잡임을 밝힘)를 허용한다.
  - 기업 측 연락 담당자는 "담당자"로 쓴다.
  - "직원"은 기업 화면 고지에서 "비자앤잡 직원"으로만 허용한다. 관리자 화면 전용 규칙은 역할 이름(`STAFF_*`) 표시에만 적용한다.
- **P-6 (3.3 '모름')** 열거 목록이 "위저드 기준"임을 명시한다. 기업 폼(구인 의뢰 `overtime` UNKNOWN, `startTiming` UNDECIDED)은 SC-02 적용 대상이 아니라 선택 사항으로 둔다는 문장을 추가한다.
- **P-7 (S-53)** N-4를 형식 상한으로 판단할 경우, 예외 목록에 "비밀 설정값 최소 길이(fail-closed 검증)"를 추가한다.

## 7. 관찰 (불일치 아님)

1. 스크린샷 `request_step2`의 잔업 "없음"과 `request_pii_refused`의 식사 "제공" 칩이 회색으로 찍혔다. 칩 선택 전환(색 0.2s) 도중에 찍힌 것으로 보인다. 3.1 radio 선택 상태(navy 배경, 흰 글자)는 같은 화면의 숙소 "제공"에서 확인했다. QA에서 전환이 끝난 뒤의 상태를 한 번 더 확인하기 바란다.
2. `request_done`에서 접수 직후 "내 구인 의뢰" 목록이 "아직 제출한 구인 의뢰가 없습니다"로 보인다. `router.refresh()`가 끝나기 전에 찍혔을 수 있다. 동작 판정은 QA 소관이다.
3. `employer.diagnosis.result.next`("다음 단계")는 코드에서 쓰이지 않는 키다.
4. `diagnosis-form.tsx:244`의 인원 칸이 `sm:w-32` 고정 폭이다. 라벨이 줄바꿈되므로 넘치지는 않지만, 2.3.4 다국어 여유 취지상 `sm:w-40` 같은 여유를 두는 것을 권한다.
5. `request_step1.png`에는 로그인 화면이 찍혀 있다. 로그인 버튼이 "확인 중…"인 채로 비활성 회색이다. disabled는 `opacity .45`이므로 3.1과 일치한다.
6. 무료 채용 진단 결과에 E-9 등 비자 목록이 기업에게 보이지만, 이것은 비자 종류 정보이고 구직자 데이터가 아니므로 BR-02·06과 관계없다.

## 8. STANDARD v2.9 반영 (오케스트레이터 지시)

- 반영한 보완: P-1~P-6. **P-7은 넣지 않았다.** N-4는 run 2에서 `MIN_KEY_LENGTH`를 `limits.ts`로 옮기는 것으로 고친다.
- 바뀐 기준서 위치
  - 머리말 버전 2.9, 개정 이력 2.9 행.
  - 1.1 직원/담당자 행(P-5): 기업 화면의 운영자 측 표기는 "비자앤잡 담당자"가 기본이다. 같은 문맥에서 반복할 때는 "담당자"를 허용한다. 기업 측 연락 담당자 입력 라벨은 "담당자 …"로 쓴다. "직원"은 관리자 화면 전용이다.
  - 3.2 OutcomeCard 행과 3.4 카드 구성 순서(P-4): `visas` 다중 표시를 넣었다.
  - 3.3 '모름' 하위 항목(P-6): 열거 목록은 구직자 위저드 기준이고, 기업 폼은 SC-02 적용 대상 밖이다.
  - 4.2 트리(P-1): `scripts/worker.ts`, `lib/employer/`, `lib/leads/`, `lib/jobs/(boss, archiveLeads)`, `schemas/` 예시.
  - 4.5(P-2): 무료 채용 진단 제출을 공개 예외에 넣고, `requireEmployer()`를 첫 문장 검사로 인정한다.
  - 4.10(P-3): 교차 테스트는 `{모듈}{주제}.test.ts`.
- 판정 영향
  - S-34·S-40·S-50과 3.4·3.3은 v2.9에서 그대로 일치다.
  - 1.1 용어는 P-5 결정에 따라 `employer.request.notice`의 "비자앤잡 직원"이 **불일치 N-5**가 된다.
  - `employer.request.done.body`의 "담당자가 검증한 뒤"는 같은 화면 위쪽 lead에 "비자앤잡 담당자"가 이미 있어 반복 허용 범위로 보고 일치로 판정했다.
- 범위 밖 관찰(P1d 이전 산출물, 이번 수정 지시 아님)
  - `legal.privacy.sections.s5.body`: "직원의 열람 기록". 법적 문서이고 [전문가 검토 필요] 대상이다.
  - `public.about.contact.body`: "담당자가 안내해 드립니다". 공개 화면이고, 같은 블록 안에 "비자앤잡 담당자"가 없다.
  - 1.1의 "직원은 관리자 화면 전용" 규칙을 공개 화면과 법적 문서에도 적용할지는 다음 기준 검토 때 정한다.

## 9. Q-13 반영

- STANDARD 1.1 직원/담당자 행에 Q-13을 한 줄로 넣었다. 용어 규칙은 공개·기업·구직자 화면에 적용하고, 법적 문서(`legal.*`, `content/consents/**`)는 법률 용어를 허용하는 예외다.
- `public.about.contact.body`는 **불일치 N-6**으로 수정 지시에 넣었다(5절).
- `legal.privacy.sections.s5.body`의 "직원의 열람 기록"은 **예외에 해당해 일치**로 판정한다.
