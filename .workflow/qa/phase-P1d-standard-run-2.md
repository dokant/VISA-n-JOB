# Phase P1d — 기준 일치 검토 (run 2, 정적 검토)

- 대상 커밋: `ef7ea14`(P1d run 2 수정). 범위는 `git show ef7ea14`이고 18개 파일이다.
- 기준
  - `.workflow/STANDARD.md` v2.9
  - `qa/phase-P1d-standard-run-1.md` 수정 지시 N-1~N-6
  - DECISIONS Q-12·Q-13·SC-08
- 검토자: wf-standard(모드 B), 2026-11-16.
- 실행한 확인
  - `lint`: 오류 0.
  - `qa:static`: 오류 0, 경고 17. run 1과 같은 기존 경고이고 새 경고는 없다.
  - `i18n:check`: 6개 로케일 오류 0, ko 키 894개(run 1과 같음).
  - 변경분 정적 검사: `text-xs`, `-[` 임의값, `text-n400`, `mailto:`/`tel:`, 판정색(`success`), `console.`, `any`, 직접 `encrypt(`/`decrypt(`, 숫자 리터럴. 모두 0건이다. 예외는 아래 4절 1번.
  - 빌더 스크린샷 `p1d_r2_*.png`를 확인했다: `notice_ko`, `notice_en`, `done_viewport`.
  - build·test·e2e·dev·start는 **실행하지 않았다**. `.next`에는 쓰지 않았다.

## 1. 결과 요약

- 수정 지시 해소: **6 / 6** (N-1~N-6).
- 새 불일치: **0건**.
- P1d 전체 점검: **일치 44 / 44**. run 1은 39 / 44였고, N-1~N-5가 해소되었다. N-6은 P1a 산출물이라 합계에 넣지 않는다.
- 빌더 확인 요청 2건은 모두 **수용**한다(3절).

## 2. 수정 지시 해소 판정

| # | 판정 | 근거 |
|---|---|---|
| N-1 | 해소 | `request/page.tsx:66-77`에서 `ExpertReviewMark`를 NoticeBox 위에 둔다. 비한국어 페이지에서는 `tKo("notice")`를 `lang="ko"` 박스로 병기한다(SC-08). 레이블은 `legal.koreanOriginal`이고, `legal-document.tsx:52`와 같은 `text-label text-n500` 모양이다. 병기 박스는 NoticeBox와 같은 `n50` 바탕, `n200` 테두리, `rounded-sm`, `px-3.5`다. 스크린샷 `notice_ko`·`notice_en`에서 확인했다. e2e `employer-intake.spec.ts:100-105`도 표시를 검사한다. |
| N-2 | 해소 | `job-request-form.tsx:128`이 이제 `rounded-md border border-border bg-white p-6 text-n700 shadow-1`이다(일반 card 모양). 아이콘은 `text-brand-blue-600`(S-63: 파랑 글자는 600/700)이다. `src/` 변경분에 `success` 계열 클래스가 0건이다. 스크린샷 `done_viewport`에서 확인했다. |
| N-3 | 해소 | `aggregate.ts:171`에 `source: { in: [...INGEST_SOURCES] }`가 있다. 머리 주석에 Q-12 ①을 적었다. `aggregate.test.ts:167`에 테스트가 있다: 수집 출처만 세고 DIAGNOSIS·REQUEST를 빼는지, 그리고 앱이 만든 리드만 있는 칸은 생기지 않는지 확인한다. |
| N-4 | 해소 | `limits.ts:125`에 `INGEST_API_KEY_MIN_LENGTH = 32`를 두었다. `ingestAuth.ts`는 이 값을 import하고, 모듈 상수는 없앴다. `.env.example`의 "at least 32"는 상수 이름 참조로 바꿨다. 이제 숫자가 한 곳에만 있다. |
| N-5 | 해소 | ko `employer.request.notice`는 "회사 측 연락처(담당자 이름·전화·이메일)는 **비자앤잡 담당자**만 확인합니다."다. "직원"은 0건이다. 앞의 "담당자 이름"은 1.1이 허용하는 기업 측 입력 라벨 표기이고, "회사 측"이 붙어 운영자 측과 구분된다. 6개 언어 모두 바뀌었다. zh는 "员工"을 "负责人"으로 바꿨다. en·ru·uz·vi는 기존 `lead` 번역과 같은 "VISA n JOB staff" 계열 표현을 쓴다. |
| N-6 | 해소 | ko `public.about.contact.body`는 "…**비자앤잡 담당자가** 안내해 드립니다."다. 6개 언어 모두 "VISA n JOB"을 붙였다. |

## 3. 빌더 확인 요청 판정

| 요청 | 판정 | 근거 |
|---|---|---|
| (1) `employer.request.done.body` "담당자가 검증한 뒤 연락드립니다."가 1.1 반복 허용에 해당하는가 | **수용(일치)** | 완료 패널은 폼 자리만 바꾸고, 같은 페이지의 PageShell `lead`("비자앤잡 담당자가 확인한 뒤 연락드립니다.")와 notice("비자앤잡 담당자만 확인합니다")는 그대로 남는다(`done_viewport`에서 notice 끝부분이 패널 바로 위에 보인다). 1.1 "같은 문맥에서 이미 '비자앤잡 담당자'를 쓴 뒤 반복할 때만 '담당자' 허용"에 해당한다. "연락드립니다"라는 주어로 보아 기업 측 담당자와 헷갈릴 여지도 작다. run 1 8절 판정과 같다. |
| (2) N-3에서 `JobLead.source`가 String 열이라 Prisma enum 대신 `INGEST_SOURCES` 상수를 쓴 것 | **수용** | `prisma/schema.prisma:318` `source String`이다(주석 "WORK24_API\|AGENT\|MANUAL + DIAGNOSIS\|REQUEST"). `INGEST_SOURCES`(`schemas/ingest/jobLead.ts:16`)는 수집 스키마 `z.enum`의 단일 출처이고, 값이 Q-12 ①의 세 출처와 정확히 같다. 제외 목록이 아니라 허용 목록 방식이라, 나중에 출처가 추가되어도 수요 지도에 섞이지 않는다(fail closed). S-48(4.9-1)은 비자 코드 리터럴 규칙이므로 해당하지 않는다. S-42 위반도 아니다. `lib`가 `schemas`의 상수를 import하는 것은 금지되어 있지 않다. |

## 4. 새 변경분 판정 (불일치 없음)

| 항목 | 판정 | 근거 |
|---|---|---|
| S-53 운영 수치 | 일치 | `ingest.ts`의 새 리터럴은 `9 ~ 10`자리(국번 0이 빠진 휴대폰 번호 모양)뿐이다. 운영자가 바꿀 정책 값이 아니라 형식 판별 상수다. |
| S-43·S-44·S-45·S-36 | 일치 | O-1/O-2 변경분(`ingest.ts`, `transitions.ts` 주석)에 직접 암복호화, `console`, `any`가 0건이다. 연락처는 `maskContacts`를 거친다. 동작 판정은 QA 소관이다. |
| S-05·S-06·S-63 | 일치 | 새 클래스는 `text-label`, `text-dense`, `text-n500`, `text-n700`, `text-brand-blue-600`, `gap-1`, `gap-3`, `px-3.5`, `py-3`, `shadow-1`이고 모두 토큰 또는 배수 유틸이다. |
| 3.5·S-19 형식 | 일치 | `ExpertReviewMark`는 orange 배지와 `FileWarning` 아이콘으로, 3.2 행 그대로다. |
| S-29·S-30 | 일치 | 새 키는 없다. 값만 바뀌었고 `legal.koreanOriginal`은 이미 있는 키를 재사용했다. |

## 5. 불일치 목록

없음.

## 6. 관찰 (불일치 아님)

1. `ExpertReviewMark`의 설명 문구는 "이 문서는 초안입니다. 전문가 검토 후 확정됩니다."다. 문서가 아닌 고지 한 단락에 붙어도 의미는 통한다. 문구를 "이 고지는…"으로 나눌지는 기준 사항이 아니므로 판단에 맡긴다.
2. ko notice 한 문장에 "담당자"가 두 뜻(기업 측 라벨, 비자앤잡 담당자)으로 나온다. "회사 측"으로 구분되어 1.1을 지키지만, 번역 검수 때 같은 구분이 유지되는지 보기 바란다.
