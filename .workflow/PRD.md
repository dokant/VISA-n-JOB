# PRD — 비자앤잡(Visa&Job) 홈페이지

- 버전: 1.1 / 갱신일: 2026-11-16
- 근거 문서: start.md, docs/WORK_ORDER.md v1.0 (이하 WO). 이 PRD와 WO가 다르면 WO §2(BR)가 우선하고, 나머지는 멈추고 질문한다.

## 1. 개요
외국인 구직자·구인기업의 의뢰를 운영자가 접수·검증·중개하는 폐쇄형 플랫폼(공개 웹 6개 언어 + 한국어 관리자 시스템)을 만든다. 이번 범위는 WO Phase 0~2(기반, 구직자 풀 형성 MVP, 폐쇄형 매칭)이다. 성공 기준은 아래 필수 요구사항 100% 통과, WO §15 필수 테스트 11개 통과, BR-01~15 위반 0건이다.

## 2. 범위
- 포함: WO §14 Phase 0·1·2 작업 전부, §11 보안, §12 다국어(1차 6개), §13 SEO 기본, §16 기능 플래그.
- 제외(Out of scope):
  - WO Phase 3 전부: 카카오 알림톡·메신저 어댑터, 기업 재직 외국인 체류 대시보드(`/employer/staff-visa`), VisaCase 고유식별정보 수집, 협력 소개소 포털(`/agency/*`), 2차 언어, LLM 설명 레이어, 계절근로 모듈
  - 실제 SMS/이메일 발송(개발용 콘솔 어댑터와 SMTP 어댑터 인터페이스까지만), 클라우드 파일 버킷(로컬 비공개 저장소 어댑터로 대체)
  - 실서버 배포, 도메인, 실제 법령 수치 입력(BR-12), 약관·동의서 법률 확정본
  - 구직자↔기업 직접 연락 기능 일체(BR-01)

## 3. 흐름과 구조
- 흐름·사이트맵·데이터 모델: WO §1.2, §4, §5, §6을 확정본으로 사용한다. 데이터 모델에 필드를 추가할 수 있으나 BR을 깨면 안 된다. 추가 필요 테이블: `VisaType`(defaultTrack, D-2 졸업 기준 개월 등 트랙 조건 포함, WO §7.4), `Industry`(KSIC 대분류), `Region`(시·도/시·군·구, 인구감소지역 플래그 — 에이전트 초안, isSample·검토 필요 표시, PC-6), `OtpChallenge`, `StaffTask`(알림·상담·행정사 업무, PC-4), `Lead/진단 결과` 저장용 필드.
- 스키마 조정(PC-3, SC-10): 간편 등록·단계 저장을 위해 SeekerProfile의 위저드 입력 필드는 nullable로 두고 완성 여부는 `completedStep`으로 판정한다. `shiftOk`는 문자열 enum(YES/NO/CONDITIONAL/UNKNOWN).
- Gate 3에서 승인된 세부 결정(PC-1~15, SC-01~12)은 DECISIONS.md를 따른다.
- 개발 DB: 임베디드 PostgreSQL(npm `embedded-postgres`)로 로컬에서 실제 Postgres를 띄운다. 운영 DB는 서울 리전 전제(배포는 범위 밖).

## 4. 요구사항

> P = WO Phase. 합격 기준의 "테스트"는 Vitest/Playwright 자동 테스트가 저장소에 있고 통과해야 함을 뜻한다.

### 4.1 Phase 0 — 기반
| 번호 | P | 요구사항 | 합격 기준 | 우선순위 | 상태 |
|---|---|---|---|---|---|
| R-001 | 0 | Next.js 15 App Router + TS strict + Tailwind + shadcn/ui + lucide 프로젝트 초기화, pnpm, git | `pnpm build` 성공, `tsconfig` `strict: true`, git 저장소 존재 | 필수 | 유효 |
| R-002 | 0 | ESLint, Prettier, Husky pre-commit, Vitest, Playwright 설정 | `pnpm lint`, `pnpm test` 0 에러 종료. pre-commit 훅이 lint-staged 실행 | 필수 | 유효 |
| R-003 | 0 | CI 워크플로우 파일 | `.github/workflows/ci.yml`에 install→lint→typecheck→test 단계 존재 (원격 실행은 범위 밖) | 필수 | 유효 |
| R-004 | 0 | 임베디드 Postgres 기반 DB 스크립트 | `pnpm db:start`로 Postgres 기동, `pnpm db:migrate`, `pnpm db:seed` 성공. README에 절차 기재 | 필수 | 유효 |
| R-005 | 0 | Prisma 스키마(WO §5 + 3절 추가 테이블) 및 마이그레이션 | 마이그레이션 적용 후 WO §5의 모든 모델·enum이 DB에 존재. 주민·여권번호 필드 0개(BR-13) | 필수 | 유효 |
| R-006 | 0 | Recommendation·AuditLog 수정·삭제 DB 차단 | 마이그레이션에 BEFORE UPDATE/DELETE 트리거. 테스트: raw SQL UPDATE·DELETE 시 에러 (WO §15-7) | 필수 | 유효 |
| R-007 | 0 | 시드: 시·도/시·군·구, KSIC 대분류, 비자 유형(defaultTrack 포함), 샘플 규칙·점수표 | 시드 후 VisaRule·ScoreTable 전 행 `isSample=true`, `status=DRAFT`. 시드 파일에 `SAMPLE` 주석. VisaType.defaultTrack이 WO §7.4 표와 일치 | 필수 | 유효 |
| R-008 | 0 | `lib/crypto.ts` AES-256-GCM(키 버전) + HMAC-SHA256 해시 | 암·복호 왕복, 변조 시 실패, 키 버전 교체 후 구버전 복호 성공 테스트 | 필수 | 유효 |
| R-009 | 0 | `*Enc` 필드 자동 암호화 Prisma extension | DB raw 조회 시 `*Enc` 컬럼에 평문 없음, 앱 조회 시 복호 테스트 | 필수 | 유효 |
| R-010 | 0 | `lib/rbac.ts` 역할·권한 매트릭스 (WO §1.3, §11 직원 권한 분리) | STAFF_PLACEMENT는 연락처 허용·체류 사건 거부, STAFF_VISA는 반대, ADMIN 둘 다 — 테스트 | 필수 | 유효 |
| R-011 | 0 | `lib/audit.ts` 감사 로그 기록 | 기록 함수 호출 시 AuditLog 행 생성 테스트 | 필수 | 유효 |
| R-012 | 0 | `lib/pii-guard.ts` 연락처 패턴 탐지·마스킹 | 국내·국제 전화, 이메일, URL, `@아이디`, kakao/zalo/telegram id 패턴 각 양성·음성 케이스 테스트 | 필수 | 유효 |
| R-013 | 0 | 유틸 4종 커버리지 | crypto·rbac·audit·pii-guard 라인 커버리지 각 90% 이상(`vitest --coverage` 보고서) | 필수 | 유효 |
| R-014 | 0 | next-intl 6개 언어(ko,en,vi,ru,zh,uz) `/[locale]` 라우팅 + 언어 전환 UI | 각 언어 메시지 파일에 `"_review": "native review required"`. 키 비교 스크립트(`pnpm i18n:check`)가 ko 대비 누락 키 0 | 필수 | 유효 |
| R-015 | 0 | `site.config.ts`(사무소명·등록번호·대표자·주소 플레이스홀더) + 기능 플래그 4종 기본 false (WO §16) | 플래그 미설정 시 수요 지도·공고·추천 보상·후보 열람이 비활성 | 필수 | 유효 |

### 4.2 Phase 1 — MVP: 구직자 풀 형성
| 번호 | P | 요구사항 | 합격 기준 | 우선순위 | 상태 |
|---|---|---|---|---|---|
| R-101 | 1 | 메인(`/`): 대상 선택 3버튼, 비자 진단 위젯, 실적 지표, 수요 지도 미리보기(플래그), 수수료 링크, "구직자 이용료 없음"(BR-10) | 6개 언어에서 요소 존재 E2E | 필수 | 유효 |
| R-102 | 1 | `/about`, `/fees`, `/privacy`, `/terms` + 푸터(사무소명·등록번호·대표자·주소·수수료 링크, site.config 값) | 페이지 200 응답, 약관·개인정보 문서에 [전문가 검토 필요] 표시 | 필수 | 유효 |
| R-103 | 1 | 모바일 Lighthouse | 메인·about·fees·terms 모바일 성능 ≥85, 접근성 ≥90 (프로덕션 빌드 기준) | 필수 | 유효 |
| R-104 | 1 | 휴대폰 OTP 인증(개발 모드 콘솔 출력), 재전송 제한 | 60초 내 재전송 거부, 시간당 5회 초과 거부, 오입력 5회 잠금 — 테스트 | 필수 | 유효 |
| R-105 | 1 | 간편 등록 `/seeker/register/quick` (언어·비자·시도·OTP·필수동의) | 완료 시 `isQuickSignup=true`, grade B, "프로필 완성" 알림 작업 생성(콘솔 어댑터) | 필수 | 유효 |
| R-106 | 1 | 정식 위저드 Step 0~7 (WO §7.3 문항 전부), 화면당 질문 ≤7, 진행률 표시, 단계별 공개 여부 배지, "모름" 선택지, 비자 코드+쉬운 설명 | 각 단계 문항 키가 WO §7.3과 일치(체크리스트), zod 스키마를 서버·클라이언트 공유 | 필수 | 유효 |
| R-107 | 1 | 단계별 서버 자동 저장·재진입 이어쓰기 | E2E: Step 3까지 작성 후 새 세션 재로그인 → Step 4에서 재개, 입력값 유지 | 필수 | 유효 |
| R-108 | 1 | 트랙 분류 `classifyTrack` (VisaType.defaultTrack 기반, D-2 졸업 6개월·E-7 needsVisaReview 포함) | WO §7.4 표 전 행 테스트 통과. 코드에 비자→트랙 매핑 상수 없음 | 필수 | 유효 |
| R-109 | 1 | 등록 불가 비자 차단 (BR-08) | B-1, B-2, C-3, 만료일 과거, 비자 없음 → 서버에서 등록 완료 거부 + 상담 안내 (WO §15-5) | 필수 | 유효 |
| R-110 | 1 | 동의 기록 (Step 7, 유형·버전·언어·시각·ipHash), 동의 본문 `content/consents/{type}/{version}/{locale}.md` [전문가 검토 필요] | Consent 행에 4개 값 저장 테스트. BLIND_PROFILE은 JOB_MATCH만 필수 | 필수 | 유효 |
| R-111 | 1 | `?ref`, `?src` 저장, 고유 referralCode 발급 | E2E: 파라미터로 진입·등록 시 `referredByCode`, `sourceChannel` 저장 | 필수 | 유효 |
| R-112 | 1 | 완료 화면: 등급 B 표시와 승급 안내, 추천 코드·메신저별 공유, 트랙별 다음 행동 버튼 | 화면 요소 존재 E2E | 필수 | 유효 |
| R-113 | 1 | 구직자 `/seeker/me`(프로필·등급·진행), `/me/stay`, `/me/referral`, 동의 철회 | BLIND_PROFILE 철회 즉시 기업 후보 쿼리에서 제외 (WO §15-8) | 필수 | 유효 |
| R-114 | 1 | 수집 API `POST /api/ingest/job-leads` (x-api-key, 배열 ≤200, sourceRef upsert, 마감 거부, KSIC·인구감소지역 자동 태깅, rawJson 저장) | 테스트: 같은 배치 2회 → 행 수 동일, closesAt 과거 거부, 201건 거부, 키 없음 401 | 필수 | 유효 |
| R-115 | 1 | DO_NOT_CONTACT 리드 재수집 시 C로 복귀 금지 | 테스트 | 필수 | 유효 |
| R-116 | 1 | pg-boss 작업: 30일 미접촉·마감 리드 자동 ARCHIVED | 시간 조작 테스트로 보관 전이 확인 | 필수 | 유효 |
| R-117 | 1 | 수요 지도 `/demand` (플래그): 시·도×업종 30일 건수·급여 중앙값 구간, 5건 미만 "자료 부족", 고지 문구, 버튼 2개만 | 마스킹 테스트(WO §15-10), 고지 문구 6개 언어 출력, "지원하기" 버튼 없음 | 필수 | 유효 |
| R-118 | 1 | 관리자 인증: 직원 이메일·비밀번호 + TOTP 2FA 필수, `/admin` 한국어 전용 | 2FA 미완료 시 `/admin/*` 접근 거부 테스트 | 필수 | 유효 |
| R-119 | 1 | 관리자 대시보드(오늘 할 일: 신규 구직자, 전화 대상 리드, 면접 일정, 만료 임박) | 각 카운트가 DB 상태와 일치 | 필수 | 유효 |
| R-120 | 1 | 구직자 검토 큐: 등급 B→A→S 승격(WO §7.6 조건 검사), 트랙 변경, 전환 가능성 판정 입력 | 조건 미충족 승격 거부, 등급 변경 시 AuditLog 생성 테스트 | 필수 | 유효 |
| R-121 | 1 | 리드 칸반(C/B/A/보관/재접촉금지), 통화 기록, 전화 우선순위(WO §8.3), "대기 인력 n명" | 등급 전이 시 AuditLog, 기본 정렬이 priority 내림차순 테스트 | 필수 | 유효 |
| R-122 | 1 | 개인정보 열람 로그 | 복호 필드를 관리자 화면에서 열람 시 `PII_VIEW` 기록 테스트 | 필수 | 유효 |
| R-123 | 1 | 기업 회원가입·로그인(이메일·비밀번호), 사업자번호 암호화·해시 중복 확인 | 같은 사업자번호 재가입 거부 테스트 | 필수 | 유효 |
| R-124 | 1 | 기업 무료 채용 진단 `/employer/diagnosis` (규칙 DB → GREEN/YELLOW/RED + "행정사 확인 필요"), 결과를 리드로 저장 | PUBLISHED 규칙 없음 → YELLOW+확인 필요 (WO §15-9) | 필수 | 유효 |
| R-125 | 1 | 구인 의뢰서 `/employer/request` (회사정보 암호화, 자유 입력 pii-guard, 제출 시 리드 B 전이·검증 큐) | 연락처 포함 입력 거부/마스킹 테스트, B 전이 테스트 | 필수 | 유효 |
| R-126 | 1 | 비자 진단 `/visa-check` + 위젯, `evaluate.ts` (PUBLISHED 규칙만) | 모든 결과에 "참고용, 행정사 확인 필요" 문구(BR-11) | 필수 | 유효 |
| R-127 | 1 | E-7-4 점수 계산기 `/score/e74` (`e74.ts`, PUBLISHED 점수표만, 미게시 시 "준비 중"+상담 안내) | 시드 상태에서 "준비 중" 표시 E2E. 결과에 총점·항목별·부족 항목·참고 문구 | 필수 | 유효 |
| R-128 | 1 | 법령 수치 하드코딩 금지 (BR-12) | `src/`에서 비자 배점·요건 상수 0건 — QA 코드 리뷰 체크리스트 | 필수 | 유효 |
| R-129 | 1 | 속도 제한: OTP, 로그인, 수집 API | 한도 초과 시 429 테스트 | 필수 | 유효 |
| R-130 | 1 | SEO: sitemap.xml, robots.txt, hreflang, Organization 스키마, `/admin`·`/employer/candidates` noindex | 응답에서 각 요소 확인 | 필수 | 유효 |
| R-131 | 1 | 비자 정보센터 `/guide/[slug]` MDX 샘플 1편(reviewedBy·updatedAt 표시, FAQPage·BreadcrumbList), `/cases` 골격 | 페이지 렌더, 스키마 출력 | 선택 | 유효 |

### 4.3 Phase 2 — 폐쇄형 매칭
| 번호 | P | 요구사항 | 합격 기준 | 우선순위 | 상태 |
|---|---|---|---|---|---|
| R-201 | 2 | 관리자 공고 관리: A등급 리드에서만 블라인드 공고 생성 → 검증 → 공개 (BR-05) | C·B 리드로 생성 시 서버 에러, verifiedBy/At 없이 공개 시 서버 에러 (WO §15-4), 공개 시 AuditLog | 필수 | 유효 |
| R-202 | 2 | `/jobs` 공개 목록·상세 (플래그): PUBLISHED+verifiedAt만, WO §8.5 표시 항목, 회사명·주소·담당자·연락처·사업자번호 없음(BR-03), JobPosting 스키마 미적용 | C·B 리드 노출 0 (WO §15-3), 응답에 금지 필드 없음 테스트 | 필수 | 유효 |
| R-203 | 2 | 면접 신청 → InterestRequest(SEEKER) + 담당자 알림, 비로그인은 간편 등록으로, 비자 부적합 시 "상담 신청" 버튼 | E2E 3가지 경우 | 필수 | 유효 |
| R-204 | 2 | `lib/serializers/blindSeeker.ts` 화이트리스트 직렬화 (BR-02), publicId·계산값 | 모든 시드 프로필 직렬화 키 ⊆ BLIND_SEEKER_FIELDS (WO §15-1), 스냅샷 테스트 | 필수 | 유효 |
| R-205 | 2 | 기업 후보 열람 `/employer/candidates` (플래그, verified+계약 기업만, 아니면 요약 통계), 필터 8종, S·A+JOB_MATCH+활성+BLIND_PROFILE 동의자만(BR-06, BR-07) | E-9 등록자 제외 (WO §15-6), 미계약 기업은 통계만 | 필수 | 유효 |
| R-206 | 2 | 기업 API 응답 연락처 누출 0 | 기업용 모든 API 응답 전수에 전화·이메일 정규식 탐지 0건 (WO §15-2) | 필수 | 유효 |
| R-207 | 2 | "면접 요청" → InterestRequest(EMPLOYER), 일 100건 열람 상한, 대량 조회 감사 로그 | 101번째 열람 429, 로그 기록 테스트 | 필수 | 유효 |
| R-208 | 2 | 기업 계약 동의: 이용약관 체크 + PDF 다운로드, visaMandateAgreed 별도 체크(강제 결합 금지), [전문가 검토 필요] | 위임 미동의로도 계약 완료 가능 테스트 | 필수 | 유효 |
| R-209 | 2 | 매칭 화면: 공고별 적합 구직자, 추천 실행 → Recommendation 원장, 면접 일정 | 앱 계층에 Recommendation update/delete 경로 없음 + DB 트리거 테스트 | 필수 | 유효 |
| R-210 | 2 | 소개 확인서 업로드(로컬 비공개 저장소, 5분 만료 서명 URL) | 만료 후 접근 403 테스트 | 필수 | 유효 |
| R-211 | 2 | 면접 확정 시 THIRD_PARTY_INTERVIEW 건별 동의 (PC-1) | 동의 전 기업 화면·API에 실명 없음, 동의 후 해당 면접 건의 해당 기업에만 실명 제공 테스트. 연락처는 동의 후에도 기업 응답에 없음(직원이 오프라인 전달) | 필수 | 유효 |
| R-212 | 2 | `/employer/requests` 면접 요청 현황, `/seeker/me/recommended` 추천 일자리 | 페이지 동작 E2E | 필수 | 유효 |
| R-213 | 2 | pg-boss: 30일 상태 확인(원클릭 링크, 14일 무응답 INACTIVE, S→A 강등), 체류 만료 D-90/60/30 알림+행정사 업무 생성, 노쇼 2회 우선순위 하향 | 시간 조작 테스트로 각 발송·전이 확인 | 필수 | 유효 |
| R-214 | 2 | `NotificationProvider` 인터페이스 + 콘솔·이메일(SMTP, 환경변수) 어댑터 | 콘솔 어댑터 테스트, SMTP는 설정 없으면 비활성 | 필수 | 유효 |
| R-215 | 2 | 규칙 DB·점수표 관리자 화면(버전, DRAFT→PUBLISHED, STAFF_VISA 이상, 검수자 기록) | DRAFT는 공개 계산에 미사용 테스트, 게시 시 reviewedBy/At 기록 | 필수 | 유효 |
| R-216 | 2 | 계약·체류 사건 화면(Placement, VisaCase 기본 CRUD, 고유식별정보 필드 없음) | STAFF_PLACEMENT는 VisaCase 상세 접근 거부 | 필수 | 유효 |
| R-218 | 2 | 관리자 기업 검증·계약 등록 최소 화면 (PC-2) | 관리자가 `verified`, `contractSignedAt` 설정 시 AuditLog 기록, 설정 전 기업은 후보 요약 통계만 | 필수 | 유효 |
| R-217 | 2 | 통합 E2E (WO §15-11) | 간편 등록 → 프로필 완성 → 관리자 A 승격 → 기업 후보 노출 → 면접 요청 → 추천 원장 생성 Playwright 통과 | 필수 | 유효 |

## 5. 비기능·품질 조건
| 번호 | 조건 | 합격 기준 |
|---|---|---|
| N-01 | BR-01 직접 연락 금지 | 채팅·연락처 열람·이메일 전달·외부 링크 공유 UI/API 0건 (QA 코드 리뷰) |
| N-02 | 모든 사용자 노출 문자열 6개 언어 키 (관리자 제외) | `pnpm i18n:check` 누락 0 |
| N-03 | 법적 문서 초안 표시 | 약관·동의서·고지 초안 전부 [전문가 검토 필요] 포함 |
| N-04 | 모바일 우선 | 375px 폭에서 가로 스크롤 없음 (주요 공개·구직자 화면) |
| N-05 | 감사 로그 대상(BR-15) | PII 열람, 내보내기, 등급 변경, 추천, 공고 공개 각각 로그 생성 테스트 |
| N-06 | 비밀 정보 | 키·비밀번호는 `.env`(git 제외), `.env.example`만 커밋 |

## 6. 출시 기준
- 필수 요구사항 100% 통과
- 전체 통과율 95% 이상
- WO §15 필수 테스트 11개 전부 통과, `pnpm lint`·`pnpm test`·`pnpm test:e2e`·`pnpm build` 성공
- 기능 플래그 4종은 기본 false 상태로 인도 (켜는 것은 운영자 법무 확인 후)

## 7. 미결 사항
없음 (Q-01~Q-04 결정 반영)

## 변경 이력
| 일자 | 변경 | 사유 |
|---|---|---|
| 2026-11-15 | 1.0 작성 | WO v1.0 + Q-01~Q-04 결정 |
| 2026-11-16 | 1.1: R-211 변경(실명만 앱), R-218 신설, StaffTask·nullable·shiftOk enum 반영 | Gate 3 결정 PC-1~6, SC-10 |
