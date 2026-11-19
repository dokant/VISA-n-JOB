# Phase P2e 기준 검토 run 1 (정적)

- 대상: 커밋 dca582b, f24b425, 2e26899 (`git diff 71865f3..2e26899`, 16개 파일)
- 기준: STANDARD v2.21(검토 중 v2.22로 개정, 아래), PRD R-217·N-01~N-06·§6, PLAN "### P2e", DECISIONS 전체(Q-28 포함)
- 방법: 정적 열람만. build·test·test:e2e·dev·start·lighthouse는 돌리지 않았고 `.next`에는 쓰지 않음. 산출물은 고치지 않음.
- README 매핑표는 스크립트로 확인: 표의 테스트 파일 24개, 테스트 이름 37개가 모두 실제 파일에 있음. `rg WO15-xx tests`로 찾은 태그 파일 24개도 모두 표에 있음.

## 결과: 일치 16 / 21

| 번호 | 점검 항목 | 근거 | 판정 |
|---|---|---|---|
| E-01 | README "출시 점검" 절에 검증 순서·환경 변수·플래그·WO15 매핑·N-01·알려진 한계가 다 있는가 | PLAN P2e 작업 3~5 | 일치 |
| E-02 | 전체 검증 명령이 PLAN P2e 검증 명령과 같은가 | PLAN P2e | 일치 (`i18n:check` 뒤 공백 3칸은 모양만 다름) |
| E-03 | WO §15 1~11 행의 파일·테스트 이름이 실제와 같은가 | PLAN P2e-4, S-51 | 일치 (37/37) |
| E-04 | 매핑이 빠짐없는가(WO15 태그가 있는 모든 파일이 표에 있음) | S-51 | 일치 (24/24, 01~11 모두 1건 이상) |
| E-05 | N-05·N-04 테스트 경로 안내가 실제와 같은가 | PLAN P2e-2·3 | 일치 |
| E-06 | 플래그 4종 기본 false 설명과 확인 테스트가 맞는가 (`flags.test.ts`, 기본 서버 ComingSoon 스펙 5개) | PRD §6, S-25, S-54 | 일치 (demand·jobs-apply·employer-candidates·seeker-recommended·score 스펙에 ComingSoon 검사 있음, `playwright.config.ts` 첫 서버에는 플래그 없음) |
| E-07 | 환경 변수 절에 이름만 있고 값은 없는가 | N-06, 1.2-10 | 일치 (비밀값 없음. 기본 포트 3100·3200과 DB URL 틀 `postgresql://…@127.0.0.1:54329/<임시 DB 이름>`만 있음) |
| E-08 | 환경 변수 목록이 코드가 실제로 읽는 이름과 맞는가 | README 정확성 | **불일치 R-1** |
| E-09 | 사람이 승인할 사항(PLAN 승인 필요 지점 A-x)이 표시되어 있는가 | PLAN "승인 필요 지점", P2e Gate 4 | **불일치 R-2** |
| E-10 | 알려진 한계가 DECISIONS와 맞고 Gate 4 항목이 빠지지 않았는가 | DECISIONS Q-12·Q-20~23·Q-24·Q-25·Q-27, PC-6·9·14·15 | **불일치 R-3** (적힌 항목은 모두 DECISIONS와 맞지만 빠진 항목이 있음) |
| E-11 | N-01 체크리스트 내용이 코드와 맞는가 | PRD N-01, S-24, 4.4 | **불일치 R-4** (결론 "0건"은 맞음, 알림 템플릿 열거가 덜 됨) |
| E-12 | README의 나머지 절이 현재 기준과 어긋나지 않는가 | STANDARD 2.3(v2.4 SC-11), 4.2 | **불일치 R-5** |
| E-13 | 새 E2E `integration.spec.ts`·`mobile-375.spec.ts` 위치·이름 | 4.10 `tests/e2e/{기능}.spec.ts` | 일치 |
| E-14 | `tests/unit/lib/auditCoverage.test.ts` 위치·이름·태그 | 4.10 P-3 교차 테스트, G-2(PLAN의 `tests/unit/audit-coverage.test.ts`보다 4.10 우선) | 일치 (태그 N-05 — v2.22에서 N-xx를 PRD 태그로 명시) |
| E-15 | `tests/e2e/support/integrationDb.ts` 위치·이름 | 4.10 v2.5 | 일치 (4.2 트리 기재는 v2.22에서 보완) |
| E-16 | 통합 테스트 이름에 `WO15-11`·`R-217` 태그, PLAN 작업 1의 7단계가 다 있는가 | 4.10, S-51, R-217 | 일치 (간편 등록 → 위저드 → 2FA 직원 A 승격 → 검증·계약 기업 후보 → 면접 요청 → 추천 → 원장 1행·RECOMMENDATION_CREATE) |
| E-17 | 단위 테스트 추가분(`console.test`, `notifications/index.test`, `config/flags.test`)이 미러 위치에 있는가 | 4.10 | 일치 |
| E-18 | 선행 A: `rule-forms.tsx` `withCurrentOption` 표시 문구 | 3.5, 3.2 관리자 예외(S-16), 1.1 | 일치 ("비자"·"업종" 용어, 관리자 화면이라 코드 표시 허용, 기존 관리자 문구 "선택하세요"와 같은 어조, 클래스 변경 없음) |
| E-19 | 선행 A: `maskLink` 문장 안 링크 마스킹 | 4.7 v2.21(링크는 `NODE_ENV`와 무관하게 항상 가림) | 일치 (가리는 범위가 넓어진 것이라 기준과 충돌 없음. 문구는 v2.22에 반영) |
| E-20 | 선행 A: `console.warn` 사용(`statusCheck.ts:229`, `smtp.ts:104-107`, `scripts/worker.ts:13-15`) | 4.7 v2.21 기본 로거, 5절 로그 형식, S-45 | 일치 (JSON 한 줄, `level: "warn"`, `status_check.simulated` 등 event 표기 맞음, PII 없음. 문구는 v2.22에 반영) |
| E-21 | S-45: diff 범위 안 `src/` `console.*`에 PII·토큰이 없는가 | S-45 | 일치 |

### 판정하지 않은 항목
- 4.2 트리 반영: 산출물 문제가 아니라 기준에 빠진 내용이라 v2.22에서 보완했다(아래).
- Q-28(v2.22 2.7 Reveal 계약 6항, S-62): 이번 검토 중 새로 생긴 규칙이다. 현재 `src/components/home/hero.tsx:76`(H1)과 `:85`(리드 `<p>`)에 `reveal`이 붙어 있으므로 P2e run 2 구현 후 판정한다.

## 불일치 목록 (수정 지시)

**R-1 README 환경 변수 표에 빠진 이름** — `README.md:118-127`
- 기준: 코드가 읽는 이름을 모두 적은 목록일 것(PLAN P2e README 정리, 환경 변수 "이름만").
- 실제: 운영 변수 `PRIVATE_STORAGE_DIR`(`src/lib/files/storage.ts:33`, 비공개 업로드 경로 R-210)가 없다. 테스트 서버 주소를 덮어쓰는 `E2E_DEMAND_URL`·`E2E_JOBS_PORT`·`E2E_CANDIDATES_PORT`(`tests/e2e/support/messages.ts:30`, `jobsDb.ts:18`, `candidatesDb.ts:27`)도 없다. 증거 스크린샷 변수 `P*_SHOTS`는 QA 전용이라 빼도 된다.
- 지시: 저장소 행 또는 보안 행에 `PRIVATE_STORAGE_DIR`를 넣는다. 테스트·측정 행에 E2E 덮어쓰기 변수 3개를 넣는다.

**R-2 사람 승인 사항 표시가 덜 됨** — `README.md:129-169`
- 기준: PLAN "승인 필요 지점" A-3·A-5·A-6·A-7·A-8 중 출시와 관련된 항목.
- 실제: A-5(플래그, `:132`)와 A-6(규칙 게시, `:165`)만 승인 지점으로 표시되어 있다. A-7(약관·번역 확정)은 내용만 있고(`:169`) 승인 지점이라는 표시가 없다. A-3(실제 SMTP·SMS 자격 증명과 첫 외부 발송)과 A-8(실서버 배포·도메인·운영 DB 서울 리전)은 적혀 있지 않다.
- 지시: "사람 승인 필요(Gate 4 이후)" 소절이나 표를 두고 A-3·A-5·A-6·A-7·A-8을 한 줄씩 적는다. 각 줄에는 담당(운영자·행정사·법무)과 해당 위치를 붙인다.

**R-3 알려진 한계에서 DECISIONS의 Gate 4 법무 확인 항목이 빠짐** — `README.md:162-169`
- 기준: DECISIONS Q-12 ③("구인 의뢰 담당자 개인정보 수집 동의 체크박스 여부는 Gate 4 법무 확인 목록")과 Q-25("Gate 4 법무 확인 목록에 동의 기간 해석 포함").
- 실제: 두 항목이 없다. 적힌 항목(Q-20~23, PC-6, Q-24, Q-12 ② KSIC null, Q-27, PC-9·14·15, 약관 초안)은 모두 DECISIONS와 맞는다.
- 지시: 법무 확인 항목 2개를 넣는다. STATE.md에 Gate 4 보고로 적힌 항목도 같은 절에 모으기를 권한다. 대상은 THIRD_PARTY_INTERVIEW 동의서 수령자 미기재, OTP 5회 오류 번호 잠금(P1c O-7), `/admin` 리디렉트·`TRUST_PROXY`·`SITE_URL` 배포 전 확인(O-9), MAJOR_FIELDS 운영자 검토(이미 있음), Q-17 ① 중복 Company 병합이다.

**R-4 N-01 "이메일 전달" 행의 알림 열거가 덜 됨** — `README.md:158`
- 기준: 체크리스트 내용이 코드와 같을 것(PRD N-01 QA 코드 리뷰).
- 실제: 운영자 → 구직자 템플릿을 "상태 확인·체류 만료·면접 동의 요청"으로만 적었다. 코드에는 OTP(`common.otp.sms`, `src/lib/otp.ts:164`)와 프로필 완성 안내(`common.profileCompletion.sms`, `src/lib/seeker/tasks.ts:20,91`)도 있다. 결론("구직자·기업 사이 중계 없음")은 맞다.
- 지시: 열거에 "OTP·프로필 완성 안내"를 더한다.

**R-5 README 글꼴 절이 SC-11 이전 내용** — `README.md:93-98`(그리고 `:74` 디렉터리 요약)
- 기준: STANDARD 2.3·S-03·S-04(v2.4, SC-11): ko 1순위는 Noto Sans KR(`next/font/google`)이다. Pretendard 파일은 쓰지 않고 보관만 하며 import는 금지다. 실제 `src/lib/fonts.ts:1,12`도 Noto Sans KR이다.
- 실제: "Pretendard 1.3.9 — `next/font/local` …", "로케일별 1순위: ko=Pretendard"라고 적혀 있다.
- 지시: 글꼴 절을 Noto Sans KR(ko), Inter, Noto Sans SC(zh만, `fontsZh.ts`)로 고치고 Pretendard는 "미사용 보관(SC-11)"으로 적는다. 디렉터리 요약 `:74` scripts 줄에 `worker.ts`, `build-terms-pdf.ts`, `lighthouse.ts`를 더하고 `:78` i18n 줄에 `dateTime.ts`를 더한다(요약이지만 현재 파일과 맞춘다).

## 기준 개정 v2.22 (이번 검토에서 반영)
1. **2.7 Reveal 계약 6항(Q-28)**: 메인 히어로 H1·리드 문단은 reveal 진입 애니메이션에서 뺀다. `reveal`·`--reveal-y`·`transitionDelay`를 붙이지 않고, `js-reveal`이 붙은 뒤에도 `transform: none`이다. 히어로의 다른 요소와 다른 섹션의 reveal은 유지한다. **S-62** 확인 방법에 같은 조건을 넣었다.
2. **4.7**: `maskLink`는 문장 안의 링크도 가린다(dca582b의 기준화). 기본 로거는 `level`에 맞춰 `console.info`/`console.warn`으로 보낼 수 있다.
3. **4.10**: 비기능 묶음 테스트는 `N-xx`를 PRD 태그로 쓴다.
4. **4.2 트리**: `scripts/lighthouse.ts`, `src/i18n/(navigation.ts, locales.ts)`, `tests/e2e/support/integrationDb`를 넣었다.
- 산출물 영향: 1번만 해당한다(`hero.tsx` H1·리드, P2e run 2). 2~4번은 판정에 영향이 없다.
