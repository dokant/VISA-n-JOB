# STANDARD — 기준서

> 모든 산출물이 지켜야 하는 "일관성의 기준". 구현 전에 확정한다.
> 버전 2.25 / 개정 2026-11-19 / 작성: wf-standard(모드 A, v2.1~v2.25는 모드 B 검토 중 보완)

## 개정 이력

| 버전 | 일자 | 근거 | 내용 |
|---|---|---|---|
| 1.0 | 2026-11-15 | Q-03 | PRD에서 도출한 제안 토큰(shadcn 기본 + [제안])으로 작성. 점검표 S-01~S-56, 충돌 C-01~C-12 |
| 2.0 | 2026-11-16 | Q-05, Gate 3(SC-01~12, PC-1~15) | **디자인 핸드오프(`design_handoff_visanjob_homepage/`)를 디자인 기준으로 채택.** 2절 디자인 토큰 전면 교체(색·글꼴·간격·반경·그림자·브레이크포인트·모션), Tailwind 4 + shadcn 변수 대응표 신설, 접근성 보정안(2.8), 컴포넌트 시각 규칙(3.1·3.2) 교체, 메인 섹션 매핑표(3.7), 자산 없음 처리(3.8), BR·PRD 충돌 목록(7절) 신설, 기존 C-01~C-12를 SC-xx 결정으로 본문 반영(8절), 점검표 S-01~S-56 갱신 + S-57~S-72 추가 |
| 2.1 | 2026-11-16 | P0a run 2 검토(qa/phase-P0a-standard-run-2.md), Q-06·Q-07 | 구현 중 드러난 기준 공백 보완: 2.2.2에 `--color-brand-orange-hover`·`--blur-glass` 추가, 2.3.3 Pretendard를 공식 **정적** KS X 1001 서브셋 4굵기·`preload: false`로 정정(공식 가변 서브셋 없음, next/font 로케일별 preload 불가), 2.3.4에 `text-control`(16px) 추가, 2.4에 간격 외 대괄호 임의값 허용 범위 명시, 3.2 Logo 워드마크 크기를 `text-body` 토큰으로, 4.2 site.config 휴대전화·계좌 처리(Q-06) 명시, S-06 확인 방법 보완 |
| 2.3 | 2026-11-16 | P0c run 1 검토(qa/phase-P0c-standard-run-1.md) | 기준 공백 보완(산출물 기준 변경 없음): 4.2 `notifications/`를 PLAN P0c대로 `types.ts`(인터페이스)·`index.ts`(선택)·`console.ts` + P2d `smtp.ts`로 정정. 4.7 개발용 콘솔 어댑터 예외의 범위(파일·마스킹·production 조건) 명시. 4.5 권한 이름 형식 `{대상}:{행위}` camelCase 명시 |
| 2.4 | 2026-11-16 | P1a run 1 검토(qa/phase-P1a-standard-run-1.md), SC-11 | **SC-11 적용 반영**: 한국어 글꼴 Pretendard → Noto Sans KR(`next/font/google`, 가변, `preload:false`), 2.3.1~2.3.3·S-03·S-04 갱신, Pretendard 파일은 미사용 보관만 허용. Noto Sans SC 선언을 `src/lib/fontsZh.ts`로 분리·zh 하이드레이션 뒤 로드 허용(조건: 로드 전 zh 스택에서 한국어 글꼴이 한자를 그리지 않을 것), Inter `preload:false`. 3.1 `native-select`(공개 폼, JS 없이 동작) 추가, FAQ 펼친 목록 허용, sheet 링크 크기 `text-h3`로 정정(22px 토큰 없음). 2.4 임의값 허용 예 추가(`backdrop-blur-[22px]`, `tracking-[0.02em]`, 푸터·대상 패널 열 비율). 3.3 "상담 신청" 목적지 `/about#contact`. 3.7 #3 패널 열 비율. 3.8·S-62 LCP 요소를 "히어로 텍스트(H1 또는 부제)"로 정정. 4.2 `components/public/`, `lib/{demand,seo}/`, `lib/{fontsZh,guide,referenceData}.ts` 추가 |
| 2.2 | 2026-11-16 | P0b run 1 검토(qa/phase-P0b-standard-run-1.md) | 기준 공백 보완(산출물 기준 변경 없음): 4.2 `scripts/`를 PLAN P0b대로 `db.ts`(start/stop/status/reset) + `lib/`로 정정, `tests/setup/` 추가. 4.10에 `prisma/`·DB 대상 테스트(`tests/unit/db/`)와 `scripts/` 테스트·Vitest 전역 설정 위치 명시. 3.6에 참조 데이터(VisaType·Region·Industry) `nameKey` 형식과 messages 존재 의무 추가. 4.9에 등록 가능 판정은 `VisaType.registrable`만 사용(SC-02 OTHER) 명시 |
| 2.5 | 2026-11-16 | P1b run 1 검토(qa/phase-P1b-standard-run-1.md) | 기준 공백 보완: 4.2 트리에 `src/auth.ts`, `lib/admin/`, `lib/{authConfig,authCredentials,authGuard,employerAccount,otp,password,phone,rateLimit}.ts` 추가. 4.5 공개 예외에 로그인·회원가입·로그아웃·Auth.js 엔드포인트 추가, 직원 영역 가드 `requireStaff()`를 첫 문장 검사로 인정(내부 `assertCan(…,'admin:access')`). 4.7·S-45 Auth.js logger(오류 type·경고 code만, JSON 한 줄) 허용 명시. 5 오류 번역 키 `errors.{그룹}.{코드의 lowerCamelCase}` 명시. 3.6 알림 템플릿 키 `common.{주제}.{채널}`. 4.10 테스트 공용 픽스처·E2E `support/` 위치. S-53 입력 형식 상한(스키마 리터럴 허용)과 운영 수치 구분, 그리고 확인 방법에 "limits.ts 값이 messages에 숫자로 중복되지 않음" 추가(기존 '한 곳에만' 규칙의 구체화 — 이번 검토 불일치 #2의 근거) |
| 2.6 | 2026-11-16 | Q-09 (P1b run 1 불일치 #1) | 3.1 native-select 사용처를 클라이언트 폼(react-hook-form 포함)의 긴 목록까지 확대, select 행의 긴 목록 대상을 native-select로, command·popover는 `cmdk` 미승인으로 현재 사용 안 함 |
| 2.7 | 2026-11-16 | P1c run 1 검토(qa/phase-P1c-standard-run-1.md) B-1~B-12, Q-10 | 3.3 문항 수 = WO §7.3 표 한 행(B-1), '모름' 적용 대상 열거 + `pendingApplication` 포함(B-5, Q-10). 3.2 VisaLabel·S-16: native `<option>` 문자열 예외(B-2), 체류자격 코드가 아닌 행(OTHER·NONE·UNKNOWN)은 이름만(B-3), 세부 유형 코드만 허용(B-4). S-24 추천 링크 공유 예외(B-6, PC-9). 4.5 `requireSeeker()` 첫 문장 인정(B-7). 4.2 `lib/seeker/`·`lib/candidates/`·`schemas/seeker/register/fields.ts`(B-8). 2.4 위저드 문항 간격 = form 22px(B-9). 3.6 시·군·구 `nameKo` 표시 허용(B-10). 3.1 날짜 문항 native `type="date"` 허용(B-11), radio 칩 선택 그림자 `shadow-ink`(B-12). **블러 토큰 `--blur-nav` 22px(`backdrop-blur-nav`) 신설, 2.4 임의값 허용 목록에서 `backdrop-blur-[22px]` 삭제**(CLAUDE.md 임의값 클래스 금지와 정합 — 산출물 영향: `site-nav.tsx`의 `backdrop-blur-[22px]` → `backdrop-blur-nav`, WizardProgress도 같은 유틸). Q-10: 위저드 이전/다음은 sticky 하단 바(3.3 문구 그대로), 위저드 H1은 `text-h1`(3.7 예외 없음) |
| 2.8 | 2026-11-16 | P1c run 2·3 검토(qa/phase-P1c-standard-run-2.md R2-1, run-1 D-2, run-2 관찰 3) | 2.2.2 토큰 표에 `--translate-dialog` 18px(3.1 dialog 진입, `slide-in-from-bottom-dialog` — tw-animate는 `slide-in-from-bottom-4.5` 같은 소수 척도를 생성하지 않음)과 `--spacing-wizard-bar` 96px(위저드 sticky 하단 바가 있는 화면의 `scroll-padding-bottom`, 포커스가 바 아래로 숨지 않게 — WCAG 2.4.11) 추가. 3.1 dialog 진입 구현 유틸 명시. 3.3 하단 고정 이전/다음의 대상에서 **Step 0(시작 화면, 이전 버튼 없는 단일 CTA)** 제외를 명시하고, sticky 바 화면의 scroll-padding 규칙 추가. 산출물 기준 변경 없음(구현 601992f에 이미 반영된 값의 기준화) |
| 2.9 | 2026-11-16 | P1d run 1 검토(qa/phase-P1d-standard-run-1.md) P-1~P-6 | 4.2 트리에 `lib/employer/`·`lib/leads/`·`lib/jobs/(boss, archiveLeads)`·`schemas/{employer,ingest}/`·`scripts/worker.ts` 추가(P-1). 4.5 공개 예외에 무료 채용 진단 제출 추가, `requireEmployer()` 첫 문장 검사 인정(P-2). 4.10 교차 테스트 위치(P-3). 3.2·3.4 OutcomeCard 다중 비자(`visas`) 표시(P-4). **1.1 용어: 기업 화면의 운영자 측 표기는 "비자앤잡 담당자" 기본, 문맥상 반복 시 "담당자" 허용, "직원"은 관리자 화면 전용, 공개·기업·구직자 화면 적용·법적 문서 예외(Q-13)**(P-5 — 산출물 영향: `employer.request.notice`의 "비자앤잡 직원"). 3.3 '모름' 열거는 구직자 위저드 기준이고 기업 폼은 SC-02 대상 밖(P-6) |
| 2.10 | 2026-11-16 | P1e run 1 검토(qa/phase-P1e-standard-run-1.md) G-1~G-5, CLAUDE.md 터치 규칙 | 4.8·S-46에 `SEEKER_REVIEW_UPDATE` 추가(G-1). 4.10 PLAN 경로와 다를 때 4.10 우선, 교차 테스트 예 `piiView`(G-2). 4.2 트리에 `app/admin/_i18n/ko.ts`·`lib/admin/(dashboard, leadDesk, seekerReview)`·`lib/leads/priority`·`schemas/admin/` 기재(G-3). 관리자 예외: S-16·S-27 비자 코드·등급 글자 표시, S-32 `ko-KR` 고정 `Intl` 상수 허용(G-5). 2.6 관리자 1024px 미만 컨테이너 가로 스크롤 허용 명시. **터치 타깃(G-4 개정): CLAUDE.md 사용자 규칙("터치 영역 44px=h-11 이상") 우선 — 모든 화면(관리자 포함)·모든 폭에서 44px 이상. 관리자 32px 하한과 ≥1025px 핸드오프 높이 허용 삭제. 3.1 button `sm` 42px→44px, radio 칩 34px·tabs 38px·LocaleSwitcher 38px→44px, B-10·S-08 갱신**(산출물 영향: `button.tsx` `lg:h-10.5`, `radio-group.tsx` `lg:h-8.5`, `tabs.tsx` `lg:h-9.5`, `locale-switcher.tsx` `lg:h-9.5`, `site-footer.tsx` 언어 바로가기 `lg:h-8.5`) |
| 2.11 | 2026-11-17 | P1e run 2 검토(qa/phase-P1e-standard-run-2.md) H-1·H-3 | 4.5에 관리자 서버 액션 래퍼 `adminAction`(`src/lib/admin/actionGuard.ts`) 허용 조건 추가 — 첫 문장 판정은 안쪽 함수 본문, 래퍼는 본문 호출과 `AuthzError`→`{ ok: false, code }` 변환만(H-1). 4.2 트리 `lib/admin/`에 `actionGuard.ts` 기재. 3.5·S-32 관리자 화면에서 `Intl` 포맷 숫자 뒤 한국어 수 단위 글자(명·건·일) 허용, 원화는 `currency:'KRW'`만, `toLocaleString` 금지 유지(H-3). 산출물 기준 변경 없음(e52a176에 이미 반영된 형태의 기준화). **Gate 4 개선 후보(미반영, H-2)**: qa:static에 S-40 첫 문장 rbac 구조 검사(warn) 추가 — 이번에는 S-40을 사람 전수 열람으로 유지 |
| 2.12 | 2026-11-17 | P1e run 3 검토(qa/phase-P1e-standard-run-3.md), Q-16 | 3.3 터치 대상 44×44가 폭 포함·텍스트 링크 포함임을 명시, 폭은 상자(`min-w-11`)에만 주고 글자·밑줄은 글자 폭 유지, 짧은 라벨의 글자 간격이 핸드오프 간격보다 넓어지는 것 허용(산출물 판정 변화 없음) |
| 2.13 | 2026-11-17 | P2a run 1 검토(qa/phase-P2a-standard-run-1.md), Q-17 ② | 공고 직렬화 파일명 `blindJob.ts` → **`publicPosting.ts`**(PLAN P2a 이름 유지, 상수 `BLIND_JOB_FIELDS`는 그대로): 4.2 트리·4.4·S-39·7절 K-05 정정. 4.2 트리에 `lib/postings/`(public, manage, interest), `components/jobs/`(posting-view, posting-card, interest-panel, interest-form, verified-badge), `schemas/jobs/`(interest), `schemas/admin/postings`, `server/actions/jobs/` 기재. 4.5에 첫 문장 판정 보충: 초기값 없는 변수 선언은 실행 문장으로 보지 않으며, `try` 블록 첫 문장이 rbac 검사이고 `catch`가 `AuthzError`만 `{ ok:false, code }`로 바꾸고 나머지는 다시 던지면 첫 문장 검사로 인정(산출물 판정 변화 없음 — `server/actions/jobs/interest.ts` 형태의 기준화) |
| 2.14 | 2026-11-17 | P2a run 2 검토(qa/phase-P2a-standard-run-2.md) | 4.2 트리에 `components/admin/` 관리자 전용 표시 컴포넌트 예 `posting-badges`(공고 상태·검증 배지) 기재. 3.2 SiteFooter: 등록 정보 행은 라벨 위·값 아래로 쌓는다(핸드오프 `.foot__legal div` 가로 flex의 변형 — 번역 라벨이 열 폭보다 길어 값이 한 글자씩 꺾이던 run 1 F-3). S-64 범위 명시: 대상은 `brand-orange` 배경·`seeker` 버튼이며, `orange` 배지(틴트 바탕, 주의·대기 표시 — ExpertReviewMark·부족 항목·관리자 "검증 대기/검증 전")는 S-64 대상이 아님(기존 3.2 사용례의 명문화, 판정 변화 없음) |
| 2.15 | 2026-11-17 | P2b run 1 검토(qa/phase-P2b-standard-run-1.md) | 4.2 트리에 P2b 파일 기재(빌더 요청): `lib/candidates/`(access, browse, eligible, interest, stats, stayBand), `lib/employer/`(apiRegistry, contract), `lib/admin/companies`, `components/employer/`(후보·계약 화면), `components/admin/company-forms`, `content/terms/employer/{version}/{locale}.md`, `public/docs/`(약관 PDF 생성물), `schemas/employer/(candidates, contract)`, `schemas/admin/companies`, `scripts/build-terms-pdf.ts`, `prisma/seed/sampleSeekers.ts`. 4.4에 보충: 기업에게 나가는 공개 ID 변환(`toBlindPublicId`/`fromBlindPublicId`)도 `blindSeeker.ts` 안에만 두고, 미계약 기업 요약 통계(`lib/candidates/stats.ts`)는 개별 행·ID 없이 화이트리스트 코드별 건수만 내보낼 때 직렬화기 밖 집계를 허용(PC-11 마스킹 적용). 산출물 판정 변화 없음 |
| 2.16 | 2026-11-17 | P2b run 2 검토(qa/phase-P2b-standard-run-2.md), Q-24, PC-11 | 기준 공백 보완(산출물 판정 변화 없음): 3.3 문항 수 — Q-24 `majorField`는 WO §7.3 `major` 행에서 갈라진 별도 1문항(`majorField` 블라인드 + `major` 비공개). 3.3 SC-02 '모름' 있음 목록에 `majorField` 추가. 4.4 `majorField`는 `MAJOR_FIELDS` 코드만 통과(자유 입력 `major` 선택 금지), 요약 통계 합계는 가린 칸이 하나라도 있으면 숨기고 칸 정렬은 공개 값만 사용, 숨긴 합계 표시 규칙(messages 키 `—` + 바로 아래 안내 문구). 4.9 법령 수치가 아닌 운영자 미확정 코드 목록(`MAJOR_FIELDS`) 표시 방식(주석 + `{이름}_SOURCE` 상수 `reviewStatus: 'OPERATOR_REVIEW_REQUIRED'`). 4.2 트리에 `tests/e2e/support/` 파일 목록(shots 포함)·`lib/seeker/options` 설명 |
| 2.17 | 2026-11-18 | P2c run 1 검토(qa/phase-P2c-standard-run-1.md), PC-1, 빌더 판단 요청 3건 | 기준 공백 보완(산출물 판정 변화 없음): **4.4 기업에게 나가는 구직자 데이터의 허용 경로를 둘로 명시** — `blindSeeker.ts`(블라인드 프로필·공개 ID) + `interviewDisclosure.ts`(PC-1 동의 건 실명 `legalName` 한 키만: 해당 기업·해당 면접 건·CONFIRMED·유효 동의를 매 요청 조회, PII_VIEW 기록). 구직자에게 보이는 추천·면접 기록의 BR-03 범위. 4.8 `PII_VIEW`에 기업 실명 제공·직원 비공개 파일 열람 포함, 동의 부여는 감사 액션 없이 `Consent` 행이 기록(`CONSENT_GRANT` 신설 안 함, 철회만 `CONSENT_REVOKE`). 4.3 PLAN이 적은 kebab 파일명(`signed-url.ts`, `third-party.ts`)보다 camelCase 우선. 4.2 트리: `lib/storage/` 자리 → `lib/files/`(storage, signedUrl), 루트 `storage/private/`(git 제외), P2c 파일(recommendations, consent, employer/interviews, admin/placements·visaCases, seeker/recommended, admin·seeker 컴포넌트, schemas·actions admin 3종, api/employer/requests, api/files/[token], e2e support matchingDb). 3.5 관리자 수 단위 허용에 limits 안내용 `분`·`MB` 추가. S-37 확인 방법 갱신 |
| 2.18 | 2026-11-18 | P2c run 2 검토(qa/phase-P2c-standard-run-2.md), Q-25, Q-14 | 기준 공백 보완: **1.1 용어집에 `실명/이름`(`legalName`) 행 신설** — 기업 면접 현황(`employer.requests.*`)의 면접 건별 이름 제공 표시는 "이름"(열 라벨·동의 상태 문구와 같은 말), "실명"은 블라인드 설명·동의 문구에서 블라인드와 대비할 때만(산출물 영향: `employer.requests.interviews.nameState.ENDED` ko 1건 = run 2 D-4). 4.4 `interviewDisclosure.ts` 조건에 Q-25(최종 결과 기록 또는 취소 시 종료, `DISCLOSURE_ENDING_RESULTS`) 추가, `EMPLOYER_NAME_DISCLOSURE` 조건 문구 동기화. 3.1 dialog 사용처에 되돌릴 수 없는 관리자 전이(면접 취소 등, Q-14 취지) 명시와 확인 버튼 `destructive` 규칙. S-53에 다른 운영 수치에서 정해지는 설정값(예 `SERVER_ACTION_BODY_LIMIT`)은 `limits.ts` 안 파생식 + 단위 테스트로 묶는다 |
| 2.19 | 2026-11-18 | P2c run 3 검토(qa/phase-P2c-standard-run-3.md), Q-26, Q-25 | 기준 공백 보완(산출물 판정 변화 없음): **4.8 감사 meta 식별자 면제 규칙 명시** — 연락처 검사 면제는 키 이름이 식별자(`id`·`…Id`·`…Ids`·`verifiedBy`)이고 값이 정확히 cuid(`c` + 소문자·숫자 20~31자, 전체 21~32자) 또는 uuid일 때만, 그 밖의 값은 키와 무관하게 검사. 연락처 필드 이름(`phone`·`email`·`messengerId` 등)은 meta 키로 쓰지 않는다. 목록 열람 `PII_VIEW`는 열람한 행 id 목록을 meta에 둘 수 있다. **3.1 dialog 닫기(X) 버튼 48px(`size-12`)** — 진입 `scale(.98)` 중에도 44px 이상. **3.5 ko 시간은 24시간제(`hourCycle: "h23"`, 예 18:58), 실행 환경 ICU/CLDR에 의존하지 않음**(Q-26, 구현 P2d 선행). 1.1 면접 상태 `면접 종료`(Q-25 종료, 구직자·기업 같은 말) 행 추가 |
| 2.20 | 2026-11-18 | P2d run 1 검토(qa/phase-P2d-standard-run-1.md), 빌더 요청 3건 | 기준 공백 보완(산출물 판정 변화 없음): **4.5 공개 예외에 "아직 구직 중" 원클릭 응답(서명 토큰, R-213)** 추가와 조건(토큰이 유일한 권한, 페이지 열람은 상태 변경 없음, noindex). **4.8 `RULE_PUBLISH`에 게시(`meta.change: "PUBLISH"`, 같은 묶음 이전 게시 버전 자동 폐기는 `retiredIds`)와 폐기(`"RETIRE"`)를 함께 기록**, 초안 생성·수정·새 버전은 감사 대상 아님. 4.2 트리에 P2d 파일(`i18n/dateTime.ts`, `lib/rules/`, `lib/jobs/` R-213 핸들러, `lib/notifications/{render,smtp}`, `lib/seeker/stillSearching`, `components/admin/{rule-forms,rule-badges}`, `components/seeker/still-searching-*`, `schemas/admin/rules`, `server/actions/{admin/rules,seeker/stillSearching}`, `tests/e2e/support/p2dDb`). 3.5 Q-26 공통 함수 위치 `src/i18n/dateTime.ts` 명시. 3.6 이메일 템플릿 키 `common.{주제}.email.{subject,body}` |
| 2.21 | 2026-11-19 | P2d run 2 검토(qa/phase-P2d-standard-run-2.md), DECISIONS Q-27 | 기준 명문화(산출물 판정 변화 없음): **5절 알림 전달 결과 `delivery` = REAL / SIMULATED / FAILED, "구직자가 메시지를 받았다"에 기대는 상태 전이(14일 무응답 INACTIVE·S→A)는 REAL에만 적용**, 실제 채널이 없으면 워커 시작 경고 로그. 4.7 콘솔 어댑터 params의 링크는 `NODE_ENV`와 무관하게 항상 `maskLink`, 작업 핸들러·알림 모듈의 주입 가능한 기본 로거(`options.log ?? console.info`)는 S-45 열람 대상으로 허용(건수·코드만). 1.1 관리자 화면 상태 확인 표시 "발송"(REAL) / "기록만(실제 채널 미전달)"(SIMULATED). 3.5 H-3 관리자 수 단위 글자에 `점`(점수) 추가(run 1 D-1 수정 지시의 기준화) |
| 2.22 | 2026-11-19 | P2e run 1 검토(qa/phase-P2e-standard-run-1.md), DECISIONS Q-28 | **2.7 Reveal 계약 6항 신설(Q-28): 첫 화면 LCP 후보(메인 히어로 H1·리드 문단)는 reveal 진입 애니메이션 대상에서 제외**(처음부터 최종 위치, `js-reveal` 아래에서도 transform 없음), 다른 요소·섹션의 reveal은 유지. S-62 확인 방법에 이 조건 추가(산출물 영향: `components/home/hero.tsx` H1·리드 `<p>`의 `reveal` — P2e run 2 구현 대상). 기준 공백 보완(판정 변화 없음): 4.7 `maskLink`가 문장 안의 링크도 가림(P2d O-1 수정 dca582b의 기준화), 주입 가능한 기본 로거는 `level: "warn"` 줄을 `console.warn`으로 보낼 수 있음(`lib/jobs/statusCheck.ts`·`lib/notifications/smtp.ts`·`scripts/worker.ts`). 4.10 교차 테스트의 PRD 태그에 비기능 번호 `N-xx` 포함(예 `tests/unit/lib/auditCoverage.test.ts` N-05). 4.2 트리에 `scripts/lighthouse.ts`, `src/i18n/(navigation.ts, locales.ts)`, `tests/e2e/support/integrationDb` 기재 |
| 2.23 | 2026-11-19 | P2e run 2 검토(qa/phase-P2e-standard-run-2.md) | 구현(dc4cf0f·c28b8de)으로 드러난 기준 공백 보완. **3.1 tabs: 좁은 폭 라벨 줄바꿈 허용([HO→보정], HO `.aud__tab` `white-space: nowrap` 미채택) — 트랙은 컨테이너를 넘지 않고, 탭이 줄어들며 라벨은 **단어 사이에서만** 두 줄로, 높이 `min-h-11`, 줄간격 `leading-tight` 허용, 좌우 패딩 <640px 12px(`px-3`, HO ≤760px 12px)·≥640px 16px, 글자 13px 유지(HO 모바일 12px 미채택). 단어 중간 분리 금지(2.3 `overflow-wrap: anywhere`의 탭 라벨 예외)**(산출물 영향: en·uz 375px 탭 라벨 단어 분리 — run 2 R2-1). 3.1 button: 긴 번역 라벨 줄바꿈 변형(`h-auto min-h-{크기 높이} whitespace-normal text-center` + 세로 패딩 `py-2`/`py-3`, 기존 final-cta·demand-actions·next-actions 선례). 2.6·S-07: 375px 확인에 '조작 요소가 뷰포트 밖으로 잘리지 않음' 추가(`html`·`body` `overflow-x: clip`이라 `scrollWidth`만으로는 넘침이 안 보임). 4.7 `maskLink` 대상에 스킴 없는 `www.` 링크 추가(가리는 범위 확대) |
| 2.24 | 2026-11-19 | P2e run 3 검토(qa/phase-P2e-standard-run-3.md) | 기준 명문화(산출물 판정 변화 없음): 2.6·S-07 (1)의 `scrollWidth` 측정은 `html`·`body`의 `overflow-x: clip`을 측정 동안만 인라인 `visible`로 풀고 재고 바로 되돌리는 방식을 표준 측정으로 한다(구현 예 `mobile-375.spec.ts` `horizontalOverflow`, 51e0dfb). 3.1 tabs 단어 사이 줄바꿈의 구현 예: 트리거 `wrap-normal`(Tailwind 4 기본 유틸, `overflow-wrap: normal`) + 기본 `min-width: auto`(`min-w-0` 쓰지 않음) |
| 2.25 | 2026-11-19 | 통합 QA I-1 수정 검토(qa/integration-standard-run-1.md, 커밋 5e2ed93) | **세션 보안 기준 신설(4.11)**: JWT 세션은 `User.sessionVersion`(클레임 `sv`)으로 서버 측 무효화 — Node 쪽 JWT 콜백이 매 `auth()`마다 DB 값과 비교하고, 로그아웃(Auth.js `events.signOut`, 모든 로그아웃 경로)은 토큰의 `sv`가 현재 값일 때만 1 올린다(조건부 증가). **미들웨어는 라우팅 힌트만**: 쿠키를 읽기 전용으로 복호(`readSessionClaims`)하고 Auth.js 인스턴스·세션 Set-Cookie·Prisma를 쓰지 않으며, 접근 결정은 Node 쪽(`requireStaff`·`requireEmployer`·`requireSeeker`·`auth()`)의 DB 검사가 한다. `/admin/login`은 미들웨어가 항상 통과시키고 페이지가 DB로 판단(`hasVerifiedStaffSession`). **슬라이딩 만료 없음**: 세션 수명은 로그인 시각 기준 절대 만료이며 앱은 세션 쿠키를 재발급해 만료를 늘리지 않는다. 4.5에 위 규칙과 S-41 보충, 4.2 트리 설명 갱신(`authConfig.readSessionClaims`, `authCredentials` 세션 버전 함수, `admin/session.hasVerifiedStaffSession`, `middleware.ts`), 4.8에 로그인·로그아웃·세션 버전 증가는 감사 대상 아님, 점검표 S-73·S-74 신설. `sessionVersion`은 운영 카운터(개인정보 아님 — `…Enc`·감사·블라인드 화이트리스트 대상 아님) |

- 기준의 출처
  - **디자인(시각 언어)**: 디자인 핸드오프. `design_handoff_visanjob_homepage/README.md`(측정값·상호작용 명세), `reference/assets/css/tokens.css`·`site.css`·`site2.css`·`site3.css`, `reference/Design System.html`, `reference/index.html`, `reference/assets/js/app.js`·`data.js`. Q-05 "디자인만 기준 채택"(Q-03 대체).
  - **섹션·기능 범위, 업무 규칙**: `.workflow/PRD.md` v1.1, `docs/WORK_ORDER.md` v1.0(이하 WO), `.workflow/DECISIONS.md`(Q-01~05, PC-1~15, SC-01~12).
- 표기
  - **[HO]** = 핸드오프에서 본 값·규칙(파일에 있는 그대로).
  - **[HO→보정]** = 핸드오프 값이 WCAG AA 또는 PRD 요건(R-103 접근성 ≥90, N-04 등)에 미달해 이 기준서가 보정한 값. 핸드오프 원값을 함께 적는다(2.8절).
  - **[WO]** = WO·PRD·DECISIONS에 이미 정해진 규칙.
  - **[제안]** = 근거 문서와 핸드오프 어디에도 없어 이 기준서가 정한 값(예: 판정색). v1.0의 [제안] 중 핸드오프와 충돌하지 않는 것은 유지한다.
- 우선순위: WO §2(BR-01~15) > PRD·DECISIONS > 이 기준서([WO] > [HO→보정] > [HO] > [제안]). 핸드오프는 "모양"의 기준이며 **기능·섹션 범위·문구의 사실관계는 PRD가 정한다.** 핸드오프 요소가 BR·PRD와 부딪히면 7절 처리에 따른다.
- 핸드오프 자체 안의 불일치(아래)는 README 값을 우선한다(README가 "living specification"의 해설서이고 측정값을 명시하므로).
  - Display 크기: README·`site.css .hero h1` = `clamp(38px, 5.9vw, 80px)`/1.06/−0.042em ↔ `tokens.css .t-display` = `clamp(38px, 5.4vw, 74px)`/1.1/−0.035em → **README 값 채택**.
  - Reveal: `Design System.html` "620ms opacity + 780ms translateY" ↔ README "Opacity is never animated" → **README 채택**(opacity 애니메이션 금지).
  - 대비: `Design System.html`의 "#6B7280 on white 4.9:1", "white on #2F6BFF 3.6:1"은 실측(WCAG 2.x 상대 휘도)과 다르다. 실측 4.83:1, 4.50:1(정확히는 4.499:1). 이 기준서의 대비 값은 모두 실측값이다.

---

## 1. 공통

### 1.1 용어집 (같은 것을 같은 이름으로)

| 한국어 화면 용어 | 코드 식별자 | 규칙 |
|---|---|---|
| 구직자 | `SEEKER`, `SeekerProfile` | "외국인 근로자", "근로자", "지원자", "인재"(구직자를 가리킬 때)라고 쓰지 않는다. 핸드오프의 "근로자"는 "구직자"로 바꾼다 |
| 기업 (구인기업) | `EMPLOYER`, `Company` | 화면에서는 "기업". "고용주", "사장님", **"사업주"**(핸드오프 표기) 금지 |
| 협력 소개소 | `AGENCY` | Phase 0~2 범위 밖(포털 미구현). 핸드오프의 "지역 협력기관", "파트너"는 "협력 소개소"로 바꾼다 |
| 비자앤잡 / 운영자 | — | 구직자·기업 화면에서 연락 주체는 항상 "비자앤잡". 영문 워드마크 표기는 C-14 |
| 직원 / 담당자 | `STAFF_PLACEMENT`, `STAFF_VISA`, `ADMIN` | **"직원"은 관리자 화면 전용**. [v2.9, P-5] 기업 화면에서 운영자 측 사람을 가리킬 때는 **"비자앤잡 담당자"가 기본**이고, 같은 문맥에서 이미 "비자앤잡 담당자"를 쓴 뒤 반복할 때만 "담당자"를 허용한다(연락 주체가 비자앤잡임이 드러나야 함). 기업 폼의 기업 측 연락 담당자 입력 라벨("담당자 이름" 등)도 "담당자"로 쓴다. 기업 화면에서 "직원"·"비자앤잡 직원"은 쓰지 않는다. [v2.9, Q-13] 이 행의 규칙은 공개·기업·구직자 화면 전체에 적용한다. 단 법적 문서(약관·개인정보처리방침·동의서 본문, `legal.*`·`content/consents/**`)는 법률 용어("직원" 등) 사용을 허용하는 예외다 |
| 비자 | `visaCode` | 구직자·기업 화면은 "비자"(쉬운 말). 약관·동의서·법적 고지는 "체류자격" |
| 구직자 등급 B / A / S | `SeekerGrade` | 화면 표기 "B등급" 등. 관리자 화면에서는 반드시 "구직자 등급"/"리드 등급"으로 구분 |
| 리드 등급 C / B / A / 보관 / 재접촉금지 | `LeadGrade` | 관리자 화면 전용 |
| 트랙 | `SeekerTrack` (`JOB_MATCH`/`FUTURE_POOL`/`CONSULT_ONLY`) | 구직자 화면에 트랙 코드를 노출하지 않는다. 다음 행동 문구로만 표현 |
| 블라인드 공고 | `JobPosting` | "채용공고", "구인공고" 대신 "추천 일자리"(목록 제목) / "블라인드 공고"(관리자) |
| 수요 지도 | `/demand` | "채용 정보", "일자리 목록", "진행 중 공고"라고 부르지 않는다(BR-04) |
| 구인 의뢰 | `/employer/request` | 핸드오프의 "인력 요청", "견적 요청"은 "구인 의뢰"로 바꾼다 |
| 무료 채용 진단 | `/employer/diagnosis` | 기업용. "비자 진단"과 혼용 금지 |
| 면접 신청 | `InterestRequest(initiator=SEEKER)` | **구직자** 쪽 행동 |
| 면접 요청 | `InterestRequest(initiator=EMPLOYER)` | **기업** 쪽 행동. 두 용어를 바꿔 쓰지 않는다 |
| 추천 | `Recommendation` | 직원이 실행하는 원장 기록. 구직자 친구 추천은 "추천 코드"로 구분 |
| 추천 코드 | `referralCode` | — |
| 비자 진단 | `/visa-check`, `evaluate.ts` | 구직자·공개용 |
| E-7-4 점수 계산기 | `/score/e74`, `e74.ts` | — |
| 간편 등록 / 정식 등록 | `/seeker/register/quick`, `/seeker/register` | — |
| 상담 신청 | — | 모든 "상담" CTA의 동사는 "상담 신청" |
| 동의 / 동의 철회 | `Consent`, `revokedAt` | "취소"가 아니라 "철회" |
| 이름 / 실명 | `legalName`(`legalNameEnc`) | [v2.18] 기업 화면의 면접 건별 이름 제공(PC-1, `employer.requests.*`)은 **"이름"**으로 쓴다(열 라벨 `interviews.name`, 안내 `nameNotice`, 상태 `nameState.*`가 같은 말). "실명"은 블라인드 정보와 대비해 설명하는 문장(블라인드 프로필 동의·후보 화면 안내·개인정보 고지 등)에서만 쓴다. 한 화면 블록 안에서 두 말을 섞지 않는다. 관리자 화면은 제한 없음 |
| 면접 종료 | `interviewEnded()`(`interviewDisclosure.ts`) = 취소 또는 최종 결과 기록 | [v2.19, Q-25] 끝난 면접 건의 상태 표시는 구직자(`seeker.me.interviewConsent.state.ENDED`)·기업(`employer.requests.interviews.status.ENDED`) 모두 **"면접 종료"**(아이콘 `CalendarX`, 배지 `neutral`). 판정은 `interviewEnded` 한 곳만 쓴다 |
| 판정 결과 | `Outcome` GREEN/YELLOW/RED | 화면 라벨은 3.4절 |
| 발송 / 기록만 | `SendResult.delivery` REAL / SIMULATED (`statusCheckDeliveredReal`) | [v2.21, Q-27] 관리자 화면 전용. 실제 채널로 전달된 알림은 "발송", 콘솔 어댑터로만 남은 알림은 "기록만(실제 채널 미전달)"으로 쓰고 "발송"이라고 쓰지 않는다. 기록만인 상태 확인은 "응답이 없어도 상태 유지"를 함께 적는다. 구직자·기업 화면에는 이 구분을 노출하지 않는다 |

### 1.2 금지 사항 (전 산출물 공통)

1. **직접 연락 수단 금지(BR-01) [WO]**: 구직자↔기업 간 채팅, 메시지, 연락처 열람, 이메일 전달, 외부 링크(메신저 딥링크 포함) 공유 UI·API·문구. 운영자(비자앤잡)에게 연락하는 수단은 허용하되 site.config 값이 있을 때만 표시(7절 K-01).
2. **기업 대상 구직자 데이터는 `BLIND_SEEKER_FIELDS` 외 필드 금지(BR-02) [WO]**. 사진·이름·이니셜·출생 연도·성별·학교명·자유 텍스트 노출 금지(WO §7.5). 구직자에 대한 `Avatar` 사용 금지. **공개 화면에 구직자 개별 프로필(익명 포함) 게시 금지**(BR-06·07, 7절 K-03).
3. **구직자 대상 공고·화면에 회사명·상세 주소·담당자·연락처·사업자번호 금지(BR-03) [WO]**. 고객사 이름·로고 나열(로고 마퀴 등)도 공개 화면에 두지 않는다(7절 K-05).
4. **법령 수치 하드코딩 금지(BR-12) [WO]**: 비자 요건·배점·허용 업종·비자→트랙 매핑·비자 설명 문구(법적 내용)를 `src/`·messages에 임의로 넣지 않는다(검사 4.9절).
5. **주민·외국인등록번호·여권번호 필드·입력란 금지(BR-13) [WO]**.
6. **LLM으로 판정 생성 금지(BR-11) [WO]**.
7. **schema.org `JobPosting` 금지 [WO §13]**. 핸드오프 README 체크리스트의 "JobPosting structured data for listings"는 따르지 않는다.
8. **지어낸 숫자 금지(PC-7) [WO]**: 실적·규모·기간·비율·건수 등 사실 주장 숫자는 site.config 운영자 입력값 또는 DB 집계만. 핸드오프의 예시 숫자(12,480명, 1,240개, 94.2%, 5.8주, 428개 등)는 하나도 옮기지 않는다.
9. 금지 표현은 3.5절.
10. 비밀값 커밋 금지. `.env`는 git 제외, `.env.example`만 커밋(N-06) [WO].

---

## 2. 디자인 토큰 [HO]

### 2.1 색

- 값의 기준은 **hex**(핸드오프 `tokens.css` 변수명 그대로). 대비는 WCAG 2.x 상대 휘도 실측값.
- 다크 모드: Phase 0~2 범위에서 구현하지 않는다. 핸드오프의 어두운 섹션(히어로·실적·지도·최종 CTA·푸터)은 "다크 모드"가 아니라 **라이트 테마 안의 어두운 면**이다.
- 사용 비율 [HO]: 중립 70%, 남색 20%, 파랑→시안 8%, 오렌지 2%. **오렌지는 구직자(핸드오프: worker/partner) 쪽 CTA 전용 — 기업 주 행동에 쓰지 않는다** [HO].

**2.1.1 원본 토큰 (`src/app/globals.css` `:root`, 이름은 핸드오프 그대로)**

| 변수 | hex | 용도 [HO] | 흰 배경 대비 / 비고 |
|---|---|---|---|
| `--navy` | #0B1B3F | 제목·주 텍스트, 어두운 면, 기업 CTA(ink 버튼) | 16.90:1 |
| `--navy-deep` | #06122B | 실적 섹션 등 어두운 섹션 | — |
| `--navy-soft` | #122A5C | ink 버튼 hover | — |
| `--navy-ink` | #0A1836 | 내비 배경 변형 | — |
| `--blue` | #2F6BFF | 강조, 포커스 링, 그라디언트 시작 | 4.50:1(4.499) — **텍스트 금지, 2.8 B-03** |
| `--blue-600` | #245AE0 | 파랑 pressed, **파랑 텍스트·링크** [HO→보정] | 5.81:1 |
| `--blue-700` | #1F4FC4 | 파랑 배지 글자, 단계 칩 글자 [HO: `.badge--blue` 글자색] | 7.06:1 |
| `--cyan` | #22D3EE | 그라디언트 끝, 어두운 면의 지표 접미사·실시간 표시 | 1.81:1 — **흰 배경 텍스트 금지** |
| `--cyan-ink` | #0D7285 | 시안 배지 글자 [HO: `.badge--cyan` 글자색] | 5.09:1(시안 틴트 위) |
| `--orange` | #FF8A3D | 구직자 CTA 배경 전용 | 텍스트 금지(2.35:1) |
| `--orange-hover` | #FF9A56 | 오렌지 버튼 hover [HO `.btn--orange:hover`] | `--orange-ink` 위 7.85:1 |
| `--orange-ink` | #351703 | 오렌지 위 글자 | 오렌지 위 7.02:1 |
| `--orange-text` | #A84B0D | 오렌지 배지 글자 [HO: `.badge--orange` 글자색] | 5.09:1(오렌지 틴트 위) |
| `--n50` | #F7F8FA | 섹션 배경 | — |
| `--n100` | #F1F3F6 | 표 간격, hover 배경, 탭 트랙 | — |
| `--n200` | #E5E7EB | 테두리·구분선(장식, 정보 전달 금지) | 1.24:1 (비정보) |
| `--n400` | #9AA2AF | **장식 전용**(구분 점, 비활성 아이콘) | 2.57:1 — **텍스트 금지, 2.8 B-01** |
| `--n500` | #6B7280 | 본문·보조 문구 | 흰 4.83, n50 4.55, **n100 위 4.35(금지)** |
| `--n700` | #3F4859 | 밀도 높은 본문·목록·라벨 | 9.20:1 |
| `--ink` | #111827 | 기본 텍스트 | 17.74:1 |
| `--white` | #FFFFFF | 표면 | — |
| `--error` | #DC2626 | 입력 오류 테두리 [HO: Design System Inputs/Error] | 4.83:1 |
| `--error-text` | #B91C1C | 오류 문구 [HO: Design System `field__hint` 오류] | 6.47:1 |

**2.1.2 틴트(불투명 hex로 고정)** — 밝은 면의 반투명 틴트는 흰 배경 위 합성 hex로 고정해 대비를 예측 가능하게 한다.

| 변수 | hex | 핸드오프 원 표기 | 위 글자 / 대비 |
|---|---|---|---|
| `--tint-blue` | #EAF0FF | `rgba(47,107,255,0.10)` (`.badge--blue`, 비자 코드 칩) | `--blue-700` 6.19:1 |
| `--tint-blue-soft` | #EEF3FF | `rgba(47,107,255,0.08)` (언어 메뉴 선택 행) | `--blue-700` 6.36:1 |
| `--tint-cyan` | #E0F9FD | `rgba(34,211,238,0.14)` (`.badge--cyan`) | `--cyan-ink` 5.09:1 |
| `--tint-orange` | #FFEFE4 | `rgba(255,138,61,0.14)` (`.badge--orange`) | `--orange-text` 5.09:1 |

**2.1.3 그라디언트**

| 변수 | 값 | 용도 |
|---|---|---|
| `--grad` [HO] | `linear-gradient(100deg, #2F6BFF 0%, #22D3EE 100%)` | **비텍스트 전용**: 진행 막대, 레일, 로고, 장식, 포커스 외 강조선. 흰 글자를 올리지 않는다 |
| `--grad-cta` [HO→보정] | `linear-gradient(100deg, #245AE0 0%, #0E7490 100%)` | 흰 글자를 올리는 브랜드 CTA 버튼 배경(핸드오프 `.btn--primary`). 흰 글자 대비 양 끝 5.81 / 5.36:1. 2.8 B-02 |
| `--grad-text` [HO] | `linear-gradient(96deg, #7EA6FF 0%, #22D3EE 58%, #A8F0FB 100%)` | 어두운 면 위 제목 강조 구(`background-clip:text`). 밝은 면 금지 |
| `--grad-soft` [HO] | `linear-gradient(135deg, rgba(47,107,255,.12), rgba(34,211,238,.12))` | 장식 배경 |

- 섹션 전용 어두운 바탕 [HO]: 히어로 #050D24, 지도 #071531, 최종 CTA #050D22, 푸터 #040A1A, 비자 패널 `linear-gradient(165deg,#0b1b3f,#071531)`. 토큰이 아니라 `src/app/brand.css`의 `.vj-surface-*` 레시피로만 둔다(2.1.5 대비 규칙은 #050D24와 동일하게 적용).

**2.1.4 판정·상태 색 [제안, v1.0 유지]** — 핸드오프에 없는 기능 색. AA 실측 통과 값 유지.

| 변수 | hex | 용도 | 대비 |
|---|---|---|---|
| `--success` / `-foreground` | #15803D / #FFFFFF | GREEN 아이콘·테두리, 성공 토스트 | 5.02:1 |
| `--success-subtle` / `-foreground` | #F0FDF4 / #166534 | GREEN 카드 | 6.81:1 |
| `--warning` | #A16207 | YELLOW 아이콘·테두리 | 4.92:1 |
| `--warning-subtle` / `-foreground` | #FEFCE8 / #854D0E | YELLOW 카드 | 6.62:1 |
| `--danger` | #B91C1C (= `--error-text`) | RED 아이콘·테두리 | 6.47:1 |
| `--danger-subtle` / `-foreground` | #FEF2F2 / #991B1B | RED 카드 | 7.60:1 |

- v1.0의 `--review`, `--blind`, `--grade-*`는 폐지하고 핸드오프 배지 틴트(2.1.2)로 대체한다(3.2절 표).
- 판정색은 판정 결과·리드 상태 표시 외에 쓰지 않는다. 노랑(`--warning`)은 판정 YELLOW 전용.
- 색만으로 정보를 전달하지 않는다: 판정·등급·공개 여부는 항상 **아이콘 + 글자** 동반.
- **하드코딩 색 금지**: 컴포넌트·페이지에서 `#hex`, `rgb(`/`rgba(`, Tailwind 기본 팔레트 유틸(`text-red-600` 등) 사용 금지. 토큰 유틸과 투명도 수식어(`text-white/60`, `bg-navy/10`, `border-white/15`)만 쓴다. 예외 파일: `src/app/globals.css`, `src/app/brand.css`(3.8절 장식 레시피).

**2.1.5 어두운 면 위 텍스트 [HO→보정]**: 단색 어두운 면(`--navy-deep`, `--navy`, 히어로 바탕 #050D24 등 3.8의 섹션 바탕) 위 글자는 **최소 `white/50`**(navy-deep 위 5.29:1) — 핸드오프의 `0.5`·`0.55`·`0.58`·`0.62`·`0.66`은 그대로 허용. 핸드오프의 `0.42`·`0.45`·`0.32`·`0.34` 글자는 **`white/60`**(7.09:1)으로 올린다(2.8 B-04, 라디얼 워시로 밝아지는 부분 여유 포함). 그라디언트·아트(대상 카드 아트, 히어로 필름 플레이트의 밝은 영역) 위 글자는 **`white/72` 이상**.

### 2.2 Tailwind 4 + shadcn 변수 대응표

구조: `:root`에 2.1의 원본 토큰(핸드오프 이름) → shadcn 의미 변수는 원본을 참조 → `@theme inline`에서 Tailwind 유틸 이름으로 노출. Tailwind 기본 팔레트 이름(`blue-600` 등)과 겹치지 않게 브랜드 색은 `brand-`, 중립은 `n` 접두를 쓴다.

**2.2.1 shadcn 의미 변수 (`:root`)**

| shadcn 변수 | 값 | 핸드오프 근거 | 대비 |
|---|---|---|---|
| `--background` | `var(--white)` | body 배경 | — |
| `--foreground` | `var(--ink)` | body 글자 #111827 | 17.74:1 |
| `--card` / `--card-foreground` | `var(--white)` / `var(--ink)` | `.card` | 17.74:1 |
| `--popover` / `--popover-foreground` | `var(--white)` / `var(--navy)` | `.lang__menu` | 16.90:1 |
| `--primary` / `--primary-foreground` | `var(--navy)` / `var(--white)` | `.btn--ink`("기업 CTA", README 토큰표) | 16.90:1 |
| `--secondary` / `--secondary-foreground` | `var(--n100)` / `var(--navy)` | `.aud__tabs` 트랙, `.badge` 중립 | 15.20:1 |
| `--muted` / `--muted-foreground` | `var(--n50)` / `var(--n500)` | 섹션 배경 / 본문 | n50 위 4.55, 흰 4.83 |
| `--accent` / `--accent-foreground` | `var(--tint-blue-soft)` / `var(--blue-700)` | `.lang__item[aria-checked]` [HO→보정: 원 글자 #2F6BFF 4.05:1] | 6.36:1 |
| `--destructive` / `--destructive-foreground` | `var(--error-text)` / `var(--white)` | 입력 오류 | 6.47:1 |
| `--border` | `var(--n200)` | 모든 카드·구분선 | 비정보 |
| `--input` | **#868E9C** [HO→보정, 원값 `--n200`] | 입력·체크박스·라디오 테두리(WCAG 1.4.11 3:1) | 3.30:1 |
| `--ring` | `var(--blue)` | `:focus-visible` outline | 흰 4.50, navy 3.76(비텍스트 3:1 충족) |
| `--radius` | `16px` | `--r-md` 카드 | — |

**2.2.2 `@theme inline` 노출 (유틸 이름)**

| Tailwind 테마 변수 | 참조 | 유틸 예 |
|---|---|---|
| `--color-background` … `--color-ring` | 2.2.1 shadcn 변수 | `bg-primary`, `text-muted-foreground`, `border-input`, `ring-ring` |
| `--color-navy`, `--color-navy-deep`, `--color-navy-soft`, `--color-navy-ink` | `--navy*` | `bg-navy-deep`, `text-navy` |
| `--color-brand-blue`, `--color-brand-blue-600`, `--color-brand-blue-700` | `--blue`, `--blue-600`, `--blue-700` | `text-brand-blue-600`, `bg-brand-blue` |
| `--color-brand-cyan`, `--color-brand-cyan-ink` | `--cyan`, `--cyan-ink` | `text-brand-cyan`(어두운 면만) |
| `--color-brand-orange`, `--color-brand-orange-hover`(v2.1), `--color-brand-orange-ink`, `--color-brand-orange-text` | `--orange*` | `bg-brand-orange text-brand-orange-ink hover:bg-brand-orange-hover` |
| `--color-n50`, `--color-n100`, `--color-n200`, `--color-n400`, `--color-n500`, `--color-n700` | `--n*` | `bg-n50`, `text-n700` |
| `--color-ink`, `--color-white` | `--ink`, `--white` | `text-ink`, `text-white/60` |
| `--color-tint-blue`, `--color-tint-blue-soft`, `--color-tint-cyan`, `--color-tint-orange` | 2.1.2 | `bg-tint-blue` |
| `--color-error`, `--color-error-text` | `--error*` | `border-error` |
| `--color-success*`, `--color-warning*`, `--color-danger*` | 2.1.4 | `bg-success-subtle` |
| `--font-sans` | `var(--app-font-sans)` (2.3 로케일별) | `font-sans` |
| `--radius-2xs` 4px · `--radius-xs` 8px · `--radius-sm` 10px · `--radius-md` 16px · `--radius-lg` 22px · `--radius-xl` 28px | `--r-xs`…`--r-xl` (+ 4px는 핸드오프 `:focus-visible`·`.skip-link` 반경) | `rounded-md`(카드), `rounded-full`(버튼·배지 = `--r-pill`) |
| `--shadow-1`, `--shadow-2`, `--shadow-3`, `--shadow-glow` | 2.5 | `shadow-1` |
| `--ease-out`, `--ease-standard` | 2.7 | `ease-out`, `ease-standard` |
| `--blur-glass` 14px (v2.1) | 3.1 `glass` 버튼 [HO backdrop blur 14px], dialog 스크림(v2.7 명시) | `backdrop-blur-glass` |
| `--blur-nav` 22px (v2.7) | 3.2 SiteNav 스크롤 상태·WizardProgress 바·위저드 하단 버튼 바 [HO 내비 blur 22px] | `backdrop-blur-nav` (+ `backdrop-saturate-160`) |
| `--translate-dialog` 18px (v2.8) | 3.1 dialog 콘텐츠 진입 `translateY(18px)` [HO `.modal`]. tw-animate `--value(--translate-*)` 경로 | `data-[state=open]:slide-in-from-bottom-dialog` |
| `--spacing-wizard-bar` 96px (v2.8, [제안]) | 3.3 위저드 sticky 하단 바 높이(약 77px) + 여유. 바가 있는 화면에서 `:root:has([data-sticky-bottom-bar]) { scroll-padding-bottom: var(--spacing-wizard-bar) }`(`globals.css` base) | 유틸로 직접 쓰지 않음(변수 참조) |
| `--spacing-section`, `--spacing-section-tight`, `--spacing-gutter` | 2.4 | `py-section`, `px-gutter` |
| `--container-site` 1320px | `--maxw` | `max-w-site` |
| `--breakpoint-*` | 2.6 | `md:`, `lg:`, `xl:` |
| `--text-*` | 2.3.4 | `text-h2`, `text-eyebrow` |

- 권장: `@theme`에 `--color-*: initial;`을 먼저 두어 Tailwind 기본 팔레트를 제거(필요 시 `--color-black`만 재정의). 하지 않더라도 S-02 검사는 적용된다.
- 현재 `globals.css`의 `--radius-sm/md/lg/xl: calc(var(--radius) ± n)` 파생식은 폐지하고 위 고정값으로 바꾼다.

### 2.3 글꼴

**2.3.1 글꼴 선택 [HO + 다국어 보완]**

- 핸드오프: 한국어 **Pretendard Variable**, 라틴 **Inter 400/500/600/700**, 다국어 폴백 Noto Sans 계열 [HO README Typography, Design System Foundation 메모].
- **[v2.4] SC-11 적용**: P1a Lighthouse에서 Pretendard로 /ko 모바일 성능 58~81(R-103 ≥85 미달)이 측정되어 한국어 글꼴을 **Noto Sans KR**로 교체했다(사전 승인 SC-11). 아래 표·스택의 "Pretendard"는 모두 Noto Sans KR로 읽는다.
- 6개 로케일 지원 판단:

| 로케일 | 필요한 글리프 | 판단 |
|---|---|---|
| ko | 한글, 라틴 | Pretendard(한글) + 라틴(Pretendard의 라틴은 Inter 기반) |
| en | 라틴 | Inter |
| vi | 라틴 확장 + 성조 겹문자(U+1EA0–1EF9 등) | **Inter**: Google Fonts `vietnamese` 서브셋 제공. Pretendard 단독 커버 여부는 이 저장소에서 검증 불가(폰트 파일 없음) → 1순위에서 제외. 핸드오프도 "Vietnamese use the Latin stack with extended diacritics"라고 적음 |
| ru | 키릴 | **Inter**: `cyrillic`·`cyrillic-ext` 서브셋 제공 |
| uz | 라틴 + `oʻ`·`gʻ`(U+02BB) (SC-09 라틴) | **Inter**: Google Fonts `latin` 서브셋 범위에 U+02BB 포함 |
| zh | 간체 한자 | 핸드오프 글꼴 모두 미지원 → **Noto Sans SC** 추가. Pretendard가 가진 한자(한국식 자형)가 섞이지 않도록 Noto Sans SC를 Pretendard보다 앞에 둔다 |

- 2차 언어(th, km, my, ne, mn, id 등)용 Noto Sans Thai/Khmer/Myanmar/Devanagari 폴백은 **범위 밖이라 로드하지 않는다**.

**2.3.2 폰트 스택 (`--app-font-sans`, `<html>`에 로케일별 className)**

| 로케일 | 스택 |
|---|---|
| ko | Noto Sans KR(v2.4, 원 Pretendard) → Inter → system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", "Segoe UI", Roboto, sans-serif |
| en | Inter → Noto Sans KR → (위 시스템 폴백) |
| vi, ru, uz | Inter → Noto Sans KR → (위 시스템 폴백) — 같은 단어 안에서 글꼴이 섞이지 않게 라틴·키릴을 Inter가 모두 처리 |
| zh | Noto Sans SC → Inter → **중국어 시스템 글꼴("PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC")** → Noto Sans KR → (위 시스템 폴백). [v2.4] Noto Sans SC가 아직 적용되지 않은 순간(지연 로드 전·JS 비활성)에도 한자가 한국어 글꼴(한국식 자형)로 그려지지 않아야 한다 |
| 관리자 `/admin` | ko 스택 |

- 본문 `font-feature-settings: "ss01" on, "cv11" on`, `-webkit-font-smoothing: antialiased` [HO].
- 숫자(지표·금액·점수·시간)는 `font-variant-numeric: tabular-nums`(`tabular-nums`) [HO `.t-mono`, `.metric__num`].

**2.3.3 로딩 방식 (next/font, 외부 CDN 금지)**

| 글꼴 | 방식 | 설정 |
|---|---|---|
| Pretendard | `next/font/local` | **[v2.1 정정]** 공식 패키지(`pretendard@1.3.9` `dist/web/static/woff2-subset/`)의 **정적 KS X 1001 서브셋 woff2 4굵기**(`Pretendard-{Regular,Medium,SemiBold,Bold}.subset.woff2` = 400/500/600/700, 합계 약 1.07MB) 자체 호스팅, 파일은 변형 없이 그대로 복사. `display: 'swap'`, `variable: '--font-pretendard'`, **`preload: false`**. 파일은 `src/fonts/`, OFL 라이선스(`OFL.txt`) 동봉. 사유: 공식 배포에 가변 서브셋 파일이 없고(가변은 전체본 또는 unicode-range 분할본뿐), next/font는 한 레이아웃에서 로케일별 preload를 나눌 수 없다. 2.3.4 밖 굵기(100·200·300·800·900) 추가 금지. 한국어 LCP 저하가 측정되면 SC-11(Noto Sans KR 교체) 또는 ko 전용 preload 수단을 검토 |
| **Noto Sans KR** (v2.4, SC-11) | `next/font/google` | `weight: 'variable'`, `display: 'swap'`, **`preload: false`**, `variable: '--font-noto-sans-kr'`. 위 Pretendard 행은 폐지. Pretendard 파일(`src/fonts/`)은 되돌림용으로 남겨도 되지만 어떤 코드도 import하지 않는다(지울 때 `OFL.txt`도 함께) |
| Inter | `next/font/google` | `subsets: ['latin','latin-ext','vietnamese','cyrillic','cyrillic-ext']`, `weight: ['400','500','600','700']`, `display: 'swap'`, `variable: '--font-inter'`, [v2.4] `preload: false` 허용(5개 서브셋 preload가 첫 페인트와 경쟁, R-103) |
| Noto Sans SC | `next/font/google` | `weight: 'variable'`(v2.4, 600 포함) 또는 `['400','500','600','700']`, `display: 'swap'`, `preload: false`, `variable: '--font-noto-sans-sc'`. **zh 로케일에만 className 적용**. [v2.4] 선언은 `src/lib/fontsZh.ts`에 따로 두고 zh 페이지에서만 동적 import로 붙여도 된다(루트 레이아웃이 import한 글꼴의 `@font-face`가 모든 로케일의 렌더 차단 CSS에 들어가기 때문). 이때 2.3.2 zh 스택 조건을 지킨다 |

- **핸드오프의 CDN 로딩(jsDelivr `@import`, Google Fonts `<link>`/`@import`)은 따르지 않는다.** 핸드오프 README도 "self-host Pretendard as woff2 subsets"를 권장. `next/font/google`은 빌드 시 내려받아 자체 호스팅하므로 허용.
- v1.0의 Noto Sans(라틴·키릴·베트남어용)는 Inter로 대체되어 폐지.
- 글꼴 선언은 `src/lib/fonts.ts`(ko·라틴) + `src/lib/fontsZh.ts`(zh 전용, v2.4) 두 곳뿐, 적용은 `src/app/[locale]/layout.tsx`, `src/app/admin/layout.tsx`(zh 글꼴은 `components/common/zh-font*.tsx` 지연 로더).
- R-103 성능 미달 시 Pretendard → Noto Sans KR(`next/font/google`) 교체는 사전 승인됨(SC-11) — **v2.4에서 적용됨**.

**2.3.4 타입 스케일 [HO README Typography] → `@theme`의 `--text-*` (크기, `--line-height`, `--letter-spacing`, `--font-weight`)**

| 토큰 | 크기 | 굵기 | 줄간격 | 자간 | 용도 |
|---|---|---|---|---|---|
| `text-display` | `clamp(38px, 5.9vw, 80px)` (≤400px: 34px [HO]) | 700 | 1.06 | −0.042em | 메인 히어로 H1 1개 |
| `text-h1` | `clamp(32px, 4vw, 56px)` | 700 | 1.14 | −0.032em | 일반 페이지 제목(페이지당 1개) |
| `text-h2` | `clamp(27px, 3.2vw, 42px)` | 700 | 1.20 | −0.030em | 섹션 제목 |
| `text-h3` | `clamp(20px, 1.8vw, 27px)` | 600 | 1.35 | −0.022em | 카드·패널 제목, 위저드 질문 |
| `text-lead` | `clamp(16px, 1.25vw, 19px)` | 400 | 1.70 | −0.012em | 섹션 리드 |
| `text-body` | 17px (≤760px 16px) | 400 | 1.72 (body 기본 1.65) | — | 본문 |
| `text-control` (v2.1) | 16px | — | 1.5 | — | 입력란 글자(B-08), `lg` 버튼 글자(3.1 `lg` 16px) |
| `text-ui` | 15px | 600 | — | −0.012em | 버튼(기본) [HO `.btn`] |
| `text-dense` | 13.5px | 400 | 1.6 | — | 목록·패널 본문 [HO `.aud__list`] |
| `text-caption` | 13px | 400 | 1.50 | 0.01em | 캡션, **필수 고정 문구·고지·도움말·오류의 최소 크기** |
| `text-meta` | 12.5px | 500 | 1.5 | — | 칩·메타 [HO `.chip`, `.hero__badge`] |
| `text-label` | 12px | 600 | — | 0.02em | 컴팩트 폼 라벨 [HO `.field>label`] |
| `text-eyebrow` | 11.5px | 600 | — | 0.16em, 대문자 | 아이브로우·배지 [HO `.eyebrow`, `.badge`] — **허용 최소 크기** |
| `text-metric` | `clamp(34px, 3.6vw, 50px)` | 700 | 1.0 | −0.040em, tabular | 실적 지표 숫자 |

- **최소 글자 크기 11.5px**. 핸드오프의 10.5px·11px·9.5px·8.5px 텍스트(코드 칩, 메타 라벨, 지도 라벨 등)는 11.5px로 올린다(2.8 B-07). 11.5~12.5px는 장식성 라벨·코드·배지에만, 정보 문장(고지·도움말·오류·법정 표시·공개 여부 배지)은 **13px 이상**.
- **입력란 글자 16px 이상** [HO→보정, 원값 15px]: iOS 확대 방지(2.8 B-08).
- **한국어 조판 [HO]**: 한국어 문단은 `word-break: keep-all` + `text-wrap: pretty`. **단, `keep-all`은 `:lang(ko)`에만 적용**한다 — zh에 적용하면 한자 사이 줄바꿈이 막혀 넘친다. 라틴·베트남어·키릴 제목은 `text-wrap: balance`. 모든 로케일에 `overflow-wrap: anywhere`(긴 단어 넘침 방지).
- **베트남어 줄간격 [HO→보정]**: `:lang(vi)`에서 display·h1·h2 줄간격 최소 1.2(성조 겹문자 위아래 잘림 방지). 본문 줄간격은 1.5 이상(전 로케일).
- **다국어 여유 [HO]**: 텍스트 컨테이너에 고정 폭 금지, 가로 ~30% 여유. 배지·칩의 `white-space: nowrap`은 2단어 이하 라벨에만, 문장형 배지(DisclosureBadge 등)는 줄바꿈 허용.
- 아이브로우·영문 라벨(`CHOOSE YOUR PATH` 등)도 번역 키로 둔다. 대문자 변환(`uppercase`)은 라틴·키릴에만 효과가 있으며 zh·ko에서는 그대로 둔다.

### 2.4 간격·레이아웃 [HO]

- **간격 척도 8pt**: `--s1`…`--s11` = 4·8·12·16·24·32·40·56·72·96·128px → Tailwind `--spacing: 4px` 기준 배수 **1·2·3·4·6·8·10·14·18·24·32**(`p-1` … `p-32`). 블록 간 간격은 이 척도만.
- 컴포넌트 내부 치수는 핸드오프 측정값을 그대로 쓰되(예: 카드 패딩 26px, 칩 높이 34px), **Tailwind 4 배수 유틸로 표현**한다(`p-6.5`=26px, `gap-1.75`=7px). **대괄호 임의값(`p-[26px]`) 금지.** 측정값 출처가 핸드오프에 없는 비척도 값 금지.
- **[v2.1] 간격 외 대괄호 임의값**: 간격·반경·글자 크기·그림자·색에는 대괄호 임의값을 쓰지 않는다(S-02·S-05·S-06). 그 밖의 속성은 토큰 유틸이 없을 때 **이 기준서에 적힌 [HO] 측정값에 한해** 임의값을 허용한다 — 자간 `tracking-[0.04em]`(언어 알약, 3.2)·`tracking-[0.06em]`(워드마크, 3.2)·`tracking-[0.14em]`(로고 보조 라벨·푸터 열 제목, 3.2), 누름 `active:scale-[0.975]`(2.7·3.1), 전환 속성 목록 `transition-[..]`, ~~[v2.4] 내비 블러 `backdrop-blur-[22px]`~~(v2.7 삭제 → 토큰 `backdrop-blur-nav`, 2.2.2), 배지 자간 `tracking-[0.02em]`(3.1 badge), 열 비율 `grid-cols-[1.5fr_1fr_1fr_1fr_1.2fr]`(3.2 푸터)·`grid-cols-[1fr_1.22fr_0.8fr]`(3.7 #3 대상 패널). `data-[..]`·`aria-[..]` 변형자는 값이 아니므로 제한 없음. 기준서에 없는 값을 임의값으로 넣으려면 먼저 이 기준서에 추가한다.
- 컨테이너: `max-w-site`(1320px), 좌우 여백 `px-gutter` = `clamp(20px, 4.4vw, 64px)` (375px에서 20px).
- 섹션 세로 리듬: `py-section` = `clamp(64px, 8vw, 132px)`, 촘촘한 변형 `py-section-tight` = `clamp(48px, 5.5vw, 88px)`, ≤760px에서 56px [HO].
- 그리드: 12열, 간격 24px [HO].
- 콘텐츠 폭: 섹션 헤더 블록 720px [HO `.shead`], 법적 문서 본문 720px, 폼·위저드 576px(`max-w-xl`) [제안 유지 — 핸드오프에 위저드 없음].
- 위저드 문항 간 = 3.1 form 필드 간격 22px(`gap-5.5`) [v2.7, B-9: v2.6까지의 "24px"는 3.1과 충돌해 3.1로 통일], 섹션 간은 섹션 리듬.

### 2.5 반경·그림자 [HO]

- **반경**: `--radius-2xs` 4px(포커스 윤곽·체크박스 [HO `:focus-visible`]) · `--r-xs` 8px(칩·작은 타일) · `--r-sm` 10px(입력) · `--r-md` 16px(카드) · `--r-lg` 22px(패널·큰 카드) · `--r-xl` 28px(검색 카드 = 메인 진단 위젯) · `--r-pill` 999px(**모든 버튼·배지**). 그 외 반경 값 금지(핸드오프 측정값 15px 아이콘 타일·14px 메뉴·12px 행 등 예외는 해당 컴포넌트 규칙(3.2)에 적힌 것만).
- **그림자** (이 목록 외 금지, Tailwind 기본 `shadow-sm/md/lg/xl` 사용 금지):

| 토큰 | 값 | 용도 |
|---|---|---|
| `shadow-1` | `0 1px 2px rgba(11,27,63,.05), 0 10px 26px -14px rgba(11,27,63,.16)` | 쉬는 카드 |
| `shadow-2` | `0 2px 6px rgba(11,27,63,.06), 0 28px 60px -26px rgba(11,27,63,.30)` | hover 카드, 드롭다운·메뉴 |
| `shadow-3` | `0 40px 110px -40px rgba(11,27,63,.45)` | 다이얼로그·툴팁 |
| `shadow-glow` | `0 18px 44px -14px rgba(47,107,255,.55)` | 브랜드 CTA |
| `shadow-cta` | `0 12px 30px -12px rgba(47,107,255,.7)` | 브랜드 CTA 쉬는 상태 [HO `.btn--primary`] |
| `shadow-ink` | `0 12px 30px -14px rgba(11,27,63,.7)` | navy 버튼 [HO `.btn--ink`] |
| `shadow-orange` | `0 12px 32px -14px rgba(255,138,61,.8)` | 오렌지 버튼 [HO `.btn--orange`] |
| `shadow-tab` | `0 2px 8px rgba(11,27,63,.09)` | 선택된 세그먼트 탭 [HO `.aud__tab`] |

### 2.6 반응형 [HO 브레이크포인트 → 모바일 우선으로 변환]

- 핸드오프는 `max-width` 기준(1180 / 1024 / 760 / 400). Tailwind는 모바일 우선 `min-width`이므로 경계 다음 px에서 시작하도록 `@theme`에서 재정의한다:

| Tailwind | 값 | 핸드오프 경계 의미 |
|---|---|---|
| (기본) | 0–400 | ≤400: 비자 박스 2열, 히어로 H1 34px |
| `xs` | 401px (25.0625rem) | 401~760 |
| `sm` | 640px (Tailwind 기본 유지) | — |
| `md` | 761px (47.5625rem) | >760: 본문 17px, 다열 그리드 시작, 푸터 다열 |
| `lg` | 1025px (64.0625rem) | >1024: 내비 링크 표시(버거 숨김), 대상 카드 3열, 패널 다열 |
| `xl` | 1181px (73.8125rem) | >1180: 지표 5열, 내비 간격 확장 |

- 기준 폭 **375px**(N-04), 공개·구직자·기업 화면은 375px에서 **가로 스크롤 없음**. 확인 폭 375·390·768·1440 [HO 검증 폭 + N-04]. [v2.23] `html`·`body`가 `overflow-x: clip`이므로 문서 `scrollWidth`만으로는 넘침이 보이지 않는다. 375px 확인은 (1) `scrollWidth <= clientWidth`와 (2) **보이는 조작 요소(링크·버튼·탭·`role=button`·입력·`summary`)가 뷰포트 [0, 폭] 밖으로 잘리지 않음**을 함께 본다. [v2.24] (1)은 `html`·`body`의 `overflow-x: clip`을 측정 동안만 `visible`로 풀고 재며, 재고 나면 바로 되돌린다(구현 예 `horizontalOverflow`). 의도한 가로 스크롤 컨테이너(`overflow-x: auto/scroll`, 표 등) 안의 요소, 시각적으로 숨긴 요소(`sr-only`·1px), `aria-hidden`·`inert` 하위는 제외한다(구현 예 `tests/e2e/mobile-375.spec.ts` `clippedInteractive`).
- 표는 모바일에서 카드 목록으로 바꾸거나 표만 가로 스크롤 컨테이너에 넣는다.
- 관리자는 데스크톱 우선, 최소 지원 폭 1024px. [v2.10] 1024px 미만에서는 보드·표의 스크롤 컨테이너 안 가로 스크롤을 허용한다(S-07은 관리자 비적용).

### 2.7 모션 [HO]

- 이징: `--ease-out` = `cubic-bezier(0.16, 1, 0.3, 1)`(등장·들림), `--ease-standard`(핸드오프 `--ease`) = `cubic-bezier(0.22, 0.61, 0.36, 1)`(색·투명도). 기본 지속 `--dur` 0.45s.
- 시간: 등장(reveal) transform 780ms · 카드 들림 450–550ms(−6px, `shadow-2`) · 버튼 누름 `scale(0.975)` · 탭/패널 전환 ~450ms(패널 `translateY(8px)`→0, 500ms) · 형제 지연 60–80ms · 내비 높이/배경 0.4s.
- **Reveal 계약 [HO, 변경 금지]**:
  1. 콘텐츠의 `opacity`는 애니메이션하지 않는다. 기본 상태는 `opacity:1; transform:none`, JS가 `<html>`에 `js-reveal` 클래스를 붙인 뒤에만 미진입 요소에 `translateY(var(--reveal-y, 18px))`.
  2. 상태로 교체되는 패널(대상 패널, 결과 카드 등)의 `@keyframes`에 opacity 키프레임 금지(transform만).
  3. JS 비활성·실패 시에도 모든 콘텐츠가 보여야 한다.
  4. 진입 판정은 `getBoundingClientRect()` + `requestAnimationFrame` 스로틀(`rect.top < innerHeight*0.94 && rect.bottom > -40`). IntersectionObserver를 쓰지 않는다 [HO].
  5. 예외: 오버레이(다이얼로그·시트·드롭다운·툴팁)는 열고 닫을 때 opacity 전환 허용 [HO `.lang__menu`, `.modal` 동일].
  6. [v2.22, Q-28] **첫 화면 LCP 후보는 reveal 제외**: 메인 히어로의 제목(H1)과 리드 문단(부제 `<p>`)은 reveal 진입 애니메이션 대상이 아니다. `reveal` 클래스·`--reveal-y`·진입 지연(`transitionDelay`)을 붙이지 않으며, `<html>`에 `js-reveal`이 붙은 뒤에도 처음부터 최종 위치(`transform: none`)로 그린다(R-103 성능 ≥85, LCP 지연 방지). 히어로의 다른 요소(배지·버튼 줄 등)와 다른 섹션의 reveal은 이 계약 1~5대로 유지한다. 다른 페이지에 첫 화면 LCP 후보 텍스트가 새로 생기면 같은 규칙을 적용한다.
- **카운트업 [HO]**: SSR HTML에 **최종 값을 먼저 렌더**하고, 뷰포트 진입 시 1400ms·`1-(1-p)^3.2`로 0→목표 1회(`done` 플래그). 0이 쉬는 상태가 되면 안 된다. 숫자 포맷은 next-intl formatter(3.5절).
- **자석 효과 [HO]**: 브랜드 CTA(`data-magnetic`)에 한해 `pointermove`로 `dx/width*7px`, `dy/height*5-1px` 이동, `transform`만. 터치·reduced-motion에서 끔.
- **부드러운 앵커 [HO]**: 페이지 내 앵커는 `window.scrollTo({top: targetTop-70, behavior:'smooth'})` 또는 `html { scroll-padding-top: 70px }`. `scrollIntoView` 금지.
- **`prefers-reduced-motion: reduce` [HO]**: 모든 transition/animation 0.001ms, reveal은 최종 상태, 카운터는 즉시 값, 히어로 빔·글로·그레인·핑·대시 애니메이션 정지, 스크롤 연동 요소는 최종 상태, `scroll-behavior: auto`. 움직임만으로 정보를 전달하지 않는다.
- 관리자 화면: reveal·자석·장식 애니메이션 없음.

### 2.8 접근성 보정 목록 (R-103 접근성 ≥90, WCAG 2.1 AA) [HO→보정]

> 핸드오프 원값은 기록으로 남기고, 구현은 **보정안**을 따른다(PRD R-103 필수 요구가 디자인보다 우선). 시각 승인은 C-13.

| 번호 | 핸드오프 원값 (위치) | 실측 | 보정안 | 보정 후 |
|---|---|---|---|---|
| B-01 | `--n400` #9AA2AF 글자: 카드 번호 `01 / EMPLOYER`, `.field__hint`, 메타 라벨, `.tcard` 라벨, 플레이스홀더 (`site.css .acard__num`, `site2.css .field__hint`) | 흰 2.57, n50 2.42 | 글자에는 `--n500`(본문 보조) 또는 `--n700`. n400은 장식 전용 | 4.83 / 9.20 |
| B-02 | 흰 글자 + `--grad`(#2F6BFF→#22D3EE) 버튼 (`tokens.css .btn--primary`, 내비 CTA, 히어로 CTA) | 끝 4.50 / 1.81, 중간 ≈2.9 | 흰 글자를 올리는 버튼은 `--grad-cta`(#245AE0→#0E7490). `--grad`는 비텍스트 전용 | 5.81 / 5.36 |
| B-03 | `--blue` #2F6BFF 텍스트(링크, ghost hover, 비자 코드 칩 글자, 선택 행 글자) | 흰 4.499, 블루 8% 틴트 위 4.05 | 흰 바탕 파랑 글자는 `--blue-600`, 틴트 위 파랑 글자는 `--blue-700` | 5.81 / 6.19~6.36 |
| B-04 | 어두운 면 글자 `rgba(255,255,255,.42/.45/.32/.34)` (히어로 셀 라벨·태그, 라이선스 부문구, 지표 노트, 결과 카드 라벨) | navy-deep 위 4.07 / 4.49 / 2.86 / 3.08 | `white/60`(2.1.5). 단색 면 최소 `white/50`, 아트·그라디언트 위 `white/72` 이상 | 7.09 |
| B-05 | `--n500` 글자 on `--n100`(대상 탭 비선택 `.aud__tab`, 중립 배지 영역) | 4.35 | 비선택 탭 글자 `--n700` | 8.28 |
| B-06 | `--n500` 글자 on 구직자 섹션 블루 워시 #F2F6FF | 4.47 | `--n700` (핸드오프도 해당 리드 문단은 n700 사용) | 8.50 |
| B-07 | 10.5px·11px·9.5px·8.5px 텍스트(코드 칩, 지표 노트, 지도 라벨, 비자 박스 설명) | — (가독성) | 최소 11.5px, 정보 문장 13px 이상(2.3.4) | — |
| B-08 | 입력 글자 15px (`.input`, `.select`) | — (iOS 확대) | 16px | — |
| B-09 | 입력 테두리 `--n200` (`.input`, `.select`, `.chip`) | 1.24 (WCAG 1.4.11 3:1 미달) | `--input` #868E9C. hover `--n500` | 3.30 |
| B-10 | 언어 전환 버튼 38px, 세그먼트 탭 38px, 칩 34px, 버튼 sm 42px (`.lang__btn`, `.aud__tab`, `.chip`, `.btn--sm`) | — (터치 타깃) | [v2.10] **모든 화면(관리자 포함)·모든 폭에서** 터치 대상 **44px 이상**(CLAUDE.md 사용자 규칙 `h-11` 이상 우선). ~~≥1025px 핸드오프 높이 허용~~(v2.10 삭제) | — |
| B-11 | 오렌지 배경 흰 글자(FAB 배지 "1") | 2.35 | 오렌지 위 글자는 `--orange-ink`만(FAB 자체는 제외 섹션) | 7.02 |

- 유지(통과): `--navy`/`--ink` 텍스트, `--n500` 흰·n50 위, `--n700`, `--orange-ink` on `--orange`, 배지 3종 글자색(`#1F4FC4`, `#0D7285`, `#A84B0D`), `--grad-text`(#7EA6FF 이상) on navy-deep 7.78, `#7FF0FF` on navy-deep 14.0, 포커스 링 `--blue`(흰 4.50, navy 3.76 — 비텍스트 3:1 충족).
- 포커스 [HO]: `:focus-visible { outline: 2px solid var(--blue); outline-offset: 3px; }`, 입력 포커스는 테두리 `--blue` + `0 0 0 4px rgba(47,107,255,.13)` 글로. `outline-none`만 있고 대체 포커스 표시가 없는 경우 금지.
- 기타 [HO]: 건너뛰기 링크(`본문으로 바로가기`), 랜드마크, 페이지당 H1 1개, 대상 카드 `role="button"` + `aria-pressed` + Enter/Space, 탭 `role="tablist"`/`aria-selected`, 결과 영역 `aria-live="polite"`, 다이얼로그 포커스 트랩·`Esc`·닫을 때 트리거로 포커스 복귀, 지도 노드 키보드 포커스 + 텍스트 툴팁.

---

## 3. 컴포넌트·문구 규칙

### 3.1 shadcn/ui 사용 목록과 시각 규칙 (`src/components/ui/`)

shadcn 컴포넌트는 그대로 쓰되 클래스(cva variant)를 핸드오프 모양으로 바꾼다.

| 컴포넌트 | 사용처 | 핸드오프 모양 [HO] |
|---|---|---|
| button | 모든 버튼. 직접 `<button>` 스타일링 금지 | 전부 `rounded-full`. 크기 `sm` 44px(`h-11`, 16px 좌우, 13.5px — [v2.10] 핸드오프 42px를 모든 폭 44px로) · `default` 52px(24px, 15px/600) · `lg` 60px(30px, 16px). 모든 폭에서 최소 44px(B-10, v2.10). 아이콘 간격 10px, 화살표 hover `translateX(3px)`, 누름 `scale(.975)`, disabled `opacity .45`. [v2.23] **긴 번역 라벨 줄바꿈 변형**: 375px에서 라벨이 한 줄에 안 들어갈 수 있는 버튼(알약형 링크 포함)은 `h-auto min-h-{크기 높이}`(예 default `min-h-13`) `whitespace-normal text-center` + 세로 패딩 `py-2` 또는 `py-3`, 필요 시 `max-w-full`/`w-full`을 준다. 높이는 크기 높이 아래로 줄지 않고 모양(알약·색·그림자)은 그대로. 단어 중간 분리 금지는 tabs와 같다. **variant**: `default`=navy(`.btn--ink`, `shadow-ink`, hover `--navy-soft`) · `brand`=`--grad-cta` 흰 글자(`.btn--primary`, `shadow-cta`, 자석) · `seeker`=오렌지(`.btn--orange`, `--orange-ink` 글자, `shadow-orange`, hover `--orange-hover`) · `outline`=흰 바탕 `border-navy/16`(hover `/32`) · `glass`=어두운 면 전용(`bg-white/9 border-white/26 backdrop-blur 14px`) · `ghost`=navy 글자 hover `--blue-600` · `destructive`=`--destructive` |
| input, textarea, label | 입력 | 높이 48px, `rounded-sm`(10px), 좌우 14px, 16px/500 navy(B-08), 테두리 `--input`(B-09), hover `--n500`, 포커스 2.8절. 오류: 테두리 `--error` + `0 0 0 4px rgba(220,38,38,.1)`, 문구 `--error-text` 13px. 라벨: 컴팩트 폼 `text-label`(12px/600 `--n700`), 위저드 질문 라벨 `text-h3` |
| form (react-hook-form 연동) | 모든 폼 | 필드 간 22px, 필드 내부 7px [HO `.est__form`, `.field`] |
| select | 짧은 목록(≤10). 긴 목록은 native-select(v2.6, Q-09) | 트리거는 input과 동일 모양 + 오른쪽 14px `ChevronDown`(`--n500`). 메뉴는 dropdown-menu 모양 |
| native-select (v2.4, v2.6 확대) | **공개 페이지 폼**(비자 진단 위젯·`/visa-check`·수요 지도 필터 등 JS 없이 제출돼야 하는 GET/서버 액션 폼) + [v2.6, Q-09] **클라이언트 폼(react-hook-form 포함)의 긴 목록(>10)**(업종·시·도·국적 등). 목록 길이 제한 없음 | 네이티브 `<select>`에 select 트리거 모양만 적용(48px, `rounded-sm`, 좌 14px, `text-control`/500 navy, `--input` 테두리, hover `--n500`, 오른쪽 14px `ChevronDown` `--n500`, 포커스 2.8 입력 글로). 메뉴는 OS 기본 [HO: `index.html:602,617`, `Design System.html:298`의 `<select class="select">`] |
| radio-group | 단일 선택(예/아니오/모름 포함) | **칩형**: `rounded-full`, 높이 44px([v2.10] 핸드오프 34px를 모든 폭 44px로), 12.5px/500 `--n700`, 테두리 `--input`; 선택 시 navy 배경·흰 글자·`0 8px 18px -10px rgba(11,27,63,.6)` [HO `.chip[aria-pressed]`] — [v2.7, B-12] 이 그림자는 2.5 목록에 없으므로 구현은 `shadow-ink`로 대신한다. 글자는 13px(`text-caption`)도 허용. 선택지가 길면 행형(전체 행 클릭, 44px 이상, 왼쪽 20px 원형 표시) |
| checkbox | 다중 선택, 동의 | 20px 사각 `rounded-2xs`(4px), 테두리 `--input`, 체크 시 navy 배경 + 흰 `Check`. 라벨 포함 행 전체 클릭, 44px 이상. 다중 선택 칩은 radio 칩과 같은 모양(`aria-pressed`) |
| command, popover | [v2.6, Q-09] 현재 사용 안 함(`cmdk` 미승인). 국적·업종 등 긴 목록은 native-select. `cmdk`가 승인되면 검색 선택으로 다시 검토 | popover = dropdown-menu 모양 |
| card | 판정 결과, 공고, 후보, 정보 카드 | 흰 바탕, `--border` 1px, `rounded-md`(16px), `shadow-1`, 패딩 20~26px. 클릭 가능한 카드만 hover `translateY(-4~-6px)` + `shadow-2` + `border-brand-blue/30` [HO `.card`, `.tcard`, `.case`] |
| badge | 공개 여부·등급·검증·준비 중 | 높이 26px(문장형은 auto, 최소 26px), 좌우 11px, `rounded-full`, `text-eyebrow`(11.5px/600, 0.02em). variant: `neutral`(n100/n700) · `blue`(tint-blue/blue-700) · `cyan`(tint-cyan/cyan-ink) · `orange`(tint-orange/orange-text) · `outline`(투명/`--n200` 테두리/n500) · `dark`(어두운 면, `bg-white/10 text-white/86 border-white/14`) · `solid`(navy/흰). 점 5px `currentColor` 선택 [HO `.badge`] |
| alert | 고지 박스, 오류 안내 | NoticeBox 규칙(3.2) |
| progress | 위저드 진행률 | 트랙 5px `--n200` `rounded-[3px]` 대신 `rounded-full`, 채움 `--grad`, 너비 전환 0.6s `--ease-out` [HO `.est__bar-track`·`.range`] |
| dialog | 확인(동의 철회, 추천 실행 등). [v2.18, Q-14 취지] 되돌릴 수 없는 상태 전이(관리자 면접 취소, 리드 NO_INTENT 등)는 확인 dialog 필수, 그 확인 버튼은 `destructive`, 닫기는 `outline` | 스크림 `rgba(3,8,22,.86)`(구현 `bg-navy-deep/86`) + `blur(14px)`(`backdrop-blur-glass`, v2.7 명시), 0.35s 페이드. 셸 `rounded-[20px]` 대신 `rounded-lg`(22px), 흰 바탕, `shadow-3`, 진입 `translateY(18px) scale(.98)`→0 0.5s(v2.8 구현 `slide-in-from-bottom-dialog zoom-in-98 duration-500 ease-out`, 2.2.2 `--translate-dialog`). 닫기 버튼 hover `rotate(90deg)` [HO `.modal`]. [v2.19] 셸 오른쪽 위 닫기(X) 버튼은 48px(`size-12`, 아이콘 20px `size-5`, `rounded-full`): 셸이 `scale(.98)`로 들어오는 동안에도 터치 대상 44px 이상(3.3)을 지키기 위함. 44px(`size-11`)로 줄이지 않는다 |
| sheet | 모바일 메뉴 | 전체 화면 흰 오버레이, 상단 100px·좌우 gutter 패딩, 0.35s 페이드 + 12px 내려옴. 링크 22px/600(v2.4: 22px 토큰이 없으므로 `text-h3` 600 — <1025px에서 20~22px) + 오른쪽 11.5px 보조 라벨, 세로 18px, `--n200` 구분선. 하단: 전체 폭 CTA. 열리면 body 스크롤 잠금, `Esc`·링크 클릭·1025px 이상 리사이즈 시 닫힘 [HO `.drawer`] |
| dropdown-menu | 언어 전환 | 너비 236px, 패딩 8px, 흰 바탕, `--n200` 테두리, `rounded-[14px]` 대신 `rounded-md`(16px — 반경 척도 준수), `shadow-2`. 행 9px/11px 패딩, 13.5px, hover `--n50`, 선택 행 `--accent`/`--accent-foreground`/600 [HO `.lang__menu` + B-03] |
| tabs | 마이페이지, 관리자 상세, 대상 선택 탭 | **세그먼트형**: 트랙 `--n100` + `--n200` 테두리 + 4px 패딩 `rounded-full`, 탭 44px([v2.10] 핸드오프 38px를 모든 폭 44px로) 13px/600, 비선택 `--n700`(B-05), 선택 흰 바탕·navy·`shadow-tab` [HO `.aud__tabs`]. [v2.23, HO→보정] **좁은 폭에서 라벨 줄바꿈 허용**: HO의 `white-space: nowrap`은 따르지 않는다(6개 언어 375px). 탭 목록은 컨테이너 폭(`max-w-full`)을 넘지 않고 숨은 가로 스크롤을 두지 않는다. 라벨이 한 줄에 안 들어가면 탭이 줄어들고 라벨이 **단어 사이에서만** 줄바꿈된다(가운데 정렬, 줄간격 `leading-tight` 허용, 높이 `min-h-11` 이상). **한 단어 안에서 끊지 않는다** — 2.3의 `overflow-wrap: anywhere`는 탭 라벨에서 단어 하나가 탭이 가질 수 있는 최대 폭보다 길 때만 작동해야 한다(예 "Companie/s" 금지). 좌우 패딩 <640px 12px(`px-3`, HO ≤760px `.aud__tab` 12px)·≥640px 16px(`sm:px-4`). HO ≤760px의 12px 글자는 따르지 않고 13px(`text-caption`) 유지(`text-xs` 금지) |
| accordion | FAQ(가이드) | 행 18px 세로 패딩, `--n200` 1px 구분선, 제목 17px/600 navy, 내용 `text-dense` `--n700`. [v2.4] 공개 페이지 FAQ는 접지 않은 **펼친 목록**(`<dl>`, 같은 행 모양)도 허용 — 내용이 JS 없이 보이고 FAQPage JSON-LD 문구와 화면 문구가 같다 |
| table | 관리자 목록 | 헤더 `--n50` 배경 12px/600 `--n700`, 행 구분 `--n100`, 숫자 `tabular-nums` |
| separator, skeleton | 구분선, 로딩 | 구분선 `--n200`(어두운 면 `white/12`), 스켈레톤 `--n100` |
| sonner (toast) | 저장·제출 알림 | 흰 바탕, `rounded-md`, `--border`, `shadow-2`, 13.5px |
| tooltip | 데스크톱 보조 설명만 | 흰 97%, `rounded-md`, `shadow-3`, 13px, 최소 폭 196px, 하단 10px 꼬리. 필수 정보를 툴팁에만 두지 않는다 [HO `.map__tip`] |

- 위 표에서 "`rounded-[..]` 대신"이라고 쓴 곳은 핸드오프의 비척도 반경(14·20·3px)을 반경 척도의 가장 가까운 값으로 맞춘 것이다(임의값 금지 유지).
- **아이콘**: `lucide-react`만. 핸드오프 스프라이트(`i-arrow`, `i-globe`, `i-shield`…)는 lucide 대응 아이콘(`ArrowRight`, `Globe`, `ShieldCheck`, `Factory`, `Network`, `User`, `MessageCircle`, `FileText`, `Search`, `MapPin`, `Clock`, `Check`, `Handshake`, `Play`, `X`, `ChevronDown`)으로 바꾸고 **`strokeWidth={1.5}`**(체크 아이콘은 2 허용) [HO "keep the 1.5px stroke"]. 장식 아이콘은 `aria-hidden`.
- **로고**: 핸드오프 로고 마크(30×30 아치+다리 3개+시안 점, `--blue→--cyan` 그라디언트 선 2.2px)를 `components/common/logo.tsx` 인라인 SVG로 구현. 색은 `stop-color="var(--blue)"` 등 CSS 변수로(하드코딩 금지 준수). 워드마크 문자열은 C-14 결정 전까지 site.config 값.
- 사용 금지: `avatar`(BR-02), `calendar`(월 선택은 연·월 select 2개). [v2.7, B-11] WO가 유형을 "날짜"로 정한 문항(예 Step 5 `availableFrom`)은 네이티브 `<input type="date">`(input 모양 규칙 적용)를 허용한다. shadcn calendar는 계속 금지.
- [v2.7] 다중 선택 칩(`aria-pressed` 토글)은 checkbox 행의 칩 형태이므로 radio 칩과 같은 클래스(`chipClass`)를 쓴 `<button type="button">`을 허용한다(button 행 "직접 스타일링 금지"의 예외).
- 위 목록 밖 shadcn 컴포넌트 추가 시 이 기준서에 행을 추가한 뒤 사용한다.

### 3.2 프로젝트 공통 컴포넌트 (`src/components/` 하위, 이름 고정) — 핸드오프 시각 언어 적용

| 컴포넌트 | 위치 | 기능 규칙 [WO·제안 유지] | 시각 규칙 [HO 언어 적용] |
|---|---|---|---|
| `SiteNav` (신설) | `components/common/site-nav.tsx` | 로고, 주 메뉴(최대 6개, 3.7 표의 PRD 경로), `LocaleSwitcher`, 주 CTA 1개(C-17), 버거(<1025px) → sheet | 높이 76px, 스크롤 24px 초과 시 66px, ≤760px 64px. **메인(`/`)에서만** 히어로 위 투명·흰 글자, 스크롤 시 `bg-white/82 backdrop-blur(22px) saturate(160%)`(v2.7 구현 `bg-white/82 backdrop-blur-nav backdrop-saturate-160`) + navy 글자 + `border-navy/8` 하단선. 메인 외 페이지는 처음부터 스크롤 상태 모양. 링크 14.5px/500, 82% 불투명, 26px 간격, hover 1.5px 밑줄이 왼쪽부터 0.4s, 현재 페이지 `aria-current="page"` + 600 + 밑줄 [HO §1] |
| `SiteFooter` (신설) | `components/common/site-footer.tsx` | site.config: 행정사 사무소명·등록번호, 직업소개사업 등록번호, 대표자, 주소, 수수료표(`/fees`) 링크, 개인정보처리방침·이용약관 [WO §13, R-102]. 값 없는 항목은 숨김. 핸드오프 플레이스홀더 값(비전잡 주식회사, 000-00-00000, 제 2026-0000호, 02-1234-5678, 올림픽로 300) 사용 금지 | 바탕 #040A1A(`brand.css` `.vj-surface-footer`), 상단 64px, 13px 기본, 열 `1.5fr 1fr 1fr 1fr 1.2fr` 34px 간격(≤1024 3열, ≤760 2열), 열 제목 11.5px/700/0.14em, 링크 13px `white/66`, [v2.14] 등록 정보 행은 `<dt>` 라벨 위·`<dd>` 값 아래로 쌓음(`grid gap-0.5`, `registration-info`와 같은 형태), 하단 바 `border-white/9` + 22px, 저작권·법정 링크·6개 언어 바로가기 [HO §13] |
| `SectionHeader` (신설) | `components/common/section-header.tsx` | 아이브로우 + 제목(h2) + 리드, 선택적 오른쪽 액션 | 세로 18px 간격, 최대 720px, 아이브로우 `text-eyebrow` + 앞 22px 1px 선(55% 불투명), 제목 `text-h2` `text-wrap: balance`, 리드 `text-lead` `--n500`. 어두운 면: 아이브로우 `white/60`, 리드 `white/66`. 행형(`shead__row`)은 아래 정렬 space-between [HO `.shead`, `.eyebrow`] |
| `WizardProgress` | `components/seeker/wizard-progress.tsx` | 위저드 상단 고정. progress + 글자 "n/7 · 단계명"(SC-03: 분모 7, Step 0 제외) 동시 표시, `aria-valuenow/max`, "자동 저장됨" 상태 영역 | sticky 바: `bg-white/82 backdrop-blur-nav backdrop-saturate-160`(내비 스크롤 상태와 동일, v2.7), 내비 아래 붙음. 안쪽 폭은 위저드 본문과 같은 `max-w-xl`(2.4). 글자 13px/600 `--n700` + 단계명 navy, 막대 progress 규칙(5px, `--grad` 채움). 저장 상태는 `text-caption` `--n500` + `Check` |
| `DisclosureBadge` | `components/forms/disclosure-badge.tsx` | `variant: 'private' \| 'blind'`. 문구 [WO §7.1] 그대로 번역 키. SC-04: **필드별 아이콘** + 단계 하단 "블라인드 공개 / 비공개" **요약 목록** | private = `neutral` 배지 + `Lock`, blind = `blue` 배지 + `Eye`. 문장형이라 `text-caption`(13px) + 줄바꿈 허용. 필드 옆 아이콘은 14px `--n500`(private)/`--blue-700`(blind) + `sr-only` 글자. 요약 목록은 `--n50` 바탕 `rounded-sm` 박스, 두 그룹 각 `text-dense` |
| `OutcomeCard` | `components/visa/outcome-card.tsx` | GREEN/YELLOW/RED(3.4). **"참고용, 행정사 확인 필요" 문구를 끄는 prop 없음**. [v2.9, P-4] `visa`(1개) 또는 `visas`(여러 개): 무료 채용 진단(R-124)은 판정·문구가 같은 비자를 카드 한 장으로 묶고 ② 자리에 VisaLabel 목록(각 `showCode=isStatusCode`)을 둔다 | card 모양(`rounded-md`, `shadow-1`) + 판정 subtle 배경 + 판정색 1px 테두리. 상단 52×52 아이콘 타일(`rounded-[15px]` 대신 `rounded-md`, 흰 바탕, 판정색 아이콘 24px 1.5 stroke). 라벨 `text-h3`, 문구 `text-dense`, 참고 문구 `text-caption` 판정 subtle-foreground, 하단 "상담 신청" 버튼(`default`). 결과 교체 시 transform 등장만 |
| `ScoreResult` | `components/visa/score-result.tsx` | 총점·항목별 점수·부족 항목·참고 문구(R-127) | 총점 `text-metric` navy(밝은 면) tabular, 항목별 막대는 progress 모양(라벨 왼쪽 12px `--n700`, 값 오른쪽 600 navy) [HO `.est__bar` 밝은 면 변형], 부족 항목은 `--tint-orange` 배지. 참고 문구 `text-caption` |
| `ExpertReviewMark` | `components/legal/expert-review-mark.tsx` | "[전문가 검토 필요]". 법적 문서 제목 바로 아래. SC-08: 한국어 원문 + 번역 병기 | `orange` 배지 + `FileWarning`, `text-caption` |
| `NoticeBox` | `components/legal/notice-box.tsx` | 고지 문구 박스. `role="note"`, 접기·닫기 불가, 관련 데이터 **위** | `--n50` 바탕, `--n200` 1px 테두리, `rounded-sm`(10px), 패딩 12px 14px, `Info` 16px `--blue-600`, 글자 `text-dense` `--n700`(9.2:1), 강조어 navy 600 [HO Design System `.note`, 크기는 B-07로 13.5px]. 어두운 면 변형: `bg-white/5 border-white/16 text-white/72` |
| `GradeBadge` | `components/seeker/grade-badge.tsx` | B/A/S 글자 + 색. S는 `Star` + "우선 추천" | S = `solid`(navy/흰) + `Star`, A = `blue`, B = `outline`(테두리 `--input`, 글자 `--n700`) |
| `VerifiedBadge` | `components/jobs/verified-badge.tsx` | "검증 완료" + `BadgeCheck` | `cyan` 배지 + `BadgeCheck` [HO 라이선스 인장 색 계열] |
| `ComingSoon` | `components/common/coming-soon.tsx` | 플래그 off·미게시 시 "준비 중" + 설명 + "상담 신청"(SC-07: 200, noindex) | `--n50` 바탕 `rounded-lg` 패널, 52px 아이콘 타일 + `Clock`, 제목 `text-h3` navy, 설명 `text-dense` `--n500`, 버튼 `default` |
| `VisaLabel` | `components/visa/visa-label.tsx` | 비자 표시 유일 경로: `{코드} {쉬운 설명}`. [v2.7] 예외 ① 네이티브 `<option>`은 컴포넌트를 담을 수 없으므로 `{code} {t(nameKey)}` 문자열(VisaLabel과 같은 내용)을 허용하고, 선택 값을 화면에 다시 보일 때는 VisaLabel(B-2). ② 체류자격 코드가 아닌 `VisaType` 행(OTHER·NONE·UNKNOWN — "그 밖의 비자"·"비자 없음"·"모름")은 옵션·VisaLabel 모두 **코드 없이 이름만**. 판별은 코드 리터럴 목록이 아니라 `VisaType` 데이터(행 속성)로 한다(4.9-1)(B-3). ③ 세부 유형(`VisaType.subTypes`)은 쉬운 이름 키가 없으므로 **코드만** 표시를 허용하되 상위 비자 VisaLabel을 같은 화면에 함께 보인다. 세부 유형 설명 문구는 법령 내용이므로 임의로 쓰지 않는다(BR-12)(B-4) | 코드 칩: `text-eyebrow`(11.5px/700, 0.06em) `--blue-700` on `--tint-blue`, 3px/6px 패딩, 반경 `rounded-2xs`(4px, 핸드오프 5px를 척도로) — 칩 + 이름 9px 간격 [HO `.vchip .code`, B-03·B-07]. 어두운 면: `bg-white/14` + 글자 `text-brand-cyan`(핸드오프 #9FE9FF를 토큰으로) |
| `LocaleSwitcher` | `components/common/locale-switcher.tsx` | **6개 언어만**(ko, en, vi, ru, zh, uz), 각 언어를 그 언어 이름으로: 한국어, English, Tiếng Việt, Русский, 中文, Oʻzbekcha. 현재 경로 유지 | 알약 버튼: `Globe` + 대문자 코드(KO/EN/VI/RU/ZH/UZ) + `ChevronDown`, 13px/600 0.04em, 히어로 위 `border-white/22 bg-white/7`, 밝은 면 흰 바탕 `--n200` 테두리. 높이 44px([v2.10] B-10: 핸드오프 38px를 모든 폭 44px로). 메뉴는 dropdown-menu, 행 오른쪽 코드(11.5px, 50% 불투명 장식, `aria-hidden`) [HO §1 Language switcher] |
| `Logo` (신설) | `components/common/logo.tsx` | 3.1 로고 규칙 | 30×30 마크 + 워드마크 `text-body`(17px, ≤760 16px — v2.1)/700 0.06em, 보조 라벨 11.5px/500 0.14em 55% 불투명(≤760 숨김) |

- 표의 반경 표기 중 "A 대신 B"는 핸드오프 비척도 값을 척도로 맞춘 결정이다. 구현은 B만 쓴다.
- [v2.10, G-5] **관리자 화면 예외**: 관리자는 messages(next-intl)를 쓰지 않으므로(3.6) `VisaLabel`·`GradeBadge`를 쓰지 않아도 된다. 비자는 코드(세부 유형 포함) 글자로 표시하고 `VisaType.nameKo`가 있으면 병기할 수 있다. 구직자 등급은 "구직자 등급 B등급"처럼, 리드 등급은 "리드 등급 C"처럼 글자로 표시하며 1.1의 구분을 지킨다. 색만으로 상태를 전달하지 않는 규칙(S-09)은 그대로 적용한다.

### 3.3 상호작용·접근성 규칙

- **터치 타깃 44×44px 이상**: [v2.10] **모든 화면(공개·구직자·기업·관리자)·모든 폭**의 버튼, 링크 버튼(알약형 링크·언어 바로가기 포함), 탭, 칩, 라디오·체크박스 행(B-10). CLAUDE.md 사용자 규칙(`h-11` 이상)이 우선한다. v2.9까지의 "관리자 최소 32px"과 "≥1025px 핸드오프 높이 허용"은 삭제. 높이는 `h-11`/`min-h-11` 이상으로 주고 `lg:h-…`로 줄이지 않는다.
  - [v2.12, Q-16] 44×44는 **폭 포함**이며 대상에 텍스트 링크(헤더 내비·본문·푸터 링크)도 들어간다. 폭은 `min-w-11`(Button은 기본 클래스)로 상자에만 주고, 글자·밑줄 같은 시각 요소는 글자 폭을 유지한다. 그 결과 짧은 라벨 사이의 글자 간격이 핸드오프 간격(예: SiteNav 26px — 상자 사이 간격으로 적용)보다 넓어지는 것은 허용한다.
- **한 화면 문항 ≤7 [WO §7.1]**: 동시에 보이는 입력 문항 수(조건부 문항은 표시될 때 1개, 확인 체크박스 포함, `sido/sigungu` 2단 선택은 1개)가 7 이하. [v2.7, B-1] **문항 1개 = WO §7.3 표의 한 행**: 한 행 안의 종속 입력(`sido/sigungu`, `messengerType/messengerId`)은 1개, 반복 그룹(`experiences[]`)은 1개(행 수와 무관), 표에 따로 적힌 하위 행(`experiences[].employerName`)은 별도 1개. **Step 3·5는 각각 2개 하위 화면(3a/3b, 5a/5b)으로 나누고 단계 번호는 유지**(SC-01).
  - [v2.16, Q-24] WO §7.3 `major` 행("✔ (분야)")은 선택형 `majorField`(전공 분야, 블라인드)와 자유 입력 `major`(전공명, 비공개·직원 전용, BR-14) 두 문항으로 나눠 **각 1문항**으로 센다. Step 3a = `educationLevel`·`majorField`·`major`·`schoolName`·`graduationDate` 5문항.
- **"모름" 선택지 [WO §7.1, SC-02]**: 선택 문항·세부 유형·`shiftOk`에 "모름"(`UNKNOWN`). 필수 `visaCode`는 "모름/기타" 선택 시 등록 완료 대신 상담 신청 안내. `hasArc`·`needDormitory`는 예/아니오만. 성별은 "응답 안 함"(`NO_ANSWER`) 포함.
  - [v2.7, B-5, Q-10] "선택 문항" = **비필수** 문항. 적용 대상 열거(위저드 기준):
    - **'모름'(`UNKNOWN`) 있음**: `visaSubType`, `entryYear`, `pendingApplication`, `shiftOk`(필수지만 SC-02 명시), `desiredPayMin`, `nextVisaGoal`, [v2.16, Q-24] `majorField`(빈 선택 = 무응답, `UNKNOWN` = 모름, 둘 다 허용). `visaCode`는 '모름/기타' 행(registrable=false) → 상담 신청 안내.
    - **'모름' 없음**: 그 밖의 필수 선택 문항, `hasArc`·`needDormitory`(예/아니오), `groupApply`·`wantsConsult`(본인 의사), `birthYear`(미선택 = 무응답), `messengerType`("없음" `NONE` 제공), 다중 선택(`otherLanguages`·`skills`·`licenses`·`consultTime` — 빈 선택 = 무응답), `gender`(`NO_ANSWER`).
    - 새 문항을 추가하면 이 목록에 먼저 넣는다.
  - [v2.9, P-6] 위 열거는 **구직자 위저드**(WO §7.1) 기준이다. 기업 폼(무료 채용 진단, 구인 의뢰)은 SC-02 적용 대상이 아니며, 선택지에 '모름'·'정하지 않음'(예: 구인 의뢰 `overtime` `UNKNOWN`, `startTiming` `UNDECIDED`)을 둘지는 폼 설계에 맡긴다.
- `shiftOk`는 문자열 enum `YES/NO/CONDITIONAL/UNKNOWN`(SC-10).
- 위저드: 각 단계 하단 `DisclosureBadge` 요약, 하단 고정 "이전/다음", 다음 클릭 시 서버 자동 저장 후 이동. 오류는 필드 바로 아래 + 첫 오류 필드로 포커스.
  - [v2.8] "하단 고정" = Step 1~7(3a/3b, 5a/5b 포함)의 sticky 하단 바(`WizardNav`, `data-sticky-bottom-bar`). **Step 0(시작 화면: 전화 인증, 이전 버튼 없는 단일 CTA)은 대상이 아니다** — 일반 흐름의 버튼으로 둔다.
  - [v2.8] sticky 바가 있는 화면은 `scroll-padding-bottom: var(--spacing-wizard-bar)`(2.2.2)로 Tab 포커스·첫 오류 포커스가 바 아래에 가려지지 않게 한다(WCAG 2.4.11). "첫 오류 필드"에는 필수 체크박스(확인·동의)도 포함되며 `field.ref`를 체크박스에 연결한다.
- 모든 입력에 `<label>`, 필수 표시는 "(필수)" 글자 병기.
- 포커스 표시 2.8절. 이미지 `alt`, 장식 아이콘 `aria-hidden`.
- **기능 플래그 off(WO §16 4종, SC-07)**: 페이지는 `ComingSoon`(200, `noindex`, sitemap 제외), 내비·메인 미리보기 링크 숨김(메인 수요 지도 섹션 미렌더), API 404. 점수표·규칙 미게시도 `ComingSoon`(R-127).
- **대상 선택(메인) [HO §3]**: 카드 3장 `role="button" tabindex="0" aria-pressed` + Enter/Space, 탭 3개와 같은 상태(`audience`, 기본 `employer`) 공유, 패널 교체는 transform 등장만. 선택 상태는 URL `?for=`에 반영해도 된다 [HO 권장].
- **"상담 신청" 목적지 [v2.4]**: PRD·WO에 상담 신청 경로가 없으므로 모든 "상담 신청" 버튼·링크(`OutcomeCard`, `ComingSoon`, 협력 소개소 카드 등)는 `/about#contact`(운영자 연락 블록, site.config 연락처)로 보낸다. 상수 한 곳(`CONSULT_HREF`)에서 관리하고, 상담 신청 화면이 PRD에 생기면 그 상수만 바꾼다.
- **JS 비활성 [HO]**: 메인과 공개 페이지는 JS 없이도 모든 텍스트가 보이고 링크가 동작해야 한다(reveal 계약 2.7).

### 3.4 판정 결과 카드 (`OutcomeCard`)

| Outcome | 아이콘 | 화면 라벨(ko) | 배경 / 글자 / 테두리 |
|---|---|---|---|
| GREEN | `CircleCheck` | 가능성 높음 | `--success-subtle` / `--success-subtle-foreground` / `--success` |
| YELLOW | `TriangleAlert` | 확인 필요 | `--warning-subtle` / `--warning-subtle-foreground` / `--warning` |
| RED | `CircleX` | 어려움 | `--danger-subtle` / `--danger-subtle-foreground` / `--danger` |

- 라벨은 제안 문구를 쓰고 [전문가 검토 필요] 표시 대상으로 관리(SC-12).
- 카드 구성 순서: ① 아이콘+라벨 ② `VisaLabel`(v2.9: 다중 비자면 VisaLabel 목록, 3.2) ③ 규칙 `messageKey` 번역 문구 ④ **"참고용, 행정사 확인 필요"**(키 `common.disclaimer.reference`, 카드 내부 하단, `text-caption`, 항상 표시) ⑤ "상담 신청" 버튼.
- "가능합니다", "불가능합니다" 같은 단정 문구 금지. 일치 규칙이 없으면 YELLOW + 확인 필요 [WO §10]. 채용 진단(R-124)도 같은 카드.

### 3.5 문구·톤

- **쉬운 문장**: 한 문장에 정보 하나. 한국어 문장당 40자 이내 권장, 위저드 질문 25자 이내. 전문 용어는 처음 나올 때 풀어 쓴다.
- 어조: 합쇼체 기본. WO 예시 문구는 그대로 ko 원문으로.
- **핸드오프 카피**: 핸드오프의 한국어 카피는 "verbatim"을 요구하지만, 3.7 매핑표에서 "유지"인 요소 중 **BR·PRD·용어집·금지 표현과 부딪히지 않는 문장만** 그대로 쓴다. 숫자·고객사·서비스 약속(정착 케어, 3배수 후보, 공항 픽업 등 PRD에 없는 서비스)이 들어간 문장은 쓰지 않는다. 모든 카피는 messages 키(6개 언어)로.
- 비자 표시: 항상 **코드 + 쉬운 설명**(`VisaLabel`). 키 `visaType.{코드의 '-'를 '_'로}.short`.
- 금액·날짜·숫자: next-intl formatter(`Intl`) [WO §12]. 원화 `currency: 'KRW'`. 문자열 이어 붙이기·`toLocaleString('ko-KR')` 고정 로케일 금지(핸드오프 `toLocaleString('ko-KR')`는 따르지 않음). [v2.10, G-5] 관리자(한국어 전용)는 `ko-KR` 고정 `Intl.NumberFormat`·`Intl.DateTimeFormat` 상수를 허용한다. 관리자도 `toLocaleString`과 단위 문자열 연결(`+ "원"`)은 금지. [v2.11, H-3] 단, 관리자 화면에서 `Intl` 상수로 포맷한 숫자 뒤의 **한국어 수 단위 글자(명·건·일)**는 허용한다([v2.17] `limits.ts` 운영 수치를 안내하는 관리자 문구의 `분`·`MB`도 같은 조건으로 허용, 예 `` `${Math.round(SIGNED_URL_TTL_SEC / 60)}분` ``)([v2.21] 점수표·합격 점수의 `점`도 같은 조건으로 허용, 예 `fmtCount(passScore, "점")`)(예 `` `${countFmt.format(n)}명` ``, JSX `{n}건`). 원화는 `currency: 'KRW'`로만 표시하고 "원"을 붙이지 않는다.
  - [v2.19, Q-26] **시간 표시**: ko 로케일의 시각은 **24시간제**(`hourCycle: "h23"`, 예 `2026. 11. 22. 18:58`)로 쓴다. "PM 6:58"·"오후 6:58" 모두 쓰지 않는다. 날짜·시간 포맷 옵션은 공통 함수([v2.20] `src/i18n/dateTime.ts` — `formatDate`·`formatTime`·`formatDateTime`·`formatMonth`·`formatMonthName`, 관리자 `fmtDate` 등도 이 함수를 거침) 한 곳에서 `hourCycle`을 명시해 정하고, 실행 환경 ICU/CLDR 데이터(`dayPeriod` 표기, 기본 시간제)에 의존하지 않는다. 다른 로케일은 각 로케일 기본 시간제를 따른다(명시 결정 전까지). 구현은 P2d 선행 작업 — P2c 산출물(스크린샷 "PM 7:27")은 이 항목의 판정 대상이 아니다.
- **필수 고정 문구 [WO]** (ko 원문 그대로, 6개 언어 키):
  - "구직자 이용료 없음" (BR-10) — 메인·구직자 등록·`/fees`
  - "참고용, 행정사 확인 필요" (BR-11) — 모든 진단·점수 결과
  - 수요 지도 고지 (WO §8.4) — "공공 채용정보를 바탕으로 비자앤잡이 분석한 지역·업종별 구인 수요입니다. 개별 채용이 확정된 정보가 아닙니다."
  - "이 정보는 기업에 공개되지 않습니다" / "블라인드로 공개됩니다" (WO §7.1)
  - "기업과의 연락은 비자앤잡을 통해서만 진행" (WO §7.3 NOTICE)
- **허용 CTA 동사**: 면접 신청(구직자), 면접 요청(기업), 상담 신청, 무료 채용 진단, 구인 의뢰, 간편 등록, "이 지역·업종 일자리 알림 받기", "내 비자로 가능한지 확인"(수요 지도 2개 [WO §8.4]).
- **금지 표현**:
  - "지원하기", "Apply", "바로 지원", "입사 지원" — **전 화면**(SC-06). 핸드오프의 "지원할 수 있는 일자리", "지원 가능한 공고", "지원 가능 공고만 필터링"도 같은 뜻이므로 금지 → "내 비자로 가능한 일" 등으로 바꾼다. '도움'의 뜻도 혼동을 피해 "지원" 대신 "도움"을 쓴다(예: "서류 도움").
  - 직접 연락 유도: "기업에 연락하기", "전화하기"(기업·구직자 대상), "연락처 보기", "채팅", "메시지 보내기", "카카오톡/Zalo/WhatsApp/Telegram으로 대화·문의"(BR-01, 운영자 채널은 K-01 결정 전까지 미표시)
  - 결과 단정·보장: "비자 보장", "100%", "반드시 가능", "합격 보장", "불가능합니다"(BR-11)
  - 구직자 대상 비용: "수수료", "소개비", "유료"를 구직자에게 부과하는 의미의 모든 표현(BR-10). 핸드오프의 "소개 수수료는 근로자에게 받지 않습니다"는 고정 문구 "구직자 이용료 없음"으로 대체.
  - 수요 지도·메인을 "채용 중", "모집 중", "일자리 n건", "n개 공고", "진행 중 공고"로 표현(BR-04)
  - 지어낸 실적 숫자(PC-7, 1.2-8)
- **[전문가 검토 필요]**: 약관·개인정보처리방침·동의서·고지 초안·탈퇴 정책·판정 라벨(SC-12) 등 법적 성격 문서 전부(N-03). 번역본은 한국어 원문 + 번역 병기(SC-08).

### 3.6 번역 키 규칙 (next-intl)

- 파일: `messages/{ko,en,vi,ru,zh,uz}.json`. **ko가 원본**, 나머지는 ko와 같은 키 집합. **핸드오프의 10개 로케일(ko, en, vi, th, id, uz, ne, km, mn, my) 중 PRD 1차 6개만** 만든다(th·id·ne·km·mn·my는 WO §12 2차 언어, 범위 밖).
- 각 파일 첫 키: `"_review": "native review required"` [WO §12] (6개 모두).
- 키 이름: `{영역}.{페이지}.{섹션?}.{요소}.{속성}`, lowerCamelCase 세그먼트. 예 [WO]: `seeker.register.step2.visaCode.label`. 메인 섹션은 `public.home.{hero|audience|metrics|visaWidget|demandPreview|finalCta}.…`.
  - 영역: `common`, `public`, `seeker`, `employer`, `visa`, `visaType`, `legal`, `errors`, `nav`, `footer`, `meta`.
  - 필드 키 세그먼트는 WO §7.3 / 데이터 모델 필드명과 같게.
  - 속성: `label`, `placeholder`, `help`, `error.{코드}`, `option.{값}`(enum과 동일), `title`, `description`, `cta`, `eyebrow`, `lead`.
- 사용자 노출 문자열을 JSX·TS에 직접 쓰지 않는다(관리자 제외). ESLint `react/jsx-no-literals` 또는 동급.
- 관리자(`src/app/admin/**`, `src/components/admin/**`)는 한국어 전용, 한국어 리터럴 허용.
- 동의서 본문은 `content/consents/{type}/{version}/{locale}.md` [WO §7.3].
- [v2.5] 알림 템플릿(SMS·이메일 본문, `NotificationProvider`의 `templateKey`) 키 = `common.{주제}.{채널}`(예 `common.otp.sms`). 여러 영역에서 같은 템플릿을 쓰므로 `common`에 둔다. 값에 숫자 운영 수치를 직접 쓰지 않고 ICU 인자로 받는다. [v2.20] 이메일 채널은 제목·본문이 필요하므로 `common.{주제}.email.subject`·`common.{주제}.email.body` 두 키로 둔다(`lib/notifications/render.ts`). 알림 문구에도 고정 문구("구직자 이용료 없음" 등)는 기존 키와 같은 문장을 쓴다.
- uz는 라틴 문자(SC-09).
- [v2.2] 참조 데이터 표시 이름 키(DB `nameKey`): `VisaType` = `visaType.{코드 소문자, 하이픈 제거}.name`(예 `visaType.e7.name`, 쉬운 설명은 같은 접두 `.description`), `Region`(시·도) = `common.region.{코드 소문자}`, `Industry` = `common.industry.{코드 소문자}`. `name`은 이 용도에 한해 속성으로 허용. 시드에 있는 모든 `nameKey`는 해당 키를 처음 화면에 쓰는 Phase(P1a)부터 6개 messages에 있어야 한다(테스트 또는 `i18n:check`로 확인).
- [v2.7, B-10] 시·군·구(`Region` level SIGUNGU, PC-6 에이전트 초안)는 번역 키 없이 `nameKo`(한국어 고유명사)를 모든 로케일에 표시할 수 있다. 번역 키(`common.region.{코드}`)는 운영자 검수 뒤 도입한다.

### 3.7 메인(`/`) 섹션 매핑표 (핸드오프 13섹션 + 부속 → PRD R-101)

R-101 필수 요소: ① 대상 선택 3버튼 ② 비자 진단 위젯 ③ 실적 지표 ④ 수요 지도 미리보기(플래그) ⑤ 수수료 링크 ⑥ "구직자 이용료 없음". 메인은 아래 순서로 구성하고 시각 언어는 해당 핸드오프 섹션을 따른다. **"제외"인 섹션·부속은 메인과 다른 페이지 어디에도 구현하지 않는다**(PRD 변경 없이는).

| # | 핸드오프 섹션 (README §, index.html) | 처리 | 메인에서의 내용 (PRD 대응) | 시각 언어 유지 범위 |
|---|---|---|---|---|
| 1 | Sticky Navigation (§1, 74–125) | **유지(변형)** | `SiteNav`. 메뉴: 구직자(간편 등록) · 기업(무료 채용 진단) · 비자 진단 · 일자리(`/jobs`, 플래그) · 수요 지도(`/demand`, 플래그) · 회사 소개 · 수수료 중 최대 6개. 앵커·scroll-spy 대신 라우트 + `aria-current="page"`. 언어 10개→6개. 주 CTA 문구·목적지 C-17. 서랍의 전화 버튼은 site.config 운영자 전화 있을 때만 | 높이·투명→블러 전환·링크 밑줄·언어 알약·CTA·버거·서랍 전부 |
| 2 | Hero (§2, 131–210) | **유지(변형)** | H1(2줄, 강조구 `--grad-text`)·부제·배지는 번역 키(숫자 제거: "15년간 16개국 인재와 1,240개 기업" 삭제). 주 버튼 `brand`(B-02) → 대상별 주 행동(C-17과 동일 목적지), 보조 버튼은 "브랜드 필름 보기" 대신 `glass` "비자 진단"(`/visa-check`). 코너 메타: 좌상 "VISANJOB FILM — 01"·좌표 삭제, 하단 띠 좌 "16 COUNTRIES · 68 REGIONAL PARTNERS" 삭제, 우 "유료직업소개소 제 …호"는 **site.config 등록번호**로 유지. 통계 띠 4칸은 지어낸 숫자 대신 PRD 사실로 대체: 직업소개사업 등록번호 / **구직자 이용료 없음**(⑥) / 6개 언어 / 행정사 사무소 연계(site.config 사무소명) — 값 없는 칸은 숨김 | 필름 플레이트(3.8), 레이아웃(100svh, 아래 정렬), 배지·H1·부제 타이포, 스크롤 큐, 통계 띠 격자 |
| 3 | Audience Selector (§3, 212–277) | **유지(변형) = ①** | 카드 3장 = 구직자 / 기업 / 협력 소개소(세 번째 카드 처리 C-15). 카드 하단 통계(1,240개 등) 삭제 → 짧은 행동 문구. 개인화 패널: 제목·본문·체크리스트·CTA를 PRD 행동으로 — 구직자: 간편 등록·비자 진단·"구직자 이용료 없음", 기업: 무료 채용 진단·구인 의뢰, 협력 소개소: C-15. 핸드오프 패널 문구 중 숫자(5.8주, 12,400명)·"6:4 배분"·"풀 실시간 공유"·"10개 언어"·"지원 가능한 공고" 삭제 | 탭·카드 3종 아트·hover/active 상태·패널 3열(v2.4: HO 비율 `1fr 1.22fr 0.8fr` 또는 균등 3열, ≥1025px)·전환 모션 전부 (오렌지 아트는 구직자 카드) |
| 4 | Trust Metrics (§4, 279–324) | **유지(변형) = ③** | 지표 항목·값은 **site.config 운영자 입력값만**(PC-7). 입력값 없으면 지표 행 미렌더(섹션 전체 숨김 가능, 라이선스 카드는 등록번호 있으면 유지). 리드 "모든 수치는 분기별로 검증됩니다", 업계 평균 비교 문구 삭제(운영자 입력 없으면). 라이선스 카드 = site.config 등록번호·관할 | 어두운 섹션·라디얼 워시·라이선스 카드·지표 타이포·카운트업(최종값 먼저) |
| 5 | Employer Service Flow (§5, 326–378) | **제외** | PRD에 없음. 단계 내용(3배수 후보, 공항 픽업, 90일 정착 등)이 PRD에 없는 서비스 약속. WO §1.2 흐름 소개로 쓸지는 C-19 | (레일 진행 표현은 쓰지 않음) |
| 6 | Cost & Timeline Estimator (§6, 380–480) | **제외** | PRD에 없음. 소개 수수료 금액 계산은 `/fees`(R-102) 외 노출 금지 | 폼 컨트롤 모양(48px select, 칩, 슬라이더 트랙)만 3.1 입력 규칙의 출처로 사용 |
| 7 | Visa Type Explorer (§7, 482–497, `VJ.visas`) | **제외** | 비자별 사실·허용 업종·고용 유의사항은 법령 내용 → BR-12(임의 입력 금지)·BR-11. PRD에 없음 | 비자 칩(`.vchip`) 모양만 `VisaLabel`·비자 선택 칩의 출처 |
| 8 | Nationwide Network Map (§8, 498–537) | **PRD 요소로 대체 = ④ (플래그 `FEATURE_DEMAND_MAP`, WO §16)** | 수요 지도 미리보기: 시·도 노드 = `Region` 시·도(세종 포함 17개, 핸드오프 16개), 툴팁 행 = "최근 30일 구인 수요 n건", "제시 급여 중앙값 구간", 표본 5건 미만 "자료 부족"(R-117). `NoticeBox`(어두운 면 변형) 고지를 지도 **위**에. 버튼은 WO §8.4의 2개만. 본사 허브·협력기관 수·"진행 중 공고 924"·"지역 협력기관 되기" 삭제. 플래그 off면 섹션 미렌더 | 어두운 섹션, 스타일화 SVG 지도(viewBox 460×640, 면·선 색), 노드·툴팁·키보드 포커스, 점선 연결은 장식(데이터 의미 없음) |
| 9 | Talent Showcase (§9, 539–556, `VJ.candidates`) | **제외** | BR-02·06·07: 공개 화면 구직자 프로필 게시 금지(E-9 포함), 후보 열람은 검증·계약 기업 전용(R-205) | — |
| 10 | Job Seekers (§10, 558–641) | **PRD 요소로 대체 = ② + ⑥** | 왼쪽: 인사 알약(현재 로케일 인사, 국기·"428개 공고" 삭제), H2(번역), 리드 끝 굵은 약속 = **"구직자 이용료 없음"** + `/fees` 링크(⑤), 국기 줄 → 6개 언어 이름 줄, 메신저 버튼 4개 제외(K-01). 오른쪽 검색 카드 → **비자 진단 위젯**: 비자 박스(DB `VisaType`에서, `VisaLabel`) + 시·도·업종 select → `evaluate.ts` → `OutcomeCard`(참고용 문구). 공고 목록·"n개 공고 모두 보기" 삭제 → "자세히 진단하기"(`/visa-check`) | 블루 워시 배경(B-06), 2열(≤1180 세로 쌓기, 문구 먼저), 검색 카드(`rounded-xl` 28px, 무거운 그림자, 비자 박스 5열→≤760 3열→≤400 2열), select 2개 나란히(≤760 세로) |
| 11 | Case Studies & Testimonials (§11, 643–668) | **제외** | 사례 수치 지어냄(PC-7), 후기 영상 자산 없음, 구직자 실명·국적 노출, 고객사 로고 마퀴(BR-03 취지·지어낸 고객) | 사례 카드 모양은 `/cases` 골격(R-131, 선택)에서만 사용 가능 |
| 12 | Insights (§12, 669–684) | **제외** | 메인에 없음. 법령 해설 내용 지어냄 금지(BR-12). `/guide/[slug]`(R-131)는 별도, reviewedBy 필수 | 인사이트 카드 모양은 `/guide` 목록에서만 사용 가능 |
| 13a | Final CTA (§13, 685–722) | **유지(변형) = ⑤** | 2분할: 왼쪽 **구직자**(오렌지 따뜻한 변형, `seeker` 버튼 "간편 등록", 보조 "비자 진단") / 오른쪽 **기업**(`brand` 버튼 "무료 채용 진단", 보조 `glass` "구인 의뢰"). 아래 수수료 링크(`/fees`)와 "구직자 이용료 없음". 전화·이메일 glass 버튼은 site.config 운영자 연락처 있을 때만(BR-01 허용 범위) | 메시 배경(3.8), 유리 카드 2장, 버튼 |
| 13b | Footer (§13) | **유지(변형)** | `SiteFooter`. 링크 열 = PRD 경로(서비스: 비자 진단·E-7-4 점수·수요 지도(플래그)·일자리(플래그) / 구직자: 간편 등록·정식 등록 / 기업: 무료 채용 진단·구인 의뢰 / 회사: 회사 소개·수수료·개인정보처리방침·이용약관). "윤리강령", "수수료 배분 구조", "전국 지도", 소셜 아이콘(site.config 없으면) 삭제 | 5열 그리드·타이포·하단 바 |
| — | Film modal player (README Interactions, 805–849) | **제외** | 영상 자산 없음(3.8) | — |
| — | Floating chat FAB (850–880) | **제외** | PRD에 없음, 가짜 미읽음 배지, 메신저 채널(K-01) | — |
| — | Logo marquee (§11) | **제외** | 고객사명 노출(K-05), 지어낸 고객 | — |

- 메인 렌더 순서: 1 → 2 → 3 → 4(값 있을 때) → 10 → 8(플래그 on일 때) → 13a → 13b.
- 메인 외 공개 페이지(`/about`, `/fees`, `/privacy`, `/terms`, `/visa-check`, `/score/e74`, `/demand`, `/jobs`, `/guide`, `/cases`)와 구직자·기업 화면: 히어로 없음, 내비 스크롤 상태 모양, 상단에 `SectionHeader`(H1은 `text-h1`), 본문은 `--white`/`--n50` 섹션 교대, 카드·폼은 3.1·3.2 규칙. 어두운 면은 메인과 페이지 상단 띠(선택)에만.

### 3.8 실제 자산이 필요한 요소 — 자산 없음 처리 규칙

| 요소 | 핸드오프 상태 | 처리 (R-103 성능 ≥85 고려) |
|---|---|---|
| 히어로 배경 영상 | CSS 그라디언트 "필름 플레이트" 자리표시(README "replace with an actual `<video>`") | **영상 없이 CSS 플레이트를 정식 배경으로 쓴다.** `<video>`·`<iframe>`·영상 파일 0개. 정적 층(바탕 #050D24, 라디얼 3개, `linear-gradient(168deg,#0a1b3f,#061231 46%,#03081a)`, 96px 그리드 마스크, 하단 지평선 페이드)은 모든 폭에서. 움직이는 층(빔 3개 18–28s, 46vw 코닉 글로 `blur(60px)` 52s 회전, SVG 노이즈 그레인 14% overlay)은 **≥1025px이고 reduced-motion이 아닐 때만** 렌더(모바일은 페인트 비용 때문에 렌더 자체를 안 함). LCP 요소는 H1 텍스트여야 한다([v2.4] 정정: **히어로 텍스트 요소(H1 또는 부제 문단)** — 이미지·영상·장식 층·배경이 아니어야 한다는 뜻. 모바일에서는 여러 줄 부제가 H1보다 면적이 커 LCP가 되는 것이 정상). 레시피는 `src/app/brand.css` `.vj-film*` 클래스로 |
| 브랜드 필름 모달 | 가짜 타임라인 플레이어 | **미구현.** 히어로 재생 버튼·"1:32" 표시 없음 |
| 후기 영상 3개 | 그라디언트 썸네일 + 모달 | 섹션 제외(3.7 #11) |
| 사례 썸네일 | 네이비 라디얼 + 40px 그리드 플레이트 | `/cases` 골격에서 쓸 경우 CSS 플레이트 유지(이미지 없음) |
| 대상 카드 아트, 지도, 최종 CTA 메시 | CSS 그라디언트·SVG | 그대로(이미지 아님). 최종 CTA 메시 원 3개 애니메이션(22–27s)은 ≥1025px·reduced-motion 아님에서만, 모바일은 정적 |
| 국기 이미지 | CSS 원·텍스트 | 사용 안 함(국기 줄 제외) |
| OG 이미지 1200×630 | 없음 | R-130 범위 밖. 만들 경우 텍스트·토큰만으로 `next/og` 정적 생성, 사진 금지 |
| 로고 | 인라인 SVG | `Logo` 컴포넌트(3.1) |

- `backdrop-filter`는 내비(스크롤 상태)·히어로 배지·유리 버튼·유리 카드·다이얼로그 스크림에만. 스크롤 중 동시에 보이는 블러 요소 최소화.
- 장식 레이어는 `aria-hidden`, `pointer-events: none`, `will-change`는 애니메이션 중인 층에만.
- 나중에 실제 영상이 제공되면(PRD 변경 필요): 자체 호스팅, `muted loop playsinline preload="none"` + poster, ≤3MB 1920×1080, <761px는 poster + 명시적 재생 버튼(자동 재생 금지), reduced-motion은 poster 고정, 자막 트랙은 6개 로케일 [HO §Assets 기준을 6개 언어로 확장]. 외부 임베드(YouTube 등)는 클릭 전 로드 금지(파사드).
- "사진은 실제 작업 현장, 스톡 사진 금지" [HO]는 사진을 쓰게 될 때 적용.

---

## 4. 아키텍처·코드 기준

### 4.1 기술 스택 [WO §3]
Next.js 15 App Router · TypeScript `strict: true` · **Tailwind CSS 4**(`@theme`, CSS 우선 설정, `tailwind.config` 없음) · shadcn/ui(new-york, CSS 변수) · lucide-react · react-hook-form + zod · next-intl · PostgreSQL(개발: `embedded-postgres`, Q-02) + Prisma · Auth.js · pg-boss · Vitest · Playwright · ESLint · Prettier · Husky + lint-staged · pnpm.
- `any` 금지(`@typescript-eslint/no-explicit-any: error`).
- 핸드오프의 vanilla JS(`app.js`)·마크업을 통째로 붙여 넣지 않는다 [HO README]. 상호작용은 클라이언트 컴포넌트로 최소 범위만(서버 컴포넌트 기본).

### 4.2 디렉터리 [WO §4 + 제안 보완]

```
/
├─ CLAUDE.md                       [WO §17 내용]
├─ .env.example                    (커밋) / .env (git 제외)
├─ .github/workflows/ci.yml        [R-003]
├─ content/
│  ├─ consents/{type}/{version}/{locale}.md   [WO §7.3]
│  ├─ terms/employer/{version}/{locale}.md    [v2.15] 구인 서비스 이용약관 초안(R-208, WO §9.4). [전문가 검토 필요] 줄 필수, ko 외 파일은 끝에 한국어 원문 병기(SC-08). 현재 버전 = 가장 높은 vN 폴더
│  └─ guide/{slug}.{locale}.mdx              [제안] reviewedBy·updatedAt frontmatter 필수
├─ design_handoff_visanjob_homepage/          디자인 기준 원본(읽기 전용, 빌드에 포함하지 않음)
├─ docs/WORK_ORDER.md
├─ messages/{ko,en,vi,ru,zh,uz}.json
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed/ (visaTypes.ts, industries.ts, regions.ts, sampleRules.ts, sampleScoreTable.ts, sampleSeekers.ts, index.ts)   [v2.15] sampleSeekers = 가짜 구직자(SAMPLE 주석, SEED_SAMPLE_SEEKERS·운영 제외, R-204)
├─ public/docs/                    [v2.15] 생성물: `employer-terms-{version}-{locale}.pdf`(`pnpm terms:pdf`, 직접 편집 금지)
├─ storage/private/               [v2.17] 비공개 업로드(소개 확인서). git 제외(`/storage/`), 웹 루트·`public/` 밖, `/api/files/[token]`으로만 읽음(R-210)
├─ scripts/ (db.ts, i18n-check.ts, qa-static.ts, worker.ts, build-terms-pdf.ts, lighthouse.ts, lib/ …)   [v2.22] lighthouse.ts = `pnpm lighthouse`(R-103 측정, PLAN P1a·P2e), [v2.2] db.ts = db:start/stop/status/reset (PLAN P0b), [v2.9] worker.ts = `pnpm worker`(pg-boss 워커, PLAN P1d), [v2.15] build-terms-pdf.ts = `pnpm terms:pdf`(content/terms → public/docs, PLAN P2b)
├─ src/
│  ├─ app/
│  │  ├─ globals.css               토큰(2절) + shadcn 변수 + @theme
│  │  ├─ brand.css                 [v2] 핸드오프 장식 레시피(필름 플레이트, 카드 아트, 지도, 메시, grad-text). globals.css에서 import
│  │  ├─ [locale]/(public)/ · seeker/ · employer/      ※ agency/ 는 Phase 3 — 만들지 않음
│  │  ├─ admin/                    (한국어 전용, 2FA)
│  │  │  └─ _i18n/ko.ts            [v2.10, G-3] 관리자 공용 한국어 문구·포맷터(PLAN P1e). import는 `src/app/admin/**`·`src/components/admin/**`에서만
│  │  └─ api/ingest/job-leads/ · api/...   [v2.17] api/employer/requests(GET, R-212), api/files/[token](GET, 서명 URL 다운로드, R-210)
│  ├─ components/ (ui/, forms/, seeker/, employer/, admin/, visa/, legal/, jobs/, common/, home/)
│  │                               [v2.14] admin/ = 관리자 전용(한국어) 표시·폼 컴포넌트. 예: forbidden-notice, posting-forms, posting-badges(공고 상태·검증 배지, S-09 아이콘 포함), [v2.15] company-forms(기업 검증·계약 등록, R-218)
│  │                               [v2.17] admin/ P2c = matching-forms(추천 실행 dialog·면접·소개 확인서), placement-forms, visa-case-forms. seeker/ P2c = interview-consents(면접 건별 동의)
│  │                               [v2.20] admin/ P2d = rule-forms(규칙·점수표 초안 폼, 게시·폐기 확인 dialog, 새 버전), rule-badges(버전 상태·SAMPLE 배지, S-09 아이콘). seeker/ P2d = still-searching-form, still-searching-notice(R-213 원클릭 응답)
│  │                               [v2.15] employer/ (P2b) = candidate-card, candidate-filters, candidate-stats, candidate-view.ts(서버 전용 표시값 변환, 입력은 BlindSeeker만), interview-request-button, contract-form, terms-document (+ P1d 진단·의뢰·계정 폼)
│  │                               [v2.13] jobs/ = verified-badge, posting-card, posting-view.ts(서버 전용 표시값 변환, 입력은 PublicPosting만), interest-panel, interest-form (PLAN P2a)
│  │                               home/ = 메인 섹션 컴포넌트(hero.tsx, audience-selector.tsx, trust-metrics.tsx, visa-widget.tsx, demand-preview.tsx, final-cta.tsx)
│  │                               [v2.4] public/ = 메인 외 공개 페이지 공용(page-shell, legal-document, registration-info, demand-*) — PLAN P1a `src/components/public/**`
│  ├─ config/
│  │  ├─ site.config.ts            [R-015] 사무소명·등록번호·대표자·주소 플레이스홀더 + [v2] 운영자 실적 지표(PC-7), 운영자 연락처(선택), 브랜드 표기(C-14)
│  │  │                            [v2.1, Q-06] 대표 휴대전화는 코드 기본값 없이 환경변수(SITE_OPERATOR_MOBILE)로만 읽고 공개 화면·공개 config 객체에 넣지 않음. 입금계좌 항목은 두지 않음
│  │  ├─ flags.ts                  WO §16 플래그 4종, env 미설정 시 false
│  │  └─ limits.ts                 운영 수치(SC-05, PC-5)
│  ├─ fonts/                       Pretendard woff2 + 라이선스 [v2.4: SC-11 이후 미사용 보관만, import 금지]
│  ├─ i18n/ (routing.ts, request.ts, navigation.ts, locales.ts, dateTime.ts)   [v2.22] navigation = next-intl 로케일 링크·라우터, locales = 로케일 목록. [v2.20] dateTime = 날짜·시간 표시 공통 함수(3.5 Q-26, 순수 모듈 — 클라이언트에서도 사용)
│  ├─ lib/
│  │  ├─ crypto.ts · rbac.ts · audit.ts · pii-guard.ts · fonts.ts · fontsZh.ts(v2.4) · guide.ts · referenceData.ts
│  │  ├─ [v2.5] authConfig.ts(Edge 안전 Auth.js 설정) · authCredentials.ts · authGuard.ts · employerAccount.ts · otp.ts · password.ts · phone.ts · rateLimit.ts   PLAN P1b. [v2.25, I-1] authConfig = 공용 설정 + 미들웨어 전용 `readSessionClaims`(쿠키 읽기 전용 복호, 4.11), authCredentials = 세션 버전 함수(`sessionVersionOf`·`isSessionCurrent`·`applySessionVersion`·`revokeSessions`, Node 전용), authGuard = 클레임만 보는 라우팅 판단(`decideAdminAccess`·`staffState`)
│  │  ├─ admin/ (session.ts, actionGuard.ts, dashboard.ts, leadDesk.ts, seekerReview.ts, companies.ts …)      [v2.5] 관리자 서버 측 공용(직원 확인 등), [v2.10] 대시보드 카운트·리드 칸반·구직자 검토(PLAN P1e), [v2.11] `actionGuard.ts` 관리자 서버 액션 래퍼(4.5), [v2.15] companies = 기업 검증·계약 등록(R-218, COMPANY_VERIFY·PII_VIEW), [v2.17] placements = 계약(Placement), visaCases = 체류 사건(VisaCase, `visaCase:view/manage`) (R-216)
│  │  ├─ seeker/ (account, consent, options, overview, reference, referral, saveStep, session, stillSearching, tasks, wizardValues)   [v2.20] stillSearching = 상태 확인 원클릭 서명 토큰·응답(R-213, 토큰에 프로필 id만)   [v2.7] 구직자 등록·마이페이지 서버 측 공용 (PLAN P1c), [v2.16] options = 위저드 코드 목록(`MAJOR_FIELDS`·`MAJOR_FIELDS_SOURCE` 포함, 4.9), [v2.17] recommended = `/seeker/me/recommended`(PC-13: 일치 공개 공고 + 본인 추천 건)
│  │  ├─ [v2.17] recommendations/ (ledger, matching, interviews)   ledger = Recommendation 원장 저장소(create·find만, `recommendation.create`는 이 파일에서만 — qa:static BR-09/ledger-repository), matching = 공고별 적합 구직자·추천 실행, interviews = 면접 일정·확정·취소·결과·소개 확인서 (PLAN P2c, R-209·R-210)
│  │  ├─ [v2.17] consent/thirdParty.ts   THIRD_PARTY_INTERVIEW 면접 건별 동의·거부·철회(PC-1, R-211)
│  │  ├─ [v2.17] files/ (storage, signedUrl)   비공개 파일 저장(루트 `storage/private/` 또는 `PRIVATE_STORAGE_DIR`, `public/` 밖)·HMAC 서명 URL(만료 `SIGNED_URL_TTL_SEC`) (R-210). v2.16까지의 `lib/storage/` 자리는 이 폴더로 대체
│  │  ├─ candidates/ (eligible, access, browse, interest, stats, stayBand)   [v2.7] eligible = 기업 후보 쿼리 계층 제외 조건(BR-06·07, BLIND_PROFILE 철회), [v2.15] access = 열람 수준(LIST/STATS), browse = 목록(일 상한·CANDIDATE_BULK_VIEW, 행은 blindSeeker만), interest = 면접 요청(EMPLOYER), stats = 요약 통계(PC-11), stayBand = 잔여기간 구간 (PLAN P2b)
│  │  ├─ employer/ (diagnosis, jobRequest, session, apiRegistry, contract, interviews)   [v2.17] interviews = 면접 요청 현황(`/employer/requests` 페이지·API 공용, R-212)   [v2.9] 무료 채용 진단·구인 의뢰·기업 세션(requireEmployer) (PLAN P1d), [v2.15] apiRegistry = 기업용 라우트·서버 액션 목록(R-206 누출 테스트), contract = 약관 본문·PDF 경로·계약 동의(R-208)
│  │  ├─ leads/ (ingest, ingestAuth, tagging, transitions, priority)   [v2.9] 수집 API·태깅·리드 등급 전이(PLAN P1d), [v2.10] priority = 전화 우선순위(WO §8.3, PLAN P1e)
│  │  ├─ demand/aggregate.ts · seo/(jsonld.ts, metadata.ts)   [v2.4] PLAN P1a
│  │  ├─ db.ts
│  │  ├─ serializers/ (blindSeeker.ts, publicPosting.ts, interviewDisclosure.ts)   [v2.13, Q-17] 공고 직렬화는 PLAN P2a 이름 `publicPosting.ts`(상수 `BLIND_JOB_FIELDS`), [v2.17] interviewDisclosure = PC-1 동의 건 실명 단일 경로(4.4)
│  │  ├─ postings/ (public, manage, interest)   [v2.13] 공개 공고 쿼리(PUBLISHED+검증+리드 A)·관리자 공고 생성·검증·공개·마감·면접 신청(PLAN P2a)
│  │  ├─ visa-engine/ (classifyTrack.ts, evaluate.ts)
│  │  ├─ score/e74.ts
│  │  ├─ notifications/ (types.ts, index.ts, console.ts, smtp.ts, render.ts)   [v2.3] types = NotificationProvider 인터페이스, index = 공급자 선택(채널별 라우터, 선택 결과 JSON 한 줄 로그), [v2.20] smtp = 이메일 어댑터(SMTP_* 없으면 생성 안 함, 수신자 마스킹 로그), render = messages 템플릿 → 본문(3.6)
│  │  ├─ [v2.20] rules/ (manage, messageKeys, options)   규칙 DB·점수표 버전 관리(R-215: DRAFT→PUBLISHED→RETIRED, 게시 시 reviewedBy/At·이전 게시 버전 폐기, SAMPLE 게시 거부), messageKeys = 6개 언어에 있는 결과 문구 키만 선택, options = 관리자 폼 선택지
│  │  └─ jobs/ (boss, archiveLeads, statusCheck, stayExpiry, noShow, notifySeeker)  [v2.9] pg-boss 설정(스키마 `pgboss`, 예약 작업 목록) + 순수 핸들러 `(now: Date) => Promise<Result>` (PLAN P1d), [v2.20] R-213: statusCheck = 30일 상태 확인·14일 무응답 INACTIVE·S→A, stayExpiry = D-90/60/30 알림 + StaffTask, noShow = 노쇼 재집계(내부 표시), notifySeeker = 구직자 SMS·이메일 발송 공용. PLAN의 kebab 이름(`status-check` 등)보다 4.3 camelCase 우선
│  ├─ server/actions/{영역}/*.ts   [v2.13] 예: admin/postings, jobs/interest, [v2.15] admin/companies, employer/(candidates, contract), [v2.17] admin/(matching, placements, visaCases), [v2.20] admin/rules, seeker/stillSearching
│  ├─ schemas/{영역}/*.ts          [v2.9] 예: employer/(diagnosis, request), ingest/jobLead.ts, [v2.10] admin/(leads, review), [v2.13] admin/postings, jobs/interest, [v2.15] employer/(candidates, contract), admin/companies, [v2.17] admin/(matching, placements, visaCases), [v2.20] admin/rules
│  ├─ auth.ts                      [v2.5] Auth.js 진입점(Node 런타임, providers). 미들웨어는 lib/authConfig.ts만 쓴다. [v2.25] JWT 콜백의 세션 버전 검사·`events.signOut` 무효화(4.11)는 여기서만
│  └─ middleware.ts                [v2.25] Auth.js 인스턴스 없이 `readSessionClaims`로 클레임만 읽어 `/admin/*` 라우팅 + next-intl. 세션 Set-Cookie·Prisma 금지(4.11)
└─ tests/
   ├─ setup/                     [v2.2] Vitest globalSetup(테스트 DB)
   ├─ unit/
   └─ e2e/
      └─ support/                [v2.5] E2E 도우미(4.10). [v2.16] adminDb, authDb, candidatesDb, employerDb, jobsDb, seekerDb, seekerFlow, messages, shots(QA 증거 스크린샷 — 환경변수가 있을 때만 저장, 저장 경로는 저장소 밖), [v2.17] matchingDb(추천·면접·동의 E2E 데이터), [v2.20] p2dDb(상태 확인 토큰·규칙 E2E 데이터), [v2.22] integrationDb(R-217 통합 시나리오의 후보 목록 격리 태그·결과 조회)
```
- 위 트리에 없는 최상위 폴더를 `src/` 아래에 새로 만들려면 이 기준서에 먼저 추가한다.

### 4.3 파일·식별자 명명

- WO가 이름을 지정한 파일은 **그 이름 그대로**: `crypto.ts`, `rbac.ts`, `audit.ts`, `pii-guard.ts`, `blindSeeker.ts`, `classifyTrack.ts`, `evaluate.ts`, `e74.ts`, `site.config.ts`, `schema.prisma`, seed 파일명.
- 그 외 `src/components/**`, `src/app/**` 파일 = kebab-case, 컴포넌트 export = PascalCase.
- `src/lib/**`, `src/schemas/**`, `src/server/**` 신규 파일 = camelCase. [v2.17] PLAN의 "만들거나 고칠 파일"이 kebab-case로 적었어도(예 P2c `signed-url.ts`, `third-party.ts`) 이 규칙이 우선한다(→ `signedUrl.ts`, `thirdParty.ts`, 4.10 G-2와 같은 원칙). WO가 이름을 지정한 파일만 예외.
- zod: `export const step2Schema = z.object(...)`, `export type Step2Input = z.infer<typeof step2Schema>`.
- 서버 액션: 동사로 시작하는 camelCase.
- enum 값·DB 문자열 코드: UPPER_SNAKE.
- 환경변수: UPPER_SNAKE, 플래그는 `FEATURE_*` [WO §16].
- Prisma 모델·필드: WO §5 이름 그대로, 암호화 `…Enc`, 조회 HMAC `…Hash`.
- CSS 클래스(brand.css): `vj-` 접두 kebab-case(`.vj-film`, `.vj-art-seeker`). 핸드오프 클래스 계약(`.reveal`/`is-in`, `--p`, `--fill`, `--reveal-y`)은 의미를 유지해 옮긴다 [HO "class-based CSS contracts"].

### 4.4 서버 직렬화 화이트리스트 (BR-02, BR-03)

- 기업에게 나가는 구직자 데이터는 **반드시** `src/lib/serializers/blindSeeker.ts`만 거친다. `BLIND_SEEKER_FIELDS` = WO §7.5 배열.
- [v2.17, PC-1, R-211] **두 번째 허용 직렬화기 `src/lib/serializers/interviewDisclosure.ts`**: 면접 건별 동의(THIRD_PARTY_INTERVIEW)를 받은 건의 **실명(`legalName`) 한 키만** 내보내는 유일한 경로. 조건(모두 매 요청 쿼리로 확인, 캐시 금지): 요청 기업의 추천에 속한 해당 면접 건, 면접 상태 CONFIRMED, [v2.18, Q-25] 면접 건이 끝나지 않았을 것(최종 결과 `DISCLOSURE_ENDING_RESULTS` = 채용·불합격·노쇼 미기록 — "결과 대기"는 종료 아님, 취소는 CONFIRMED가 아니므로 제외), 그 구직자 본인의 철회되지 않은 동의. 종료 판정은 `interviewDisclosure.ts`의 `interviewEnded`·쿼리 조건 한 곳에 두고 기업 화면 상태 표시(`ENDED`)도 이 함수만 쓴다. `EMPLOYER_NAME_DISCLOSURE.condition` 문구는 이 조건과 같게 유지한다. 결과는 `INTERVIEW_DISCLOSURE_FIELDS` 키 집합의 새 객체이고 제공할 때마다 `PII_VIEW`(meta는 필드 이름·viewer·companyId만). 연락처(전화·이메일·메신저)는 select하지 않는다. 기업 응답에서 실명이 나올 수 있는 JSON 경로는 `lib/employer/apiRegistry.ts` `EMPLOYER_NAME_DISCLOSURE`에 등록하고, R-206 누출 테스트가 그 경로·동의 건 밖에서 null임을 확인한다. 이 두 직렬화기 밖의 기업 영역 코드는 `legalNameEnc`·`phoneEnc`·`emailEnc`·`messengerIdEnc`를 select하지 않는다.
- 화이트리스트 키만으로 **새 객체 구성**(blacklist·`...profile` 스프레드 금지).
- `publicId`는 DB `id`와 다른 랜덤 값. [v2.15] 기업에게 보이는 ID로의 변환과 역변환(`toBlindPublicId`/`fromBlindPublicId`)도 `blindSeeker.ts` 안에만 둔다(면접 요청 상태 표시 등 행 직렬화가 아닌 곳도 이 함수만 사용).
- [v2.15] 미계약·미검증 기업 요약 통계(`lib/candidates/stats.ts`, PC-11)는 구직자 개별 행·ID를 내보내지 않고 화이트리스트 코드(시·도·등급)별 **건수만** 내보낼 때에 한해 직렬화기 밖 집계 쿼리를 허용한다. 소표본 칸은 수요 지도와 같은 기준으로 가린다.
  - [v2.16, PC-11] 공개하는 합(전체 합계 등)은 그 합에 가린 칸이 하나라도 들어 있으면 내보내지 않는다(합 − 공개 칸 = 가린 값 차감 노출 방지). 칸 정렬·숨김 사유 등 다른 공개 값도 공개된 수만으로 정해 가린 칸의 값에 따라 달라지지 않는다. 숨긴 합계는 화면에 번역 키 값 `—`(코드 리터럴 금지)로 보이고 같은 블록 바로 아래에 숨긴 이유 안내 문구(`text-caption`)를 둔다. 가린 칸 자체는 기존대로 `{min}명 미만` 문구.
- [v2.16, Q-24] `majorField`는 `MAJOR_FIELDS`(lib/seeker/options) 안의 코드일 때만 내보내고 그 밖의 저장 값은 null. 자유 입력 `major`는 `BLIND_SEEKER_SELECT`에 넣지 않는다(BR-14).
- 구직자에게 나가는 공고 데이터는 `src/lib/serializers/publicPosting.ts`(`BLIND_JOB_FIELDS` = WO §8.5 표시 항목)만. [v2.13, Q-17] v2.12까지의 이름 `blindJob.ts`는 이 파일을 가리킨다.
- 기업 영역에서 `SeekerProfile`/`User`를 직렬화기 없이 반환·props 전달 금지. 클라이언트 컴포넌트에 Prisma 객체 직접 전달 금지.
- BLIND_PROFILE 철회자·B등급·비 JOB_MATCH·비활성 제외는 **쿼리 계층**(BR-06, BR-07).
- 면접 동의(THIRD_PARTY_INTERVIEW) 후에도 기업 응답에는 실명만(해당 면접 건·해당 기업), 연락처는 없음(PC-1, R-211). 실명은 위 `interviewDisclosure.ts`로만.
- [v2.17] 구직자에게 보이는 추천·면접 기록(`/seeker/me` 면접 건별 동의, `/seeker/me/recommended`)은 업종·시·도·날짜·상태만 — 회사명·면접 장소(상세 주소)·담당자·연락처 금지(BR-03).

### 4.5 권한 검사 (rbac)

- 모든 서버 액션과 Route Handler는 **첫 실행 문장**에서 `rbac.ts` 검사(예 `requirePermission(perm)`). 공개 예외(비자 진단·점수 계산·OTP 요청·간편 등록 시작·`/api/ingest/*`, [v2.5] 로그인·기업 회원가입·로그아웃·Auth.js `/api/auth/*`)는 `// rbac: public — 사유` 주석 필수.
- [v2.5] 관리자 서버 액션·페이지는 첫 문장에서 `requireStaff()`(`src/lib/admin/session.ts`: 세션·DB 직원 확인·2FA 단계 + 내부 `assertCan(role, "admin:access")`)를 불러도 첫 문장 검사로 본다. `admin:access` 외 권한이 필요한 행위는 바로 다음 문장에서 `assertCan(actor, "{권한}")`.
- [v2.11, H-1] 관리자 서버 액션은 `export const x = adminAction(async function x(...) { const actor = await requireStaff(); assertCan(actor, "{권한}"); … })` 형태를 허용한다. **첫 문장 판정은 안쪽 함수 본문**으로 한다. 래퍼(`src/lib/admin/actionGuard.ts`)는 본문 호출과 `AuthzError` → `{ ok: false, code }` 변환만 하며, 본문보다 먼저 실행되는 문장(입력 해석·DB·로그)을 넣거나 `AuthzError` 외 예외(redirect 포함)를 삼키지 않는다. 다른 영역(기업·구직자)에 같은 래퍼를 만들 때도 같은 조건을 지키고 4.2 트리에 먼저 기재한다.
- [v2.20, R-213] 공개 예외에 **"아직 구직 중" 원클릭 응답**(`server/actions/seeker/stillSearching.ts`, 페이지 `/[locale]/seeker/still-searching/[token]`)을 추가한다. 조건: 로그인 대신 상태 확인 메시지의 **서명 토큰**(HMAC, `lib/seeker/stillSearching.ts`)이 유일한 권한이며, 토큰은 프로필 id·발송 시각만 담고(개인정보 없음) 열린 확인 1건에만·`STATUS_CHECK_REPLY_DAYS` 안에서만·1회만 유효하다. 페이지 열람은 아무것도 바꾸지 않고(메일 스캐너 대비) 버튼 제출만 상태를 바꾼다. 페이지는 누구의 확인인지 보이지 않고 noindex(메타 + 미들웨어 헤더). 토큰 구분자는 경로에 점이 생기지 않는 `~`(점이 있으면 미들웨어 matcher를 건너뜀). 첫 문장 `// rbac: public — 사유` 주석 필수.
- [v2.9, P-2] 공개 예외에 **무료 채용 진단 제출**(R-124, 비로그인 공개 — 메인 주 CTA Q-07. 로그인 기업이면 회사에 연결만 함)을 추가한다. 기업 본인 서버 액션·페이지는 첫 문장에서 `requireEmployer()`(`src/lib/employer/session.ts`: 세션 + 내부 `assertCan(role, "employer:selfService")` + DB의 EMPLOYER·회사 연결 확인)를 불러도 첫 문장 검사로 본다. 같은 줄 주석 `// rbac: employer:selfService …` 권장.
- [v2.7, B-7] 구직자 본인 서버 액션은 첫 문장에서 `requireSeeker()`(`src/lib/seeker/session.ts`: 세션 확인 + 내부 `assertCan(role, "seeker:selfService")`)를 불러도 첫 문장 검사로 본다. 같은 줄 주석 `// rbac: seeker:selfService …` 권장.
- [v2.13] 첫 문장 판정 보충: 초기값 없는 변수 선언(`let actor: …;`)은 실행 문장으로 보지 않는다. `try { actor = await requireSeeker(); assertCan(…) } catch (e) { if (e instanceof AuthzError) return { ok: false, code: e.code }; throw e; }`처럼 `try` 블록 첫 문장이 rbac 검사이고 `catch`가 `AuthzError`만 변환하고 나머지는 다시 던지면 첫 문장 검사로 인정한다(4.5 H-1 래퍼와 같은 조건).
- `/admin/**`은 직원 역할 **+ 2FA 완료** [WO §11].
- [v2.25, I-1] **미들웨어는 라우팅 힌트만 준다.** 미들웨어(Edge)는 DB에 닿지 않으므로 클레임만으로는 로그아웃된 토큰과 살아 있는 토큰을 구별하지 못한다. 그래서 (1) 미들웨어의 판단은 "로그인 화면으로 보내기 / 2FA 단계로 보내기 / 통과"뿐이며 접근을 허락하는 최종 결정이 아니다. (2) 모든 접근 결정은 Node 쪽에서 DB 검사로 한다 — 관리자 `requireStaff()`·`requireStaffApi()`, 기업 `requireEmployer()`, 구직자 `requireSeeker()`, 그 밖의 `auth()` 호출(모두 4.11 세션 버전 검사를 거침). 미들웨어 통과만으로 데이터를 보여 주는 페이지·액션·Route Handler를 만들지 않는다. (3) 클레임이 "완료"로 보여도 Node 쪽 검사가 거부할 수 있는 화면(예 `/admin/login`)을 미들웨어가 다른 화면으로 튕기지 않는다 — 튕기면 Node 쪽 거부와 왕복 루프가 생긴다. `/admin/login`은 미들웨어가 항상 통과시키고, 페이지가 `hasVerifiedStaffSession()`(`lib/admin/session.ts`: `auth()` + 직원 역할·TOTP 등록 DB 확인 + 2FA 완료)이 참일 때만 `/admin`으로 보낸다. 로그인 페이지는 공개 화면이며 이 확인은 rbac 검사가 아니다.
- 권한 이름(예 `contact:view`, `visaCase:view`)으로 검사. [v2.3] 형식 `{대상}:{행위}`, 양쪽 camelCase, 목록은 `rbac.ts` `PERMISSIONS` 한 곳.

### 4.6 zod 스키마 공유

- 폼 스키마는 `src/schemas/**`에만, 클라이언트·서버가 **같은 import** [WO §3].
- 컴포넌트·액션 안 `z.object(` 금지.
- 위저드: `src/schemas/seeker/register/step{0..7}.ts`(SC-01 하위 화면은 같은 스텝 스키마를 화면별 `pick`으로 나눔). [v2.7, B-8] 스텝 공용 필드 조각은 같은 폴더 `fields.ts`.
- 법령 수치를 zod 규칙에 넣지 않는다(BR-12). 기업 자유 입력에는 `pii-guard`(BR-14).

### 4.7 암호화 필드 (`*Enc`)

- 개인 식별 값은 `…Enc`로만 저장 [WO §3, §5]. 암·복호는 `db.ts` extension 자동. 직접 `encrypt` 호출은 extension·해시 생성 외 금지.
- 조회는 `…Hash`만. `…Enc` 값은 기업·공개 응답 금지. 관리자 복호 표시마다 `PII_VIEW`.
- 로그에 복호 값·전화·OTP 금지(개발용 콘솔 OTP 어댑터 예외). [v2.3] 예외는 `src/lib/notifications/console.ts` 한 파일뿐: 수신자는 항상 마스킹, OTP 등 템플릿 값은 `NODE_ENV !== 'production'`에서만 출력, JSON 한 줄(5절). S-45 명령의 이 파일 매치는 위 조건을 열어 확인한다. [v2.21, Q-27·P2d O-2] params 안의 링크(`http(s)://`·`/`로 시작하는 값)는 `NODE_ENV`와 무관하게 항상 `maskLink`로 가린다(경로의 짧은 소문자 경로 단어만 남기고 토큰·id 조각과 쿼리 값은 `***`, 프래그먼트 삭제). [v2.22] 값 전체가 링크가 아니어도 **문장 안의 링크**(`http(s)://`로 시작하는 부분, 또는 값 첫머리·공백·여는 괄호·따옴표 뒤의 `/`로 시작하는 부분)를 찾아 같은 방식으로 가리고 나머지 글자와 링크 뒤 문장 부호는 그대로 둔다. [v2.23] 스킴 없는 `www.`로 시작하는 링크(앞이 단어 글자·`.`·`/`·`@`·`-`가 아닐 때)도 같은 방식으로 가리고 스킴을 덧붙이지 않고 출력한다. 콘솔 어댑터 결과는 항상 `delivery: "SIMULATED"`.
- [v2.5] 로그 출력 허용 위치: 위 콘솔 어댑터, 그리고 `src/lib/authConfig.ts`의 Auth.js `logger`(오류는 `type`, 경고는 Auth.js 경고 `code`만, JSON 한 줄, `CredentialsSignin`은 기록 안 함). 이 밖의 `console.*`는 5절 형식(JSON 한 줄, PII·비밀값·IP 원문 없음)을 지키고 S-45 검토 때 열어 확인한다. [v2.21] 작업 핸들러·알림 모듈의 **주입 가능한 로거 기본값**(`options.log ?? ((line) => console.info(line))`, 예 `lib/jobs/statusCheck.ts`, `lib/notifications/{index,smtp}.ts`)도 이 조건으로 허용한다. 내보내는 줄은 `JSON.stringify` 한 줄이고 건수·코드·마스킹 값만 담는다(구직자 id·연락처·토큰 없음). 경고 줄은 `level: "warn"`, `event`는 `{영역}.{사건}` 소문자 점 표기. [v2.22] 기본 로거는 줄의 `level`에 맞춰 `console.info`(info) / `console.warn`(warn)으로 보낼 수 있다(예 `smtp.ts` 실패 줄, `scripts/worker.ts` `log`, 경고 줄만 쓰는 `statusCheck.ts`의 기본값 `console.warn`). 출력 내용 조건은 위와 같다.

### 4.8 감사 로그 대상 (BR-15, N-05)

`src/lib/audit.ts` `AuditAction` 유니온.

| action | 시점 |
|---|---|
| `PII_VIEW` [WO] | 관리자 복호 필드 열람. [v2.17] 기업에 동의 건 실명 제공(`interviewDisclosure.ts`, meta `viewer:"EMPLOYER"`)과 직원의 비공개 파일 열람(`/api/files/[token]`, 필드 이름 `introConfirmFile`)도 이 액션 |
| `PII_EXPORT` | 내보내기(함수 단위, PC-14) |
| `SEEKER_GRADE_CHANGE` | 구직자 등급 변경 |
| `SEEKER_TRACK_CHANGE` | 트랙 변경 |
| `LEAD_GRADE_CHANGE` | 리드 등급 전이 |
| `RECOMMENDATION_CREATE` | 추천 실행 |
| `POSTING_PUBLISH` | 공고 공개 |
| `CANDIDATE_BULK_VIEW` | 후보 목록 조회마다(PC-12) |
| `RULE_PUBLISH` | 규칙·점수표 게시. [v2.20] 게시(DRAFT→PUBLISHED)는 meta `{ change: "PUBLISH", version, retiredIds }`(같은 묶음의 이전 게시 버전이 같은 트랜잭션에서 자동 폐기되면 그 id 목록), 수동 폐기(PUBLISHED→RETIRED)도 같은 액션 meta `{ change: "RETIRE", version }`. 둘 다 공개 계산을 바꾸므로 기록하고, `COMPANY_VERIFY`의 `change` 패턴과 같게 액션을 늘리지 않는다. 초안 생성·수정·새 버전(공개 영향 없음)은 감사 대상이 아니다 |
| `CONSENT_REVOKE` | 동의 철회 |
| `COMPANY_VERIFY` | 기업 검증·계약 등록(R-218, PC-2) |
| `SEEKER_REVIEW_UPDATE` [v2.10] | 구직자 검토 확인 항목(상담 완료·체류자격 확인·한국어 확인) 변경, 전환 가능성 판정(`convertibleVisa`/`convertibleAt`) 입력(R-120). meta는 필드 이름·참거짓·코드·날짜만 |

- [v2.17] 동의 **부여**에는 감사 액션을 두지 않는다(`CONSENT_GRANT` 신설 안 함): BR-15 대상(열람·내보내기·등급 변경·추천·공고 공개)이 아니고, 지우지 않는 `Consent` 행(type·version·locale·agreedAt·ipHash·interviewId)이 부여 기록이다. 철회만 `CONSENT_REVOKE`(면접 건별 거부로 유효 동의가 철회되는 경우 포함, meta `reason`).
- [v2.25, I-1] 로그인·로그아웃과 세션 버전 증가(`User.sessionVersion`, 4.11)는 감사 대상이 아니다: BR-15 대상(열람·내보내기·등급 변경·추천·공고 공개)이 아니고 개인정보를 읽거나 바꾸지 않는다. 새 감사 액션(`SIGN_OUT` 등)을 만들지 않는다.
- `meta`에 평문 PII 금지. `AuditLog`·`Recommendation`은 앱 코드 `update`/`delete`/`upsert` 0건 + DB 트리거(BR-09, R-006).
- [v2.19, P2c run 3] **meta 연락처 검사와 식별자 면제** (`src/lib/audit.ts` `assertSafeMeta`): meta의 모든 문자열은 연락처 검사(`hasContacts`)를 거치고, 키 이름이 `(Enc|password|secret|token|otp|totp)$`이면 거부한다. 면제는 아래 **두 조건을 모두** 만족할 때만:
  1. 키 이름이 식별자: `id`, `…Id`, `…Ids`, `verifiedBy`(정규식 `^(id|verifiedBy)$|Ids?$`, 배열 원소는 부모 키를 따른다).
  2. 값이 정확히 DB 식별자: cuid(`^c[0-9a-z]{20,31}$` — `c` 포함 전체 21~32자, 구분 기호 없음) 또는 uuid(소문자 8-4-4-4-12).
  - 식별자 키 아래의 자유 문자열·그 밖의 형식은 그대로 검사한다. DB id는 평문 PII가 아니며(무작위 값), 어떤 행을 열람·변경했는지 남기는 것은 BR-15 취지에 맞으므로 목록 열람 `PII_VIEW`의 meta에 열람한 행 id 목록(예 `companyIds`)을 둘 수 있다.
  - 연락처 필드 이름(`phone`, `email`, `messengerId`, `messengerType` 등)은 meta 키로 쓰지 않는다(`messengerId`는 정규식상 식별자 키에 걸리지만 면제 대상으로 보지 않는다). 면제 정규식을 넓힐 때는 이 절과 `tests/unit/lib/auditIdentifiers.test.ts`를 함께 바꾼다.

### 4.9 법령 수치 하드코딩 금지 검사 방법 (BR-12, R-128)

대상 `src/` 전체(테스트·시드·messages·content 제외).

1. 비자 코드 리터럴: `rg -n "['\"\`](A|B|C|D|E|F|G|H)-[0-9]{1,2}(-[0-9A-Z]{1,2})?['\"\`]" src` → 0건. (메인 비자 위젯의 비자 박스 목록도 DB에서 읽는다 — 핸드오프 마크업의 `E-9`, `E-7` … 하드코딩을 옮기지 않는다.)
2. 규칙·점수 모듈 숫자: `rg -n "\b[0-9]{2,}\b" src/lib/visa-engine src/lib/score` → 0건.
3. 매핑 상수: `rg -n "(Record<|Map<|switch\s*\().*visa" -i src/lib/visa-engine` 결과를 눈으로 확인.
- 시드 `sampleRules.ts`, `sampleScoreTable.ts`: 상단 `// SAMPLE — 실제 법령 수치 아님 (BR-12)`, 모든 행 `isSample: true`, `status: 'DRAFT'`. D-2 졸업 기준 개월 등 트랙 조건은 `VisaType` 데이터(SC-05). 시·군·구·인구감소지역은 에이전트 초안 + `isSample`·검토 필요 표시(PC-6).
- [v2.16, Q-24] 법령 수치가 아니지만 운영자가 아직 확정하지 않은 **코드 목록**(예: `MAJOR_FIELDS` — ISCED-F 2013 대분류 + OTHER/UNKNOWN 초안)은 DB 시드 `isSample`/`DRAFT` 대상이 아니라 코드 상수로 둔다. 표시: 상수 위 주석에 "운영자 검토 필요"와 출처, 같은 파일에 `{상수명}_SOURCE = { basis, reviewStatus: 'OPERATOR_REVIEW_REQUIRED', decision }`. 확정되면 `reviewStatus`를 바꾸고 Gate 보고의 운영자 검토 목록에서 뺀다. 목록 밖 저장 값은 기업에 내보내지 않는다(4.4).
- [v2.2] 등록 완료 가능 여부는 `VisaType.registrable`만으로 판정한다. `defaultTrack`이 있어도 `registrable=false`면 등록 완료 대신 상담 신청 안내(SC-02 "기타"=OTHER). `defaultTrack` null 여부로 등록 가능을 판단하지 않는다.

### 4.10 테스트 위치·명명

- 단위 `tests/unit/{src 경로 미러}/{파일명}.test.ts`, E2E `tests/e2e/{기능}.spec.ts`, `src/` 안 테스트 금지.
- [v2.2] `src/` 밖 대상: `scripts/**` → `tests/unit/scripts/`, `prisma/`(스키마·마이그레이션·트리거·시드)와 DB 통합 → `tests/unit/db/`(공용 도우미 `helpers.ts` 허용). Vitest `globalSetup` 등 실행 설정은 `tests/setup/`.
- [v2.5] 테스트가 아닌 공용 도우미: 단위 테스트 픽스처는 쓰는 테스트와 같은 폴더에 camelCase `{주제}Fixtures.ts`(예 `tests/unit/lib/authFixtures.ts`), E2E 도우미는 `tests/e2e/support/`. 이름에 `.test`/`.spec`을 붙이지 않는다.
- [v2.9, P-3] 한 src 파일에 대응하지 않는 **교차 테스트**(여러 진입점을 같은 규칙으로 묶어 확인, 예 R-129 429 3종)는 주 모듈의 미러 폴더에 `{모듈}{주제}.test.ts`로 둔다(예 `tests/unit/lib/rateLimit429.test.ts`). PRD 태그(`R-xxx`)는 필수. [v2.22] PRD 비기능 조건을 확인하는 묶음 테스트는 `N-xx`(PRD 5절 번호)를 PRD 태그로 쓴다(예 `tests/unit/lib/auditCoverage.test.ts` N-05, `tests/e2e/mobile-375.spec.ts` N-04).
- [v2.10, G-2] PLAN의 "만들거나 고칠 파일"에 적힌 테스트 경로·파일명이 이 절과 다르면 **이 절(미러 위치·camelCase)을 따른다**. 교차 테스트의 미러 폴더명이 모듈을 드러내면 파일명의 모듈 접두를 생략할 수 있다(예 `tests/unit/lib/admin/piiView.test.ts` — R-122, 관리자 복호 열람 진입점 묶음).
- WO §15 필수 테스트 11개는 이름에 `WO15-01`~`WO15-11`, PRD 검증 테스트는 `R-xxx` 태그.
- 시간 의존 테스트는 가짜 시계.
- 메인 E2E는 6개 로케일 × R-101 요소 존재 + JS 비활성 가독성(S-57) + reduced-motion(S-58).

### 4.11 세션·로그아웃 보안 [v2.25, 통합 QA I-1]

- **세션 방식**: Auth.js JWT(암호화 쿠키) 유지, 세션 테이블 없음. 클레임은 `sub`·`role`·`twoFactorVerified`·`totpEnrolled`·`authTime`·`sv`만(이메일·전화·이름 금지).
- **서버 측 무효화(세션 버전)**: `User.sessionVersion Int @default(0)`. 로그인 때 Node 쪽 JWT 콜백(`src/auth.ts` → `applySessionVersion`)이 현재 값을 `sv`로 넣고, 그 뒤 모든 `auth()`(페이지·서버 액션·Route Handler·`/api/auth/session`)에서 `sv`를 DB 값과 비교해 다르거나 없거나 계정이 없으면 `null`(세션 없음)을 돌려준다. 이 검사는 Node 런타임에서만 한다.
- **로그아웃은 서버 측 무효화다**: 쿠키 삭제만으로 로그아웃을 구현하지 않는다. 모든 로그아웃 경로(관리자 `signOutStaff`의 `signOut()`, 구직자·기업의 Auth.js `/api/auth/signout`)는 Auth.js `events.signOut` 한 곳(`revokeSessions`)을 거친다. 증가는 **조건부**: `where { id: sub, sessionVersion: token.sv }`로 토큰의 `sv`가 현재 값일 때만 1 올린다 — 이미 무효인 옛 토큰으로 더 새로운 세션을 끊지 못한다. 결과: 로그아웃한 토큰과 그 복사본은 만료 전이라도 거부된다. 다른 로그아웃 경로를 새로 만들면 같은 이벤트를 거쳐야 한다.
- **미들웨어는 읽기 전용**: `src/middleware.ts`는 Auth.js 인스턴스(`NextAuth(authConfig).auth`)를 쓰지 않고 `readSessionClaims`(`next-auth/jwt` `getToken`, 쿠키 헤더만, `__Secure-`·일반 쿠키 이름)로 클레임을 복호해 라우팅 힌트로만 쓴다(4.5). 세션 쿠키를 쓰거나 갱신하는 응답(`Set-Cookie: …authjs.session-token`)을 보내지 않는다 — 로그아웃 순간 처리 중이던 요청의 응답이 쿠키를 되살리지 못하게. Edge 코드에서 Prisma·`src/auth.ts` import 금지(타입 import 제외).
- **슬라이딩 만료 없음**: 세션 수명은 **로그인 시각(`authTime`) 기준 절대 만료**다 — 직원 `STAFF_SESSION_MAX_AGE_SEC`, 그 밖 `SESSION_MAX_AGE_SEC`(`config/limits.ts`). 요청·활동이 만료를 늘리지 않으며, 앱 코드(미들웨어·페이지·액션·Route Handler)는 세션 쿠키를 재발급해 만료를 연장하지 않는다. 쿠키·JWT `exp`가 라이브러리 동작으로 다시 서명되더라도 서버 측 판단은 `authTime + 수명`으로 한다. 2FA 완료(`unstable_update`)는 클레임을 바꾸되 `authTime`을 바꾸지 않는다.
- **마이그레이션 영향**: `sv` 없는 기존 토큰은 거부된다(배포 후 1회 재로그인). 계정 삭제 시 그 계정의 토큰도 거부된다.
- **개인정보 아님**: `sessionVersion`은 운영 카운터다. `…Enc`·`…Hash`, 감사(4.8), 블라인드 화이트리스트(4.4) 대상이 아니며 기업·공개 응답에 내보내지 않는다.
- **테스트**: 단위(세션 버전 부여·불일치 거부·조건부 증가·미들웨어 읽기 전용 복호)와 E2E(로그아웃 전 쿠키 재주입이 관리자·구직자·기업 화면을 열지 못함, 로그아웃과 동시 진행 요청 반복에도 세션이 살아나지 않음). 이름·위치는 4.10을 따른다.

---

## 5. 자동화·데이터 (수집 API·오류·로그)

- **입력** `POST /api/ingest/job-leads` [WO §8.1]: `x-api-key`, JSON 배열 1~200. 스키마 `src/schemas/ingest/jobLead.ts`, 원문 `rawJson`.
- **출력** [제안]: `200 { created, updated, rejected: [{ sourceRef, reason }] }`.
- **API 오류 형식** [제안]: `{ "error": { "code": "UPPER_SNAKE", "message": "..." } }`. 400 형식, 401 미인증·키 없음, 403 권한·만료 서명 URL, 404 없음·플래그 off(SC-07), 409 중복, 422 업무 규칙 위반, 429 속도 제한.
- 화면 오류 문구는 `errors.{code}` 번역 키. [v2.5] 코드(UPPER_SNAKE)는 키에서 lowerCamelCase로 바꾸고(`BIZ_REG_NO_TAKEN` → `bizRegNoTaken`), 묶음이 필요하면 `errors.{그룹}.{코드}`(`errors.field.*` = zod 필드 오류 코드, `errors.auth.*` = 인증·가입 실패 코드). 알 수 없는 코드는 그룹의 `unknown`.
- 로그: JSON 한 줄, PII·비밀값 금지.
- [v2.21, Q-27] **알림 전달 결과**: `NotificationProvider.send`의 결과는 `delivery`를 가진다 — `REAL`(실제 채널이 받아들임, 예 SMTP 수락), `SIMULATED`(로그에만 남음, 콘솔 어댑터 — 아무도 받지 못함), `FAILED`(`ok: false`). "구직자가 메시지를 받았다"에 기대는 상태 전이(30일 상태 확인의 14일 무응답 INACTIVE·S→A, R-213)는 **REAL로 1건 이상 전달된 확인에만** 적용하고 그 사실을 행에 기록한다(`SeekerProfile.statusCheckDeliveredReal`, 운영 플래그 — 개인정보 아님, `…Enc`·감사·블라인드 화이트리스트 대상 아님). SIMULATED 확인은 기한이 지나면 상태·등급 변경 없이 닫기만 한다. 전이가 아닌 기록(체류 만료 StaffTask 등)은 같은 방식으로 만들고 payload에 `delivery` 코드를 남긴다. 실제 채널이 하나도 없으면 워커 시작 때 `{ level: "warn", event: "status_check.transition_disabled", reason: "NO_REAL_CHANNEL" }` 경고 한 줄. 테스트는 REAL을 돌려주는 모의 채널로 전이를 확인한다.

---

## 6. 점검표

각 항목은 예/아니오. "P"는 처음 적용되는 Phase(이후 계속 적용). v2에서 바뀐 항목은 번호 옆 †, 신설은 ‡. 표 안 명령의 `\|`는 마크다운 표 이스케이프이며 실행할 때는 정규식 대체 `|`로 읽는다.

| 번호 | P | 점검 항목 | 확인 방법 |
|---|---|---|---|
| S-01† | 0 | `globals.css`의 원본 토큰(2.1.1~2.1.4), shadcn 변수(2.2.1), `@theme` 노출(2.2.2)이 이 기준서 표의 hex·이름과 같은가(보정값 포함: `--input` #868E9C, `--grad-cta`, `--accent-foreground` `--blue-700`) | 파일 열어 대조 |
| S-02† | 0 | `globals.css`·`brand.css` 외 코드에 하드코딩 색(`#hex`, `rgb(`/`rgba(`, Tailwind 기본 팔레트 유틸)이 0건인가 | `rg "#[0-9a-fA-F]{3,8}\b\|rgba?\(\|(text\|bg\|border\|ring\|from\|to\|via)-(red\|green\|yellow\|blue\|slate\|gray\|zinc\|neutral\|amber\|orange\|sky\|cyan\|indigo)-[0-9]{2,3}" src --glob '!**/globals.css' --glob '!**/brand.css'` |
| S-03† | 0 | 글꼴이 `next/font/google`(Noto Sans KR(v2.4), Inter, Noto Sans SC)로만 로드되고, 외부 CDN(jsDelivr·fonts.googleapis) `<link>`/`@import`가 0건인가 | `src/lib/fonts.ts` 확인, `rg "jsdelivr\|fonts\.googleapis\|@import url\(.?https" src` |
| S-04† | 0 | 로케일별 폰트 스택 1순위가 2.3.2와 같은가(ko=Noto Sans KR(v2.4), en·vi·ru·uz=Inter, zh=Noto Sans SC), Inter 서브셋에 vietnamese·cyrillic 포함, Noto Sans SC는 zh에만 적용, (v2.4) zh 스택에서 중국어 시스템 글꼴이 Noto Sans KR보다 앞인가 | `[locale]/layout.tsx`, `fonts.ts`, `fontsZh.ts`, `globals.css` `html:lang(zh)` |
| S-05† | 1 | 글자 크기가 `--text-*` 토큰으로만 지정되고(임의 `text-[..]` 0건), 11.5px 미만 텍스트 0건, 고지·필수 문구·도움말·오류·공개 배지 13px 이상, 입력란 16px 이상인가 | `rg "text-\[" src`, `@theme` 토큰 확인, 렌더 후 computed font-size 표본 |
| S-06† | 0 | 간격·반경 임의값(`p-[..]`, `m-[..]`, `gap-[..]`, `space-*-[..]`, `rounded-[..]`)이 0건이고, 그림자가 2.5 목록(`shadow-1/2/3/glow/cta/ink/orange/tab`)만이며 Tailwind 기본 `shadow-sm/md/lg/xl/2xl/inner` 0건인가. (v2.1) 그 밖의 대괄호 임의값은 2.4 허용 범위(기준서에 적힌 [HO] 측정값)뿐인가 | `rg -o "[a-z:-]+-\[[^\]]+\]" src --glob '*.tsx'` 결과 중 `data-[..]`·`aria-[..]` 외 항목을 2.4와 대조, `rg "(p\|px\|py\|m\|mx\|my\|gap\|space-[xy]\|rounded)-\[" src`, `rg "shadow-(sm\|md\|lg\|xl\|2xl\|inner)\b\|shadow-\[" src` |
| S-07† | 1 | 주요 공개·구직자 화면이 375px(및 390·768·1440)에서 가로 스크롤이 없는가. (v2.23) 보이는 조작 요소가 뷰포트 밖으로 잘리지 않는가(2.6) | Playwright 뷰포트별 `scrollWidth <= clientWidth` + 조작 요소 boundingBox가 [0, 뷰포트 폭] 안(2.6 제외 조건) |
| S-08† | 1 | (v2.10) 모든 화면(관리자 포함)의 버튼·링크 버튼·칩·탭·언어 전환·선택 행이 **모든 폭**(375·1440 포함)에서 44px 이상인가(B-10) | 렌더 후 boundingBox 측정, `rg "lg:(min-)?h-(8\|8\.5\|9\|9\.5\|10\|10\.5)\b" src` 0건 |
| S-09 | 1 | 판정·등급·공개 여부 표시가 색과 함께 아이콘+글자를 갖는가 | 컴포넌트 코드 |
| S-10† | 0 | 사용한 shadcn 컴포넌트가 3.1 목록 안에 있고, `avatar`가 없으며, 버튼 variant가 `default/brand/seeker/outline/glass/ghost/destructive`·크기 `sm/default/lg`(모두 `rounded-full`)로 정의되어 있는가 | `src/components/ui/` 대조, `button.tsx` cva |
| S-11† | 0 | 아이콘이 `lucide-react`만이고 `strokeWidth` 1.5(체크 2)로 통일되어 있는가 | 의존성, `rg "lucide-react" -A0`, 아이콘 래퍼 또는 사용처 표본 |
| S-12† | 1 | 위저드 상단 `WizardProgress`에 막대와 "n/7 · 단계명"이 함께 보이는가(SC-03) | 렌더 |
| S-13† | 1 | 위저드 각 필드에 공개 여부 아이콘이 있고 단계 하단에 "블라인드 공개 / 비공개" 요약 목록이 있는가(SC-04), 문구가 WO §7.1과 같은가 | 렌더 + messages |
| S-14† | 1 | 위저드 각 화면 동시 표시 문항 ≤7(v2.7: WO §7.3 표 한 행 = 1문항, 3.3)이고 Step 3·5가 하위 화면 2개로 나뉘었는가(SC-01) | 스키마·화면 대조 |
| S-15† | 1 | "모름"이 SC-02 범위(v2.7: 3.3 열거 목록, `pendingApplication` 포함 — Q-10)에 있고 `visaCode` 모름/기타 → 상담 안내, `hasArc`·`needDormitory`는 예/아니오만, `shiftOk` enum이 SC-10인가 | 스키마 enum·옵션·흐름 |
| S-16 | 1 | 비자 표시가 모두 `VisaLabel`(코드+쉬운 설명)인가. (v2.7) 예외는 3.2 VisaLabel ①~③과 (v2.10) 3.2 관리자 화면 예외뿐: native `<option>` 문자열, OTHER·NONE·UNKNOWN 행은 이름만(코드 노출 0), 세부 유형은 코드만 + 상위 VisaLabel 동반 | `rg "visaCode" src/components src/app` 렌더 지점 |
| S-17 | 1 | 진단·채용 진단·점수 결과 모두에 "참고용, 행정사 확인 필요"가 있고 숨기는 prop·조건이 없는가 | `OutcomeCard`·`ScoreResult` + 렌더 |
| S-18† | 1 | 판정 라벨이 3.4 3개뿐이고 단정 표현이 없으며 [전문가 검토 필요] 대상으로 표시되는가(SC-12) | messages ko |
| S-19† | 1 | 법적 문서 전부에 "[전문가 검토 필요]"가 있고 `ExpertReviewMark`로 렌더되며 번역본은 한국어 원문 병기인가(SC-08) | `content/consents/**`, `/terms`, `/privacy` |
| S-20 | 1 | 수요 지도 고지가 `NoticeBox`로 데이터 위에, 6개 언어로 표시되는가(`/demand`와 메인 미리보기 모두) | 렌더(6 로케일) |
| S-21 | 1 | 수요 지도(및 메인 미리보기) 버튼이 WO §8.4의 2개뿐인가 | 렌더 |
| S-22 | 1 | "구직자 이용료 없음"이 메인·구직자 등록·`/fees`에 표시되는가 | 렌더 |
| S-23† | 1 | messages·화면에 3.5 금지 표현(지원하기/지원 가능/Apply, 연락 유도, 보장, 구직자 대상 수수료, "n개 공고"·"진행 중 공고", 용어집 금지어 사업주·근로자)이 0건인가 | `rg -i "지원하기\|지원 가능\|지원할 수\|apply\|연락처 보기\|채팅\|메시지 보내기\|보장\|100%\|개 공고\|진행 중 공고\|사업주\|근로자\|소개 수수료" messages src` 후 문맥 확인 |
| S-24† | 1 | 구직자↔기업 직접 연락 UI·API가 0건이고, 외부 메신저·`tel:`·`mailto:` 링크는 site.config 운영자 연락처를 쓰는 푸터·최종 CTA·서랍 외 0건인가(BR-01). (v2.7, B-6) 예외: 구직자 본인 추천 링크 공유(PC-9) — `components/seeker/referral-share.tsx` 한 곳의 Web Share·링크 복사·WhatsApp/Telegram/Viber 공유 URL, 공유 내용은 추천 링크·문구만(연락처 없음) | `rg -i "mailto:\|tel:\|wa\.me\|t\.me\|zalo\.me\|m\.me\|kakao\|whatsapp\|messenger" src` |
| S-25† | 1 | 플래그 off 시 페이지 `ComingSoon`(200, noindex, sitemap 제외), 내비·메인 링크와 메인 수요 지도 섹션 숨김, API 404인가(SC-07) | 플래그 미설정 빌드 |
| S-26 | 1 | 점수표·규칙 미게시 시 `/score/e74`가 `ComingSoon` + 상담 신청인가 | 시드 상태 렌더 |
| S-27 | 1 | 등급 표시가 `GradeBadge`로 통일되어 있는가(v2.10: 관리자는 3.2 관리자 화면 예외 — 글자 표시 + 1.1 등급 구분) | `rg "grade" src/components src/app` |
| S-28 | 0 | 6개 messages 첫 키가 `"_review": "native review required"`인가 | 파일 첫 줄 |
| S-29 | 0 | `pnpm i18n:check` 누락 키 0 | 명령 실행 |
| S-30 | 0 | 번역 키 형식이 3.6절을 따르는가 | 표본 20개 이상 |
| S-31 | 1 | 비관리자 화면 하드코딩 사용자 문자열 0건 | ESLint jsx-no-literals 또는 `rg` |
| S-32† | 1 | 금액·날짜·숫자(카운트업 프레임 포함)가 next-intl formatter로 출력되고 `toLocaleString('ko-KR')` 같은 고정 로케일·문자열 연결이 0건인가(v2.10: 관리자는 `ko-KR` 고정 `Intl` 상수 허용, `toLocaleString`·단위 연결은 관리자도 0건, v2.11: 관리자 `Intl` 숫자 뒤 명·건·일은 허용, 원화는 KRW만) | `rg "toLocaleString\|\+ ?['\"]원['\"]" src` |
| S-33 | 1 | 동의서 본문이 `content/consents/...`에 있는가 | 경로 |
| S-34† | 0 | 디렉터리가 4.2 트리(`brand.css`, `components/home/` 포함)를 따르고 트리에 없는 `src/` 최상위 폴더·`agency/`가 없는가 | 폴더 목록 |
| S-35† | 0 | 파일명 규칙(4.3)과 brand.css 클래스 `vj-` 접두를 따르는가 | 파일·클래스 목록 |
| S-36 | 0 | `strict: true`, `any` 0건 | `tsconfig`, `rg ": any\b\|as any\b" src` |
| S-37 | 2 | 기업 대상 구직자 데이터가 모두 `blindSeeker.ts`(v2.17: 동의 건 실명은 `interviewDisclosure.ts`)를 거치고 화이트리스트로 새 객체를 구성하는가 | 기업 영역 `rg "prisma\.(seekerProfile\|user)"` + 코드 |
| S-38 | 2 | `BLIND_SEEKER_FIELDS` = WO §7.5 | 대조 |
| S-39† | 2 | 구직자 대상 공고가 `publicPosting.ts`(v2.13, `BLIND_JOB_FIELDS`)를 거치고 금지 키가 없는가 | 코드 + 응답 |
| S-40 | 0 | 모든 서버 액션·Route Handler 첫 문장 rbac 또는 공개 주석 | 전수 열람 |
| S-41† | 1 | `/admin/**` 역할 + 2FA. (v2.25) 접근 결정이 Node 쪽 DB 검사(`requireStaff`)에 있고 미들웨어는 라우팅 힌트만인가(4.5) | 레이아웃·미들웨어·`lib/admin/session.ts` |
| S-42 | 1 | zod 스키마가 `src/schemas/**`에만 | `rg "z\.object\(" src --glob '!src/schemas/**'` |
| S-43 | 0 | 식별 값 `…Enc`/`…Hash`, 주민·외국인등록·여권번호 필드 0 | `schema.prisma`, `rg -i "passport\|arcNo\|alienReg\|residentNo\|registrationNumber" prisma src` |
| S-44 | 0 | 직접 암·복호 호출 0건(예외 제외) | `rg "encrypt\(\|decrypt\(" src --glob '!src/lib/crypto.ts' --glob '!src/lib/db.ts'` |
| S-45 | 0 | 로그에 PII·OTP·비밀값 없음 | `rg "console\.(log\|info\|warn\|error)" src` |
| S-46† | 0 | `AuditAction`이 4.8 목록(`COMPANY_VERIFY`, v2.10 `SEEKER_REVIEW_UPDATE` 포함)을 포함하고 각 행위에서 기록하는가 | 서버 함수 열람 |
| S-47 | 0 | `recommendation`·`auditLog` update/delete/upsert 0건 | `rg "(recommendation\|auditLog)\.(update\|delete\|upsert)" src` |
| S-48 | 1 | 4.9 검사 1·2 0건, 3 수동 확인 통과 | 4.9 명령 |
| S-49 | 0 | 샘플 시드 `SAMPLE` 주석, `isSample: true`, `status: 'DRAFT'` | 시드 열람 |
| S-50 | 0 | 테스트 위치 규칙, `src/` 안 테스트 0건 | `rg --files src \| rg "\.(test\|spec)\.tsx?$"` |
| S-51 | 2 | `WO15-01`~`WO15-11` 태그 존재 | `rg "WO15-(0[1-9]\|1[01])" tests` |
| S-52 | 0 | API 오류 형식·상태 코드 5절 | Route Handler 표본 |
| S-53 | 0 | 운영 수치가 `limits.ts` 한 곳에만(SC-05). [v2.5] 운영 수치 = 운영자가 바꿀 수 있는 정책 값(횟수·기간·잠금·창 크기·비밀번호 길이·OTP 길이·가중치 등). 화면 문구가 그 값을 말해야 하면 messages에 숫자를 쓰지 않고 ICU 인자로 넘긴다. 입력 형식에서 정해지는 상한(이메일 254, 전화 입력 32, 코드 식별자 40, 로케일 8, TOTP 6자리, 사업자등록번호 10자리)과 저장 보호용 자유 입력 길이 상한은 스키마 리터럴 허용. [v2.18] 다른 운영 수치에서 정해지는 설정값(예 서버 액션 본문 상한 `SERVER_ACTION_BODY_LIMIT` = `INTRO_CONFIRM_MAX_BYTES` + 폼 여유분)은 따로 숫자를 적지 않고 `limits.ts` 안 파생식으로 두며, 관계를 단위 테스트로 확인한다 | `rg "\b(200\|100\|60\|30\|14)\b" src --glob '!src/config/**'` 결과 열람, `limits.ts` 상수의 값이 messages에 숫자로 중복되지 않았는지 확인 |
| S-54 | 0 | `site.config.ts`·`flags.ts`가 `src/config/`, 플래그 4종 기본 false | 열람 |
| S-55† | 1 | `<html lang>`이 현재 로케일이고 `LocaleSwitcher`가 **6개 언어만** 자국어 이름으로 표시하며(th·id·ne·km·mn·my 0건), 전환 시 경로 유지되는가 | 렌더, `rg "ภาษาไทย\|Bahasa\|नेपाली\|ភាសាខ្មែរ\|Монгол" src messages` 0건 |
| S-56 | 1 | `.env` git 제외, `.env.example`만 커밋 | `.gitignore` |
| S-57‡ | 1 | Reveal 계약: 콘텐츠에 opacity 0 시작 상태·opacity 키프레임이 없고(오버레이 제외), JS 비활성 렌더에서 메인·공개 페이지 텍스트가 모두 보이는가 | `rg "opacity-0\|opacity:\s*0" src` 결과 확인, Playwright `javaScriptEnabled:false`로 H1~H3·버튼 visible |
| S-58‡ | 1 | `prefers-reduced-motion: reduce`에서 reveal·카운트업·장식 애니메이션·자석·부드러운 스크롤이 모두 꺼지는가 | Playwright `reducedMotion:'reduce'` + computed style |
| S-59‡ | 1 | 메인 구성이 3.7 순서를 따르고 "제외" 섹션(서비스 흐름, 견적 계산기, 비자 탐색기, 인재 쇼케이스, 공고 목록, 사례·후기, 인사이트, 로고 마퀴, 필름 모달, 채팅 FAB)이 코드·화면에 0개인가 | `src/components/home/` 목록, 렌더 |
| S-60‡ | 1 | 메인의 실적·규모 숫자가 site.config 운영자 값에서만 오고, 값이 없으면 해당 영역이 렌더되지 않으며, 핸드오프 예시 숫자가 0건인가(PC-7) | `rg "12,4\|12,480\|1,240\|94\.2\|5\.8\|428\|924\|68개\|16개국" src messages` 0건, 빈 config 렌더 |
| S-61‡ | 1 | 카운트업 지표가 SSR HTML에 최종 값으로 들어 있는가(0이 쉬는 상태 아님) | `curl` 또는 Playwright JS 비활성 HTML 확인 |
| S-62‡ | 1 | 히어로에 `<video>`·`<iframe>`이 없고, 움직이는 필름 층이 <1025px·reduced-motion에서 렌더되지 않으며, 모바일 LCP 요소가 히어로 텍스트(H1 또는 부제 문단, v2.4)인가. (v2.22, Q-28) 그 H1·리드 문단에 reveal 진입 애니메이션이 없는가(2.7 Reveal 계약 6항) | 렌더, Lighthouse LCP element, `src/components/home/hero.tsx`의 H1·리드 `<p>`에 `reveal` 클래스·`--reveal-y` 0건, `js-reveal` 상태 computed `transform` = `none` |
| S-63‡ | 1 | 2.8 접근성 보정이 반영되었는가: `--n400` 글자 0건, 흰 글자 버튼이 `--grad-cta` 사용, 파랑 글자는 `--blue-600/700`, 어두운 면 글자 단색 면 `white/50` 이상(핸드오프 .42·.45 자리는 `white/60`)·아트 위 `white/72` 이상, 입력 테두리 `--input` — 그리고 메인·about·fees·terms Lighthouse 모바일 접근성 ≥90, axe `color-contrast` 위반 0 | `rg "text-n400\|text-brand-blue\b\|text-white/([1-4][0-9]?)\b" src` 0건 + 표본 확인, Lighthouse·axe |
| S-64‡ | 1 | 오렌지(`brand-orange`, `seeker` 버튼)가 구직자 쪽 CTA·배지 외에 쓰이지 않고, 기업 주 행동은 `brand`/`default`인가 (v2.14: `orange` 틴트 배지는 주의·대기 표시로 대상 밖) | `rg "brand-orange\|variant=\"seeker\"" src` 사용처 확인 |
| S-65‡ | 1 | `word-break: keep-all`이 `:lang(ko)`에만 적용되고 zh 페이지에 적용되지 않으며, vi 제목 줄간격 ≥1.2, 전 로케일 `overflow-wrap: anywhere`인가 | `globals.css`, zh·vi 렌더 |
| S-66‡ | 1 | `SiteNav`가 메인에서만 히어로 위 투명이고 그 외 페이지는 처음부터 불투명이며, 높이 76/66/64px, <1025px 버거 + sheet(스크롤 잠금·Esc·포커스 복귀)인가 | 렌더·키보드 테스트 |
| S-67‡ | 1 | 7절 충돌 목록(K-01~K-14)의 처리(제외/변형)가 모두 반영되었는가 | 7절 표를 한 행씩 대조 |
| S-68‡ | 1 | 메인 비자 진단 위젯의 비자 목록이 DB(`VisaType`)에서 오고 결과가 `evaluate.ts` + `OutcomeCard`로 나오는가 | 코드 + 렌더 |
| S-69‡ | 1 | 포커스 표시가 2.8 규칙(2px `--blue` outline offset 3px 또는 shadcn `ring-ring`, 입력 4px 글로)이고 `outline-none`만 있는 요소가 0건인가 | `rg "outline-none" src` 후 `focus-visible:` 동반 확인 |
| S-70‡ | 1 | 푸터·히어로·라이선스 카드의 사무소명·등록번호·대표자·주소가 site.config에서 오고, 핸드오프 플레이스홀더(비전잡, 000-00-00000, 2026-0000, 02-1234-5678, 올림픽로 300, visanjob.co.kr)가 0건인가 | `rg "비전잡\|000-00-00000\|2026-0000\|1234-5678\|올림픽로 300\|visanjob\.co\.kr" src messages` |
| S-71‡ | 1 | JSON-LD에 `JobPosting` 타입이 0건인가(WO §13) | `rg "\"@type\":\s*\"JobPosting\"\|'@type': 'JobPosting'\|@type.*JobPosting" src` |
| S-72‡ | 1 | 공개 화면에 구직자 개별 프로필(익명 포함)·고객사 이름·로고가 게시되지 않는가(K-03, K-05) | 메인·공개 페이지 렌더, `src/components/home/` |
| S-73‡ | 1 | (v2.25) 로그아웃이 서버 측 무효화인가: 모든 로그아웃 경로가 `events.signOut`(조건부 `sessionVersion` 증가)을 거치고, 모든 `auth()`가 `sv`를 DB와 비교하며, 로그아웃 전 쿠키를 다시 넣어도 관리자·구직자·기업 화면이 열리지 않는가(4.11) | `src/auth.ts`·`lib/authCredentials.ts` 열람, `rg "signOut\(\|api/auth/signout" src`, 쿠키 재주입 E2E |
| S-74‡ | 1 | (v2.25) 미들웨어가 읽기 전용이고 슬라이딩 만료가 없는가: `src/middleware.ts`에 `NextAuth(`·`@prisma/client` 값 import·`@/auth` import 0건, 미들웨어 응답에 세션 Set-Cookie 0건, 세션 수명 판단이 `authTime + 수명`인가(4.11) | `rg "NextAuth\(\|from \"@/auth\"\|@prisma/client" src/middleware.ts src/lib/authConfig.ts src/lib/authGuard.ts`(`import type` 매치는 허용), 수명 검사 코드 열람 |

---

## 7. 핸드오프 ↔ BR·PRD 충돌 목록과 처리

> 핸드오프 요소 중 BR·PRD·DECISIONS와 부딪히는 것. 처리 "제외" = 구현하지 않음, "변형" = 시각 언어는 유지하고 내용·동작을 바꿈, "확인 필요" = PRD·BR로 판단 불가(8.2절로 올림). 위치는 `reference/` 기준 파일:줄.

| 번호 | 핸드오프 요소 (위치) | 부딪히는 규칙 | STANDARD 처리 |
|---|---|---|---|
| K-01 | 구직자 섹션 메신저 버튼 4개 카카오톡·WhatsApp·Zalo·Messenger (`index.html:577-580`), 채팅 FAB 채널 그리드 (`index.html:866-869`), 대상 카드 문구 "카카오톡·왓츠앱으로 바로 문의하세요"(`data.js:47`), 빈 결과 문구 "카카오톡으로 문의해 주세요"(README §10) | BR-01(운영자 연락은 허용이나 구직자에게 메신저 링크 공유 UI는 금지 목록과 경계가 겹침), PRD에 요구 없음, 운영자 채널 ID 없음(PC-9: 카카오·Zalo는 Phase 3) | **제외**. 운영자 메신저 채널 표시는 **확인 필요 C-16**. 운영자 전화·이메일은 site.config 값이 있을 때만 푸터·최종 CTA·서랍에 표시(허용) |
| K-02 | 협력기관 카드·패널 "구인·구직 풀 실시간 공유", "매칭 수수료 최대 6:4 배분", "비자 서류 검토 본사 지원"(`data.js:34-39`), 지도 CTA "지역 협력기관 되기"(`index.html:516`), 최종 CTA "파트너 신청"(`index.html:711`), 푸터 "수수료 배분 구조"(`index.html:760`) | WO §9.5(협력 소개소는 인재 DB·공고·수요 지도 원자료 접근 불가), BR-02, PRD §2(협력 소개소 포털 Phase 3 제외) | 문구·CTA **제외**. 대상 선택 세 번째 카드의 대상·목적지는 **확인 필요 C-15** |
| K-03 | 인재 쇼케이스 10명 익명 프로필(국적·비자·경력·한국어·기술·`VERIFIED · VN-2418`, E-9 포함) (`index.html:539-556`, `data.js:164-175`), "전체 인재 풀 열람" 버튼(`index.html:549`) | BR-02(화이트리스트·서버 직렬화), BR-06·07(S·A·JOB_MATCH만, E-9 기업 노출 금지), R-205(검증·계약 기업만 열람) | **제외**(공개 화면 구직자 프로필 게시 금지) |
| K-04 | 후기 카드 구직자 실명·국적·비자·지역·영상(`data.js:210-214`, README §11) | BR-02 취지(구직자 식별정보), 동의 근거 없음, 영상 자산 없음 | **제외** |
| K-05 | 구직자 검색 결과 행에 회사명 `co` 표시(`app.js:566`, `data.js:177-187`: 한성정밀·노보텔 스위트 등), 고객사 로고 마퀴(`data.js:222-226`), 사례 카드 고객 사례(`data.js:189-208`) | BR-03(구직자 대상 회사명 금지), PC-7(지어낸 고객·수치) | **제외**. 공고 표시는 `/jobs`(R-202, `publicPosting.ts` — v2.13)에서만 |
| K-06 | 구직자 검색 카드의 공고 9건 목록·"428개 공고" 배지·"n개 공고 모두 보기"·인사 "지금 428개의 새 공고"(`index.html:562-631`), 지도 "924 진행 중 공고"·노드 `jobs` 수(`data.js:146-161`) | BR-04(C·B 리드 개별 공고·건수 공개 금지, 집계는 고지와 함께), BR-05(A등급 검증 공고만), R-117 표현 | 공고 목록·공고 수 **제외**. 검색 카드 → **비자 진단 위젯으로 변형**(3.7 #10). 지도 → **수요 지도 미리보기로 변형**(30일 집계, 5건 미만 "자료 부족", 고지, 버튼 2개, 플래그) |
| K-07 | "소개 수수료는 근로자에게 받지 않습니다"(`index.html:566`), "소개 수수료 근로자 부담 없음"(`data.js:52`), "모국어 상담과 서류 도움까지 모두 무료입니다"(`index.html:566`) | BR-10 고정 문구 "구직자 이용료 없음", 용어집(근로자→구직자), 3.5 구직자 대상 "수수료" 표현 | **변형**: 굵은 약속 자리에 고정 문구 "구직자 이용료 없음" + `/fees` 링크. 원 문장 미사용 |
| K-08 | 견적 계산기의 수수료 금액·기간 계산·비자별 가중치(`index.html:380-480`, README §6 `calcEst`) | PRD 범위 밖, BR-12(비자별 수치 임의 입력), 소개요금은 `/fees`(R-102) 공시 | **제외** |
| K-09 | 비자 탐색기 6종의 사실표·허용 업종·대표 직무·고용 유의사항(`data.js:58-144`, README §7 "legal nuances") | BR-12(법령 요건·허용 업종 임의 입력 금지), BR-11(판정성 문구에 "참고용" 없음) | **제외**. 비자 정보는 규칙 DB(PUBLISHED)·검수된 가이드(R-131)로만 |
| K-10 | "지원할 수 있는 일자리"(`index.html:266`, `data.js:47`), "지원 가능한 공고만"(`index.html:566`, `data.js:51-52`) | SC-06("지원하기" 전 화면 금지, 같은 뜻 포함) | **변형**: "내 비자로 가능한 일"·"면접 신청"·"상담 신청" 계열로 |
| K-11 | 실적·규모 숫자: 히어로 부제 "15년간 16개국 인재와 1,240개 기업"(`index.html:159`), 히어로 띠 "16 COUNTRIES · 68 REGIONAL PARTNERS"(`:176`), 통계 띠 2011·12,400명·5.8주·94.2%(`:186-205`), 실적 섹션 12,480명·1,240개·68개·16개국·94.2%·"업계 평균 81%"(README §4), 카드 통계(`data.js:22,35,48`), 패널 "5.8주", "12,400명"(`data.js:25-26`), 지도 68·924·16, 브랜드 필름 자막의 숫자(`data.js:228-238`) | PC-7(지어낸 숫자 금지, site.config 운영자 입력값만, 미입력 시 숨김) | **제외**(숫자). 실적 섹션은 site.config 값으로 **변형**, 없으면 미렌더. 히어로 통계 띠는 PRD 사실(등록번호·구직자 이용료 없음·6개 언어·행정사 연계)로 **변형** |
| K-12 | README 체크리스트 "`JobPosting` structured data for listings"(`README.md:630`) | WO §13(JobPosting 스키마 금지), R-202 | **제외** |
| K-13 | 언어 10개(ko, en, vi, th, id, uz, ne, km, mn, my) — 언어 전환기·구직자 언어 줄·"10개 언어"(`data.js:3-14`, `index.html:633-636`, README §1) | PRD R-014·WO §12(1차 6개: ko, en, vi, ru, zh, uz). 핸드오프에 ru·zh 없음 | **변형**: 6개로 한정(ru·zh 추가, th·id·ne·km·mn·my 제거). "10개 언어" 문구 금지 |
| K-14 | 용어: "사업주", "근로자", "인력 요청", "견적 요청", "지역 협력기관/파트너"(전반) | 용어집 1.1 | **변형**: 기업 / 구직자 / 구인 의뢰 / 무료 채용 진단 / 협력 소개소 |
| K-15 | 레지스트레이션 블록 플레이스홀더(비전잡 주식회사·대표 김도현·000-00-00000·제 2026-0000호·송파구 올림픽로 300·02-1234-5678·hello@visanjob.co.kr) (README §13, `index.html:724-800`) | R-015·R-102·WO §13(site.config 값, 행정사 사무소명·등록번호 포함 — 핸드오프에는 행정사 사무소 항목 없음) | **변형**: site.config 값만, 행정사 사무소명·등록번호 추가. 브랜드 표기는 **확인 필요 C-14** |
| K-16 | 채팅 FAB의 가짜 미읽음 배지 "1", 온라인 표시(`index.html:850-880`) | 사실과 다른 상태 표시(PC-7 취지), PRD 범위 밖 | **제외** |
| K-17 | 히어로 H1 "가장 확실한 다리", 배지 "법적 리스크까지 함께 설계합니다", 브랜드 약속 "The most trusted bridge" | BR·PRD로 판단 불가(최상급·보증성 광고 표현 여부) | **확인 필요 C-18**. 결정 전까지 핸드오프 문구 사용 + messages에 `[전문가 검토 필요]` 주석 |
| K-18 | 서비스 흐름 5단계 "3배수 후보 제안", "공항 픽업, 기숙사 세팅", "90일 정착 모니터링" 및 기간 칩(`index.html:326-378`) | PRD에 없는 서비스 약속·기간 주장(PC-7 취지) | **제외**. WO §1.2 흐름 소개로 대체할지 **확인 필요 C-19** |
| K-19 | 인사이트 3편 법령 해설(사업장 변경 사유, E-7-1 확대 등) (`data.js:216-220`) | BR-12(법령 내용 임의 작성), WO §13(가이드는 reviewedBy 필수) | **제외** |
| K-20 | 히어로 코너 "37.5145°N 127.1059°E", "SEOUL · SONGPA-GU" (`index.html:145`) | 주소 사실은 site.config(R-015). 송파 소재는 근거 없음 | **제외**(장식 메타는 등록번호만 유지) |

---

## 8. 충돌·확인 필요

### 8.1 v1.0 충돌 C-01~C-12 → Gate 3 결정(SC-01~12) 반영 완료

| v1.0 번호 | 쟁점 | 결정(DECISIONS) | 반영 위치 |
|---|---|---|---|
| C-01 | 화면당 문항 ≤7 초과(Step 3, 5) | SC-01: Step 3·5 각 2개 하위 화면, 단계 번호 유지 | 3.3, 4.6, S-14 |
| C-02 | "모름" 적용 범위 | SC-02 | 3.3, S-15 |
| C-03 | 진행률 분모 | SC-03: 7 | 3.2 WizardProgress, S-12 |
| C-04 | 혼합 단계 공개 배지 | SC-04: 필드별 아이콘 + 단계 하단 요약 | 3.2 DisclosureBadge, S-13 |
| C-05 | 운영 수치와 BR-12 | SC-05: 운영 수치 `limits.ts`, D-2 졸업 기준은 `VisaType` | 4.9, S-53 |
| C-06 | "지원하기" 금지 범위 | SC-06: 전 화면 | 3.5, S-23 |
| C-07 | 플래그 off 동작 | SC-07: ComingSoon(200, noindex)·링크 숨김, API 404 | 3.3, 5, S-25 |
| C-08 | 번역본 [전문가 검토 필요] | SC-08: 한국어 원문 + 번역 병기 | 3.2, 3.5, S-19 |
| C-09 | 우즈베크어 문자 | SC-09: 라틴 | 2.3.1, 3.6 |
| C-10 | shiftOk 3값 vs Boolean | SC-10: 문자열 enum | 3.3, S-15 |
| C-11 | Pretendard와 Lighthouse | SC-11: 미달 시 Noto Sans KR 교체 사전 승인 | 2.3.3 |
| C-12 | 판정 라벨 문구 | SC-12: 제안 문구 + [전문가 검토 필요] | 3.4, S-18 |

### 8.2 새 확인 필요 (Q-05 핸드오프 채택으로 생김)

> 결정 전까지 관련 점검 항목은 "기준 보완 필요"로 판정한다. "기본안"은 결정 전 구현이 따를 임시안.

| 번호 | 내용 | 근거 | 기본안 | 영향 점검 |
|---|---|---|---|---|
| C-13 | **접근성 보정안(2.8 B-01~B-11)의 시각 승인.** 특히 B-02 브랜드 CTA 그라디언트를 #2F6BFF→#22D3EE에서 #245AE0→#0E7490로 어둡게 바꾸는 것은 브랜드 인상이 달라짐. 대안: 흰 글자 대신 navy 글자 버튼 + 원 그라디언트(navy on #2F6BFF는 3.76:1로 역시 미달이라 비권장) / 단색 `--blue-600` 버튼 | R-103(접근성 ≥90 필수), WCAG 1.4.3 | 보정안 적용 | S-01, S-63 |
| C-14 | **브랜드 표기.** 핸드오프 워드마크 "VISANJOB", 상호 "비전잡 주식회사"·"GLOBAL TALENT" vs WO "비자앤잡(Visa&Job)", 운영 주체 "코리아비자 행정사사무소 + 비자앤잡 유료직업소개소". 로고 마크(아치) 채택 여부 포함 | WO 표지, 용어집 | 마크 채택, 워드마크·상호 문자열은 site.config(기본값 "비자앤잡" / "Visa&Job") | S-70 |
| C-15 | **대상 선택 세 번째 카드.** R-101 "대상 선택 3버튼"의 세 번째 대상이 협력 소개소(WO §1.3)라면 포털은 Phase 3 범위 밖. 선택지: (가) 협력 소개소 카드 → "준비 중" 패널 + 상담 신청 / (나) 세 번째를 다른 대상(예: "비자 상담만 필요한 분" → `/visa-check`)으로 / (다) 2장으로 축소(R-101 위반이라 비권장) | R-101, WO §1.3·§9.5, PRD §2 | (가) | S-59, S-67 |
| C-16 | **운영자 메신저 채널 표시.** BR-01은 운영자 연락을 허용하지만 PRD에 요구가 없고 채널 ID가 없으며, 카카오·Zalo 연동은 Phase 3(PC-9). 구직자 섹션·FAB의 메신저 버튼을 "운영자 채널" 링크로 둘지 | BR-01, PC-9 | 표시 안 함 | S-24, S-59 |
| C-17 | **내비·히어로 주 CTA의 문구와 목적지.** 핸드오프는 기업용 "인력 요청". 메인 방문자는 구직자·기업 혼재. "상담 신청"의 목적 경로는 WO·PRD에 없음 | WO §6, R-101 | 내비 CTA = "무료 채용 진단"(`/employer/diagnosis`, `brand`), 히어로 주 버튼 = 같은 목적지, 히어로 보조 = "비자 진단"(`glass`). 구직자 행동은 대상 선택·위젯·최종 CTA에서 | S-66 |
| C-18 | **히어로 카피의 최상급·보증성 표현**("가장 확실한 다리", "법적 리스크까지 함께 설계합니다") — 광고 표현 적합성 | BR·PRD로 판단 불가 | 사용 + [전문가 검토 필요] 주석 | S-23 |
| C-19 | **서비스 흐름(레일) 섹션 재사용 여부.** 핸드오프 §5 내용은 제외(K-18). WO §1.2 사업 흐름(비자 진단·상담 → 구직 등록 → 운영자 검증 → 블라인드 추천 → 면접 주선 → 근로계약 → 체류자격 변경 → 체류 관리)을 레일 시각으로 메인에 넣을지는 PRD R-101 요소 밖 | R-101, Q-05 "섹션 범위는 PRD" | 넣지 않음 | S-59 |
