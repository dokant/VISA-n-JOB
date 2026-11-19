# QA 보고서 — Phase P1a / run 1

- 대상: Phase P1a — 공개 페이지·진단 엔진·수요 지도·SEO (커밋 79339bc + 48a80fb)
- 기준 문서: PRD v1.1, PLAN P1a 완료 조건·QA 방법, DECISIONS PC-7·PC-8·SC-06·SC-07·SC-08·SC-11·SC-12·Q-06·Q-07, WO §2(BR-01·04·10·11·12)·§8.4·§10·§13·§15
- 일시: 2026-11-16
- 환경: Windows 11, Node 24.15, 개발 DB 127.0.0.1:54320 실행 중(`db:status` running), 테스트 DB 54329(Vitest 자동)

## 결과 요약
- 통과: 13 / 전체: 13 (통과율 100%) — 필수 12/12, 선택(R-131) 1/1
- 필수 항목 실패: 0개
- 기준 외 발견: 2건(O-1 e2e 간헐 시간 초과, O-2 SITE_URL 기본값) — 결함 아님, 아래 참고

## 검증 명령 (순차 실행, 실제 출력)
| 명령 | 종료 코드 | 출력 근거 |
|---|---|---|
| `pnpm lint` | 0 | `eslint .` 오류·경고 출력 없음 |
| `pnpm typecheck` | 0 | `tsc --noEmit` 출력 없음 |
| `pnpm test` | 0 | `Test Files 18 passed (18)`, `Tests 166 passed (166)` (aggregate 10, e74 12, evaluate 25 포함) |
| `pnpm i18n:check` | 0 | 6개 언어 각 `0 error(s), 0 warning(s)`, `source ko: 365 key(s) … errors: 0` |
| `pnpm qa:static` | 0 | `errors: 0, warnings: 15` (S-23 문구 검토 14건: "수수료"·"유료직업소개소"·"정식 유료직업소개소" 등, S-45 console 1건 — 사람 검토용 경고) |
| `pnpm build` | 0 | 라우트 표 출력, /[locale]/demand 등 생성 |
| `pnpm test:e2e` 1회차 | **1** | `1 failed, 131 passed` — `[desktop-chromium] seo.spec.ts:69 R-131 guide` 가 `/zh/guide/how-to-use` `page.goto` 30초 시간 초과 |
| `pnpm test:e2e tests/e2e/seo.spec.ts` | 0 | `12 passed` |
| `pnpm test:e2e` 2회차(전체) | 0 | `132 passed (1.8m)` |
| `pnpm lighthouse` | 0 | `/ko 91·100`, `/ko/about 94·100`, `/ko/fees 96·100`, `/ko/terms 89·100` (성능·접근성 중앙값), `all pages meet the thresholds` |

## 항목별 결과
| 번호 | 합격 기준 | 시험 방법(실제로 한 것) | 결과 | 증거 |
|---|---|---|---|---|
| R-101 | 메인 요소 6개 언어 존재 E2E | `next start` 3110(플래그 off)에서 `/ko /en /vi /ru /zh /uz` curl → HTML 대조 스크립트. e2e home.spec 6개 언어×2 뷰포트 | Pass | 6개 언어 모두: `home-audience` + `role="tab"` 3개, `home-visa-widget` 있음, `/{l}/fees` 링크 5개, `common.noSeekerFee` 문구(ko "구직자 이용료 없음", en "No fees for job seekers", vi "Người tìm việc không mất phí", ru "Для соискателей бесплатно", zh "求职者免费", uz "Ish izlovchilar uchun bepul") 존재. 실적 지표 `metrics-grid` 없음(PC-7: 운영자 입력 없음 → 숨김, 히어로·등록 카드만). 플래그 off 시 `home-demand-preview` 없음, 플래그 on(3111) 시 있음. e2e `R-101 home elements` 12건 ok |
| R-102 | 4개 페이지 200, 약관·개인정보 [전문가 검토 필요], 푸터 공시 | 6개 언어 × about/fees/privacy/terms curl, 보이는 텍스트 추출 | Pass | 24개 모두 200. privacy·terms 6개 언어 모두 `data-testid="expert-review"` 1개, 보이는 "[전문가 검토 필요]"(비한국어는 한국어 원문+번역 병기, SC-08 — 예 en "[전문가 검토 필요] [Expert review required]"). 푸터(24페이지 전부): 정충교, 748-39-01213, 24-SU-RG-042, 제2026-3230291-14-5-00014호, 법원로9길 26 주소, 02-6281-8901, 수수료 링크 모두 있음. [휴대전화 번호 삭제됨] 0건, 계좌·은행 문구 0건(Q-06) |
| R-103 | 메인·about·fees·terms 모바일 성능 ≥85, 접근성 ≥90 | `pnpm lighthouse`(빌드 후 3200, 3회 중앙값) | Pass | `.lighthouse/summary.json`: /ko 성능 91(런 92·91·86), about 94, fees 96, terms 89(87·89·98), 접근성 전부 100. 최저 단일 런 86(/ko) — 기준선 근접(사람 확인 참고) |
| R-117 | 마스킹 테스트(WO15-10), 고지 6개 언어, "지원하기" 없음 + R-015 off 비활성 | ① 단위 테스트 ② 3110(off) `/ko/demand`, `/en/demand` ③ `FEATURE_DEMAND_MAP=true` 3111 서버로 6개 언어 curl, `<main>` 안 `a/button` 열거 | Pass | ① `aggregate.test.ts` 10건 통과, `WO15-10 masking (R-117)` 블록(5건 미만 셀 건수·급여 숨김, 시·도 합계에 가려진 수 미포함, DB 집계 마스킹) ② off: HTTP 200, ComingSoon "준비 중입니다", `<meta name="robots" content="noindex, nofollow">`, 메인·전 페이지에 `/demand` 링크 0건, sitemap에 demand 0건 ③ on: 6개 언어 200, `public.demand.notice`(ko "공공 채용정보를 바탕으로 비자앤잡이 분석한 … 개별 채용이 확정된 정보가 아닙니다.") 6개 언어 출력, robots noindex 없음(WO §13 색인 허용), sitemap demand 6건, main 안 버튼 정확히 2개(ko "이 지역·업종 일자리 알림 받기", "내 비자로 가능한지 확인"), "지원하기" 0건, 데이터 없는 시·도 "자료 부족". e2e demand.spec(PC-8 쿼리 전달 포함) 통과 |
| R-126 | 모든 결과에 "참고용, 행정사 확인 필요" | 3110에서 `/ko/visa-check?visaCode=E-9`, `F-2&sido=SEOUL&industryCode=C`, `B-1` curl. e2e home 위젯·visa-check(JS 끈 상태) | Pass | 3건 모두 `data-outcome="YELLOW"`, 보이는 텍스트에 "참고용, 행정사 확인 필요". 시드 규칙이 전부 DRAFT라 일치 규칙 없음 → YELLOW(WO15-09). `evaluate.test.ts` 25건 통과. 잘못된 코드(`visaCode=NOPE`)는 결과 카드 없음(검증 거부) |
| R-127 | 시드 상태 "준비 중" E2E, 결과 형식(총점·항목별·부족·참고 문구) | `/ko/score/e74` curl, e2e score.spec, 단위 테스트 | Pass | "점수 계산기는 준비 중입니다 … 지금은 상담 신청으로 안내해 드립니다. 상담 신청", robots noindex. e2e `/{6개 언어}/score/e74 shows coming soon` 12건 ok. `e74.test.ts` 12건(테스트 전용 PUBLISHED 더미 표로 total·items·shortfalls·disclaimerKey) 통과. 코드: `scoreE74` PUBLISHED 표 없으면 `NOT_READY` |
| R-128 | `src/` 비자 배점·요건 상수 0건 (코드 리뷰) | rg로 비자 코드(E-/F-/D-/H-/C-/B-) 패턴, "점·년·개월·만원" 수치, `score/points/salary/years = 숫자` 패턴 검색. `evaluate.ts`, `e74.ts`, `constants.ts`, `limits.ts`, `referenceData.ts`, `schemas/visa/*` 정독 | Pass | 비자 코드 문자열은 주석·"E-7-4" 라벨 slug뿐. 엔진은 DB의 PUBLISHED `VisaRule.conditions`·`ScoreTable.items`만 비교·합산, 자체 기준값 없음. 비자·지역·업종 목록은 DB(`referenceData.ts`). `limits.ts` 숫자(30일, 5건, 10만원 구간, C·B·A)는 WO §8.4 운영값으로 법령 수치 아님. messages·가이드 MDX에도 배점·요건 수치 없음. qa:static 비자→트랙 매핑 패턴 오류 0 |
| R-130 | sitemap, robots, hreflang, Organization, /admin·/employer/candidates noindex | 3110·3111 curl | Pass | robots.txt: `Disallow: /admin`, `/api/`, `/*/employer/candidates`, `Sitemap:` 행. sitemap.xml: 48 URL(8경로×6언어), hreflang 336개, off 시 demand·candidates·admin 없음. `/ko` head: hreflang ko·en·vi·ru·zh·uz·x-default + canonical. Organization JSON-LD(이름·주소·전화·등록번호 3종). `/admin`: 404 + `x-robots-tag: noindex, nofollow` + meta noindex. `/ko/employer/candidates`: 200 + 헤더·메타 noindex. JobPosting: 수집한 전 페이지 0건 |
| R-131 (선택) | 가이드 렌더, reviewedBy·updatedAt, FAQPage·BreadcrumbList, /cases 골격 | 6개 언어 `/guide/how-to-use` curl, `/ko/cases` | Pass | 6개 언어 200, `guide-meta`에 검토자(“[전문가 검토 필요] 행정사 검토 전”)·업데이트 2026-11-16, JSON-LD `FAQPage`, `BreadcrumbList`. `/ko/cases` 200. (e2e 1회차 시간 초과는 O-1) |
| N-02 | i18n:check 누락 0 | `pnpm i18n:check` | Pass | 6개 언어 0 error, 365 키 |
| N-03 (이 Phase 문서분) | 법적 문서 초안 [전문가 검토 필요] | privacy·terms·가이드·판정 라벨 확인 | Pass | privacy·terms 6개 언어 표시(R-102), 가이드 메타 표시, 판정 라벨 `visa.outcomeReviewNote` "[Expert review required] …"(SC-12). fees는 요금표 미게시(ComingSoon)라 초안 문서 없음 |
| N-04 (1차) | 375px 가로 스크롤 없음 | e2e mobile-375 프로젝트 | Pass | `static-pages.spec N-04 375px: no horizontal scroll on public pages` 6개 언어 ok(양 프로젝트), `smoke N-04` ok, 2회차 전체 132 passed |
| R-015 재확인 | 플래그 미설정 시 수요 지도 비활성 | 3110(플래그 없음) vs 3111(`FEATURE_DEMAND_MAP=true`) 비교 | Pass | off: ComingSoon·noindex·링크·미리보기·sitemap 전부 숨김. on: 전부 노출. 같은 빌드에서 요청 시점 판독(`dynamic = "force-dynamic"`) |

### 상시 점검 (BR)
- SC-06 / "지원하기": 6개 언어 × 13개 경로 × 2개 서버(off/on) 응답 전체에서 "지원하기"·"지원 가능" 0건, 영문 등 "Apply" 계열 0건. `src/`·`messages/` 검색 결과 주석 2건뿐.
- BR-01 직접 연락: 전 응답의 `tel:`/`mailto:`/`sms:` 링크는 운영자 대표전화 `tel:0262818901` 1종뿐(SITE_INFO 표시 규칙상 허용). 카카오·잘로·텔레그램·WhatsApp 링크 0건. 구직자↔기업 연락 수단 없음.
- BR-10: R-101·R-102 참고. BR-11: R-126. BR-12: R-128. BR-04: R-117(집계·마스킹·고지).

## 결함 목록 (Fail만)
없음.

## 기준 외 발견 (결함 아님)
| 번호 | 내용 | 재현 | 제안 |
|---|---|---|---|
| O-1 | e2e `seo.spec.ts:69 R-131 guide` 간헐 시간 초과. 1회차 전체 실행에서 `/zh/guide/how-to-use` `page.goto`(load 대기)가 30초 초과로 실패해 `test:e2e` 종료 코드 1. 단독 실행·2회차 전체 실행은 통과. 서버 응답 자체는 0.02초(curl) | `pnpm test:e2e` 전체를 반복 실행(병렬 부하 시) | 한 테스트에서 6개 언어를 순차 이동하므로 `test.setTimeout` 상향 또는 언어별 테스트로 분리, `waitUntil: "domcontentloaded"` 고려. zh 지연 폰트(Noto Sans SC) 로딩이 load 이벤트를 늦추는지 확인 |
| O-2 | sitemap·robots·canonical·hreflang·JSON-LD URL이 `http://localhost:3000` (SITE_URL 미설정 기본값). 시험 서버 포트와도 다름 | `curl /robots.txt` | 운영 배포 시 `SITE_URL` 필수 설정 — 출시 점검(P2e) 목록에 넣기 |

## 판정불가 / 사람 확인 필요
- SC-11 적용: 한국어 폰트가 Pretendard → Noto Sans KR로 교체됨(사전 승인 범위, 사용자 확인 권장). zh만 Noto Sans SC 지연 로드.
- /ko 성능: 이번 측정 중앙값 91(런 86~92), 빌더 측정 86 — 기준 85에 근접할 수 있어 변동 주의.
- "상담 신청" 링크가 `/ko/about#contact`(대표전화 안내)로 연결됨(11곳). 상담 신청 폼은 아직 없음.
- 아직 없는 경로 링크 404: `/ko/seeker/register`, `/ko/seeker/register/quick`, `/ko/employer/diagnosis`, `/ko/employer/request` (P1c·P1d에서 생성 예정).
- qa:static 경고 15건(S-23 "수수료"·"유료직업소개소"·"정식" 등 문구, S-45 console) — 사람 검토 대상, 실패 아님.
- about·fees 페이지에는 [전문가 검토 필요] 표시 없음. PRD 합격 기준은 약관·개인정보만 요구하므로 Pass로 봤으나, PLAN 작업 5 문구("/about, /fees, /privacy, /terms: 초안 + [전문가 검토 필요]")를 about·fees에도 적용할지는 사람이 정할 것(fees는 요금표 미게시 상태).
- 번역 품질(5개 언어)은 원어민 검토 필요(`_review` 유지).
- 시험용 서버(3110, 3111)는 종료함. 3123 포트 LISTEN 프로세스는 시험 전부터 있던 것으로 건드리지 않음.
