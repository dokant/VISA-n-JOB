# STANDARD — 기준서

> 모든 산출물이 지켜야 하는 "일관성의 기준". 구현 전에 확정한다.
> 버전 1.0 / 작성 2026-11-15 / 작성: wf-standard(모드 A)

- 기준의 출처: **PRD에서 도출한 제안 기준**. 피그마·브랜드 가이드·기존 코드 없음(start.md §8). 사람이 "제안 토큰으로 진행"을 승인함(DECISIONS Q-03).
- 근거 문서: `.workflow/PRD.md` v1.0, `docs/WORK_ORDER.md` v1.0(이하 WO), `.workflow/start.md`, `.workflow/DECISIONS.md`.
- 표기: **[WO]** = WO·PRD에 이미 정해진 규칙(그대로 옮김). **[제안]** = 근거 문서에 없어 이 기준서가 제안한 값(Q-03 승인 범위). 두 표기가 없는 항목은 [제안]으로 본다.
- 우선순위: WO §2(BR-01~15) > PRD > 이 기준서. 이 기준서가 BR과 다르게 읽히면 BR을 따른다. 미해결 충돌은 맨 끝 "충돌·확인 필요" 절에 있다.

---

## 1. 공통

### 1.1 용어집 (같은 것을 같은 이름으로)

| 한국어 화면 용어 | 코드 식별자 | 규칙 |
|---|---|---|
| 구직자 | `SEEKER`, `SeekerProfile` | "외국인 근로자", "지원자"라고 쓰지 않는다 |
| 기업 (구인기업) | `EMPLOYER`, `Company` | 화면에서는 "기업". "고용주", "사장님" 금지 |
| 협력 소개소 | `AGENCY` | Phase 0~2 범위 밖(포털 미구현) |
| 비자앤잡 / 운영자 | — | 구직자·기업 화면에서 연락 주체는 항상 "비자앤잡" |
| 직원 / 담당자 | `STAFF_PLACEMENT`, `STAFF_VISA`, `ADMIN` | 관리자 화면 전용 용어 |
| 비자 | `visaCode` | 구직자·기업 화면은 "비자"(쉬운 말). 약관·동의서·법적 고지는 "체류자격" |
| 구직자 등급 B / A / S | `SeekerGrade` | 화면 표기 "B등급" 등. 리드 등급과 섞지 않도록 관리자 화면에서는 반드시 "구직자 등급"/"리드 등급"으로 구분 |
| 리드 등급 C / B / A / 보관 / 재접촉금지 | `LeadGrade` | 관리자 화면 전용 |
| 트랙 | `SeekerTrack` (`JOB_MATCH`/`FUTURE_POOL`/`CONSULT_ONLY`) | 구직자 화면에 트랙 코드를 노출하지 않는다. 다음 행동 문구로만 표현 |
| 블라인드 공고 | `JobPosting` | "채용공고", "구인공고" 대신 "추천 일자리"(목록 제목) / "블라인드 공고"(관리자) |
| 수요 지도 | `/demand` | "채용 정보", "일자리 목록"이라고 부르지 않는다(BR-04) |
| 면접 신청 | `InterestRequest(initiator=SEEKER)` | **구직자** 쪽 행동 |
| 면접 요청 | `InterestRequest(initiator=EMPLOYER)` | **기업** 쪽 행동. 두 용어를 바꿔 쓰지 않는다 |
| 추천 | `Recommendation` | 직원이 실행하는 원장 기록. 구직자 친구 추천은 "추천 코드"로 구분 |
| 추천 코드 | `referralCode` | — |
| 비자 진단 | `/visa-check`, `evaluate.ts` | 구직자·공개용 |
| 채용 진단 | `/employer/diagnosis` | 기업용. "비자 진단"과 혼용 금지 |
| E-7-4 점수 계산기 | `/score/e74`, `e74.ts` | — |
| 간편 등록 / 정식 등록 | `/seeker/register/quick`, `/seeker/register` | — |
| 상담 신청 | — | 모든 "상담" CTA의 동사는 "상담 신청" |
| 동의 / 동의 철회 | `Consent`, `revokedAt` | "취소"가 아니라 "철회" |
| 판정 결과 | `Outcome` GREEN/YELLOW/RED | 화면 라벨은 3.4절 |

### 1.2 금지 사항 (전 산출물 공통)

1. **직접 연락 수단 금지(BR-01) [WO]**: 구직자↔기업 간 채팅, 메시지, 연락처 열람, 이메일 전달, 외부 링크(메신저 딥링크 포함) 공유 UI·API·문구. 운영자(비자앤잡)에게 연락하는 수단은 허용.
2. **기업 대상 구직자 데이터는 `BLIND_SEEKER_FIELDS` 외 필드 금지(BR-02) [WO]**. 사진·이름 이니셜·출생 연도·성별·학교명·자유 텍스트 노출 금지(WO §7.5). 따라서 구직자에 대한 `Avatar` 컴포넌트 사용 금지.
3. **구직자 대상 공고에 회사명·상세 주소·담당자·연락처·사업자번호 금지(BR-03) [WO]**.
4. **법령 수치 하드코딩 금지(BR-12) [WO]**: 비자 요건·배점·허용 업종·비자→트랙 매핑을 `src/`에 상수로 넣지 않는다(검사 방법 5.9절).
5. **주민·외국인등록번호·여권번호 필드·입력란 금지(BR-13) [WO]**.
6. **LLM으로 판정 생성 금지(BR-11) [WO]**.
7. **schema.org `JobPosting` 금지 [WO §13]**.
8. 금지 표현은 3.3절.
9. 비밀값(키·비밀번호·API 키) 커밋 금지. `.env`는 git 제외, `.env.example`만 커밋(N-06) [WO].

---

## 2. 디자인 토큰 [제안]

### 2.1 색 (라이트 모드 필수)

- 값의 기준은 **hex**. CSS 변수 표기 형식(HSL 채널 `224 64% 33%` / `hsl(...)` / oklch)은 설치된 shadcn/ui·Tailwind 버전의 기본 형식을 따르되, 아래 hex와 같은 색이어야 한다.
- 대비 값은 WCAG 2.x 상대 휘도 공식으로 계산한 실측값이다. 본문 텍스트 조합은 모두 4.5:1 이상.
- 다크 모드: Phase 0~2 범위에서 **구현하지 않아도 된다**. 구현한다면 `.dark`에 같은 변수 이름으로 정의하고 동일하게 AA를 만족해야 한다.

**shadcn/ui 기본 변수 (`src/app/globals.css` `:root`)**

| 변수 | hex | HSL | 용도 | 대비 확인 |
|---|---|---|---|---|
| `--background` | #FFFFFF | 0 0% 100% | 페이지 배경 | — |
| `--foreground` | #0F172A | 222 47% 11% | 본문 | 흰 배경 17.85:1 |
| `--card` / `--popover` | #FFFFFF | 0 0% 100% | 카드·팝오버 | — |
| `--card-foreground` / `--popover-foreground` | #0F172A | 222 47% 11% | | 17.85:1 |
| `--primary` | #1E3A8A | 224 64% 33% | 주 버튼·링크·강조(신뢰감 있는 남색) | 흰 배경 위 텍스트 10.36:1 |
| `--primary-foreground` | #FFFFFF | 0 0% 100% | primary 위 글자 | 10.36:1 |
| `--secondary` | #F1F5F9 | 210 40% 96% | 보조 버튼 배경 | — |
| `--secondary-foreground` | #0F172A | 222 47% 11% | | 16.30:1 |
| `--muted` | #F1F5F9 | 210 40% 96% | 비활성·"준비 중" 배경 | — |
| `--muted-foreground` | #475569 | 215 19% 35% | 보조 문구 | 흰 7.58:1, muted 위 6.92:1 |
| `--accent` | #E0E7FF | 226 100% 94% | 선택 상태·호버 배경 | — |
| `--accent-foreground` | #1E3A8A | 224 64% 33% | | 8.41:1 |
| `--destructive` | #B91C1C | 0 74% 42% | 삭제·오류 버튼, 오류 문구 | 흰 6.47:1 |
| `--destructive-foreground` | #FFFFFF | 0 0% 100% | | 6.47:1 |
| `--border` | #E2E8F0 | 214 32% 91% | 장식용 구분선·카드 테두리(정보 전달 금지) | 1.23:1 (비정보) |
| `--input` | #64748B | 215 16% 47% | 입력창·체크박스 테두리 (WCAG 1.4.11 3:1 이상) | 흰 4.76:1 |
| `--ring` | #2563EB | 221 83% 53% | 포커스 링(2px, offset 2px) | 흰 5.17:1 |

**프로젝트 추가 변수 (판정·배지·고지)**

| 변수 | hex | HSL | 용도 | 대비 |
|---|---|---|---|---|
| `--success` | #15803D | 142 72% 29% | GREEN 아이콘·실선 테두리, "검증 완료" 배지 배경 | 흰 글자 5.02:1 |
| `--success-foreground` | #FFFFFF | | | 5.02:1 |
| `--success-subtle` | #F0FDF4 | 138 76% 97% | GREEN 카드 배경 | — |
| `--success-subtle-foreground` | #166534 | 143 64% 24% | GREEN 카드 글자 | 6.81:1 |
| `--warning` | #A16207 | 35 92% 33% | YELLOW 아이콘·테두리 | 흰 배경 4.92:1 |
| `--warning-subtle` | #FEFCE8 | 55 92% 95% | YELLOW 카드 배경 | — |
| `--warning-subtle-foreground` | #854D0E | 32 81% 29% | YELLOW 카드 글자 | 6.62:1 |
| `--danger` | #B91C1C | 0 74% 42% | RED 아이콘·테두리 (`--destructive`와 동일 값) | 흰 6.47:1 |
| `--danger-subtle` | #FEF2F2 | 0 86% 97% | RED 카드 배경 | — |
| `--danger-subtle-foreground` | #991B1B | 0 70% 35% | RED 카드 글자 | 7.60:1 |
| `--review` | #FFF7ED | 33 100% 96% | [전문가 검토 필요] 표시 배경 | — |
| `--review-foreground` | #9A3412 | 15 79% 34% | [전문가 검토 필요] 글자 | 6.88:1 |
| `--blind` | #E0E7FF | 226 100% 94% | "블라인드로 공개" 배지 배경 | — |
| `--blind-foreground` | #3730A3 | 244 55% 41% | | 8.06:1 |
| `--grade-s` | #1E3A8A | 224 64% 33% | S등급 배지 배경 (글자 #FFFFFF) | 10.36:1 |
| `--grade-a` | #DBEAFE | 214 95% 93% | A등급 배지 배경 (글자 #1E40AF) | 7.15:1 |
| `--grade-b` | #F1F5F9 | 210 40% 96% | B등급 배지 배경 (글자 #334155, 테두리 `--input`) | 9.45:1 |

- 판정색(GREEN/YELLOW/RED)은 **판정 결과와 리드 상태 표시 외에는 쓰지 않는다**. 일반 성공 토스트는 `--success`를 써도 되지만 노랑(`--warning`)은 판정 YELLOW 전용.
- 색만으로 정보를 전달하지 않는다: 판정·등급·공개 여부는 항상 **아이콘 + 글자** 동반.
- 하드코딩 색 금지: 컴포넌트에서 `#hex`, `text-red-600` 같은 Tailwind 팔레트 직접 사용 금지. 토큰 유틸(`bg-primary`, `text-success-subtle-foreground` 등)만 쓴다. 예외: `globals.css`, `tailwind.config`(또는 `@theme`).

### 2.2 글꼴

**폰트 스택 (`--font-sans`)** — 로케일별 1순위만 다르고 나머지 순서는 같다.

| 로케일 | 스택 |
|---|---|
| ko, en | Pretendard → Noto Sans → system-ui, -apple-system, "Apple SD Gothic Neo", "Malgun Gothic", "Segoe UI", Roboto, sans-serif |
| vi, ru, uz | Noto Sans → Pretendard → (위와 같은 시스템 폴백) |
| zh | Noto Sans SC → Noto Sans → Pretendard → (시스템 폴백) |

- 이유: 베트남어 성조 문자(ẩ, ợ 등)·키릴·우즈베크 라틴(oʻ, gʻ = U+02BB)이 한 단어 안에서 다른 글꼴로 섞이지 않게 해당 문자를 모두 가진 Noto Sans를 1순위로 둔다.
- 관리자(`/admin`)는 ko 스택.

**로딩 방식 (next/font)**

| 글꼴 | 방식 | 설정 |
|---|---|---|
| Pretendard | `next/font/local` | 가변 woff2 서브셋 파일(한글 KS X 1001 서브셋) 자체 호스팅, `weight: '400 700'`, `display: 'swap'`, `variable: '--font-pretendard'`. 파일은 `src/fonts/`에 두고 OFL 라이선스 파일 동봉. 외부 CDN `<link>` 금지 |
| Noto Sans | `next/font/google` | `subsets: ['latin','latin-ext','vietnamese','cyrillic']`, `weight: ['400','500','700']`, `display: 'swap'`, `variable: '--font-noto-sans'` |
| Noto Sans SC | `next/font/google` | `weight: ['400','500','700']`, `display: 'swap'`, `preload: false`, `variable: '--font-noto-sans-sc'`. **zh 로케일 `<html>`에만 className 적용** |

- 글꼴 선언은 `src/lib/fonts.ts` 한 곳, 적용은 `src/app/[locale]/layout.tsx`(로케일별 className)와 `src/app/admin/layout.tsx`.
- `<link href="fonts.googleapis.com">`나 `@import url(...)` 형태의 런타임 웹폰트 로딩 금지.

**글자 크기·줄간격**

| 토큰 | 모바일 | md 이상 | 굵기 | 용도 |
|---|---|---|---|---|
| display | 28px / 36px | 36px / 44px | 700 | 메인 히어로 1개 |
| h1 | 24px / 32px | 30px / 38px | 700 | 페이지 제목(페이지당 1개) |
| h2 | 20px / 28px | 24px / 32px | 700 | 섹션 |
| h3 | 18px / 28px | 18px / 28px | 600 | 카드 제목, 위저드 질문 |
| body | 16px / 26px | 16px / 26px | 400 | 본문, 입력값 |
| small | 14px / 22px | 14px / 22px | 400 | 도움말, 고지, 배지 |

- 최소 글자 크기 **14px**(배지·고지·각주 포함). 12px 이하 금지.
- 입력란(`input`, `select`, `textarea`) 글자 **16px 이상**(iOS 확대 방지).
- 본문 줄간격 1.5 이상(베트남어 성조 겹침 방지).
- 숫자 비교 표(점수·급여)는 `tabular-nums`.

### 2.3 간격·모서리·그림자

- **간격**: Tailwind 기본 4px 단위만 사용(`p-1`=4px …). 임의값(`p-[13px]`) 금지.
  - 페이지 좌우 여백: 모바일 16px(`px-4`), md 24px(`md:px-6`).
  - 콘텐츠 최대 폭: 일반 페이지 1152px(`max-w-6xl`), 폼·위저드 576px(`max-w-xl`), 법적 문서 본문 720px(`max-w-prose` 수준).
  - 위저드 문항 간 세로 간격 24px(`space-y-6`), 섹션 간 48px(모바일 32px).
- **모서리**: `--radius: 0.5rem`(8px). 버튼·입력·카드 `rounded-md`~`rounded-lg`(shadcn 기본), 배지 `rounded-full`, 다이얼로그 `rounded-xl`. 그 외 값 금지.
- **그림자**: 3단계만. 카드 `shadow-sm`, 드롭다운·팝오버 `shadow-md`, 다이얼로그·시트 `shadow-lg`. 판정 결과 카드·고지 박스는 그림자 없이 테두리만.

### 2.4 반응형 (모바일 우선)

- 기준 폭 **375px**. 모든 스타일은 기본(모바일) → `sm` 640 → `md` 768 → `lg` 1024 → `xl` 1280 순으로 덧붙인다(Tailwind 기본값, 변경 금지).
- 공개·구직자·기업 화면은 375px에서 **가로 스크롤 없음**(N-04).
- 표(table)는 모바일에서 카드 목록으로 바꾸거나 표 자체만 가로 스크롤 컨테이너에 넣는다(페이지 전체 가로 스크롤 금지).
- 관리자 화면은 데스크톱 우선, 최소 지원 폭 1024px. 375px 요건 적용 제외.

---

## 3. 컴포넌트·문구 규칙

### 3.1 shadcn/ui 사용 목록 (`src/components/ui/`)

| 컴포넌트 | 사용처 |
|---|---|
| button | 모든 버튼. 직접 `<button>` 스타일링 금지 |
| input, textarea, label | 입력 |
| form (react-hook-form 연동) | 모든 폼 |
| select | 짧은 목록(≤10). 국적처럼 긴 목록은 command + popover(검색 선택) |
| radio-group | 단일 선택(예/아니오/모름 포함) — 모바일에서는 셀렉트보다 우선 |
| checkbox | 다중 선택, 동의 항목 |
| command, popover | 국적·업종 검색 선택 |
| card | 판정 결과, 공고, 후보 카드 |
| badge | 공개 여부·등급·검증 완료·준비 중 배지(variant 확장) |
| alert | 고지 박스, 오류 안내 |
| progress | 위저드 진행률 |
| dialog | 확인(동의 철회, 추천 실행 등) |
| sheet | 모바일 메뉴 |
| dropdown-menu | 언어 전환 |
| tabs | 마이페이지, 관리자 상세 |
| accordion | FAQ(가이드) |
| table | 관리자 목록 |
| separator, skeleton | 구분선, 로딩 |
| sonner (toast) | 저장·제출 알림 |
| tooltip | 데스크톱 보조 설명만. 필수 정보를 툴팁에만 두지 않는다 |

- 아이콘은 `lucide-react`만.
- 사용 금지: `avatar`(구직자 사진·이니셜 노출 금지 BR-02 연계), `calendar` 일 단위 선택이 필요 없는 곳(체류 만료·졸업일은 WO상 "월 선택" → 연·월 select 2개).
- 위 목록 밖 shadcn 컴포넌트 추가 시 이 기준서에 행을 추가한 뒤 사용한다.

### 3.2 프로젝트 공통 컴포넌트 (`src/components/` 하위, 이름 고정)

| 컴포넌트 | 위치 | 규칙 |
|---|---|---|
| `WizardProgress` | `components/seeker/wizard-progress.tsx` | 위저드 상단 고정(sticky). shadcn `progress` + 글자 "n/N · 단계명" 동시 표시(막대만 금지). `aria-valuenow/max` 지정. 자동 저장 상태("자동 저장됨") 표시 영역 포함 |
| `DisclosureBadge` | `components/forms/disclosure-badge.tsx` | `variant: 'private' \| 'blind'`. private = `Lock` 아이콘 + "이 정보는 기업에 공개되지 않습니다"(muted 배경), blind = `Eye` 아이콘 + "블라인드로 공개됩니다"(`--blind`). 문구는 [WO §7.1] 그대로 번역 키로 |
| `OutcomeCard` | `components/visa/outcome-card.tsx` | GREEN/YELLOW/RED 결과 카드(3.4절). **"참고용, 행정사 확인 필요" 문구를 끄는 prop이 없어야 한다** |
| `ScoreResult` | `components/visa/score-result.tsx` | 총점·항목별 점수·부족 항목·참고 문구(R-127) |
| `ExpertReviewMark` | `components/legal/expert-review-mark.tsx` | "[전문가 검토 필요]" 표시. `--review` 색, `FileWarning` 아이콘. 법적 문서 제목 바로 아래에 둔다 |
| `NoticeBox` | `components/legal/notice-box.tsx` | 고지 문구 박스. shadcn `alert` 기반, `role="note"`, 접기·닫기 불가, `Info` 아이콘, 테두리 `--input`, 배경 `--muted`. 관련 데이터 **위**에 배치 |
| `GradeBadge` | `components/seeker/grade-badge.tsx` | B/A/S. 글자 "B등급"/"A등급"/"S등급"(로케일별 번역). S는 `Star` 아이콘 + "우선 추천". 색은 2.1절 `--grade-*` |
| `VerifiedBadge` | `components/jobs/verified-badge.tsx` | "검증 완료" + `BadgeCheck` 아이콘, `--success` |
| `ComingSoon` | `components/common/coming-soon.tsx` | 기능 플래그 off 또는 미게시 데이터일 때 "준비 중" + 설명 + "상담 신청" 버튼. `Clock` 아이콘, muted 스타일 |
| `VisaLabel` | `components/visa/visa-label.tsx` | 비자 표시 유일 경로: `{코드} {쉬운 설명}` (예: "F-4 재외동포") |
| `LocaleSwitcher` | `components/common/locale-switcher.tsx` | 각 언어를 **그 언어 이름**으로 표시(한국어, English, Tiếng Việt, Русский, 中文, Oʻzbekcha) |

### 3.3 상호작용·접근성 규칙

- **터치 타깃 44×44px 이상**: 공개·구직자·기업 화면의 버튼(`h-11` 이상), 링크 버튼, 라디오·체크박스는 라벨 포함 행 전체가 클릭 영역이고 행 높이 44px 이상. 관리자 화면은 예외(최소 32px).
- **한 화면 문항 ≤7 [WO §7.1]**: 한 화면에 동시에 보이는 입력 문항 수(조건부 문항은 표시될 때 1개로 셈, 확인 체크박스 포함, `sido/sigungu`처럼 WO가 한 행으로 묶은 2단 선택은 1개)가 7 이하. → Step 3·5는 충돌(맨 끝 C-01).
- **"모름" 선택지 [WO §7.1]**: 모든 선택형(select·radio·다중 선택) 문항에 "모름"을 둔다. 값은 `UNKNOWN`으로 저장. 성별은 "응답 안 함"(`NO_ANSWER`) 포함 [WO]. 적용 범위 예외는 C-02.
- 위저드: 각 단계 하단에 `DisclosureBadge`, 하단 고정 "이전/다음" 버튼, 다음 클릭 시 서버 자동 저장 후 이동. 오류는 필드 바로 아래 + 첫 오류 필드로 포커스 이동.
- 모든 입력에 `<label>` 연결, 필수 표시는 "*"만이 아니라 "(필수)" 글자 병기(스크린리더).
- 포커스 링 제거 금지(`outline-none`만 쓰고 `focus-visible:ring` 없는 경우 금지).
- 이미지에는 `alt`. 장식 아이콘은 `aria-hidden`.
- 기능 플래그 off(WO §16 4종): 해당 페이지는 `ComingSoon` 렌더 + `noindex` + sitemap 제외, 내비게이션·메인 미리보기 링크는 숨김, 해당 API는 404. 점수표·규칙 미게시도 `ComingSoon`(R-127). → 플래그 off 동작 확정은 C-07.

### 3.4 판정 결과 카드 (`OutcomeCard`)

| Outcome | 아이콘 | 화면 라벨(ko, [제안]) | 배경 / 글자 / 테두리 |
|---|---|---|---|
| GREEN | `CircleCheck` | 가능성 높음 | `--success-subtle` / `--success-subtle-foreground` / `--success` |
| YELLOW | `TriangleAlert` | 확인 필요 | `--warning-subtle` / `--warning-subtle-foreground` / `--warning` |
| RED | `CircleX` | 어려움 | `--danger-subtle` / `--danger-subtle-foreground` / `--danger` |

- 카드 구성 순서: ① 아이콘+라벨 ② `VisaLabel` ③ 규칙 `messageKey` 번역 문구 ④ **"참고용, 행정사 확인 필요"**(키 `common.disclaimer.reference`, 카드 내부 하단, small 크기, 항상 표시) ⑤ "상담 신청" 버튼.
- "가능합니다", "불가능합니다" 같은 단정 문구 금지. 라벨은 위 3개만.
- 일치 규칙이 없으면 YELLOW + 확인 필요 [WO §10]. 채용 진단(R-124)도 같은 카드 사용.

### 3.5 문구·톤

- **쉬운 문장**: 한 문장에 정보 하나. 한국어 기준 문장당 40자 이내를 권장, 위저드 질문은 25자 이내. 전문 용어는 처음 나올 때 쉬운 말로 풀어 쓴다(예: "사회통합프로그램(KIIP)").
- 어조: 합쇼체 기본("~합니다", "~하세요"). WO에 예시 문구가 있으면 그 문구를 그대로 ko 원문으로 쓴다(예: 등급 안내, 수요 지도 고지, 등록 불가 안내).
- 비자 표시: 항상 **코드 + 쉬운 설명**(`VisaLabel`). 코드만 또는 설명만 단독 표시 금지. 쉬운 설명 번역 키 `visaType.{코드의 '-'를 '_'로}.short` (예: `visaType.F_4.short` = "재외동포").
- 금액·날짜·숫자: `Intl`(next-intl `useFormatter`) 로케일 포맷 [WO §12]. 원화는 `currency: 'KRW'`. 문자열 이어 붙이기로 숫자 포맷 금지.
- **필수 고정 문구 [WO]** (ko 원문 그대로, 6개 언어 키 존재):
  - "구직자 이용료 없음" (BR-10) — 메인·구직자 등록·`/fees`
  - "참고용, 행정사 확인 필요" (BR-11) — 모든 진단·점수 결과
  - 수요 지도 고지 (WO §8.4) — "공공 채용정보를 바탕으로 비자앤잡이 분석한 지역·업종별 구인 수요입니다. 개별 채용이 확정된 정보가 아닙니다."
  - "이 정보는 기업에 공개되지 않습니다" / "블라인드로 공개됩니다" (WO §7.1)
  - "기업과의 연락은 비자앤잡을 통해서만 진행" (WO §7.3 NOTICE)
- **허용 CTA 동사(구직자·기업 간 연결 관련)**: 면접 신청(구직자), 면접 요청(기업), 상담 신청, "이 지역·업종 일자리 알림 받기", "내 비자로 가능한지 확인"(수요 지도 2개 [WO §8.4]).
- **금지 표현**:
  - "지원하기", "Apply", "바로 지원", "입사 지원" — 전 화면(WO §8.4는 수요 지도에 명시. 전 화면 확대는 [제안], C-06)
  - 직접 연락 유도: "기업에 연락하기", "전화하기"(기업·구직자 대상), "연락처 보기", "채팅", "메시지 보내기", "카카오톡/Zalo/Telegram으로 대화", 외부 메신저 링크 (BR-01)
  - 결과 단정·보장: "비자 보장", "100%", "반드시 가능", "합격 보장", "불가능합니다"(판정 단정) (BR-11)
  - 구직자 대상 비용 언급: "수수료", "소개비", "유료"를 구직자에게 부과하는 의미로 쓰는 모든 표현 (BR-10)
  - 수요 지도를 "채용 중", "모집 중", "일자리 n건"으로 표현 (BR-04)
- **[전문가 검토 필요]**: 약관·개인정보처리방침·동의서·고지 초안·탈퇴 정책 등 법적 성격 문서 전부(N-03). 문서 첫머리에 `ExpertReviewMark`, MD 원문에도 `[전문가 검토 필요]` 문자열 포함. 번역본 표기 방식은 C-08.

### 3.6 번역 키 규칙 (next-intl)

- 파일: `messages/{ko,en,vi,ru,zh,uz}.json`. **ko가 원본**, 나머지는 ko와 같은 키 집합.
- 각 파일 최상단 첫 키: `"_review": "native review required"` [WO §12] (ko 포함 6개 모두 — ko는 원본이지만 `pnpm i18n:check` 일관성을 위해 동일하게 둔다).
- 키 이름: `{영역}.{페이지}.{섹션?}.{요소}.{속성}`, 모든 세그먼트 lowerCamelCase, 점(.)으로 중첩 객체 표현. 예 [WO]: `seeker.register.step2.visaCode.label`.
  - 영역: `common`, `public`, `seeker`, `employer`, `visa`, `visaType`, `legal`, `errors`, `nav`, `footer`, `meta`(SEO).
  - 필드 키 세그먼트는 **WO §7.3 / 데이터 모델 필드명과 같게**(`visaCode`, `stayExpiry`, `topikLevel`…).
  - 속성: `label`, `placeholder`, `help`, `error.{코드}`, `option.{값}`(값은 저장 enum과 동일, 예 `option.UNKNOWN`), `title`, `description`, `cta`.
- 사용자에게 보이는 문자열을 JSX·TS에 직접 쓰지 않는다(`src/app/[locale]/**`, `src/components/**` 단, `components/admin/**` 제외). ESLint `react/jsx-no-literals`(또는 동급 규칙)로 검사.
- 관리자(`src/app/admin/**`, `src/components/admin/**`)는 한국어 전용 [WO §12]. 한국어 리터럴 허용 [제안].
- 동의서 본문은 messages에 넣지 않는다 → `content/consents/{type}/{version}/{locale}.md` [WO §7.3].
- uz는 라틴 문자 표기 [제안, C-09].

---

## 4. 아키텍처·코드 기준

### 4.1 기술 스택 [WO §3]
Next.js 15 App Router · TypeScript `strict: true` · Tailwind CSS · shadcn/ui · lucide-react · react-hook-form + zod · next-intl · PostgreSQL(개발: `embedded-postgres`, Q-02) + Prisma · Auth.js · pg-boss · Vitest · Playwright · ESLint · Prettier · Husky + lint-staged · pnpm.
- `any` 사용 금지(ESLint `@typescript-eslint/no-explicit-any: error`). 불가피하면 `unknown` + 좁히기.

### 4.2 디렉터리 [WO §4 + 제안 보완]

```
/
├─ CLAUDE.md                       [WO §17 내용]
├─ .env.example                    (커밋) / .env (git 제외)
├─ .github/workflows/ci.yml        [R-003]
├─ content/
│  ├─ consents/{type}/{version}/{locale}.md   [WO §7.3]
│  └─ guide/{slug}.{locale}.mdx              [제안] reviewedBy·updatedAt frontmatter 필수
├─ docs/WORK_ORDER.md
├─ messages/{ko,en,vi,ru,zh,uz}.json
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed/ (visaTypes.ts, industries.ts, regions.ts, sampleRules.ts, sampleScoreTable.ts, index.ts)
├─ scripts/ (db-start.ts, i18n-check.ts …)   [제안]
├─ src/
│  ├─ app/
│  │  ├─ [locale]/(public)/ · seeker/ · employer/      ※ agency/ 는 Phase 3 (PRD §2 제외) — 만들지 않음
│  │  ├─ admin/                    (한국어 전용, 2FA)
│  │  └─ api/ingest/job-leads/ · api/...
│  ├─ components/ (ui/, forms/, seeker/, employer/, admin/, visa/, legal/, jobs/, common/)
│  ├─ config/
│  │  ├─ site.config.ts            [R-015] 사무소명·등록번호·대표자·주소 플레이스홀더
│  │  ├─ flags.ts                  [제안] WO §16 플래그 4종, env 미설정 시 false
│  │  └─ limits.ts                 [제안] 운영 수치(OTP 60초·시간당 5회·잠금 5회, 배치 200, 열람 100/일, 마스킹 5건, 보관 30일 등) — C-05
│  ├─ fonts/                       Pretendard woff2 + 라이선스
│  ├─ i18n/ (routing.ts, request.ts)   [제안] next-intl 설정
│  ├─ lib/
│  │  ├─ crypto.ts · rbac.ts · audit.ts · pii-guard.ts · fonts.ts
│  │  ├─ db.ts                     Prisma 클라이언트 + `*Enc` extension
│  │  ├─ serializers/ (blindSeeker.ts, blindJob.ts)
│  │  ├─ visa-engine/ (classifyTrack.ts, evaluate.ts)
│  │  ├─ score/e74.ts
│  │  ├─ notifications/ (provider.ts, console.ts, smtp.ts)
│  │  ├─ jobs/                     [제안] pg-boss 작업 정의
│  │  └─ storage/                  [제안] 로컬 비공개 저장소 어댑터 + 서명 URL
│  ├─ server/actions/{영역}/*.ts   [제안] 서버 액션 모음 ('use server')
│  └─ schemas/{영역}/*.ts          zod 스키마 (seeker/register/step0.ts … step7.ts)
└─ tests/
   ├─ unit/                        Vitest
   └─ e2e/                         Playwright
```
- 위 트리에 없는 최상위 폴더를 `src/` 아래에 새로 만들려면 이 기준서에 먼저 추가한다.

### 4.3 파일·식별자 명명

- WO가 이름을 지정한 파일은 **그 이름 그대로**: `crypto.ts`, `rbac.ts`, `audit.ts`, `pii-guard.ts`, `blindSeeker.ts`, `classifyTrack.ts`, `evaluate.ts`, `e74.ts`, `site.config.ts`, `schema.prisma`, seed 파일명.
- 그 외 `src/components/**`, `src/app/**`의 파일 = kebab-case(`outcome-card.tsx`), 컴포넌트 export = PascalCase(`OutcomeCard`).
- `src/lib/**`, `src/schemas/**`, `src/server/**`의 신규 파일 = camelCase(`blindJob.ts`, `step2.ts`).
- zod 스키마: `export const step2Schema = z.object(...)`, 타입 `export type Step2Input = z.infer<typeof step2Schema>`.
- 서버 액션 함수: 동사로 시작하는 camelCase (`saveRegisterStep`, `promoteSeekerGrade`).
- enum 값·DB 문자열 코드: UPPER_SNAKE (`PII_VIEW`, `JOB_MATCH`, `UNKNOWN`).
- 환경변수: UPPER_SNAKE, 플래그는 `FEATURE_*` [WO §16] 이름 그대로.
- Prisma 모델·필드: WO §5 이름 그대로. 추가 필드도 camelCase, 암호화 필드는 `…Enc`, 조회용 HMAC은 `…Hash`.

### 4.4 서버 직렬화 화이트리스트 (BR-02, BR-03)

- 기업에게 나가는 구직자 데이터는 **반드시** `src/lib/serializers/blindSeeker.ts`의 함수만 거친다. `BLIND_SEEKER_FIELDS`는 WO §7.5 배열과 동일(추가·삭제 시 WO 변경 필요).
- 직렬화 함수는 화이트리스트 키만으로 **새 객체를 구성**한다(원본 객체에서 키를 지우는 blacklist 방식 금지, 스프레드 `...profile` 금지).
- `publicId`는 DB `id`와 다른 랜덤 값.
- 구직자에게 나가는 공고 데이터는 `src/lib/serializers/blindJob.ts`(`BLIND_JOB_FIELDS` = WO §8.5 표시 항목)만 거친다 [제안].
- 기업 영역(`src/app/[locale]/employer/**`, 기업용 API·서버 액션)에서 `SeekerProfile`/`User`를 조회해 직렬화기 없이 반환·props 전달 금지. 클라이언트 컴포넌트에 Prisma 객체를 그대로 넘기지 않는다.
- 동의(BLIND_PROFILE) 철회자·B등급·비 JOB_MATCH·비활성 제외 조건은 **쿼리 계층**에서 적용(BR-06, BR-07).

### 4.5 권한 검사 (rbac)

- 모든 서버 액션(`'use server'` export 함수)과 모든 Route Handler(`src/app/api/**/route.ts`)는 **첫 실행 문장**에서 `src/lib/rbac.ts`의 검사 함수(예 `requirePermission(perm)`)를 호출한다.
  - 예외(공개 액션)는 목록으로 관리: 비자 진단·점수 계산·OTP 요청·간편 등록 시작·`/api/ingest/*`(x-api-key 검사로 대체). 예외 함수에는 `// rbac: public — 사유` 주석 필수 [제안].
- `/admin/**` 레이아웃·미들웨어에서 직원 역할 **+ 2FA 완료**를 함께 확인 [WO §11].
- 권한은 역할 문자열 비교를 각 파일에 흩뿌리지 않고 `rbac.ts` 매트릭스의 권한 이름(예 `contact:view`, `visaCase:view`)으로 검사.

### 4.6 zod 스키마 공유

- 폼 검증 스키마는 `src/schemas/**`에만 정의하고, 클라이언트(`zodResolver`)와 서버 액션(`schema.safeParse`)이 **같은 import**를 쓴다 [WO §3].
- 컴포넌트·서버 액션 파일 안에서 `z.object(` 새 정의 금지(스키마 파일 import만).
- 위저드 스키마: `src/schemas/seeker/register/step{0..7}.ts`, 필드 키는 WO §7.3 키와 동일.
- 법령 수치(나이·점수·기간 요건)를 zod 규칙으로 넣지 않는다(BR-12). 형식 검증(길이·패턴·필수)만.
- 기업 자유 입력 필드 스키마에는 `pii-guard` 검사(refine 또는 서버 전처리)가 붙는다(BR-14).

### 4.7 암호화 필드 (`*Enc`)

- 이름·연락처·메신저 ID·이메일·사업자번호·학교명·회사명 등 개인 식별 가능 값은 `…Enc` 필드로만 저장 [WO §3, §5].
- 암·복호는 `src/lib/db.ts`의 Prisma extension이 자동 처리. 앱 코드에서 `crypto.encrypt` 직접 호출은 extension·해시 생성 외 금지.
- 중복 확인·조회는 `…Hash`(HMAC-SHA256) 필드로만(평문 WHERE 금지).
- `…Enc` 값(복호 결과 포함)은 기업 영역·공개 영역 응답에 포함 금지. 관리자 화면에서 복호 값을 보여 주는 지점마다 `PII_VIEW` 감사 로그.
- 로그(`console.*`, 오류 메시지, pg-boss payload)에 복호 값·전화번호·OTP 코드 금지(개발 모드 OTP 콘솔 출력 어댑터만 예외, `NODE_ENV !== 'production'` 조건).

### 4.8 감사 로그 대상 (BR-15, N-05)

`src/lib/audit.ts`에 `AuditAction` 유니온으로 고정 [제안 명칭]. 아래 행위는 해당 서버 함수 안에서 같은 트랜잭션으로 기록한다.

| action | 시점 |
|---|---|
| `PII_VIEW` [WO] | 관리자 화면에서 복호 필드 열람 |
| `PII_EXPORT` | 개인정보 내보내기(다운로드) |
| `SEEKER_GRADE_CHANGE` | 구직자 등급 변경(승격·강등, 작업 큐 강등 포함) |
| `SEEKER_TRACK_CHANGE` | 트랙 변경 |
| `LEAD_GRADE_CHANGE` | 리드 등급 전이 |
| `RECOMMENDATION_CREATE` | 추천 실행 |
| `POSTING_PUBLISH` | 공고 공개 |
| `CANDIDATE_BULK_VIEW` | 기업 대량 조회(R-207) |
| `RULE_PUBLISH` | 규칙·점수표 게시(R-215) |
| `CONSENT_REVOKE` | 동의 철회 |

- `meta`에 평문 PII 금지(대상 ID·변경 전후 등급 등만).
- `AuditLog`·`Recommendation`은 앱 코드에 `update`/`delete`/`upsert` 호출 0건 + DB 트리거(BR-09, R-006).

### 4.9 법령 수치 하드코딩 금지 검사 방법 (BR-12, R-128)

검토 시 아래 3가지를 실행한다. 대상은 `src/` 전체(테스트·시드·messages·content 제외).

1. **비자 코드 리터럴 검색**: 
   `rg -n "['\"\`](A|B|C|D|E|F|G|H)-[0-9]{1,2}(-[0-9A-Z]{1,2})?['\"\`]" src`
   → 결과 0건이어야 한다. 비자 코드는 DB(`VisaType`, `VisaRule`)·시드·번역 파일에만 존재. (형식 검사 정규식 `/^[A-H]-\d/`처럼 특정 코드가 아닌 패턴은 허용.)
2. **규칙·점수 모듈의 숫자 리터럴 검색**:
   `rg -n "\b[0-9]{2,}\b" src/lib/visa-engine src/lib/score`
   → 결과 0건(0·1 이외의 숫자는 DB 값 또는 `src/config/limits.ts`에서 읽어야 함).
3. **매핑 상수 검색**: `rg -n "(Record<|Map<|switch\s*\().*visa" -i src/lib/visa-engine` 결과를 열어 비자→트랙·비자→업종·배점 매핑 상수가 없는지 눈으로 확인.
- 시드(`prisma/seed/sampleRules.ts`, `sampleScoreTable.ts`)는 파일 상단 `// SAMPLE — 실제 법령 수치 아님 (BR-12)` 주석, 모든 행 `isSample: true`, `status: 'DRAFT'`.

### 4.10 테스트 위치·명명

- 단위: `tests/unit/{src 경로 미러}/{파일명}.test.ts` (예 `tests/unit/lib/pii-guard.test.ts`).
- E2E: `tests/e2e/{기능}.spec.ts` (예 `tests/e2e/seeker-register.spec.ts`).
- `src/` 안에 테스트 파일 두지 않는다.
- WO §15 필수 테스트 11개는 테스트 이름(`describe`/`test`)에 `WO15-01` … `WO15-11` 태그를 넣는다 [제안] — 추적용.
- PRD 요구 번호를 검증하는 테스트에는 이름에 `R-xxx` 태그.
- 시간 의존 테스트는 가짜 시계(`vi.useFakeTimers` 또는 주입 가능한 `now()`)를 쓴다(R-116, R-213).

---

## 5. 자동화·데이터 (수집 API·오류·로그)

- **입력 형식** `POST /api/ingest/job-leads` [WO §8.1]: 헤더 `x-api-key`, 본문 JSON 배열(1~200). 각 항목 필드는 `JobLead` 모델(`source`, `sourceRef`, `companyName`, `bizRegNo?`, `sido`, `sigungu?`, `title`, `payMin?`, `payMax?`, `postedAt?`, `closesAt?` …) + 원문은 `rawJson`. 스키마는 `src/schemas/ingest/jobLead.ts`.
- **출력 형식** [제안]: `200 { created: n, updated: n, rejected: [{ sourceRef, reason }] }`.
- **API 오류 응답 형식** [제안, 전 API 공통]: `{ "error": { "code": "UPPER_SNAKE", "message": "..." } }`. 상태 코드: 400 형식 오류, 401 미인증·API 키 없음, 403 권한 없음·만료 서명 URL, 404 없음·플래그 off, 409 중복(사업자번호 등), 422 업무 규칙 위반(등록 불가 비자, 미검증 공고 공개 등), 429 속도 제한.
- 사용자 화면 오류 문구는 `errors.{code}` 번역 키로 보여 주고 서버 메시지 원문을 그대로 노출하지 않는다.
- 로그: 구조화 로그(JSON 한 줄) 권장, PII·비밀값 금지(4.7절).

---

## 6. 점검표

wf-standard가 산출물을 검토할 때 쓰는 항목. 각 항목은 예/아니오로 답한다. "P"는 처음 적용되는 Phase(이후 Phase에도 계속 적용).

| 번호 | P | 점검 항목 | 확인 방법 |
|---|---|---|---|
| S-01 | 0 | `globals.css`의 shadcn 변수와 추가 변수가 2.1절 표의 hex와 같은 색인가 | 파일 열어 대조 |
| S-02 | 0 | 컴포넌트·페이지 코드에 하드코딩 색(`#hex`, `rgb(`, `text-red-600` 류 팔레트 유틸)이 0건인가 | `rg "#[0-9a-fA-F]{3,6}\b|rgb\(|(text|bg|border)-(red|green|yellow|blue|slate|gray|amber|orange)-[0-9]{2,3}" src --glob '!**/globals.css'` |
| S-03 | 0 | 글꼴이 `next/font/local`(Pretendard)·`next/font/google`(Noto Sans, Noto Sans SC)로만 로드되고 외부 폰트 `<link>`/`@import`가 0건인가 | `src/lib/fonts.ts` 확인, `rg "fonts.googleapis|@import url" src` |
| S-04 | 0 | 로케일별 폰트 스택 1순위가 2.2절 표와 같은가(vi/ru/uz=Noto Sans, zh=Noto Sans SC, ko/en=Pretendard) | `[locale]/layout.tsx` 확인 |
| S-05 | 1 | 사용자 노출 텍스트 최소 14px, 입력란 16px 이상인가 | `rg "text-xs|text-\[1[0-3]px\]" src` 0건 + 입력 컴포넌트 확인 |
| S-06 | 0 | 간격·모서리에 임의값(`p-[..]`, `m-[..]`, `gap-[..]`, `rounded-[..]`)이 0건이고 그림자는 sm/md/lg만 쓰는가 | `rg "(p|m|gap|space-[xy]|rounded)-\[" src`, `rg "shadow-(xl|2xl|inner|\[)" src` |
| S-07 | 1 | 주요 공개·구직자 화면이 375px 폭에서 가로 스크롤이 없는가 | Playwright 뷰포트 375 렌더, `scrollWidth <= clientWidth` |
| S-08 | 1 | 공개·구직자·기업 화면의 버튼·선택 행 클릭 영역이 44px 이상인가 | 렌더 후 boundingBox 측정 또는 클래스(`h-11` 이상) 확인 |
| S-09 | 1 | 판정·등급·공개 여부 표시가 색과 함께 아이콘+글자를 갖는가 | 해당 컴포넌트 코드 확인 |
| S-10 | 0 | 사용한 shadcn 컴포넌트가 3.1절 목록 안에 있고 `avatar`를 쓰지 않는가 | `src/components/ui/` 파일 목록 대조 |
| S-11 | 0 | 아이콘이 `lucide-react`만인가 | `package.json` 의존성·import 확인 |
| S-12 | 1 | 위저드 상단에 `WizardProgress`가 있고 막대와 "n/N·단계명" 글자가 함께 보이는가 | 렌더 확인 |
| S-13 | 1 | 위저드 각 단계 하단에 `DisclosureBadge`가 있고 문구가 WO §7.1 두 가지 중 하나인가 | 렌더 + messages 확인 |
| S-14 | 1 | 위저드 각 화면의 동시 표시 문항 수가 7 이하인가(3.3절 셈법) | `src/schemas/seeker/register/step*.ts`·화면 대조 |
| S-15 | 1 | 모든 선택형 문항에 "모름"(`UNKNOWN`) 선택지가 있는가(C-02 확정 범위 기준) | 스키마 enum·옵션 확인 |
| S-16 | 1 | 비자가 표시되는 모든 곳이 `VisaLabel`(코드+쉬운 설명)을 쓰는가 | `rg "visaCode" src/components src/app` 결과의 렌더 지점 확인 |
| S-17 | 1 | 진단·채용 진단·점수 결과 화면 모두에 "참고용, 행정사 확인 필요"가 표시되고, 이를 숨기는 prop·조건이 없는가 | `OutcomeCard`·`ScoreResult` 코드 + 렌더 |
| S-18 | 1 | 판정 라벨이 3.4절 3개(가능성 높음/확인 필요/어려움)만이고 단정 표현이 없는가 | messages ko 확인 |
| S-19 | 1 | 약관·개인정보·동의서·고지 초안 전부에 "[전문가 검토 필요]"가 있고 `ExpertReviewMark`로 렌더되는가 | `content/consents/**`, `/terms`, `/privacy` 렌더 |
| S-20 | 1 | 수요 지도 고지가 `NoticeBox`로 데이터 위에, 6개 언어 모두 표시되는가 | 렌더(6 로케일) |
| S-21 | 1 | 수요 지도 버튼이 WO §8.4의 2개뿐인가 | 렌더 확인 |
| S-22 | 1 | "구직자 이용료 없음"이 메인·구직자 등록·`/fees`에 표시되는가 | 렌더 확인 |
| S-23 | 1 | messages(6개 언어)·화면에 3.5절 금지 표현이 0건인가 | `rg -i "지원하기|apply now|\"apply\"|연락처 보기|채팅|메시지 보내기|보장|100%" messages src` 후 문맥 확인 |
| S-24 | 1 | 구직자↔기업 직접 연락 UI·API(채팅, 연락처 표시, 이메일 전달, 외부 메신저 링크)가 0건인가(BR-01) | `rg -i "mailto:|tel:|wa\.me|t\.me|zalo\.me|kakao" src` 결과가 운영자 연락처(푸터 등) 외 0건 |
| S-25 | 1 | 기능 플래그 off 시 해당 페이지가 `ComingSoon`을 렌더하고, 내비 링크 숨김·sitemap 제외·API 404인가 | 플래그 미설정 빌드로 렌더·응답 확인 |
| S-26 | 1 | 점수표·규칙 미게시 시 `/score/e74`가 `ComingSoon` + 상담 신청을 보여 주는가 | 시드 상태 렌더 |
| S-27 | 1 | 등급 표시가 `GradeBadge`(B/A/S 글자+색, S는 "우선 추천")로 통일되어 있는가 | `rg "grade" src/components src/app` 렌더 지점 확인 |
| S-28 | 0 | 6개 messages 파일 모두 첫 키가 `"_review": "native review required"`인가 | 파일 첫 줄 확인 |
| S-29 | 0 | `pnpm i18n:check`가 ko 대비 누락 키 0으로 끝나는가 | 명령 실행 |
| S-30 | 0 | 번역 키가 3.6절 형식(lowerCamelCase 세그먼트, 필드 키 = WO §7.3 키, 옵션 = enum 값)인가 | 키 표본 20개 이상 대조 |
| S-31 | 1 | `src/app/[locale]/**`·비관리자 컴포넌트에 하드코딩된 사용자 노출 문자열이 0건인가 | ESLint jsx-no-literals 결과 또는 `rg ">[가-힣A-Za-z][^<{]*<" src/app/[locale] src/components --glob '!**/admin/**'` 후 확인 |
| S-32 | 1 | 금액·날짜·숫자가 `Intl`/next-intl formatter로 출력되는가(문자열 연결 포맷 0건) | `rg "toLocaleString\(\)|\+ ?'원'|\+ ?\"원\"" src` |
| S-33 | 1 | 동의서 본문이 messages에 없고 `content/consents/{type}/{version}/{locale}.md`에 있는가 | 경로 확인 |
| S-34 | 0 | 디렉터리가 4.2절 트리를 따르고, 트리에 없는 `src/` 최상위 폴더·`src/app/[locale]/agency/`가 없는가 | 폴더 목록 대조 |
| S-35 | 0 | 파일명이 4.3절 규칙(WO 지정명 유지, components·app kebab-case, lib·schemas camelCase)을 따르는가 | 파일 목록 대조 |
| S-36 | 0 | `tsconfig.json` `strict: true`이고 `any`가 0건(또는 ESLint no-explicit-any error)인가 | 파일 확인, `rg ": any\b|as any\b" src` |
| S-37 | 2 | 기업 대상 구직자 데이터가 모두 `blindSeeker.ts` 직렬화 함수를 거치고, 직렬화가 화이트리스트로 새 객체를 구성하는가(스프레드·blacklist 0건) | 기업 영역 `rg "prisma\.(seekerProfile|user)" src/app/[locale]/employer src/server/actions/employer src/app/api` + 직렬화 코드 열람 |
| S-38 | 2 | `BLIND_SEEKER_FIELDS`가 WO §7.5 배열과 정확히 같은가 | 파일 대조 |
| S-39 | 2 | 구직자 대상 공고 데이터가 `blindJob.ts`를 거치고 회사명·주소·담당자·연락처·사업자번호 키가 없는가 | 코드 + 응답 확인 |
| S-40 | 0 | 모든 서버 액션과 Route Handler가 첫 문장에서 `rbac.ts` 검사를 호출하거나 `// rbac: public — 사유` 주석이 있는가 | `rg -l "'use server'|\"use server\"" src` 및 `src/app/api/**/route.ts` 전수 열람 |
| S-41 | 1 | `/admin/**`이 직원 역할과 2FA를 함께 확인하는가 | 레이아웃·미들웨어 코드 |
| S-42 | 1 | 폼 zod 스키마가 `src/schemas/**`에만 있고 클라이언트·서버가 같은 스키마를 import하는가(컴포넌트·액션 내 `z.object(` 0건) | `rg "z\.object\(" src --glob '!src/schemas/**'` |
| S-43 | 0 | 개인 식별 값이 `…Enc` 필드로 저장되고 조회는 `…Hash`로만 하는가, 주민·외국인등록·여권번호 필드가 0개인가 | `schema.prisma` 확인, `rg -i "passport|arcNo|alienReg|residentNo|registrationNumber" prisma src` |
| S-44 | 0 | 앱 코드에서 `crypto` 암·복호 직접 호출이 extension·해시 생성 외에 0건인가 | `rg "encrypt\(|decrypt\(" src --glob '!src/lib/crypto.ts' --glob '!src/lib/db.ts'` 결과 확인 |
| S-45 | 0 | 로그·오류 메시지에 PII·OTP·비밀값이 출력되지 않는가(개발용 OTP 콘솔 어댑터 예외) | `rg "console\.(log|info|warn|error)" src` 결과 열람 |
| S-46 | 0 | `audit.ts`의 `AuditAction`이 4.8절 목록을 포함하고, 각 대상 행위 코드에서 기록 함수를 호출하는가 | 각 행위 서버 함수 열람 |
| S-47 | 0 | 앱 코드에 `recommendation`·`auditLog`의 `update`/`delete`/`upsert` 호출이 0건인가 | `rg "(recommendation|auditLog)\.(update|delete|upsert)" src` |
| S-48 | 1 | 4.9절 하드코딩 검사 1·2가 0건이고 3의 수동 확인에서 매핑 상수가 없는가 | 4.9절 명령 실행 |
| S-49 | 0 | 샘플 시드 파일에 `SAMPLE` 주석이 있고 모든 규칙·점수표 행이 `isSample: true`, `status: 'DRAFT'`인가 | 시드 파일 열람 |
| S-50 | 0 | 단위 테스트가 `tests/unit/`, E2E가 `tests/e2e/`에만 있고 `src/` 안 테스트 파일이 0건인가 | `rg --files src | rg "\.(test|spec)\.tsx?$"` |
| S-51 | 2 | WO §15 필수 테스트 11개가 `WO15-01`~`WO15-11` 태그로 각각 존재하는가 | `rg "WO15-(0[1-9]|1[01])" tests` |
| S-52 | 0 | API 오류 응답이 5절 형식(`{error:{code,message}}`)과 상태 코드 규칙을 따르는가 | Route Handler 코드 표본 확인 |
| S-53 | 0 | 운영 수치(OTP 제한, 배치 상한, 열람 상한, 마스킹 임계, 보관 일수 등)가 `src/config/limits.ts` 한 곳에만 정의되는가 | `rg "\b(200|100|60|30|14)\b" src --glob '!src/config/**'` 결과 열람 |
| S-54 | 0 | `site.config.ts`와 `flags.ts`가 `src/config/`에 있고 플래그 4종 기본값이 false인가 | 파일 열람 |
| S-55 | 1 | 공개 페이지 `<html lang>`이 현재 로케일이고 `LocaleSwitcher`가 각 언어를 자국어 이름으로 표시하는가 | 렌더 확인 |
| S-56 | 1 | `.env`가 git 제외(`.gitignore`)되고 `.env.example`만 커밋 대상인가 | `.gitignore` 확인 |

---

## 7. 충돌·확인 필요

> 이 절의 항목은 기준서가 해결하지 않았다. 사람의 결정이 필요하며, 결정 전까지 관련 점검 항목은 "기준 보완 필요"로 판정한다.

| 번호 | 내용 | 관련 근거 | 영향 점검 항목 |
|---|---|---|---|
| C-01 | **한 화면 문항 ≤7과 WO 문항 수 충돌.** Step 3은 문항 8개(educationLevel, major, schoolName, graduationDate, topikLevel, kiipStage, koreanSpeaking, otherLanguages). Step 5는 조건부 포함 최대 9개(availableFrom, groupFriendCode 표시 시). 선택지 예: 한 단계를 두 화면으로 나눔(3a/3b) / 조건부 문항은 셈에서 제외 / 일부 문항을 선택 입력 접기 영역으로 이동. | WO §7.1, §7.3, R-106 | S-14 |
| C-02 | **"모든 선택형 질문에 모름" 적용 범위.** 필수 문항 `visaCode`(BR-08 등록 불가 판정·트랙 분류와 직결), `nationality`, `sido`, 예/아니오형(`hasArc`, `needDormitory`, `shiftOk`)에도 "모름"을 두는지, `visaCode=UNKNOWN`이면 트랙·등록 가능 여부를 어떻게 처리하는지 WO에 없음. | WO §7.1, §7.4, BR-08 | S-15 |
| C-03 | **단계 수 표기.** WO는 "전체 7단계"라 하지만 문항은 Step 0~7(8개 화면). 진행률 분모를 7(Step 0 제외)로 할지 8로 할지 미정. | WO §7.1, §7.3 | S-12 |
| C-04 | **단계 하단 공개 여부 배지가 한 단계에 섞인 경우.** Step 1·2·3·4·5는 공개 필드와 비공개 필드가 섞여 있어 단계 단위 배지 하나로는 정확하지 않음. 선택지: 필드별 배지 / 단계 하단에 "블라인드 공개: 국적, 시·도 / 비공개: 이름…" 목록 / 단계 배지 + 필드 아이콘. | WO §7.1, §7.3 | S-13 |
| C-05 | **운영 수치가 BR-12 "법령 수치"에 해당하는지.** D-2 졸업 예정 "6개월", 체류 잔여 구간(6개월/12개월), 수요 지도 마스킹 5건, 30일 보관·14일 무응답, D-90/60/30, 열람 100건/일, OTP 제한 등은 WO가 지정한 운영 규칙이라 `src/config/limits.ts` 상수로 두기를 제안함. 특히 D-2 "6개월"은 트랙 분류 조건이라 `VisaType` 데이터로 옮겨야 하는지 확인 필요. | BR-12, R-108, R-128 | S-48, S-53 |
| C-06 | **"지원하기" 금지 범위.** WO는 수요 지도(§8.4)에만 명시. 기준서는 전 화면 금지를 제안(공고는 "면접 신청"이 WO 지정 버튼이므로 실질 충돌은 없음). 확정 필요. | WO §8.4, §8.5 | S-23 |
| C-07 | **기능 플래그 off 시 동작.** PRD는 "비활성"만 규정. 기준서는 페이지 `ComingSoon`(200, noindex) + 링크 숨김 + API 404를 제안. 대안: 페이지 자체 404. | R-015, WO §16 | S-25 |
| C-08 | **번역본의 "[전문가 검토 필요]" 표기.** 한국어 원문 문자열을 모든 로케일에 그대로 둘지(검색·검수 추적 용이), 번역할지, 병기할지 미정. 기준서는 "한국어 원문 + 번역 병기"를 기본안으로 보되 확정하지 않음. | N-03, WO §16 | S-19 |
| C-09 | **우즈베크어 문자 체계.** WO는 `uz`만 지정. 라틴(현행 공식)으로 가정했으나 대상 사용자(고려인·중앙아시아)에 따라 키릴 필요 여부 확인 필요. 폰트 스택은 둘 다 지원함. | WO §12 | S-04, S-55 |
| C-10 | **`shiftOk` 선택지와 데이터형 불일치.** WO §7.3은 예/아니오/조건부(3값), 데이터 모델은 `Boolean`. "모름" 추가 여부(C-02)와 함께 저장 형식 결정 필요. | WO §5, §7.3 | S-15, S-30 |
| C-11 | **Pretendard 파일 크기와 Lighthouse 성능 ≥85.** 한글 서브셋 가변 woff2도 수백 KB 수준이라 R-103 모바일 성능 목표에 영향 가능. Phase 1 측정 결과 미달 시 Noto Sans KR(next/font/google, 유니코드 범위 분할 제공)로 바꿀지 사전 승인 필요. | R-103, Q-03 | S-03, S-04 |
| C-12 | **판정 라벨 문구.** GREEN/YELLOW/RED의 화면 문구("가능성 높음/확인 필요/어려움")는 WO에 없는 제안 문구이며 법적 뉘앙스가 있어 행정사 확인 권장. | BR-11, WO §9.1, §10 | S-18 |
