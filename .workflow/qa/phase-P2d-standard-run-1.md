# Phase P2d 기준 검토 — run 1 (정적)

- 대상: 커밋 dc12a09, bdc5f07, 5591566, 6e93c40, 80a647e (`git diff 6af69eb..80a647e`, 86파일 +5723/−175)
- 기준: STANDARD v2.19 → 이번 검토 중 **v2.20**으로 보완, PRD R-213~R-215, PLAN "### P2d", DECISIONS Q-26·C-4(PC-4 StaffTask)·SC-12, CLAUDE.md(법령 수치 하드코딩 금지)
- 방법: 정적만. 변경 소스·messages·스키마·마이그레이션·시드·테스트 열람. 실행: `pnpm lint` 오류 0, `pnpm i18n:check` 6로케일 오류 0(ko 1183키), `pnpm qa:static` 오류 0·경고 19(S-23 기존 문구 검토 14건 + S-45 console 5건 — 새 2건 `notifications/index.ts:57`, `smtp.ts:92`은 열어 확인, 아래 #14). 추가 줄 금지 패턴 rg(`text-xs`·대괄호 임의값·hex·any·toLocaleString·outline-none·mailto/tel·`<button`·`lg:h-8~10`·컴포넌트 안 `z.object`) 0건. 스크린샷 4장 열람(`p2d_admin_rule_publish_dialog_375`, `p2d_admin_rule_published_1280`, `p2d_still_searching_ask_375`, `p2d_still_searching_invalid_1280`). build/test/e2e/dev/typecheck 미실행, `.next` 미접근.

## 1. 항목별 판정

| # | 항목 (기준) | 판정 | 근거 |
|---|---|---|---|
| 1 | Q-26 공통 날짜 포맷 전면 적용 (3.5 v2.19) | 일치 | `src/i18n/dateTime.ts` 한 곳: ko 시각은 `hourCycle:"h23"` 숫자 parts로 `HH:mm` 조립(ICU dayPeriod 미사용), 다른 로케일 기본. grep `Intl.DateTimeFormat|toLocale*String|timeStyle|dateStyle|hour:` → 표시용은 전부 이 모듈 경유(관리자 `fmtDate/fmtDateTime/fmtMonth` → `formatDate/formatDateTime/formatMonth`, guide·legal-document·employer contract/request/requests·seeker me/recommended·candidate-view·month-select). 남은 `Intl.DateTimeFormat`은 계산용(`classifyTrack` 월 계산, `blindSeeker` KST 연도, `browse`/`stayExpiry`/`companies` KST 날짜 키, 관리자 `isoDay` 입력값)뿐. `format.dateTime` 0건, messages ICU `{x, date}` 0건. 스크린샷 관리자 "2026. 11. 17. 21:05" 24시간제 |
| 2 | Q-26 테스트 (4.10) | 일치 | `tests/unit/i18n/dateTime.test.ts`(src 미러, Q-26 태그) |
| 3 | 관리자 서버 액션 rbac (4.5 H-1) | 일치 | `server/actions/admin/rules.ts` 10개 모두 `adminAction(async function …{ const actor = await requireStaff(); assertCan(actor, "rules:edit" | "rules:publish") …})`. 게시·폐기 = `rules:publish`(STAFF_VISA·ADMIN = "STAFF_VISA 이상", R-215), 권한 이름 `{대상}:{행위}`·`rbac.ts PERMISSIONS`에 등록. `actionGuard.ts` 변경 없음 |
| 4 | 관리자 페이지 가드 (4.5 v2.5) | 일치 | rules·score-tables 목록·상세 4개 페이지 첫 문장 `requireStaff()`, 다음 `can(…,"rules:edit")` 아니면 `ForbiddenNotice` |
| 5 | 게시·폐기 확인 dialog, 확인 버튼 `destructive` (3.1 v2.18) | 일치 | `rule-forms.tsx` `ConfirmAction`: 게시·폐기 모두 dialog 필수, 확인 버튼 `variant="destructive"`, 닫기 `outline`, X 버튼 공용 dialog(48px). 스크린샷 `publish_dialog_375`에서 "게시하기" 빨강·"취소" outline |
| 6 | dialog 안 오류 표시 (dc12a09 A-4 + rule-forms) | 일치 | 실패는 `DialogContent` 안 `ActionFeedback`(`role="alert"`, `text-caption text-error-text`), 성공만 닫힘. `lead-call-form`(NO_INTENT/DNC), `matching-forms`(면접 취소), `consent-manager`·`interview-consents`(철회)도 같은 형태. `unstable_rethrow`로 redirect 유지, 그 밖 예외는 `ACTION_FAILED`(ko.ts 문구) |
| 7 | 안내 문구 키 선택 (3.6, BR-11, R-215) | 일치 | 규칙 `messageKey`는 자유 입력이 아니라 `lib/rules/messageKeys.ts`의 `visa.rule.*` + "행정사 확인 필요" 키 중 **6개 로케일 모두에 있는 키만** native-select로 고르고, 서버(`checkRuleInput`)가 다시 검증(`UNKNOWN_MESSAGE_KEY`). 직원 자유 문구가 공개 화면에 가지 않음 |
| 8 | 판정 라벨 (3.4, SC-12) | 일치 | 관리자 `OUTCOME_LABEL` = 가능성 높음 / 확인 필요 / 어려움 — 공개 `visa.outcome`과 같은 말 |
| 9 | 상태 표시 색+아이콘+글자 (S-09) | 일치 | `rule-badges.tsx` DRAFT `PencilLine`·neutral "초안", PUBLISHED `CircleDot`·cyan "게시 중", RETIRED `Archive`·outline "폐기", SAMPLE `ShieldAlert`·orange "샘플 · 실제 기준 아님"(orange 틴트 배지 = 주의 표시, S-64 대상 밖 v2.14). lucide 1.5 |
| 10 | 관리자 숫자 표시 (3.5 H-3, S-32) | **불일치 D-1** | 노쇼·매칭 수는 `fmtCount(n,"명"/"건")`(일치), `${STATUS_CHECK_REPLY_DAYS}일`은 v2.17 limits 안내 단위(일치), 버전 `v{n}`은 식별자(일치). 그러나 합격 점수는 `String(table.passScore)`로 `Intl` 상수를 거치지 않음 |
| 11 | 관리자 한국어 리터럴 위치 (3.6, 2.10 G-3 `_i18n/ko.ts`) | **불일치 D-2** | 관리자 화면 문구가 `src/lib/rules/options.ts:27`(" (체류자격 코드 아님)", " · 사용 안 함")과 `src/lib/rules/manage.ts:531`(`?? "직원"`)에 있음. 3.6 리터럴 허용 위치는 `src/app/admin/**`·`src/components/admin/**`뿐이고, `src/lib/**`에는 지금까지 표시용 한국어 리터럴이 없음(rg 확인, pii-guard 탐지 목록 제외) |
| 12 | 터치 44px (3.3) | 일치 | 관리자 링크 `min-h-11 min-w-11`, 버튼 `size="sm"`(44px) 이상, dialog 버튼 default 52px. 공개 응답 버튼 default 52px(E2E boundingBox ≥44×44 검사 포함), 상담 신청 버튼 default |
| 13 | 법령 수치 하드코딩 0 (4.9, CLAUDE.md, BR-12) | 일치 | 4.9-1 비자 코드 리터럴 rg 0건, 4.9-2 visa-engine·score 숫자 0건(주석의 R-/WO §/00:00만, 이번 diff에서 해당 파일 변경 없음). 새 점수표 기본값 = `{ items: [] }`, 기본 이름은 DB에서 찾음(`normalizeTableName === E74_SLUG`). SAMPLE 표시(`isSample` 또는 JSON `__sample`)는 게시 거부(`SAMPLE_NOT_PUBLISHABLE`), 새 버전도 SAMPLE 표시 상속. 시드 `sampleRules.ts`는 `ruleKey`만 추가(SAMPLE/DRAFT 유지). 운영 수치(14일, D-90/60/30, 노쇼 2회, cron, 배치)는 `limits.ts`(S-53), messages에는 `{days}` ICU 인자만 |
| 14 | 알림 어댑터 로그 (4.7, 5, S-45) | 일치 | `notifications/index.ts` 선택 로그 = 경로·SMTP 사용 여부·사유만(호스트·계정 없음), `smtp.ts` 발송 로그 = 마스킹 수신자·templateKey·locale·결과 코드(본문·토큰 URL·서버 오류 문장 없음). JSON 한 줄. SMTP_* 없으면 어댑터 생성 안 함(R-214), `.env.example` 빈 값 |
| 15 | 감사 — 게시·폐기 (4.8, BR-15) | 일치(v2.20 명문화) | 게시: `RULE_PUBLISH` meta `{change:"PUBLISH", version, retiredIds}` + `reviewedBy/At`(R-215), 같은 트랜잭션에서 이전 게시 버전 RETIRED. 폐기: 같은 액션 `{change:"RETIRE", version}`. `COMPANY_VERIFY`의 `change`(CONTRACT_SET/CLEAR) 선례와 같은 형태, meta는 코드·숫자·cuid 목록(`…Ids` 면제 v2.19)뿐. 4.8 표는 "게시"만 적어 폐기 처리가 비어 있었음 → v2.20에 PUBLISH/RETIRE 규칙 명시 |
| 16 | 감사 — 14일 무응답 S→A (4.8 `SEEKER_GRADE_CHANGE`, R-213) | 일치 | `statusCheck.ts` 같은 트랜잭션, actor `SYSTEM`, meta `{from,to,reason,status}` 코드만 |
| 17 | 감사 meta 연락처 키 거부 (4.8 v2.19, run 3 O-2) | 일치 | `audit.ts` `CONTACT_META_KEY`를 식별자 면제보다 먼저 검사 → `messengerId` 등 거부. `auditIdentifiers.test.ts` 갱신 |
| 18 | still-searching 공개 화면 — 클릭 전 상태 변경 없음 | 일치 | 페이지는 `stillSearchingState`(읽기만), 변경은 버튼 → `answerStillSearching` → `confirmStillSearching`(열린 확인·ACTIVE 조건부 updateMany, 1회용). 안내 문구 "버튼을 누르기 전에는 아무것도 바뀌지 않습니다." E2E가 열람 전후 `statusCheckSentAt` 같음 확인 |
| 19 | still-searching noindex (R-130, WO §13) | 일치 | `buildPageMetadata({noindex:true})` + 미들웨어 NOINDEX 정규식에 `still-searching` 추가. 5591566: 토큰 구분자 `.`→`~`(점 경로는 matcher 제외라 헤더가 빠지던 문제), E2E가 `x-robots-tag: noindex` 확인 |
| 20 | still-searching 6개 언어 (3.6, S-29) | 일치 | `seeker.stillSearching.*`·`meta.seekerStillSearching`·`common.statusCheck/stayExpiry.{sms,email.subject,email.body}` 6로케일, i18n:check 0. 고정 문구 "구직자 이용료 없음"은 각 로케일 `common.noSeekerFee`와 같은 문장. 브랜드 표기 ko "비자앤잡"/외 "VISA n JOB" 기존과 같음. E2E 위조 토큰 6로케일. 스크린샷 uz invalid 확인 |
| 21 | still-searching 시각·접근성 (3.2, 3.3, S-09, S-64) | 일치 | `PageShell` + `SectionHeader`형, 버튼 `seeker`(구직자 쪽 CTA), 결과 패널 `role="status"` 아이콘(CircleCheck/Clock/CircleX)+제목+본문, 상담 신청 = `CONSULT_HREF`(3.3), 오류 `role="alert"` 버튼 옆. 개인정보 표시 없음. 375 가로 스크롤 없음(E2E) |
| 22 | 4.5 공개 예외 — 서명 토큰 응답 | 일치(v2.20 명문화) | 액션 첫 문장 `// rbac: public — 상태 확인 메시지의 서명 토큰이 권한…` 주석. 토큰: HMAC(`crypto.hmacSign`, 용도 분리), 프로필 id·발송 시각·만료만, 14일·열린 확인 1건·1회. 4.5 예외 목록에 없어 v2.20에 추가 |
| 23 | R-213 핸들러 `now` 주입·C-4 StaffTask | 일치 | `statusCheck`·`stayExpiry`·`noShow` 모두 `(now, options)` 순수 핸들러, 체류 만료 단계마다 `StaffTask STAY_EXPIRY`(STAFF_VISA, dedupeKey 유일), payload 코드·숫자만. 노쇼 표시는 관리자 매칭·구직자 상세에만(기업 영역·blindSeeker에 `noShow` 0건, BR-02) |
| 24 | 스키마 변경 시 마이그레이션·시드 (CLAUDE.md) | 일치 | `20261119100000_p2d_rule_versions` + `sampleRules.ts` `ruleKey` + `seed.test.ts` 갱신 |
| 25 | 파일 명명 (4.3) | 일치 | `lib/jobs/{statusCheck,stayExpiry,noShow}.ts` camelCase(PLAN kebab보다 4.3 v2.17 우선), 컴포넌트 kebab |
| 26 | 테스트 위치 (4.10) | 일치 | PLAN `tests/unit/jobs/status-check.test.ts`·`tests/unit/{notifications,rules-publish}.test.ts` 대신 미러 `tests/unit/lib/jobs/{statusCheck,stayExpiry,noShow}.test.ts`, `lib/notifications/index.test.ts`, `lib/rules/manage.test.ts`, `server/actions/admin/rules.test.ts`(G-2: 4.10 우선). R-213/214/215 태그, stayExpiry D-91/90/89 경계. E2E `admin-rules.spec.ts`, `still-searching.spec.ts`, 도우미 `support/p2dDb.ts`. `src/` 안 테스트 0 |
| 27 | 4.2 디렉터리 | 일치(v2.20 기재) | 새 파일이 모두 기존 최상위 폴더 안. 트리에 없던 파일을 빌더 요청대로 v2.20에 기재(아래 3절) |
| 28 | 알림 템플릿 키 (3.6 v2.5) | 일치(v2.20 명문화) | `common.{주제}.sms` + 이메일 `common.{주제}.email.{subject,body}` — 기존 규칙에 이메일 하위 키 형식이 없어 v2.20 보완 |

**일치 26 / 28** (불일치 2 — 둘 다 경미, 관리자 화면 한정)

## 2. 불일치 목록 (수정 지시)

| # | 위치 | 기준 | 실제 | 수정 |
|---|---|---|---|---|
| D-1 | `src/app/admin/(staff)/score-tables/[id]/page.tsx:73` | 3.5·S-32 (관리자 숫자는 `ko-KR` `Intl` 상수, v2.10/H-3) | 합격 점수 `String(table.passScore)` | `_i18n/ko.ts`의 수 포맷(`fmtCount` 계열, 단위 없이 또는 `점`)으로 표시. 폼 입력 기본값(`:123`)은 입력값이라 그대로 둔다 |
| D-2 | `src/lib/rules/options.ts:27`, `src/lib/rules/manage.ts:531` | 3.6 (관리자 한국어 리터럴은 `src/app/admin/**`·`src/components/admin/**`, 공용 문구는 `_i18n/ko.ts`) | lib에서 관리자 표시 문구 " (체류자격 코드 아님)", " · 사용 안 함", 대체 이름 "직원"을 만듦 | lib는 코드·플래그(`isStatusCode`, `active`)와 `displayName \| null`만 반환하고, 라벨 조립과 "직원" 대체는 `_i18n/ko.ts`(또는 관리자 페이지)에서 한다 |

## 3. 관찰 (판정 밖)

- O-1 `rule-forms.tsx:207` 도움말 "공개 점수 계산기는 이름이 E-7-4인 게시 점수표만 씁니다" — 따옴표 리터럴이 아니라 4.9-1에 걸리지 않고 관리자 설명문이다. 실제 매칭은 `normalizeTableName === E74_SLUG`이므로 문구와 동작은 같다. 이름 비교 규칙이 바뀌면 문구도 같이 바꿀 것.
- O-2 `updateScoreTableAction`이 `name: "KEEP"`을 넣어 스키마를 통과시킨다. 동작은 맞지만(이름은 버전 간 고정), 수정용 스키마를 `scoreTableDraftSchema.omit({ name: true })`로 두면 의도가 분명하다.
- O-3 smtp·render는 `tests/unit/lib/notifications/index.test.ts`, stillSearching 토큰은 `tests/unit/lib/jobs/statusCheck.test.ts`에서 함께 검사한다(4.10 P-3 교차 테스트 허용 범위). 파일별 미러 테스트(`notifications/smtp.test.ts`, `seeker/stillSearching.test.ts`)로 나누면 찾기 쉽다.
- O-4 robots.txt `disallow`에 `/*/seeker/still-searching`은 없다. 메타 + 헤더 noindex로 4.5·R-130 요건은 충족(다른 seeker 경로와 같은 처리).
- O-5 게시 확인 버튼도 `destructive`다. 게시는 이전 게시 버전을 폐기하므로 되돌릴 수 없는 전이로 보아 3.1 v2.18과 맞다.

## 4. STANDARD v2.20 변경 내역

- 머리 2.19 → 2.20, 개정 이력 2.20 행.
- 3.5 Q-26 공통 함수 위치 `src/i18n/dateTime.ts`(formatDate·formatTime·formatDateTime·formatMonth·formatMonthName, 관리자 fmt* 경유) 명시.
- 3.6 이메일 템플릿 키 `common.{주제}.email.subject`·`.body`, 알림 문구 안 고정 문구는 기존 키와 같은 문장.
- 4.2 트리: `i18n/dateTime.ts`, `lib/rules/(manage, messageKeys, options)`, `lib/jobs/(statusCheck, stayExpiry, noShow, notifySeeker)`, `lib/notifications/(smtp, render)`, `lib/seeker/stillSearching`, `components/admin/(rule-forms, rule-badges)`, `components/seeker/(still-searching-form, still-searching-notice)`, `server/actions/(admin/rules, seeker/stillSearching)`, `schemas/admin/rules`, `tests/e2e/support/p2dDb`.
- 4.5 공개 예외: "아직 구직 중" 원클릭 응답(서명 토큰이 유일한 권한, 프로필 id·발송 시각만, 열린 확인 1건·14일·1회, 열람은 상태 변경 없음, noindex 메타+헤더, 구분자 `~`).
- 4.8 `RULE_PUBLISH`: 게시 `{change:"PUBLISH", version, retiredIds}`, 폐기 `{change:"RETIRE", version}` 같은 액션, 초안 생성·수정·새 버전은 감사 대상 아님.
