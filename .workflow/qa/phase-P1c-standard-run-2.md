# Phase P1c — 기준 일치 재검토 (run 2, 정적 검토)

- 대상 커밋: `2a875f1`(로그인 실패 한도 계정+IP, 만료 체류 후보 제외), `b5924a5`(run 1 수정 지시 #1~#12). 범위 `git diff b3933a1..b5924a5`.
- 기준: `.workflow/STANDARD.md` v2.7, `.workflow/qa/phase-P1c-standard-run-1.md` 3절 수정 지시 #1~#12, CLAUDE.md.
- 검토자: wf-standard(모드 B), 2026-11-16.
- 실행한 확인
  - `corepack pnpm lint`: 통과. 첫 실행은 메모리 부족으로 종료 코드 134가 났다. 동시에 돌던 QA 작업 때문으로 보인다. `NODE_OPTIONS=--max-old-space-size=4096`로 다시 실행해 오류 0이었다.
  - `qa:static`: 오류 0, 경고 17. run 1과 같은 기존 경고이고 새 경고는 없다.
  - `i18n:check`: 6개 로케일 오류 0, ko 키 792개.
  - Tailwind 클래스 생성 확인: scratchpad 스크립트로 프로젝트의 `tailwindcss@4.3.5` `compile()` + `tw-animate-css`를 돌려 `slide-in-from-bottom-4.5`, `zoom-in-98`의 CSS 생성 여부를 봤다. `.next`는 건드리지 않았다.
  - 스크린샷(375px viewport): `p1c_r2_step2_viewport`, `step2_unknown`, `step4`, `step5a_error`, `step7`, `dialog`.
  - build·test·e2e·dev·start는 **실행하지 않았다**.

## 1. 결과 요약

- 수정 지시 **해소 10 / 12**. 부분 해소 2건: #1 다이얼로그 진입 이동, #6 체크박스 포커스.
- 새 불일치 **1건**(N-1). `/visa-check` 비자 옵션과 결과 카드에 OTHER·NONE·UNKNOWN 코드가 보인다(S-16 v2.7 ②). 이번 diff 밖의 기존 코드지만 v2.7 규칙에 어긋난다. run 1 #11의 위치 목록에서 빠졌던 곳이다.
- 2a875f1(인증·후보 쿼리)에는 기준 불일치가 없다. 운영 수치는 `limits.ts`에 모았고(S-53), 체류 만료 판정은 `classifyTrack.notExpiredFrom` 한 곳에서 파생한다. 테스트는 `tests/unit/` 미러 경로에 있다(S-50).

## 2. 수정 지시별 판정

| # | 판정 | 근거 |
|---|---|---|
| 1 | **부분 해소** | 해소된 부분: 스크림 `backdrop-blur-glass`(`dialog.tsx:27`). WizardProgress `backdrop-blur-nav backdrop-saturate-160`(`wizard-progress.tsx:24`). `--blur-nav: 22px`(`globals.css:237`). `zoom-in-98` → `--tw-enter-scale: calc(98*1%)`가 생성됨을 확인했다. **남은 부분**: `dialog.tsx:33`의 `slide-in-from-bottom-4.5`는 **CSS가 생성되지 않는다**. tw-animate의 `slide-in-from-bottom-*`는 `--value(integer)`, 백분율 토큰, 비율, `--translate-*` 테마, `[length]`만 받는다. 4.5는 정수가 아니어서 매칭되지 않는다. 컴파일 결과에 `slide-in-from-bottom-4`만 나오고 `-4.5`는 없다. 그래서 진입 `translateY(18px)`(3.1 dialog)가 적용되지 않는다. → 수정 지시 R2-1 |
| 2 | 해소 | 국가 필드 `labelAddon={icon("private")}`(`wizard-steps-b.tsx:102`). 요약 `hidden={[country, employerName]}`(`:249`). 스크린샷 step4: "국가 (필수)" 옆에 자물쇠, 요약 "국가, 회사명". |
| 3 | 해소 | `consent-documents.tsx:20` 마커 줄을 제거하고 제목 다음에 `<ExpertReviewMark className="mt-2" />`(`:56`)를 넣는다. 24개 파일 모두 마커가 1회이므로 `m` 플래그 단일 치환으로 충분하다. 스크린샷 step7: 제목 아래 주황 배지 + "이 문서는 초안입니다…". |
| 4 | 해소 | 6개 로케일 `desiredIndustries.help`·`desiredRegions.help`가 `{max}`다. `useStepText.help(field, values?)`, 호출부 `{ max: DESIRED_MAX_SELECTIONS }`(`wizard-steps-b.tsx:316`, `:342`). messages에 남은 "최대 N" 숫자는 0건이다. |
| 5 | 해소 | `WizardNav` 버튼 줄이 `sticky bottom-0 z-20 -mx-gutter … border-t border-navy/8 bg-white/82 px-gutter py-3 backdrop-blur-nav backdrop-saturate-160`(`wizard-shell.tsx:113-116`)이다. Fragment로 바꿔 form의 직계 자식이 됐다. 3a·3b 뒤의 `sr-only` span은 absolute여서 흐름에 영향이 없다. 스크린샷 step2·5a viewport: 하단 바가 고정되어 있다. |
| 6 | **부분 해소** | 해소된 부분: `ChipGroup`(선택 칩, 없으면 첫 칩), `MultiChips`(첫 칩), `MonthSelect`(연 select)가 `ref`를 받는다. Controller 19곳에서 `field.ref`를 넘긴다. 서버 오류는 첫 항목에 `shouldFocus`(`wizard-shell.tsx:63-70`)다. **남은 부분**: 필수 체크박스 Controller 2종은 `field.ref`가 연결되지 않았다. ① Step 2 `visaConfirm`(`wizard-steps-a.tsx:458-475`, `mustCheck`). ② Step 7 필수 동의 `ConsentRow`(`wizard-steps-b.tsx:720-733`. ConsentRow는 ref prop이 없다). 이 둘이 첫 오류이면 포커스가 움직이지 않는다. Step 7은 화면의 모든 필수 문항이 체크박스다. → 수정 지시 R2-2 |
| 7 | 해소 | `src`·`messages`·`content`에 "Visa&Job" 0건이다. 비한국어 messages 5×12곳과 동의서 번역본 20개가 "VISA n JOB"이다. ko "비자앤잡"은 그대로다. |
| 8 | 해소 | 본문 `max-w-xl`(`register/page.tsx:86`), 진행 바 안쪽 `max-w-xl`(`wizard-progress.tsx:27`). seeker 영역에 `max-w-180`은 0건이다. |
| 9 | 해소 | `<SectionHeader as="h1" title={stepName} lead=…/>`(`register/page.tsx:88`) → `text-h1`. 스크린샷에서 H1 크기를 확인했다. |
| 10 | 해소 | Prisma `enum YesNoUnknown`, `pendingApplication YesNoUnknown?`. 마이그레이션 `20261116120000_…`에서 기존 값을 변환한다(true→YES, 확인 후 false→NO, 그 밖 null). `optionalYesNoUnknown`(`step2.ts:24`). 칩은 `YES_NO_UNKNOWN`과 `common.{yes,no,unknown}`(6개 로케일 존재). `saveStep.ts:178`, `wizardValues.ts:61` 매핑이 맞다. 시드 픽스처도 갱신했다. |
| 11 | 해소(지시한 위치) | `VisaType.isStatusCode`(스키마·시드·마이그레이션 backfill). `VisaLabel showCode`. 옵션 문자열 분기는 `wizard-steps-a.tsx:311`, `quick-register-form.tsx:137`이다. VisaLabel은 `wizard-steps-a.tsx:319`, `quick-register-form.tsx:145`, `seeker/me/page.tsx:60`이다. `src/`에 OTHER·NONE·UNKNOWN 리터럴 목록은 0건이다. 마이그레이션 SQL의 `WHERE code IN (…)`은 1회성 데이터 backfill이라 4.9 대상(`src/`)이 아니다. 스크린샷 step2_unknown: 옵션 "모름", 선택 후 "모름"만 보인다. 단 `/visa-check`는 빠졌다 → N-1 |
| 12 | 해소 | `site-nav.tsx:82` `backdrop-blur-nav`. `src`에 `backdrop-blur-[..]`·`-md`·`-xl` 0건이다. |

## 3. 새 불일치

| # | 기준 | 위치 | 실제 상태 |
|---|---|---|---|
| N-1 | S-16 / 3.2 VisaLabel ②(v2.7): "OTHER·NONE·UNKNOWN 행은 옵션·VisaLabel 모두 코드 없이 이름만(코드 노출 0)" | `src/components/visa/visa-check-form.tsx:90-92`(옵션 `{v.code} {v.label}`), `src/components/visa/outcome-card.tsx:61`(`VisaLabel`에 `showCode` 없음). 데이터: `src/lib/referenceData.ts:12-17` `getVisaTypes()`는 `active` 전체를 반환하고 `isStatusCode`를 고르지 않는다. 사용처는 `app/[locale]/(public)/visa-check/page.tsx:54` | `/visa-check` select에 "OTHER 그 밖의 비자", "NONE 비자 없음", "UNKNOWN 모름"이 그대로 나온다. 고르면 결과 카드 VisaLabel에 코드 칩 "UNKNOWN"이 보인다. 홈 위젯(`visa-widget.tsx:27`)은 `registrable`로 걸러서 해당이 없다. |

## 4. 수정 지시 (run 2)

| # | 위치 | 지시 |
|---|---|---|
| R2-1 | `src/components/ui/dialog.tsx:33` | 생성되는 클래스로 18px 진입을 만든다. 권장: `@theme`에 `--translate-dialog: 18px;` 같은 토큰을 추가하고 `data-[state=open]:slide-in-from-bottom-dialog`로 쓴다. tw-animate의 `--value(--translate-*)` 경로이고 임의값 없음. 토큰을 추가하면 STANDARD 2.2.2 표에 한 줄 추가가 필요하다(기준 담당이 반영). 대안 `slide-in-from-bottom-[18px]`은 CLAUDE.md 임의값 금지에 걸리므로 쓰지 않는다. 확인: 렌더 후 dialog 콘텐츠의 `--tw-enter-translate-y` 계산값이 18px인지 본다. |
| R2-2 | `wizard-steps-a.tsx:458-475`(visaConfirm), `wizard-steps-b.tsx:640-680`(`ConsentRow`)·`:724` | `Checkbox`에 `ref={field.ref}`를 넘긴다. `ConsentRow`는 `ref?: Ref<HTMLButtonElement>` prop을 받아 내부 `Checkbox`에 연결하고, 호출부에서 `ref={f.ref}`를 넘긴다. 확인: QA E2E에서 필수 동의를 비운 채 제출한 뒤 `document.activeElement`가 첫 미체크 필수 동의 체크박스인지 본다. |
| R2-3 (N-1) | `lib/referenceData.ts` `getVisaTypes` select, `visa-check-form.tsx:90-92`, `outcome-card.tsx:61`과 그 호출부 | `isStatusCode`를 select에 추가해 visas prop으로 넘긴다. 옵션은 위저드와 같은 분기(`isStatusCode ? "{code} {name}" : name`)로 만든다. OutcomeCard의 `visa`에 `isStatusCode`를 넣고 `showCode={visa.isStatusCode}`로 넘긴다. 리터럴 목록은 만들지 않는다(4.9). |

## 5. 관찰 (불일치 아님)

1. Step 2에서 등록 불가 비자를 고르면 다음 버튼이 `pending || blocked`로 비활성이 된다. 이때 라벨이 "저장 중…"으로 보인다(스크린샷 step2_unknown). b3933a1부터 있던 동작이다. STANDARD 규칙 위반은 아니지만 문구가 상태와 맞지 않는다. 비활성 시 라벨은 "다음"을 유지하는 것을 권장한다.
2. 간편 등록 폼(`quick-register-form.tsx:90`)의 동의 `ConsentRow`에도 ref가 없다. 3.3 첫 오류 포커스 규칙은 위저드 항목이라 판정 대상은 아니다. R2-2와 함께 고치면 일관된다.
3. Step 0(`wizard-start-form.tsx`)의 시작 버튼은 sticky 바가 아니다. 이전 버튼이 없는 단일 CTA 짧은 화면이라 3.3 "이전/다음 하단 고정"의 대상에서 뺐다. 기준에 명시가 필요하면 다음 개정에서 "Step 0 제외"를 적는다.
4. 위저드 H1 아래 리드가 SectionHeader의 `text-lead text-n500`으로 바뀌었다(이전 `text-dense text-n700`). 3.2 SectionHeader 규칙과 같고 대비 문제는 없다(n500은 S-63 허용).
