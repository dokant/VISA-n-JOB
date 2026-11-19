# Phase P2b 기준 검토 — run 1 (정적)

- 대상: 커밋 7e18f8d, 421f244, f29d7e1 (`git diff 8e5ab22..f29d7e1`, 72파일)
- 기준: STANDARD v2.14 → 이번 검토 중 **v2.15**로 보완(4.2 트리·4.4 보충, 판정 변화 없음), PRD R-204~R-208·R-218, PLAN P2b, DECISIONS PC-1·PC-11·PC-12·SC-06~08·Q-08·Q-17·Q-24, WO §7.3·§7.5·§9.3·§9.4, CLAUDE.md
- 방법: 정적만. `pnpm lint`(오류 0), `pnpm i18n:check`(6로케일 오류 0, ko 1069키), `pnpm qa:static`(오류 0, 경고 17건 = 기존 S-23 phrases-review 14·S-45 console 3, 새 경고 0). 추가 줄 2903줄에 금지 패턴 rg(`text-xs`·대괄호 임의값·hex/rgb·`lg:h-8~10.5`·any·console·mailto/tel/메신저·toLocaleString·outline-none·opacity-0·기본 shadow·비자 코드 리터럴) 0건, `z.object(` 위치 `src/schemas/**`만, `src/` 안 테스트 0건. 변경 파일 전수 열람, 약관 6파일 한국어 원문 텍스트 대조(diff), 스크린샷 `p2b_candidates_list_1280`·`p2b_candidates_stats_375`·`p2b_contract_en_375`·`p2b_admin_companies_1280`(축소가 심해 판독 불가 — 코드로 판정) 열람. build/test/e2e/dev 미실행, `.next` 미접근. PDF는 렌더 도구(poppler)가 없어 직접 열지 못함 — 생성 스크립트의 검사(`[전문가 검토 필요]` 없으면 실패)와 원본 md로 판정.

## 1. 블라인드 경유(BR-02, CLAUDE.md) — 우회 경로 grep

기업 영역(`src/lib/candidates`, `src/lib/employer`, `src/app/[locale]/employer`, `src/app/api/employer`, `src/server/actions/employer`, `src/components/employer`)의 `seekerProfile`/`user` 접근 전수:

| 위치 | 나가는 것 | 판정 |
|---|---|---|
| `lib/candidates/browse.ts:113` `queryCandidates` | `LIST_SELECT`(= `BLIND_SEEKER_SELECT` + 내부용 id·groupApply·친구 코드) → 모든 행 `serializeBlindSeeker` | 일치. 내부용 열은 직렬화 입력으로만 쓰이고 결과에 없음(매핑 타입 + `assertBlindKeys`) |
| `browse.ts:83` `groupApplySizes` | 숫자만(`groupApplySize`) | 일치 |
| `interest.ts:56` | `select {id}` → 결과에 구직자 데이터 없음(`{ok, already}`) | 일치 |
| `interest.ts` `requestedPublicIds` | `seeker.publicId` → `toBlindPublicId`(blindSeeker.ts) | 일치(v2.15 4.4에 명문화) |
| `stats.ts:36` `candidateStats` | 시·도×등급 건수만, 5 미만 `null` | 일치(v2.15 4.4에 집계 허용 조건 명문화) |
| `eligible.ts` | id·count만 | 일치 |
| `employer/session.ts` | 기업 본인 계정 | 대상 아님 |
| `components/employer/candidate-view.ts` | 입력 타입 `BlindSeeker`만 | 일치 |
| 감사 meta(`browse.ts`) | 필터 코드·건수·blind publicId | 일치(PII 없음) |

우회 경로 **0건**. `BLIND_SEEKER_FIELDS` = WO §7.5 배열(순서·키 동일).

## 2. 항목별 판정

| # | 항목 | 판정 | 근거 |
|---|---|---|---|
| 1 | S-37 기업 대상 구직자 데이터 blindSeeker 경유 | 일치 | 1절 |
| 2 | S-38 `BLIND_SEEKER_FIELDS` = WO §7.5 | 일치 | `blindSeeker.ts` 대조 |
| 3 | 4.4 새 객체 구성·스프레드 금지 | 일치 | 키별 리터럴, `Object.freeze`, `assertBlindKeys`. `...BLIND_SEEKER_SELECT`는 select 객체 확장이지 프로필 스프레드 아님 |
| 4 | 4.4 publicId ≠ DB id | 일치 | uuid `publicId` → 자음 16자 변환, DB id는 결과에 없음 |
| 5 | 4.4 쿼리 계층 제외(BR-06·07) | 일치 | `eligibleCandidateWhere`(S·A, JOB_MATCH, ACTIVE, 활성 구직 상태, 완료, 체류 미만료, BLIND_PROFILE 미철회)가 목록·통계·면접 요청 모두에 적용 |
| 6 | PC-1·1.2-2 실명·연락처·사진·출생 연도·성별·학교·자유 텍스트 0 | 일치 | select에 없음, `majorField` null(Q-24는 run 2 범위) |
| 7 | **WO §7.3 `stayExpiry` 기업 공개 구간** | **불일치 F-1** | 아래 |
| 8 | S-24·BR-01 직접 연락 수단 0 | 일치 | 버튼은 "면접 요청"만 → InterestRequest(EMPLOYER)+StaffTask, 결과에 연락처 없음. 약관 제3조 직접 연락 금지 |
| 9 | S-23·SC-06 "지원하기"/Apply 0 | 일치 | 새 messages 6개·src 추가 줄 0건 |
| 10 | 1.1 용어(면접 요청, 비자앤잡 담당자, 구직자, 기업) | 일치 | 기업 화면 "직원" 0건, "비자앤잡 담당자" 사용 |
| 11 | S-40 첫 문장 rbac | 일치 | `api/employer/candidates/route.ts`·`actions/employer/candidates.ts`(v2.13 try/catch 형태 + `assertCan`), `actions/employer/contract.ts`(`requireEmployer`), `actions/admin/companies.ts`(adminAction + `requireStaff`·`assertCan(company:verify)` — Q-08), 관리자 페이지 `requireStaff` |
| 12 | S-42·4.6 zod 위치 | 일치 | `schemas/employer/{candidates,contract}`, `schemas/admin/companies` |
| 13 | S-46·4.8 감사 | 일치 | 목록 조회마다·거부도 `CANDIDATE_BULK_VIEW`(PC-12), 검증·계약 등록 `COMPANY_VERIFY`, 회사명 복호 목록 `PII_VIEW` |
| 14 | S-53 운영 수치 | 일치 | `CANDIDATE_VIEWS_PER_DAY`·`CANDIDATE_LIST_MAX`·`STAY_REMAINING_BANDS`·`CANDIDATE_STATS_MIN_SAMPLE`(= `DEMAND_MIN_SAMPLE`) limits.ts, messages는 ICU `{limit}`·`{min}` |
| 15 | S-02·S-05·S-06 색·글자 크기·임의값 | 일치 | 추가 줄 0건(`min-w-240`은 척도 유틸) |
| 16 | S-08 터치 44px | 일치 | Button default/sm, NativeSelect 48, 체크박스 행 `min-h-11`, 관리자 `size="sm"` |
| 17 | S-10·3.1 컴포넌트 | 일치 | card(`rounded-md` `shadow-1` p-6, 비클릭 hover 없음), badge variant 목록 안, native-select(GET 필터, JS 없이 동작), checkbox 행, table(헤더 `text-label` n50, 행 `border-n100`, 스크롤 컨테이너), 관리자 date input(input 모양) |
| 18 | **3.1 form 간격(필드 간 22px·내부 7px)** | **불일치 F-2** | 아래 |
| 19 | S-11 아이콘 | 일치 | 새 아이콘 모두 `strokeWidth={1.5}`, `Check` 2, `aria-hidden` |
| 20 | S-09 상태 표시 아이콘+글자 | 일치 | 비자/한국어 확인, 검증·계약 상태, 사업자번호 배지 |
| 21 | **S-16 VisaLabel** | **불일치 F-3** | 아래 |
| 22 | **S-27 GradeBadge** | **불일치 F-4** | 아래 |
| 23 | S-64 오렌지 | 일치 | 기업 화면 "기업 검증 대기"·관리자 "검증 전/사업자번호 없음"은 `orange` 틴트 배지(v2.14 대상 밖), 기업 행동 버튼은 `default` |
| 24 | S-32 기업 화면 숫자·날짜·금액 | 일치 | `format.number`·`format.dateTime`·`currency:'KRW'`, ICU 숫자 인자 |
| 25 | **S-32 관리자 H-3 숫자 표기** | **불일치 F-5** | 아래 |
| 26 | S-19·SC-08 약관 화면 | 일치 | 제목 바로 아래 `ExpertReviewMark`(ko 라벨 + 번역 라벨), 5개 번역 파일 끝 "한국어 원문" 절 — ko.md와 본문 동일(diff 확인, 표지 줄만 제외), 비 ko 페이지에 한국어 원문 PDF 링크 |
| 27 | R-208 PDF·[전문가 검토 필요] | 일치(정적) | `public/docs/employer-terms-v1-{6로케일}.pdf`, `build-terms-pdf.ts`가 표지 줄 없으면 실패·`.review` 강조, 약관 항목이 WO §9.4(법정 한도, 12개월, 재신청, 3개월) 그대로 |
| 28 | R-208 위임 동의 분리 | 일치 | 필수 약관 체크와 별도 선택 체크(`(선택)`, "동의하지 않아도 계약은 완료"), 서버 `visaMandate: z.boolean()` |
| 29 | S-25·SC-07 플래그 | 일치 | 후보 페이지 off → `ComingSoon`, API off → 404(인증 실패 시에도), 계약 화면 후보 링크는 on일 때만 |
| 30 | noindex(R-130) | 일치 | 두 페이지 `noindex`, 미들웨어 `contract` 추가 |
| 31 | S-29·S-30·S-31 i18n | 일치 | 오류 0, 키 `employer.candidates.*`/`employer.contract.*`/`meta.*`, 코드값은 `option.{값}` 재사용, lint(jsx-no-literals) 통과 |
| 32 | 4.10 테스트 위치 | 일치 | `tests/unit/lib/serializers/blindSeeker.test.ts`(+`__snapshots__`), `lib/candidates/*`(+`candidateFixtures.ts`), `lib/employer/{contract,employerApiLeak}`(교차 테스트, R-206 태그), `app/api/employer/candidates/route.test.ts`, `lib/admin/companies`, `scripts/build-terms-pdf`, e2e `employer-candidates.spec.ts` + `support/candidatesDb.ts`. PLAN 경로(`tests/unit/blind-seeker.test.ts` 등)와 다른 것은 4.10 우선(G-2) |
| 33 | S-51 WO15 태그 | 일치 | WO15-01·02·06(+04·08·09) |
| 34 | S-34·4.2 디렉터리 | 일치(v2.15) | 새 `src/` 최상위 폴더 없음. 빌더 요청 항목은 기존 폴더 아래이며 트리에 이름이 없었을 뿐 → v2.15에 기재 |
| 35 | S-49 시드 | 일치 | `sampleSeekers.ts` 첫 줄 SAMPLE 주석, `SEED_SAMPLE_SEEKERS` 기본 false·운영 제외 |

**일치 30 / 전체 35**

## 3. 불일치 목록과 수정 지시

### F-1 기업 공개 체류 잔여기간 구간 수 (WO §7.3, STANDARD 1.2-2·4.4)
- 위치: `src/config/limits.ts:191-196` `STAY_REMAINING_BANDS`(4구간: M0_6, M6_12, **M12_24, M24_PLUS**), 사용처 `lib/candidates/stayBand.ts`, 카드·필터(스크린샷 "12~24개월").
- 기준: WO §7.3 `stayExpiry` 행 "기업 공개: 구간만 — **6개월 미만 / 6~12개월 / 1년 이상**"(3구간).
- 실제: 1년 이상을 12~24개월 / 24개월 이상으로 더 잘게 나눠 기업에 WO보다 세밀한 정보를 공개.
- 수정: 3구간(`M0_6`, `M6_12`, `M12_PLUS` — 최소 12, 상한 없음)으로 줄이고 메시지·필터·테스트·스냅샷 갱신. 4구간을 유지하려면 WO 변경 결정이 먼저 필요(오케스트레이터·사람 판단).

### F-2 폼 간격 (3.1 form "필드 간 22px, 필드 내부 7px")
- 위치: `src/components/employer/contract-form.tsx:51`(`gap-5`=20px), `:52`·`:78`(`gap-1.5`=6px); `src/components/employer/candidate-filters.tsx:73`·`:78`(`gap-5`).
- 수정: 필드 간 `gap-5.5`, 필드 내부 `gap-1.75`. 필터 그리드는 `gap-5.5`(필드 내부는 이미 `gap-1.75`).
- 참고: P2a `components/admin/posting-forms.tsx:109,122,171,206`도 `gap-5`(P2a 검토에서 누락). 같은 수정을 함께 권장.

### F-3 전환 가능 비자 원문 코드 표시 (S-16, 3.2 VisaLabel "비자 표시 유일 경로")
- 위치: `src/components/employer/candidate-card.tsx:101` — `VisaType`에 없는 `convertibleVisa`는 `<span>{candidate.convertible.code}</span>`로 원문 코드를 그대로 표시. 스크린샷 `p2b_candidates_list_1280`에서 "E2E-f9eaefb5"가 카드에 나옴(E2E 데이터지만 같은 경로).
- 수정: VisaType에 없는 코드는 화면에 내보내지 않는다 — `candidate-view.ts`에서 `visaOf.get(...)`가 없으면 `convertible`을 null로(또는 "확인 필요" 번역 문구), 카드의 원문 코드 분기 삭제. 현재 비자(`visa`)는 이미 같은 방식(null이면 미표시).

### F-4 요약 통계 표의 등급 표시 (S-27 "등급 표시가 GradeBadge로 통일")
- 위치: `src/components/employer/candidate-stats.tsx:112` — `{tg("label", { grade })}` 글자만.
- 수정: 등급 칸을 `<GradeBadge grade={c.grade} />`로(후보 카드와 동일). 기업 화면이므로 3.2 관리자 예외 대상 아님.

### F-5 관리자 수 단위 '개' (S-32, 3.5 H-3 "Intl 숫자 뒤 명·건·일만 허용")
- 위치: `src/app/admin/(staff)/companies/page.tsx:86` — `가입 계정 {c.accounts}개`.
- 수정: `가입 계정 수 {countFmt.format(c.accounts)}`처럼 단위 글자 없이 쓰거나 허용 단위로 바꾼다. ('개'를 H-3 허용 목록에 넣는 기준 개정을 원하면 오케스트레이터 결정 — 이번에는 하지 않음.)

## 4. 관찰 (판정 밖, QA 참고)
- O-1 PC-11 차감 노출: `stats.ts`는 칸별로 5 미만을 가리지만 합계(`total`)는 가리지 않아, 마스킹 칸이 1개면 합계 − 공개 칸으로 값이 복원된다(스크린샷 375: 214 − 201 − 10 = 3명). 수요 지도와 같은 방식인지, 2차 마스킹이 필요한지 QA·오케스트레이터 판단 권장.
- O-2 계약 폼은 react-hook-form 없이 `useState` + 서버 zod 검증이다. 3.1 form 행이 "모든 폼"을 react-hook-form 연동으로 적고 있으나 P2a 면접 신청 폼 등 서버 액션 폼 선례가 있어 이번에는 판정하지 않았다(필요하면 다음 개정에서 범위 명시).
- O-3 관리자 기업 목록 스크린샷(1280×18473)은 시드 기업이 많아 축소 판독 불가. 표 구조·배지는 코드로 확인.
- O-4 약관 PDF는 도구 부재로 열지 못함 — QA가 PDF를 직접 열어 [전문가 검토 필요]·한국어 원문을 확인할 것(PLAN QA 방법).
- O-5 `employer.candidates.card.majorField` 키는 아직 쓰이지 않음(Q-24 run 2에서 사용 예정).

## 5. STANDARD v2.15 변경 내역
- 머리 버전 2.14 → 2.15, 개정 이력 2.15 행.
- 4.2 트리: `content/terms/employer/{version}/{locale}.md`, `public/docs/`(약관 PDF 생성물), `scripts/build-terms-pdf.ts`, `prisma/seed/sampleSeekers.ts`, `components/admin/company-forms`, `components/employer/`(candidate-card, candidate-filters, candidate-stats, candidate-view.ts, interview-request-button, contract-form, terms-document), `lib/admin/companies.ts`, `lib/candidates/(eligible, access, browse, interest, stats, stayBand)`, `lib/employer/(apiRegistry, contract)`, `server/actions/admin/companies`·`employer/(candidates, contract)`, `schemas/employer/(candidates, contract)`·`schemas/admin/companies`.
- 4.4 보충: 공개 ID 변환·역변환은 `blindSeeker.ts` 안에만 둔다. 미계약 기업 요약 통계는 개별 행·ID 없이 화이트리스트 코드별 건수만 낼 때 직렬화기 밖 집계를 허용한다(PC-11 마스킹).
- 산출물 판정 변화 없음.
