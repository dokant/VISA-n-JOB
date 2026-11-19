# Phase P2b 기준 재검토 — run 2 (정적)

- 대상: 커밋 2644efa (`git show 2644efa`, 37파일, +590/−102)
- 기준: STANDARD v2.15 → 이번 검토 중 **v2.16**으로 보완(판정 변화 없음), DECISIONS Q-24·PC-11, WO §7.3·§7.5, run 1 보고서 F-1~F-5
- 방법: 정적만. `pnpm i18n:check`(6로케일 오류 0, ko 1085키), `pnpm qa:static`(오류 0, 경고 17 = run 1과 같은 기존 경고, 새 경고 0), `pnpm lint`(오류 0). 추가 줄 금지 패턴 rg(`text-xs`·대괄호 임의값·hex/rgb·any·console·mailto/tel·toLocaleString·outline-none·opacity-0·기본 shadow·`lg:h-`) 0건. 변경 파일 전수 열람. 스크린샷 `p2b_r2_wizard_3a_375`·`p2b_r2_candidate_card_1280`·`p2b_r2_stats_375`·`p2b_r2_contract_form_375` 열람. build/test/e2e/dev 미실행, `.next` 미접근.

## 1. run 1 불일치 해소

| # | 내용 | 판정 | 근거 |
|---|---|---|---|
| F-1 | 체류 잔여기간 구간 WO §7.3 3구간 | **해소** | `config/limits.ts:193-197` `M0_6`/`M6_12`/`M12_PLUS`(상한 없음). `M12_24`·`M24_PLUS`는 src·messages 0건(테스트의 "무시되는 옛 값" 확인만). 라벨은 ICU(`stayBand.over/under/range`)라 messages 변경 불필요. 카드 스크린샷 "12개월 이상" |
| F-2 | 폼 간격 22px/7px | **해소** | `contract-form.tsx` `gap-5.5`·`gap-1.75`, `candidate-filters.tsx` `gap-5.5` 2곳, `admin/posting-forms.tsx` `gap-5.5` 4곳(run 1 권장분 포함). 남은 `gap-5`/`gap-1.5`는 폼이 아닌 카드·결과 섹션(`candidate-card.tsx:30,75`, `diagnosis-form.tsx:80` 결과 `section`, `disclosure-badge.tsx` 요약 박스)뿐 |
| F-3 | 전환 비자 원문 코드 노출 | **해소** | `candidate-view.ts` `convertibleOf` — VisaType에 없으면 `convertible: null`, 타입이 `visa: CandidateVisa`(필수)로 바뀌어 원문 분기 불가. 카드는 VisaLabel만. E2E가 E2E 태그 코드 미노출 확인 |
| F-4 | 통계 표 GradeBadge | **해소** | `candidate-stats.tsx:120-122` `<GradeBadge>`, `seeker.grade` 글자 표시 제거. 스크린샷 A등급·S등급 우선 추천 배지 |
| F-5 | 관리자 '개' 단위 | **해소** | `companies/page.tsx:86` `가입 계정 수 {fmtCount(c.accounts)}` — 단위 없는 Intl 숫자 |

**해소 5/5**

## 2. 추가 판정

| # | 항목 | 판정 | 근거 |
|---|---|---|---|
| A-1 | SC-01·S-14 Step 3a 문항 ≤7 | 일치 | 3a = 최종 학력·전공 분야·전공명·학교명·졸업일 5문항. `majorField`는 WO §7.3 `major` 행에서 갈라진 Q-24 신설 문항 → 별도 1문항으로 세는 규칙을 v2.16 3.3에 명시(기준 보완) |
| A-2 | SC-02·S-15 '모름' | 일치 | 비필수 선택 문항, 옵션 끝 `UNKNOWN`("모름") + 빈 선택(무응답) 허용, 스키마 `optionalChoice(MAJOR_FIELDS).optional()`. 3.3 열거 목록에 없던 것은 기준 쪽 공백("새 문항을 추가하면 이 목록에 먼저 넣는다")이라 v2.16에 `majorField` 추가 |
| A-3 | SC-04·S-13 공개 아이콘·요약 | 일치 | 전공 분야 = `blind` 아이콘, 전공명 = `private` 아이콘(Q-24 "자유 입력 major는 직원 전용"), 하단 요약 블라인드[최종 학력, 전공 분야, 졸업(예정)일] / 비공개[전공명, 학교명]. help 문구 "기업에는 이 분야만 보입니다"/"기업에 보이지 않습니다"가 아이콘과 일치. 스크린샷 3a 375 확인 |
| A-4 | S-16 비자 표시 | 일치 | 3a에 비자 표시 추가 없음. 기업 카드의 현재·전환 비자 모두 VisaLabel만(F-3) |
| A-5 | 4.4·S-37 majorField 직렬화 | 일치 | `BLIND_SEEKER_SELECT`에 `majorField`만, 자유 입력 `major`는 select·기업 영역 0건. `oneOf(MAJOR_FIELDS, …)`로 목록 밖 값은 null. 스냅샷 갱신 |
| A-6 | MAJOR_FIELDS 운영자 검토 표시 | 일치(v2.16 기준화) | `lib/seeker/options.ts:83-113` 주석 "운영자 검토 필요"(BR-12 법령 수치 아님, ISCED-F 2013 대분류 초안) + `MAJOR_FIELDS_SOURCE.reviewStatus = "OPERATOR_REVIEW_REQUIRED"`, `decision: "DECISIONS Q-24"`. 법령 수치가 아니라 DB 시드 DRAFT 대상이 아니며, 기준에 형식이 없어 이 방식을 v2.16 4.9에 명문화 |
| A-7 | 통계 합계 "—"·안내 문구 | 일치(v2.16 기준화) | `maskCandidateStats`: 가린 칸이 하나라도 있으면 `total=null`, `totalMask="HAS_MASKED_CELL"`, 정렬은 공개 값만 사용. 화면은 `t("withheld")`(6로케일 `—`, 코드 리터럴 아님) + 바로 아래 `withheldNote`(`text-caption text-n700`, 6로케일 번역). 가린 칸은 기존 `{min}명 미만`. 기준에 숨긴 합계 표시 규칙이 없어 v2.16 4.4에 명문화 |
| A-8 | 4.2 트리 반영 | 기준 보완(v2.16) | `tests/e2e/support/shots.ts`는 4.10 E2E 도우미 위치 규칙에 맞음(이름에 .spec 없음). 트리에 `tests/e2e/support/` 목록이 없어 v2.16에 9파일 기재. `lib/seeker/options` 설명 보강. 마이그레이션 `prisma/migrations/20261117200000_seeker_major_field`는 기존 `migrations/` 아래라 추가 불필요 |
| A-9 | 마이그레이션·시드 동반(CLAUDE.md) | 일치 | 스키마 `majorField String?` + migration.sql + `sampleSeekers.ts` 7행 코드, 기존 샘플 행 null만 채움(SAMPLE 행만) |
| A-10 | 6개 언어 키 | 일치 | `seeker.register.step3.majorField.{label,help,option.*13}`, `major` 라벨 "전공명", `employer.candidates.stats.{withheld,withheldNote}` 6로케일, i18n:check 오류 0. 옛 문자열 키 `step3.majorField` 사용처 0건(요약은 `s.label`로 교체) |
| A-11 | S-50 테스트 위치 | 일치 | `tests/unit/lib/candidates/statsMasking.test.ts`(주 모듈 미러 폴더, camelCase), `saveStep`·`blindSeeker`·`stepKeys`·`eligible`·`stats` 갱신, E2E 2개 spec |

## 3. 새 불일치

**없음.**

## 4. P2b 전체 일치

run 1 표 35항목 중 불일치였던 5개(7·18·21·22·25)가 모두 일치로 바뀌고 나머지 30개는 이번 변경으로 회귀 없음(6번 `majorField`는 Q-24 반영으로 코드값만 공개 — 일치 유지, 34번 디렉터리는 v2.16 트리 보완).

**P2b 전체 일치 35 / 35** (추가 판정 A-1~A-11 포함 시 46/46)

## 5. 관찰 (판정 밖)

- O-1 `statsMasking.test.ts`의 머리·describe 태그는 `PC-11`뿐이고 `R-205` 태그가 없다(같은 모듈의 `stats.test.ts`에는 있음). 4.10 "PRD 검증 테스트는 R-xxx 태그"에 맞추려면 `R-205`를 붙이길 권장. `saveStep.test.ts`의 Q-24 케이스도 동일.
- O-2 숨긴 합계 `—`는 `text-metric` 크기라 375 스크린샷에서 제목 아래 구분선처럼 보인다. 바로 아래 안내 문구로 뜻은 전달되지만, 스크린리더가 대시를 읽지 않을 수 있으니 QA가 접근성 이름(예: 안내 문구를 `aria-describedby`로 연결)을 확인할 것.
- O-3 기업 카드 요소 스크린샷 위쪽이 sticky 내비에 가려 있음(촬영 방식의 문제, 산출물 아님).
- O-4 STATE에 적힌 대로 수요 지도 집계의 차감 노출 가능성은 이번 범위 밖. `lib/demand/aggregate.ts` 주석은 시·도 합계를 공개 칸만 더한다고 적고 있으나 v2.16 4.4 규칙(가린 칸이 든 합은 공개 안 함)을 수요 지도에도 적용할지는 오케스트레이터 판단.
- O-5 MAJOR_FIELDS는 운영자 검토 대기 — Gate 4 보고의 운영자 검토 목록에 넣을 것.

## 6. STANDARD v2.16 변경 내역

- 머리 2.15 → 2.16, 개정 이력 2.16 행.
- 3.3 문항 수: Q-24 `majorField`/`major`는 각 1문항, Step 3a 5문항.
- 3.3 SC-02 '모름' 있음 목록에 `majorField`(빈 선택 = 무응답, UNKNOWN = 모름).
- 4.2 트리: `lib/seeker/options` 설명(MAJOR_FIELDS·_SOURCE), `tests/e2e/support/` 9파일.
- 4.4: 가린 칸이 든 합은 공개하지 않음·정렬 등도 공개 값만으로, 숨긴 합계는 번역 키 `—` + 바로 아래 안내 문구. `majorField`는 MAJOR_FIELDS 코드만, `major` select 금지.
- 4.9: 법령 수치가 아닌 운영자 미확정 코드 목록의 표시 방식(주석 + `{상수명}_SOURCE.reviewStatus`).
- 산출물 판정 변화 없음.
