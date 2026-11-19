# QA 보고서 — Phase P2a / run 1

- 대상: 커밋 463c75e (블라인드 공고 관리 `/admin/postings`, `/[locale]/jobs`·`/jobs/[id]`·`/api/jobs`(FEATURE_PUBLIC_JOBS), 면접 신청)
- 기준 문서: PRD R-201·R-202·R-203·R-015; PLAN `### P2a`; WO §2(BR-01·03·04·05·14·15), §8.5, §15-3, §15-4, §16; DECISIONS SC-06, SC-07, Q-17
- 일시: 2026-11-17 07:24 ~ 08:15 (KST)
- 환경: Windows 11, 개발 DB 54320(마이그레이션 7개 적용, `prisma migrate status` up to date). 검증 명령 7종은 하나씩 순차 실행, E2E는 `E2E_PORT=3240`(3240·3241·3242 세 서버)으로 다른 시험 없이 단독 실행. 직접 시험은 E2E가 끝난 뒤 같은 빌드로 `next start` 두 개를 띄움: 플래그 off 127.0.0.1:3250(`TRUST_PROXY=true`), 플래그 on 127.0.0.1:3252(`FEATURE_PUBLIC_JOBS=true`, `TRUST_PROXY=true`). 브라우저는 쿠키 때문에 `localhost`로 접속. 스크래치 Playwright 스펙(workers 1)으로 수행: 직원은 `signInNewStaff`(실제 로그인 → TOTP 설정 → `/admin`), 구직자는 실제 OTP 로그인(`loginUi`)·실제 간편 등록 화면. 서버 액션 직접 호출은 브라우저가 실제로 보낸 요청(`Next-Action` 헤더, multipart 본문 `_1_<필드>` + 루트 `0`)을 잡아 값만 바꿔 같은 세션의 페이지 `fetch`로 다시 보냄. `.env` 값 출력 없음, 외부 전송 없음. 두 서버는 끝에 종료(3100~3299·3300 LISTEN 0 확인). 스크래치 파일(`qa-p2a1.config.ts`, `tests/e2e/qa-p2a1*.spec.ts`, 스크래치패드 `qa-p2a1-*`)은 이름으로 삭제. `git status`는 `.workflow/` 기존 변경과 `qa/`뿐, HEAD 463c75e.

## 결과 요약
- 통과: 25 / 전체: 27 (통과율 92.6%), 판정불가 0
- 필수 항목(PRD 합격 기준 문구) 실패: 0개. 호출자 지정 시험 "공고 문구 연락처·회사명 거부(우회 표기 포함)"에서 2개 실패(BR-03·BR-14 관련)
- 결함: D-1(공고 문구 연락처 우회 표기 일부 통과), D-2(공고 문구 회사명 우회 표기 일부 통과)
- 관찰: O-1 ~ O-4

## 검증 명령 (순차 실행)
| 명령 | 종료 코드 | 결과 |
|---|---|---|
| `corepack pnpm lint` | 0 | 오류·경고 없음 |
| `corepack pnpm typecheck` | 0 | 오류 없음 |
| `corepack pnpm test` | 0 | **56 files / 423 tests** 통과(29.7s). P1e run 3 대비 +5 files, +27 tests |
| `corepack pnpm i18n:check` | 0 | ko 951 keys, 6 locales, errors 0 |
| `corepack pnpm qa:static` | 0 | errors 0, warnings 17 (P1e와 같은 수) |
| `corepack pnpm build` | 0 | Compiled successfully, 158/158 페이지. `/admin/postings*`, `/api/jobs*`, `/[locale]/jobs/[id]` 동적(관찰 O-1) |
| `E2E_PORT=3240 corepack pnpm test:e2e --reporter=line` | 0 | **222 passed (2.8m)**, 실패 0 (P1e 210 + jobs-apply 6 tests × 2 프로젝트) |

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| 1 | R-201 C·B·보관·재접촉금지 리드로 공고 생성 불가(화면) | PLACEMENT로 각 등급 리드의 `/admin/postings/new?leadId=` 열기 | Pass | C·B·ARCHIVED·DO_NOT_CONTACT 4개 모두 `admin-forbidden` 1, `posting-create-form` 0 |
| 2 | R-201 서버 거부(요청 변조·직접 호출) | A 리드 작성 화면을 채운 뒤 숨은 `leadId`를 DOM에서 C 리드로 바꿔 저장; 그 요청을 잡아 leadId만 B·ARCHIVED·DNC·없는 id로 바꿔 직접 호출; 대조로 같은 요청을 A 리드로 | Pass | 화면 `action-error` data-code `LEAD_NOT_A`. 직접 호출 4건 HTTP 200 `{ok:false,code:"LEAD_NOT_A"}`, digest 0; 없는 id `LEAD_NOT_FOUND`. 비A 리드 공고 DB **0건**. 대조(A 리드) `{ok:true}`·공고 1건 → 직접 호출 경로가 실제로 동작함을 확인 |
| 3 | R-201 화면을 연 뒤 리드가 강등되면 거부 | A 리드 작성 화면을 채운 뒤 DB에서 리드를 B로 바꾸고 저장 | Pass | `LEAD_NOT_A`, 공고 생성 없음 |
| 4 | R-201 / WO §15-4 verifiedBy/At 없이 공개 서버 거부 | 새 DRAFT 공고 상세에서 검증 전 "공개" 클릭, 같은 요청 직접 재호출 | Pass | 화면 `NOT_VERIFIED`, 직접 호출 `NOT_VERIFIED`. DB `{status:DRAFT, verifiedAt:null, verifiedBy:null, publishedAt:null}`, POSTING_PUBLISH 감사 0 |
| 5 | R-201 DB CHECK(직접 쓰기 차단) | 같은 DRAFT를 원시 SQL·Prisma로 PUBLISHED 변경 4가지(검증 없음 / verifiedAt만 / verifiedBy만 / publishedAt 없음) | Pass | 4건 모두 거부: SQLSTATE 23514, 제약 `JobPosting_published_requires_verification`. 이후 행 그대로 DRAFT |
| 6 | R-201 검증 → 공개 시 POSTING_PUBLISH 감사, 리드 강등 시 공개 거부 | 화면 "검증" → DB 확인 → 리드를 ARCHIVED로 바꾸고 공개 직접 호출 → 리드를 A로 되돌리고 화면 "공개" → 같은 공개 요청 재호출 → "마감" | Pass | 검증 후 verifiedBy=로그인 직원 id, verifiedAt 기록. 강등 상태 공개 `LEAD_NOT_A`(DRAFT 유지). 공개 후 `posting-status` PUBLISHED, AuditLog POSTING_PUBLISH **1행** `{actor: 공개한 직원, entity: JobPosting, meta:{leadId, verifiedBy}}`. 재공개 `POSTING_STATE`, 감사 1행 그대로. 마감 → CLOSED |
| 7 | R-201 권한: STAFF_VISA 거부 | VISA 직원으로 `/admin/postings`, 작성 화면, 공고 상세 열기; PLACEMENT가 보낸 생성·검증·공개·마감 요청을 VISA 세션으로 재호출(대상: 새 DRAFT·검증된 DRAFT·공개 공고); 비로그인 재호출 | Pass | 화면 3개 `admin-forbidden` 1, 폼 0, 회사명 미노출. 직접 호출 4건 `{ok:false,code:"FORBIDDEN"}`, DB 불변(생성 0, DRAFT·미검증 유지, PUBLISHED 유지, 감사 0). 대조: 같은 공개 요청을 PLACEMENT 세션으로 → `{ok:true}`. 비로그인 → 로그인 리다이렉트(opaque 응답), 행 불변 |
| 8 | R-201 공고 문구 연락처 거부(우회 표기 포함) | 생성 요청의 제목·직무만 바꿔 직접 호출 15가지 + 화면 1건 | **Fail** | 거부됨: `010-1234-5678`, `010 1234 5678`, `공일공 일이삼사 오육칠팔`, 전각 `０１０－…`, `o1o-I234-5678`, `02-123-4567`, 이메일, `골뱅이·닷` 표기, `www.` URL, `카톡 qa1234`, `kakao id:`, 직무란 전화, 이메일 사이 ZWSP. 화면: "공고 제목·직무에 전화번호·이메일·메신저 같은 연락처를 적지 마세요.", 입력값 유지. **통과(저장됨)**: `010​1234​5678`(사이 U+200B), → 결함 D-1 |
| 9 | R-201 공고 문구 회사명 거부(우회 표기 포함) | 같은 방법으로 회사명 "이투이공고정밀 주식회사" 리드에 13가지, 구인 의뢰형 리드(companyName 없음, Company 암호화 이름만) 2가지 | **Fail** | 거부됨: 그대로, 띄어쓰기, `(주)`, `㈜`, 하이픈, 가운뎃점, 전각 공백, 직무란 회사명, 구인 의뢰형 리드의 Company 이름(띄어쓰기 포함) → `TEXT_HAS_COMPANY`. **통과(저장됨)**: `이투이/공고정밀`, `이투이_공고정밀`, `이투이​공고정밀`(U+200B) → 결함 D-2 |
| 10 | R-202 / WO §15-3 C·B 리드 공고 노출 0(DB에서 강제로 PUBLISHED여도) | 리드 등급 A·B·C·ARCHIVED·DNC 공고를 DB에 PUBLISHED+검증 상태로 직접 만들고, 추가로 A 리드의 CLOSED·DRAFT 공고, 리드 없는 PUBLISHED 공고 생성 → `/ko/jobs` HTML, `/api/jobs`, `/ko/jobs/[id]`, `/api/jobs/[id]` | Pass | A만 목록·API·상세 200. B·C·ARCHIVED·DNC·CLOSED·DRAFT·리드 없음: 목록 0, API 0, 상세 페이지 404, API 상세 404. `/api/jobs` 전체 49건을 DB와 대조: 리드 비A **0**, 비PUBLISHED/미검증 **0** |
| 11 | R-202 리드가 A에서 빠지면 숨김 | 노출 중인 A 공고 2개의 리드를 각각 ARCHIVED, B로 변경 후 재조회 | Pass | 둘 다 목록·API에서 사라지고 상세·API 상세 404. 다른 A 공고는 그대로 노출 |
| 12 | R-202 / BR-03 응답에 회사명·주소·담당자·연락처·사업자번호·companyId·leadId 없음 | 회사명·사업자번호(암호화 `8123456789`, 리드 `812-34-56789`)·담당자 `홍큐에이담당`·전화 `010-9876-5432`·이메일·`requestJson` 주소 `…금지로 123`·리드 제목을 모두 넣은 A 리드 공고 1건 → 6개 언어 목록·상세 HTML, 같은 경로 RSC(`RSC: 1`), `/api/jobs`, `/api/jobs/[id]` 총 26개 응답에서 문자열 검색(값 20종 + 키 이름 `companyId`·`leadId`·`verifiedBy`·`bizRegNo`·`contactPhone`, 검증자 id) | Pass | 26개 응답 검출 **0건**(공고 자체는 모든 응답에 포함됨을 확인). API 키 집합은 1종 `blindTitle, dormitory, eligibleVisas, headcount, id, industryCode, meals, overtimeNote, payMax, payMin, placementRegNo, role, shift, sido, sigungu, verified` = `BLIND_JOB_FIELDS`. `placementRegNo`는 사무소 등록번호(site.config) |
| 13 | R-202 JobPosting 스키마 미적용 | 위 26개 응답에서 `JobPosting` 문자열, 상세 HTML의 `application/ld+json` 검색 | Pass | `JobPosting` 0건, ld+json 0건. E2E jobs-apply도 같은 확인 통과 |
| 14 | R-015 / SC-07 플래그 off(기본 서버) | 3250 서버: `/ko/jobs`·`/en/jobs`·없는 id·실제 공고 id 상세, 6개 언어 목록(1280·375), 6개 언어 × 8개 화면(홈, about, fees, seeker, employer, visa-check, guide, 간편 등록) 링크, `/api/jobs`·`/api/jobs/[id]`, `sitemap.xml`; 대조로 3252 서버 | Pass | 목록·상세 모두 200 + `coming-soon` + `<meta name="robots" content="noindex, nofollow">`, 공고 내용·면접 신청 영역 없음(id는 canonical URL에만). `/jobs` 링크 **0**(48개 화면). API 404 2건. sitemap `/jobs` 0. 플래그 on 대조: 홈에 `/ko/jobs` 링크, sitemap `/jobs` 48줄, `/api/jobs` 200, robots 메타 없음 |
| 15 | R-203 ① 로그인·비자 일치 → InterestRequest + 담당자 알림 | F-4 구직자 실제 OTP 로그인 → F-4 공고 상세 → "면접 신청" | Pass | panel `ELIGIBLE` → "면접 신청이 접수되었습니다. 비자앤잡 담당자가 확인한 뒤 연락드립니다." InterestRequest 1행 `{initiator:SEEKER, status:RECEIVED, seekerId: 본인, companyId: 공고 회사}`, StaffTask INTEREST_FOLLOWUP 1행 `{OPEN, STAFF_PLACEMENT}`, payload는 id만(`initiator, postingId, interestRequestId`). 서버 로그 콘솔 알림 1줄 `{"channel":"STAFF","to":"***NT","templateKey":"staff.interestRequest"}`(개인정보 없음) |
| 16 | R-203 중복 신청 1건 | 신청 직후 같은 요청 3회 동시 재호출, 새로고침; 새 구직자로 첫 신청 4건 동시 호출 | Pass | 재호출 3건 `{ok:true,already:true}`, 새로고침 panel `REQUESTED`, 행 1·업무 1·알림 1줄 유지. 동시 첫 신청 4건: `ok` 1 + `already` 3, InterestRequest 1·StaffTask 1 |
| 17 | R-203 ② 비로그인 → 간편 등록 `?next=` 후 복귀 | 비로그인으로 `/ko/jobs/[id]` → "면접 신청" → 실제 간편 등록(OTP·동의) → 복귀 → 면접 신청. 기존 구직자로 "이미 등록했나요? 로그인" 경로. 로그인 상태에서 `quick?next=` 열기 | Pass | panel `ANONYMOUS`, 링크 `/ko/seeker/register/quick?next=%2Fjobs%2F<id>`, 로그인 링크 `/ko/seeker/login?next=…`. 등록 후 `/ko/jobs/<id>`로 복귀, panel `ELIGIBLE`, 신청 1건. 로그인 경로도 `/ko/jobs/<id>`로 복귀. 로그인 상태 `quick?next=` → 공고로 이동. E2E(vi)도 통과 |
| 18 | R-203 ③ 비자 불일치 → 상담 신청 + 서버 NOT_ELIGIBLE | E-9 구직자, 비자 없는 구직자로 F-4 전용 공고 열기 + 면접 신청 요청 직접 호출 | Pass | 두 경우 panel `NOT_ELIGIBLE`, `interest-submit` 0, 등록 버튼 0, "상담 신청" 1(href `/ko/about#contact`). 직접 호출 `{ok:false,code:"NOT_ELIGIBLE"}`, InterestRequest 0·업무 0 |
| 19 | R-203 BLOCKED 거부 | F-4이지만 status BLOCKED 구직자로 같은 시험 | Pass | panel `BLOCKED`, 신청 버튼 0, 상담 신청 1, 직접 호출 `{ok:false,code:"BLOCKED"}`, 행 0 |
| 20 | R-203 비로그인·숨은 공고·플래그 off 직접 호출 거부 | 비로그인 페이지에서 신청 요청 재호출; B 리드 공고 id로 재호출; 같은 세션으로 플래그 off 서버(3250)에 재호출(대조: 같은 요청을 on 서버로) | Pass | 비로그인 `UNAUTHENTICATED`, 숨은 공고 `NOT_FOUND`·행 0, 플래그 off `{ok:false,code:"NOT_FOUND"}`·행 0, 대조(on) `{ok:true,already:false}`·행 1 |
| 21 | BR-01 기업으로 가는 알림·데이터 0 | 신청 전후 on 서버 로그의 `notification.send` 전부, 회사 계정 수, 기업 쪽 코드의 InterestRequest 사용처 | Pass | 신청 구간 알림은 `channel:"STAFF"` 1종뿐(기업·이메일·SMS 0). 공고 회사에 연결된 User 0. `interestRequest`를 읽는 코드는 `src/lib/postings/*`, `src/server/actions/jobs/interest.ts`, `/admin/postings`뿐(기업 화면·API 없음). 화면 문구 "기업에 내 연락처가 전달되지 않습니다." |
| 22 | SC-06 '지원하기'/Apply 0 | 6개 언어 목록·상세(1280·375) 본문, 로그인 상태(ELIGIBLE·DONE·NOT_ELIGIBLE) 본문, `messages/*.json`·`src` 검색 | Pass | 본문 검출 0(지원하기, Apply, Ứng tuyển, Откликнуться 등). 버튼 문구: 면접 신청 / Request an interview / Đăng ký phỏng vấn / Записаться на собеседование / 申请面试 / Suhbatga yozilish. 소스 검색은 주석 2곳뿐 |
| 23 | 6개 언어 렌더 | on 서버 6개 언어 목록·상세, off 서버 6개 언어 목록 | Pass | 모두 200, `<html lang>` 일치, 메시지 키 노출(`public.jobs.` 등) 0, 배지 "검증 완료"·교대 값 번역(E2E en) |
| 24 | 375 가로 스크롤 없음, 터치 44×44 | 1280·375(모바일 터치)에서 on 6개 언어 목록·상세, off 6개 언어 목록, 로그인 상태 3종, 관리자 `/admin/postings`·작성·상세의 보이는 `a[href]`·`button`·`select`·`input`·`[role=checkbox]` 측정 | Pass | 44 미만 **0건**(화면당 8~195개 측정, 체크박스는 44 이상 label 안). 모든 화면 `scrollWidth = clientWidth`(375/375, 1280/1280) |
| 25 | 회귀 P1c 간편 등록(`?next` 없거나 안전하지 않으면 완료 화면) | E2E quick-register 전체; `?next=//evil.example/x`, `https://evil.example`, `/\evil.example`로 실제 등록 | Pass | E2E 통과(222/222에 포함). 위험한 next 3건 모두 안내 문구 0, 등록 후 `/ko/seeker/register/complete` |
| 26 | 회귀 P1e 관리자 핵심 | E2E admin-core·auth·employer-intake 등 전체 | Pass | 222/222 통과(admin-core 8/8 포함) |
| 27 | 검증 명령 7종 | 위 표 | Pass | 7개 모두 종료 코드 0 |

## 판정불가 / 사람 확인 필요
없음.

## 결함 목록 (Fail만)
| 번호 | 요구사항 | 재현 방법 | 기대 | 실제 | 위치 | 심각도 |
|---|---|---|---|---|---|---|
| D-1 | R-201 / BR-03·BR-14 공고 문구 연락처 거부(우회 표기) | PLACEMENT로 A 리드 공고 작성, 블라인드 제목에 `생산직 010`+U+200B+`1234`+U+200B+`5678` 입력 후 저장(복사·붙여넣기로 보이지 않는 문자 포함). 함수 단위로도 `hasContacts()`가 `010​1234​5678`, `010‌…`, `010⁠…`, `010­…`(보이지 않는 문자)와 `010_1234_5678`, `010~1234~5678`, `010*1234*5678`에 false | `TEXT_HAS_CONTACT`로 거부 | `{ok:true}`, DRAFT 공고 저장(화면에는 `01012345678`처럼 보임) | `src/lib/pii-guard.ts` `SEP`(구분자 집합에 `_ ~ *`·폭 없는 문자 없음, 폭 없는 문자 제거 정규화 없음); 호출 `src/lib/postings/manage.ts` `createPostingFromLead` | 중간: 공개 문구는 직원이 쓰고 검증 단계가 한 번 더 있지만, 같은 함수가 기업 자유 입력란(BR-14)에도 쓰여 영향 범위가 넓음 |
| D-2 | R-201 / BR-03 공고 문구 회사명 거부(우회 표기) | 회사명 "이투이공고정밀 주식회사" A 리드로 제목 `이투이/공고정밀 생산직`, `이투이_공고정밀 생산직`, `이투이`+U+200B+`공고정밀 생산직` 저장. 함수 단위로 `containsCompanyName()`가 `/ _ ~ + :`·U+200B·U+00AD 사이 표기에 false | `TEXT_HAS_COMPANY`로 거부 | `{ok:true}`, 공고 저장 | `src/lib/postings/manage.ts` `normalizeName`(제거 문자 `[\s·.,()[\]{}'"-]`만) | 낮음~중간: 직원이 작성·검증하는 문구라 고의 우회 가능성은 낮지만, 공개 화면에 회사명이 나가는 경로 |

제안(참고): 비교 전에 글자·숫자 이외(유니코드 `\p{L}\p{N}` 밖) 문자를 모두 지우는 방식으로 정규화하면 두 결함이 함께 해소됨. 회사명 비교는 짧은 이름 오탐에 주의(지금 최소 2글자).

## 관찰 / 기준 외 발견
| 번호 | 내용 | 재현·증거 | 영향 | 제안 |
|---|---|---|---|---|
| O-1 | 빌드 출력이 `/[locale]/jobs`를 `●`(SSG, /ko/jobs 등)로 표시 | `next build` 출력. 그러나 prerender-manifest에 jobs 없음, 같은 빌드에서 off 서버는 ComingSoon·on 서버는 목록을 요청마다 보여 줌(항목 10·14) | 실제 동작 영향 없음 | 없음(기록만) |
| O-2 | 면접 신청 폼에서 서버가 `NOT_ELIGIBLE`을 돌려주면(화면을 연 뒤 비자가 바뀐 경우) 문구는 "지금은 면접 신청을 할 수 없습니다. 상담 신청으로 문의해 주세요."이고 상담 신청 버튼은 그 자리에 없음 | `src/components/jobs/interest-form.tsx` errorKey 매핑. 새로고침하면 상담 신청 버튼 표시(항목 18) | 드문 경우, 문구로 안내됨 | 필요하면 오류 아래 상담 신청 링크 추가 |
| O-3 | 관리자 공고 상세에 리드 회사명이 보임 | PLACEMENT 공고 상세 HTML에 회사명 포함 | 직원 전용 화면이라 허용 범위(VISA는 화면 자체 거부, 항목 7) | 없음 |
| O-4 | 시험 행이 개발 DB에 남음 | E2E와 이번 직접 시험의 `E2E-POSTING:*`·`QAP2A1*` 리드, PUBLISHED 공고(현재 `/api/jobs` 49건), Company(`이투이공고정밀 주식회사`·`큐에이*`), 구직자·직원 계정, InterestRequest·StaffTask·AuditLog | 플래그 on 개발 서버의 `/jobs`에 시험 공고가 많이 보임 | 정리 스크립트 또는 E2E 전용 DB(이전 관찰과 같음) |
