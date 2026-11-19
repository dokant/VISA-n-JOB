# Phase P2a 기준 검토 — run 1 (정적)

- 대상: 커밋 463c75e (`git diff 7380403..463c75e`, 46파일)
- 기준: STANDARD v2.12 → 이번 검토 중 **v2.13**으로 개정(Q-17 반영), PRD R-015·R-201~R-203, PLAN "### P2a", DECISIONS SC-06·SC-07·Q-17, CLAUDE.md
- 방법: 정적만. `pnpm lint`(오류 0), `pnpm i18n:check`(6로케일 오류 0, ko 951키), `pnpm qa:static`(오류 0, 경고 17건 모두 P2a 이전부터 있던 S-23 phrases-review·S-45 console), STANDARD 6절 rg 명령, 변경 파일 전수 열람, 빌더 스크린샷 `p2a_*.png` 9장 열람. build/test/e2e/dev는 실행하지 않음(QA 담당).

## 1. 항목별 판정

| # | 항목 | 판정 | 근거 |
|---|---|---|---|
| 1 | S-23 / SC-06 "지원하기"·Apply 금지 | 일치 | 추가된 messages 6개·src에 지원하기/지원 가능/Apply 0건. CTA는 면접 신청(ko), Request an interview(en), Đăng ký phỏng vấn(vi), Записаться на собеседование(ru), 申请面试(zh), Suhbatga yozilish(uz). `interest-panel.tsx` 주석만 SC-06 언급 |
| 2 | S-24 / BR-01 직접 연락 수단 없음 | 일치 | 신규 파일에 mailto·tel·메신저 링크 0건(rg 매치 1건은 `input.meals` 오탐). 면접 신청 → InterestRequest(SEEKER) + StaffTask + 담당자 알림(`lib/postings/interest.ts`), 기업 통지·구직자 데이터 전달 없음. 화면 문구에 "기업에 내 연락처가 전달되지 않습니다"·"기업과의 연락은 비자앤잡을 통해서만" 있음 |
| 3 | S-71 / 1.2-7 JobPosting JSON-LD 없음 | 일치 | `/jobs`·`/jobs/[id]`는 `JsonLd` 컴포넌트를 쓰지 않음(사용처는 메인·가이드뿐). src의 `JobPosting` 문자열은 Prisma 모델명과 주석뿐. E2E `jobs-apply.spec.ts:135,157`에 HTML `not.toContain("JobPosting")` 검사가 있음 |
| 4 | S-25 / SC-07 플래그 off | 일치 | 두 페이지 모두 `ComingSoon`(200) + `noindex`(`buildPageMetadata`), `sitemap.ts:30` 플래그 조건, 내비·푸터 링크가 `flags.publicJobs` 조건, `/api/jobs`·`/api/jobs/[id]` 404 `{error:{code:"NOT_FOUND"}}`, 서버 액션도 NOT_FOUND. E2E와 단위 테스트(`route.test.ts`)로 확인. PLAN의 "off면 404"는 SC-07이 우선 |
| 5 | S-39 / 4.4 공고 직렬화 화이트리스트 | 일치(v2.13 기준) | `publicPosting.ts`: `BLIND_JOB_FIELDS` = WO §8.5 13개 항목 + id·verified·placementRegNo, select와 반환 객체를 키별로 새로 만듦(spread 없음), 회사·리드·검증자 id 없음, `Object.freeze`. 공개 쿼리 `PUBLIC_POSTING_WHERE` = PUBLISHED + verifiedAt + verifiedBy + 리드 등급 A |
| 6 | S-40 / 4.5 첫 문장 rbac | 일치 | 관리자 액션 4개는 `adminAction` 안 본문 첫 문장 `requireStaff()` 다음 `assertCan(actor,"posting:manage")`. `jobs/interest.ts`는 `try` 첫 문장 `requireSeeker()` + `assertCan`, catch는 AuthzError만 변환하고 나머지는 다시 던짐 → v2.13 4.5 보충으로 기준화. Route Handler 2개는 `// rbac: public — 사유` 주석 있음. 관리자 페이지 3개는 `requireStaff()` |
| 7 | S-46 / 4.8 감사 로그 | 일치 | `publishPosting`이 같은 트랜잭션에서 `POSTING_PUBLISH` 기록. 검증·마감은 4.8 대상 밖 |
| 8 | S-02 하드코딩 색 | 일치 | 신규 파일 0건 |
| 9 | S-05·S-06 글자 크기·임의값·그림자 | 일치 | `text-[`·`text-xs`·대괄호 간격·반경 임의값·`shadow-sm` 등 0건. 고지·도움말은 `text-caption`(13px) 이상 |
| 10 | S-08 / 3.3 터치 44×44 | 일치(코드) | Button은 `sm` 이상만 사용(44px), 텍스트 링크(목록으로·관리자 링크·리드 링크)는 `min-h-11 min-w-11`, 비자 체크박스 행은 `min-h-11 min-w-11`. `lg:h-…` 축소 0건. 실측 boundingBox는 QA 몫 |
| 11 | S-09 판정·등급·공개 여부 = 색 + 아이콘 + 글자 | **불일치** | 공개 화면 VerifiedBadge는 아이콘 있음. 관리자 공고 화면의 공개 상태 배지와 검증 배지에는 아이콘이 없음(아래 F-1) |
| 12 | S-10 / 3.1 button·badge·card | 일치 | 버튼 variant: 면접 신청·빈 목록 간편 등록 `seeker`, 상담 신청 `default`, 자세히 보기 `outline sm`, 로그인 `ghost sm`. 카드: 흰 바탕·`border-border`·`rounded-md`·`shadow-1`·`p-6`(24px, 3.1의 20~26 안). 카드 전체가 클릭 대상이 아니므로 hover 들림이 없는 것이 맞음 |
| 13 | 3.2 VerifiedBadge | 일치 | `cyan` 배지 + `BadgeCheck`(1.5) + "검증 완료"(`components/jobs/verified-badge.tsx`, 3.2 위치·이름 그대로) |
| 14 | 3.2 ComingSoon / 3.3 CONSULT_HREF | 일치 | 플래그 off는 기존 `ComingSoon`. 비자 부적합·BLOCKED 상태의 "상담 신청"은 `CONSULT_HREF` 사용 |
| 15 | S-11 아이콘 | 일치 | lucide `ArrowRight`·`BadgeCheck`, strokeWidth 1.5, `aria-hidden`. "← 목록으로"의 글자 화살표는 관리자 화면(P1e)에서 이미 쓰던 형태와 같음 |
| 16 | S-16 VisaLabel | 일치 | 공개 카드·상세 모두 `VisaLabel`(코드 + 쉬운 이름, `showCode=isStatusCode`), 비자 목록은 DB(`VisaType`)에서 읽음. 관리자는 3.2 관리자 예외(코드 글자) |
| 17 | S-64 오렌지 사용처 | 일치 | `seeker` variant는 구직자 CTA 2곳(면접 신청, 간편 등록)만 |
| 18 | 1.1 용어 | 일치 | 목록 제목 "추천 일자리", 관리자 "블라인드 공고", 구직자 행동 "면접 신청", 공개 화면은 "비자앤잡 담당자"(v2.9 P-5). "직원"은 관리자 화면에만. 관리자의 "구인신청"은 WO BR-05 표기 |
| 19 | S-29 i18n:check | 일치 | 6로케일 오류 0 |
| 20 | S-30 번역 키 형식 3.6 | **불일치(경미)** | 코드값 번역 키에 `option.` 세그먼트가 없음(아래 F-2) |
| 21 | S-31 하드코딩 사용자 문자열 | 일치 | lint 통과, 공개 화면 문구는 모두 `public.jobs.*`·`meta.jobs*`·`seeker.quick.nextNotice` |
| 22 | S-32 / 3.5 숫자·금액 포맷(H-3 포함) | 일치 | 공개: `format.number(…, {style:"currency", currency:"KRW"})`, 인원은 ICU. 관리자: `fmtWon`(KRW `Intl` 상수), `fmtPeople`·`fmtCount(…,"건")` = `Intl` 숫자 + 명·건(v2.11 H-3 허용), `toLocaleString`·`+ "원"` 0건. "~ / 이상"은 단위가 아님. 입력 라벨 "월 급여 최저(원, 세전)"은 숫자 포맷이 아니라 라벨 |
| 23 | 관리자 공고 화면 문구 | 일치 | 리드 등급은 "리드 등급 A"로 구분(1.1), 검증·공개 순서와 감사 로그 안내, 회사 이름·연락처 금지 안내, 오류 문구 8종 한국어(`_i18n/ko.ts`). 스크린샷 `p2a_admin_*` 확인 |
| 24 | S-34 / 4.2 디렉터리 | 일치(v2.13 기준) | `lib/postings/`, `components/jobs/*`, `schemas/jobs/`, `schemas/admin/postings.ts`, `server/actions/jobs/` → v2.13 트리에 기재. 새 `src/` 최상위 폴더 없음 |
| 25 | S-35 / 4.3 파일명 | 일치 | components kebab-case, lib·schemas·server camelCase |
| 26 | S-36 any | 일치 | 0건 |
| 27 | S-42 zod 위치 | 일치 | `src/schemas/` 밖 `z.object(` 0건 |
| 28 | S-45 로그 | 일치 | 신규 `console.*` 0건. 담당자 알림은 id만 담음 |
| 29 | S-47 원장 불변 | 일치 | 0건 |
| 30 | S-48 / 4.9 법령 수치 | 일치 | 비자 코드 리터럴 0건, eligibleVisas는 운영자 데이터 |
| 31 | S-53 운영 수치 | 일치 | `POSTING_*`·`PUBLIC_POSTING_LIST_MAX`는 `limits.ts`, messages에 같은 숫자 중복 없음("1분"은 기존 간편 등록 문구와 같은 표현) |
| 32 | S-50·S-51 / 4.10 테스트 | 일치 | 미러 위치(`tests/unit/lib/postings/*`, `lib/serializers/publicPosting.test.ts`, `app/api/jobs/route.test.ts`), 픽스처 `postingFixtures.ts`, E2E 도우미 `support/jobsDb.ts`. `WO15-03`·`WO15-04`·`R-201~203` 태그 있음. PLAN 경로(`posting-guard`, `public-posting`)와 다른 것은 4.10 우선(G-2) |
| 33 | S-72 공개 화면 고객사 이름 | 일치 | 공개 응답에 회사명 없음. 관리자 공고 작성은 회사명·연락처가 들어간 제목·직무를 서버가 거부(`TEXT_HAS_COMPANY`·`TEXT_HAS_CONTACT`) |
| 34 | S-07 375px 가로 스크롤 | 일치(스크린샷) | `p2a_jobs_list_375`, `p2a_interest_*_375`에서 넘침 없음. 실측은 QA 몫 |
| 35 | 3.2 SiteFooter 시각 규칙(빌더 관찰) | **불일치(P1a 기존)** | vi·1280에서 "등록 정보" 열 값이 한 글자씩 세로로 줄바꿈되고 라벨이 열 밖으로 넘침(아래 F-3) |

**일치 32 / 전체 35** (불일치 3: F-1, F-2, F-3. F-3은 P1a부터 있던 결함)

## 2. 불일치 목록과 수정 지시

### F-1 관리자 공고 상태·검증 배지에 아이콘 없음 (S-09)
- 위치: `src/app/admin/(staff)/postings/page.tsx:152-154`(상태 배지), `src/app/admin/(staff)/postings/[id]/page.tsx:73-82`(상태 배지·검증 배지)
- 기준: S-09 "판정·등급·**공개 여부** 표시가 색과 함께 아이콘+글자". 3.2 관리자 예외도 "S-09는 그대로 적용"이라고 적음.
- 실제: `Badge`에 글자("공개 중"/"작성됨"/"마감", "검증 완료"/"검증 전")와 색만 있음.
- 수정: 각 배지 앞에 lucide 아이콘(`strokeWidth={1.5}`, `aria-hidden`, `size-3.5` 정도)을 넣는다. 예: 공개 중 `Eye`, 작성됨 `FilePen`, 마감 `Lock`, 검증 완료 `BadgeCheck`, 검증 전 `Clock`. 목록 표의 "검증" 열 글자 "전"도 같은 배지로 맞추면 좋다(권장).

### F-2 공개 공고 코드값 번역 키에 `option.` 세그먼트 없음 (S-30, 3.6)
- 위치: `messages/{ko,en,vi,ru,zh,uz}.json` `public.jobs.overtime.*`·`public.jobs.dormitory.*`·`public.jobs.meals.*`·`public.jobs.shift.*`, 사용처 `src/components/jobs/posting-view.ts:58-59`(`coded()`)
- 기준: 3.6 속성 `option.{값}`(enum과 같게). 앞선 Phase도 그렇게 씀(`employer.request.overtime.option.NONE`, `seeker.register.step1.gender.option.*`).
- 실제: `public.jobs.overtime.NONE`처럼 값이 그룹 바로 아래에 있음.
- 수정: 6개 파일에서 `public.jobs.{overtime,dormitory,meals,shift}.{값}` → `public.jobs.{overtime,dormitory,meals,shift}.option.{값}`로 옮기고, `posting-view.ts`의 `coded`를 `t(\`public.jobs.${group}.option.${value}\`)`로 바꾼다. 그 뒤 `pnpm i18n:check`.

### F-3 vi 1280 푸터 "등록 정보" 열이 한 글자씩 세로 줄바꿈 (3.2 SiteFooter, P1a 기존)
- 위치: `src/components/common/site-footer.tsx:114-116`(등록 정보 행), 같은 구조 `:120-121`(대표전화), `:133-134`(이메일). 마지막 수정 커밋 7380403(P2a에서 바뀌지 않음).
- 원인: 행이 `flex gap-2`이고 `<dt>`가 `flex-none`(줄지 않음)이다. 1280에서 이 열은 `1.2fr`(약 200px)인데 vi 라벨("Văn phòng giới thiệu việc làm có thu phí", "Số đăng ký giới thiệu việc làm")이 그보다 넓어 `<dt>`가 열 폭을 다 차지하거나 넘친다. 남은 폭이 거의 0인 `<dd>`가 전역 `overflow-wrap: anywhere`로 한 글자씩 꺾인다(스크린샷 `p2a_interest_anonymous_1280.png` 푸터; ko 1280에서도 등록번호가 3줄로 꺾임, `p2a_jobs_list_1280.png`). 라벨이 줄지 않아 열 오른쪽 밖으로도 넘친다.
- 기준: 3.2 SiteFooter(열 `1.5fr 1fr 1fr 1fr 1.2fr`, 13px), 2.6/S-65(전 로케일 표시).
- 수정: 세 행 모두 라벨과 값을 위아래로 쌓는다 — `<div className="flex gap-2 …">` → `<div className="grid gap-0.5 …">`, `<dt>`의 `flex-none` 삭제(`:115`, `:121`, `:134`). 대표전화·이메일 행의 `items-center`도 삭제. `components/public/registration-info.tsx:48`의 `grid gap-0.5`와 같은 형태다. (대안: `flex flex-wrap gap-x-2` + `<dt>`의 `flex-none` 삭제 + `<dd className="min-w-0">`. 다만 긴 vi 라벨에서 값이 다음 줄로 가는 행과 아닌 행이 섞이므로 쌓는 쪽을 권장.) 수정 뒤 vi·ru·uz 1280과 1024에서 푸터를 확인한다.

## 3. 관찰 (판정 밖, 참고)
- O-1 `public.jobs.interest.register` 키가 6개 파일에 있으나 코드에서 쓰지 않는다(i18n:check는 미사용 키를 잡지 않음). 지우거나 쓴다.
- O-2 비자 부적합·BLOCKED 상태에서도 패널 하단에 `interest.how`("신청하면 비자앤잡 담당자가 … 연락드립니다")가 보인다(`interest-panel.tsx:96-98`). 신청할 수 없는 상태라 문맥이 어긋난다. 이 두 상태에서는 숨기는 것을 권장한다.
- O-3 `posting-view.ts`는 `components/` 아래에 있으면서 `db`를 직접 읽는다. 입력이 `PublicPosting`뿐이고 참조 테이블(지역·업종·비자 이름)만 읽어 BR-03 위험은 없다. v2.13 트리에 이 형태로 기재했다.
- O-4 `p2a_interest_signed_in_done_375.png` 중간에 내비와 "본문으로 바로가기"가 겹쳐 보이는 것은 전체 페이지 캡처의 sticky·포커스 때문으로 보이며 화면 결함이 아니다(QA가 실제 렌더로 확인할 것).

## 4. STANDARD v2.13 변경 내역 (Q-17 ②)
- 머리 버전 2.12 → 2.13, 개정 이력 2.13 행 추가.
- 4.2 트리: `serializers/(blindSeeker.ts, publicPosting.ts)`, `lib/postings/(public, manage, interest)`, `components/jobs/`(verified-badge, posting-card, posting-view.ts, interest-panel, interest-form), `schemas/` 예에 `admin/postings`·`jobs/interest`, `server/actions/` 예에 `admin/postings`·`jobs/interest`.
- 4.4: `blindJob.ts` → `src/lib/serializers/publicPosting.ts`(`BLIND_JOB_FIELDS` 유지, 옛 이름 매핑 주석).
- S-39 → `publicPosting.ts`(† 표시). 7절 K-05의 `blindJob.ts`도 정정.
- 4.5 보충: 초기값 없는 변수 선언은 실행 문장으로 보지 않음. `try` 첫 문장이 rbac 검사이고 `catch`가 `AuthzError`만 변환하고 나머지는 다시 던지는 형태를 첫 문장 검사로 인정(`jobs/interest.ts` 형태, 판정 변화 없음).
