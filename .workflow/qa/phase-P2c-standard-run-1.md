# Phase P2c 기준 검토 — run 1 (정적)

- 대상: 커밋 3a3488f, c5921f5, 7cc2a99 (`git diff 2644efa..7cc2a99`, 81파일 +7406/−59)
- 기준: STANDARD v2.16 → 이번 검토 중 **v2.17**로 보완(판정 변화 없음), PRD R-209~R-212·R-216, PLAN "### P2c", DECISIONS PC-1·PC-13·SC-06~SC-08·Q-08, CLAUDE.md
- 방법: 정적만. `pnpm lint`(오류 0), `pnpm i18n:check`(6로케일 오류 0, ko 1154키), `pnpm qa:static`(오류 0, 경고 17 = P2b와 같은 기존 경고, 새 경고 0). 추가 줄 금지 패턴 rg(`text-xs`·대괄호 임의값·hex/rgb·any·console·mailto/tel·toLocaleString·outline-none·opacity-0·기본 shadow·`lg:h-`·`<button`) 0건. S-36/S-42/S-43/S-44/S-50/4.9-1 명령 0건. 변경 소스 전수 열람. 스크린샷 `p2c_employer_requests_after_375`, `p2c_seeker_consent_375`, `p2c_seeker_recommended_375`, `p2c_admin_recommendation_375` 열람. build/test/e2e/dev 미실행, `.next` 미접근.

## 1. 항목별 판정

| # | 항목 | 판정 | 근거 |
|---|---|---|---|
| 1 | S-37·4.4 기업 대상 구직자 데이터 경로(우회 grep) | 일치(v2.17 명문화) | 기업 영역(`lib/employer`, `app/[locale]/employer`, `api/employer`, `components/employer`, `server/actions/employer`)에서 `seekerProfile`/`user` 직접 조회 0건. `legalName|phoneEnc|emailEnc|messenger` rg: 기업 쪽은 `serializers/interviewDisclosure.ts`(`legalNameEnc`만 select)와 그 결과를 그리는 `employer/requests/page.tsx:142`뿐. `lib/employer/interviews.ts`는 `toBlindPublicId`(blindSeeker) + `loadInterviewDisclosure`만 사용, `seeker.userId`는 동의 대조용 내부값(출력 없음). `recommendations/interviews.ts:116` `phoneEnc`는 구직자 본인에게 보내는 동의 요청 SMS(직원 액션, 기업 출력 아님) |
| 2 | S-38 `BLIND_SEEKER_FIELDS` | 일치 | 키 변경 없음. `convertibleVisa`는 `visaCodes` 문맥으로 미등록 코드 null(P2b O-5) |
| 3 | PC-1·R-211 실명 조건 | 일치 | `interviewDisclosure.ts`: 해당 기업(`recommendation.companyId`)·해당 건·`CONFIRMED`·유효 동의·동의자 = 구직자 본인, 매 요청 조회, 새 frozen 객체 + `assertDisclosureKeys`, `PII_VIEW`(필드 이름만). `apiRegistry.ts` `EMPLOYER_NAME_DISCLOSURE`에 경로 등록 |
| 4 | S-24·BR-01 연락처 0 | 일치 | 새 줄 `mailto:/tel:/메신저` 0건. 면접 `place`·`interpreter`·추천 메모는 `hasContacts`로 거부(`PLACE_HAS_CONTACT`). 기업 화면 문구 "직접 연락할 수 없습니다 … 연락처는 제공하지 않습니다" |
| 5 | S-47·BR-09 추천 원장 append-only | 일치 | `ledger.ts`가 create·find만 노출, `recommendation.create`는 이 파일에서만(qa:static 새 규칙 `BR-09/ledger-repository` error), update/delete/upsert 0건, `tests/unit/db/ledger-trigger.test.ts` + `ledger.test.ts` WO15-07 트리거 확인. `interestRequest.updateMany`는 원장이 아님 |
| 6 | S-46·4.8 감사 | 일치(v2.17 명문화) | 추천 = `RECOMMENDATION_CREATE`(같은 트랜잭션, meta id·코드만), 실명 제공·파일 열람 = `PII_VIEW`, 철회·거부 = `CONSENT_REVOKE`(meta `reason`). 새 AuditAction 없음. 아래 2절 (1) |
| 7 | S-40 첫 문장 rbac | 일치 | 관리자 액션 10개 모두 `adminAction(async function …{ requireStaff(); assertCan(…) })`(4.5 H-1). `api/files/[token]`·`api/employer/requests`: 초기값 없는 `let` + `try` 첫 문장 rbac + `AuthzError`만 변환(4.5 v2.13). 구직자 `answerInterviewConsent` 첫 문장 `requireSeeker()` |
| 8 | S-41 `/admin` 역할+2FA | 일치 | 페이지 `requireStaff()`, 파일 API는 `requireStaffApi`(DB 직원·TOTP·세션 2FA + `admin:access` + `interview:manage`) |
| 9 | R-216 STAFF_PLACEMENT 체류 사건 거부(Q-08 권한 분리) | 일치 | 페이지 `can(…,"visaCase:view")` → ForbiddenNotice, `lib/admin/visaCases.ts`가 다시 `assertCan`, 액션 `visaCase:manage`. VisaCase에 고유식별정보 열 없음(S-43 0건) |
| 10 | S-32·H-3 관리자 숫자 | 일치(v2.17 기준 보완) | `fmtCount(n,"명"/"건")`, `fmtWon`(KRW), `fmtDate*`. `_i18n/ko.ts`의 `${Math.floor(INTRO_CONFIRM_MAX_BYTES/…)}MB`, `${Math.round(SIGNED_URL_TTL_SEC/60)}분`은 v2.16 허용 단위(명·건·일) 밖이었으나 기존 `${LEAD_ARCHIVE_NO_CONTACT_DAYS}일`과 같은 형태 → v2.17 3.5에 `분`·`MB`(limits 안내) 추가 |
| 11 | BR-03 구직자 동의·추천 화면 회사명 비노출 | 일치 | `listInterviewConsentRequests`·`ownRecommendations`는 업종·시·도·날짜·상태만 select(회사명·장소·주소 없음). 스크린샷: "제조업 · 서울특별시", 회사명 없음 |
| 12 | S-19·SC-08 동의서 [전문가 검토 필요]·원문 병기 | 일치 | `content/consents/THIRD_PARTY_INTERVIEW/v1/` 6로케일 모두 표기 1회, ko 외 5개는 `---` 뒤 한국어 원문. 화면은 `loadConsentDocuments`(ExpertReviewMark 경로) |
| 13 | S-33 동의서 위치 | 일치 | `content/consents/{type}/{version}/{locale}.md` |
| 14 | S-08 터치 44×44 | 일치 | 버튼 전부 `Button`(sm=44), 텍스트 링크 `min-h-11 min-w-11`, `<summary>` `min-h-11`, `lg:h-*` 축소 0건 |
| 15 | S-05 `text-xs`·임의 글자 크기 | 일치 | 0건 |
| 16 | S-06 임의값 | 일치 | 대괄호 임의값 0건(`min-w-200/240`은 간격 척도, 관리자 표 가로 스크롤 2.6) |
| 17 | S-02 하드코딩 색 | 일치 | 0건 |
| 18 | S-10·3.1 컴포넌트 | 일치 | dialog(추천 실행·동의 철회 확인, 3.1 사용처와 일치), native-select, badge, card, input/textarea/label, NoticeBox, ComingSoon. 관리자 면접 일시 `Input type="datetime-local"`은 shadcn calendar 아님(네이티브, 관리자) |
| 19 | **3.1 form 간격(필드 간 22px·내부 7px)** | **불일치 D-1** | 아래 |
| 20 | S-11 아이콘 | 일치 | 새 아이콘 모두 `strokeWidth={1.5}` + `aria-hidden` |
| 21 | S-09 상태 아이콘+글자 | 일치 | 면접 상태·동의 상태·소개 확인서 배지 모두 아이콘+글자 |
| 22 | S-64 오렌지 | 일치 | `seeker` 버튼은 구직자 "동의"뿐, 대기 상태 `orange` 틴트 배지(v2.14 대상 밖), 기업 화면 버튼 `outline` |
| 23 | **1.1 용어** | **불일치 D-2** | 아래. "비자앤잡 담당자"(기업·구직자 화면) 일치, "직원"은 관리자 화면만 |
| 24 | S-23 금지 표현 | 일치 | 새 ko 문자열 92줄 rg: 지원·채팅·보장·사업주·근로자·수수료 0건 |
| 25 | **S-31·3.6 하드코딩 문자열** | **불일치 D-3** | 아래 |
| 26 | S-28·S-29 번역 키 | 일치 | i18n:check 0, `employer.requests.*`, `seeker.recommended.*`, `seeker.me.interviewConsent.*`, `common.interviewConsent.sms` 6로케일 |
| 27 | S-53 운영 수치 | 일치 | 새 값 전부 `limits.ts`(TTL 300, 5MB, 목록 상한 등), messages에 숫자 0건, 스키마 상한은 limits 상수 |
| 28 | S-42 zod 위치 | 일치 | `schemas/admin/{matching,placements,visaCases}`, `schemas/seeker/me` |
| 29 | S-43·S-44·S-45·S-36 | 일치 | 고유식별 필드 0, 직접 encrypt/decrypt 0(새 `hmacSign`은 crypto.ts 안), console 새 0, any 0 |
| 30 | S-34·4.2 디렉터리 | 일치(v2.17 트리 보완) | 아래 2절 (3) |
| 31 | S-35·4.3 파일명 | 일치(v2.17 명문화) | 아래 2절 (2) |
| 32 | R-210 비공개 저장소 | 일치 | `storage/private/`(`.gitignore` `/storage/`), `public/` 밖, 키 서버 생성·경로 탈출 검사·바이트 시그니처 검사, 서명 URL 사용자·용도 결속, 만료·변조 403(5절 오류 형식), `no-store`·`nosniff`·sandbox CSP |
| 33 | S-50·4.10 테스트 경로 | 일치 | 단위는 미러(`tests/unit/lib/{recommendations,files,consent,admin,seeker}/…`, `tests/unit/app/api/files/[token]/route.test.ts`), 교차 테스트 `tests/unit/server/actions/admin/adminActionsRbac.test.ts`·`employerApiLeak.test.ts`(R 태그 있음), 픽스처 `matchingFixtures.ts`, E2E 3 spec + `support/matchingDb.ts`. PLAN의 `tests/unit/{recommendation-ledger,signed-url,…}.test.ts`와 다르나 4.10 G-2(이 절 우선)대로. 모든 새 테스트에 R-xxx 태그 |
| 34 | CLAUDE.md 스키마 → 마이그레이션 | 일치 | `20261118100000_p2c_matching` + `Interview_status_check`. 새 열은 기본값·nullable이라 시드 변경 불필요(샘플 면접 시드 없음) |
| 35 | S-25·SC-07 플래그 | 일치 | `/seeker/me/recommended` 공고 부분은 `FEATURE_PUBLIC_JOBS` off면 ComingSoon, 본인 추천 기록은 표시(오케스트레이터 수용, STATE 2026-11-18). `/employer/requests` 플래그 미적용 수용. noindex 미들웨어에 `requests` 추가 |
| 36 | SC-06 "지원하기" | 일치 | 0건 |

**일치 33 / 36** (불일치 D-1~D-3)

## 2. 빌더 판단 요청

1. **감사 액션을 4.8 안에서만 사용, CONSENT_GRANT 신설 안 함** — 기준 부합. 근거: BR-15 대상(열람·내보내기·등급 변경·추천·공고 공개)에 동의 부여가 없고, 4.8 목록에도 없으며, 기존 `grantConsent`(P1c)도 감사 없이 `Consent` 행만 쓴다. 행은 지우지 않고(철회는 `revokedAt`) type·version·locale·agreedAt·ipHash·interviewId를 담으므로 부여 기록 요건을 충족. 다만 4.8 `PII_VIEW` 정의가 "관리자 복호 필드 열람"뿐이라 기업 실명 제공·직원 파일 열람에 쓰는 것을 v2.17에서 명시했다.
2. **camelCase 파일명(`signedUrl.ts`, `thirdParty.ts`)** — 기준 부합. 4.3 "`src/lib/**` 신규 파일 = camelCase". PLAN의 kebab 표기(`signed-url.ts`, `third-party.ts`)보다 4.3 우선을 v2.17에 명시(4.10 G-2와 같은 원칙).
3. **4.2 트리 추가 목록** — 모두 실재·규칙 부합, v2.17에 반영. 추가로 v2.16 트리의 `lib/storage/` 자리(미사용)를 `lib/files/`로 바꾸고 루트 `storage/private/`(git 제외)를 기재했다. 4.4에 `interviewDisclosure.ts`를 두 번째 허용 직렬화기로 명시.

## 3. 불일치 목록과 수정 지시

### D-1 새 관리자 폼 간격 (3.1 form "필드 간 22px, 필드 내부 7px")
- 위치(필드 간 `gap-4`/`gap-3`/`gap-2`): `src/components/admin/matching-forms.tsx:86,127,129,223,226`, `src/components/admin/placement-forms.tsx:25,87,127`, `src/components/admin/visa-case-forms.tsx:45,148,189`.
- 위치(필드 내부 `gap-1.5`=6px): `matching-forms.tsx:95,130,134,138,227,239`, `placement-forms.tsx:26,36,48,60,88`, `visa-case-forms.tsx:46,56,67,77,81,90,149`. `matching-forms.tsx:273`(라벨+입력 행 `gap-2`)도 내부 간격 `gap-1.75`.
- 기준 상태: P2b F-2 수정 뒤 다른 관리자 폼(`posting-forms`, `lead-call-form`, `seeker-review-forms`, `staff-login-form`, `totp-form`)은 `gap-5.5`/`gap-1.75`.
- 수정: 폼·필드 그리드 `gap-5.5`, 라벨-입력 묶음 `gap-1.75`. 버튼 한 개짜리 인라인 폼(`matching-forms.tsx:176,184`)과 버튼 줄 `gap-2`는 대상 아님.

### D-2 구직자 화면의 "블라인드 공고" (1.1 용어집 "블라인드 공고" 행: 목록 제목은 "추천 일자리", "블라인드 공고"는 관리자)
- 위치: `messages/ko.json:1369` `seeker.recommended.postingsNote` "…맞는 블라인드 공고입니다." (5개 번역본 같은 키).
- 수정: 구직자 화면 용어로 바꾼다(예 "내 비자로 가능하고 희망 지역·업종에 맞는 추천 일자리입니다. 회사 이름·주소·연락처는 공개하지 않습니다."), 6로케일 함께.

### D-3 기업 화면 문자열 이어 붙이기 (3.6 "사용자 노출 문자열을 JSX·TS에 직접 쓰지 않는다", S-31)
- 위치: `src/app/[locale]/employer/requests/page.tsx:98` `` {r.postingTitle ? ` · ${t("posting")}: ${r.postingTitle}` : ""} `` — 구분자 " · "와 ": "가 코드 리터럴(zh 등 로케일별 구두점 불가).
- 수정: ICU 키 하나로(예 `employer.requests.recommendedAtWithPosting` = "추천일 {date} · 공고: {title}"), 공고 없을 때는 기존 `recommendedAt`. 6로케일 추가.

## 4. 관찰 (판정 밖)

- O-1 주석 경로 오류: `prisma/schema.prisma`(Interview.status 주석)와 마이그레이션 SQL 끝 주석이 `src/lib/interviews/manage.ts`를 가리키나 실제 파일은 `src/lib/recommendations/interviews.ts`. 다음 수정 때 주석 정정 권장(마이그레이션 SQL은 적용 후 수정하지 말고 schema 주석만).
- O-2 날짜 표기: 375 스크린샷의 기업·구직자 화면 "2026. 11. 22. PM 5:28", 관리자 "PM 05:28" — ko 로케일이면 "오후"가 기대값. 서버 Node의 ICU 데이터(small-icu) 또는 로케일 전달 문제일 수 있어 QA가 실행 환경에서 `new Intl.DateTimeFormat('ko',{timeStyle:'short'}).format()` 확인 권장(기준 산출물 문제인지 미확정).
- O-3 `SERVER_ACTION_BODY_LIMIT = "6mb"`는 `INTRO_CONFIRM_MAX_BYTES`(5MB)와 따로 적힌 값이라 운영자가 한쪽만 바꾸면 어긋난다. 둘 다 limits.ts에 있어 S-53 위반은 아니나, 파생식 또는 테스트로 묶길 권장.
- O-4 관리자 "면접 취소"는 되돌릴 수 없는 전이인데 확인 다이얼로그가 없다(3.1 dialog 사용처는 "동의 철회, 추천 실행 등"으로 의무는 아님, Q-14 취지 참고).
- O-5 관리자 375 스크린샷은 본문이 오른쪽에서 잘림(2.6 관리자 1024px 미만 가로 스크롤 허용 범위).
- O-6 `/seeker/me`·`/seeker/me/recommended`에서 참조 데이터 이름이 없으면 원 코드(`?? r.industryCode`)를 보인다. 시드에 모든 코드의 nameKey가 있으면 실제로는 나오지 않음.
- O-7 Gate 4 법무(이미 STATE 기록): THIRD_PARTY_INTERVIEW 동의서가 수령 기업명을 적지 않고 "담당자가 안내"로 둔 것(BR-03과 개인정보 제3자 제공 고지 요건의 조정).

## 5. STANDARD v2.17 변경 내역

- 머리 2.16 → 2.17, 개정 이력 2.17 행.
- 4.2 트리: `lib/recommendations/`(ledger, matching, interviews), `lib/consent/thirdParty.ts`, `lib/files/`(storage, signedUrl — `lib/storage/` 자리 대체), 루트 `storage/private/`(git 제외), `lib/employer/interviews`, `lib/admin/(placements, visaCases)`, `lib/seeker/recommended`, `serializers/interviewDisclosure.ts`, `components/admin/(matching-forms, placement-forms, visa-case-forms)`, `components/seeker/interview-consents`, `schemas/admin/(matching, placements, visaCases)`, `server/actions/admin/(matching, placements, visaCases)`, `api/employer/requests`, `api/files/[token]`, `tests/e2e/support/matchingDb`.
- 4.3: PLAN kebab 표기보다 camelCase 우선.
- 4.4: `interviewDisclosure.ts` 두 번째 허용 직렬화기(조건·키 1개·PII_VIEW·apiRegistry 등록·연락처 select 금지), 구직자에게 보이는 추천·면접 기록의 BR-03 범위.
- 4.8: `PII_VIEW` 범위(기업 실명 제공·직원 파일 열람), 동의 부여 감사 없음(`Consent` 행이 기록, `CONSENT_GRANT` 신설 안 함).
- 3.5: 관리자 단위 허용에 limits 안내용 `분`·`MB`.
- 6 S-37 항목·확인 방법 갱신.
- 산출물 판정 변화 없음(D-1~D-3은 v2.16 기준으로도 불일치).
