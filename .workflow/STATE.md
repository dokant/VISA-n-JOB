# STATE — 진행 상태

- 프로젝트: 비자앤잡(Visa&Job) 홈페이지
- 유형: 소프트웨어(웹) — 기준: 디자인 시스템·아키텍처 / 검증: 실행·테스트·화면 확인
- 현재 단계: 완료 (Gate 4 승인 2026-11-18). push·배포·외부 발송 등 A-3~A-8은 별도 승인 대기
- 다음에 할 일: P1c wf-builder(선행: P1b 경미 수정·보안 보강) → 기준 검토·QA. P1d 선행: pii-guard 개선 P-1~P-5
- 대기 중인 결정: 없음

## 관문
| Gate | 내용 | 승인 | 일자 |
|---|---|---|---|
| 1 | start.md | ☑ | 2026-11-15 |
| 2 | PRD | ☑ | 2026-11-15 |
| 3 | 기준·계획 | ☑ | 2026-11-16 |
| 4 | 완료·출시 | ☑ | 2026-11-18 |

## Phase 진행
| Phase | 상태(대기/진행/통과/중단) | run 횟수(최대 3) | 통과/전체 | 최근 보고서 |
|---|---|---|---|---|
| P0a | 통과(S-11 경미 1건은 P0b 선행 커밋으로 수정·재확인) | 2 | QA 8/8, 기준 14/15 | qa/phase-P0a-run-2.md, qa/phase-P0a-standard-run-2.md |
| P0b | 통과(시군구 코드 형식 1건은 P0c 선행 커밋으로 수정·재확인) | 1 | QA 4/4(+회귀 8/8), 기준 13/14 | qa/phase-P0b-run-1.md, qa/phase-P0b-standard-run-1.md |
| P0c | 통과(테스트 파일명 1건은 P1a 선행 커밋으로) | 1 | QA 15/15, 기준 17/18 | qa/phase-P0c-run-1.md, qa/phase-P0c-standard-run-1.md |
| P1a | 통과 | 2 | QA 13/13, 기준 재검토 4/4 해소 | qa/phase-P1a-run-1.md, qa/phase-P1a-standard-run-2.md |
| P1b | 통과(기준 경미 2건+보안 보강은 P1c 선행 커밋으로, P1c QA에서 재확인) | 1 | QA 9/9, 기준 49/51 | qa/phase-P1b-run-1.md, qa/phase-P1b-standard-run-1.md |
| P1c | 통과 | 3 | QA 14/14, 기준 68/68 | qa/phase-P1c-run-3.md, qa/phase-P1c-standard-run-3.md |
| P1d | 통과 | 3 | QA 14/14, 기준 44/44 | qa/phase-P1d-run-3.md, qa/phase-P1d-standard-run-2.md |
| P1e | 통과 | 3 | QA 20/20(판정불가 1: INVALID_TRANSITION 방어 코드, 단위 테스트로 확인), 기준 60/60 | qa/phase-P1e-run-3.md, qa/phase-P1e-standard-run-3.md |
| P2a | 통과(Q-23 사람 결정: D-10·D-11 알려진 한계) | 8 | QA 25/27, 기준 32/35 | qa/phase-P2a-run-1.md, qa/phase-P2a-standard-run-1.md |
| P2b | 통과 | 2 | QA 24/24, 기준 35/35 | qa/phase-P2b-run-2.md, qa/phase-P2b-standard-run-2.md |
| P2c | 통과 | 3 | QA 20/20, 기준 50/50 | qa/phase-P2c-run-3.md, qa/phase-P2c-standard-run-3.md |
| P2d | 통과 | 2 | QA 16/16, 기준 39/39 | qa/phase-P2d-run-2.md, qa/phase-P2d-standard-run-2.md |
| P2e | 통과 | 3 | QA 12/14, 기준 16/21 | qa/phase-P2e-run-1.md, qa/phase-P2e-standard-run-1.md |

## 통합 검증
- 필수 통과율: 63/63 (100%)
- 전체 통과율: 70/70 (100%) — qa/integration-run-2.md
- 판정: 출시 기준 5/5 충족(커밋 5e2ed93). Q-29 마무리 수정 후 Gate 4

## 기록
| 일시 | 사건 |
|---|---|
| 2026-11-15 | 0단계: 유형=소프트웨어(웹). 원천 문서 docs/WORK_ORDER.md. 폴더에 코드·git 없음. 환경: Node 24.15, pnpm·PostgreSQL·Docker 미설치 |
| 2026-11-15 | 1단계: start.md 작성, 핵심 결정 질문 → Q-01 Phase 0~2, Q-02 임베디드 Postgres, Q-03 제안 토큰 |
| 2026-11-15 | 2단계: PRD v1.0 작성 (필수 62, 선택 1, 비기능 6) |
| 2026-11-15 | Gate 1·2 승인. 3단계 시작 |
| 2026-11-16 | STANDARD(S-01~56)·PLAN(13 Phase) 작성. Gate 3 결정 27건(DECISIONS PC/SC) 승인, PRD v1.1(R-211 개정, R-218 신설). Gate 3 승인 → P0a 시작 |
| 2026-11-16 | P0a 빌더 중단 발견(커밋 없음). Q-05: 디자인 핸드오프를 STANDARD 기준으로 채택 → wf-standard 재작성 후 P0a 재개 |
| 2026-11-16 | P0a 빌더 run 1 완료: 검증 7종 통과, 커밋 9b0f28d. Q-06 사업자 정보(SITE_INFO.md) 기록. QA 실행, 토큰·사업자 정보 반영은 STANDARD v2 이후 |
| 2026-11-16 | P0a QA run 1: 6/6 Pass. STANDARD v2 후 토큰·폰트·사업자 정보 반영 run 예정 |
| 2026-11-16 | STANDARD v2(핸드오프 기준, S-01~72, K-01~20) 완성. Q-07 결정. P0a run 2(토큰·폰트·사업자 정보·브랜드) 시작 |
| 2026-11-16 | P0a run 2 완료(커밋 b192681, 검증 7종 통과). 기준 검토·QA run 2 실행 |
| 2026-11-16 | P0a run 2 QA 8/8, 기준 14/15(S-11 아이콘 strokeWidth 경미). STANDARD v2.1. P0a 통과 처리, P0b 시작 |
| 2026-11-16 | P0b run 1 구현 완료(커밋 361162e, 8c36dd3, 테스트 65건). 기준 검토·QA 실행 |
| 2026-11-16 | P0b QA 4/4, 기준 13/14(시군구 코드 형식). STANDARD v2.2. P0b 통과 처리, P0c 시작 |
| 2026-11-16 | P0c run 1 구현(커밋 1bbf269, 611260c, 테스트 118, 커버리지 4종 100%). test 종료 코드 결함(실패에도 0) 발견·수정 → QA 재검증 지시 |
| 2026-11-16 | P0c 기준 검토 17/18(테스트 파일명 enc-extension→db). STANDARD v2.3. 주의: 테스트 DB 클러스터(54329)를 쓰는 test 명령은 동시에 두 개 돌리지 말 것 |
| 2026-11-16 | P0c QA 15/15(종료 코드 수정 확인), 기준 17/18. WO Phase 0 완료. P1a 시작 |
| 2026-11-16 | Q-08: 개발 키 자동 생성, seeker:review → STAFF_VISA·ADMIN만(P1b 선행 수정), company:verify 유지 |
| 2026-11-16 | P1a run 1 구현(커밋 79339bc, 48a80fb). 테스트 166, e2e 132, Lighthouse /ko 86·접근성 100. SC-11 적용: 한국어 폰트 Noto Sans KR로 교체. 기준 검토(정적)·QA 실행 |
| 2026-11-16 | P1a 기준 검토 57/60(+3·4절 8/9). 불일치 4건(zh 폰트 스택, 푸터 언어 링크 터치 44px, score 키 영역, 푸터 열 경계). STANDARD v2.4. QA 대기 후 run 2 |
| 2026-11-16 | P1a QA run 1: 13/13 Pass(Lighthouse /ko 91·접근성 100). 기준 불일치 4건 + 관찰(about·fees 전문가 검토 표시, G-1 중복 표기, 서랍 겹침, e2e 간헐 타임아웃) → P1a run 2 수정 시작 |
| 2026-11-16 | P1a run 2(커밋 6ff9d15): 불일치 4건+관찰 수정, e2e 144/144×2, /ko 성능 86. 기준 재검토(커밋 기준)와 P1b 동시 시작. 포트 3300·3123의 잔여 next start 프로세스 종료는 권한 거부됨 → 사용자 안내 |
| 2026-11-16 | P1a 기준 재검토: 불일치 4/4 해소, 새 불일치 0 → P1a 통과 |
| 2026-11-16 | P1b run 1 구현(커밋 624001f Q-08, 615abef). 테스트 215, e2e 160. 기준 검토(정적)·QA 실행. 배포 전 확인 목록: SITE_URL, x-forwarded-for 프록시, trustHost |
| 2026-11-16 | P1b 기준 검토 48/51. 불일치: select(→Q-09로 기준 개정), OTP 길이 숫자 중복, 관리자 (필수) 표시. STANDARD v2.5 |
| 2026-11-16 | P1b QA 9/9(기준 외 O-1~O-8). P1b 통과 처리, P1c 시작(선행: OTP 길이 인자화, 관리자 (필수), TOTP 재사용 차단, 로그인 한도 잠금 남용 완화, 사업자번호 체크섬, 프록시 IP 설정화) |
| 2026-11-16 | P1c run 1 구현(커밋 1e99955 선행 A, b3933a1 본 작업). 테스트 289, e2e 186, 트랙 분류 22건. 마이그레이션 totp_last_step, seeker_wizard. 기준 검토(정적)·QA 실행. 배포 전 확인 목록 추가: TRUST_PROXY |
| 2026-11-16 | P1c 기준 검토 57/68, 수정 지시 12건(BR 위반 0). Q-10 결정, STANDARD v2.7(B-1~B-12, --blur-nav 토큰). QA 결과 대기 후 run 2 |
| 2026-11-16 | P1c QA 13/13(P1b 재확인 5/6, D-1 잠금 남용 잔존). Q-11 결정. P1c run 2(기준 12건 + D-1 + O-1) 시작 |
| 2026-11-16 | P1c run 2(커밋 2a875f1, b5924a5, 마이그레이션 pending_application_unknown_visa_status_code). 테스트 296, e2e 186. IP 미상 시 계정 상한(50/15분)만 적용 — 오케스트레이터 수용. P1d 선행 후보: /visa-check 코드 노출(B-3), 등록 불가 비자 선택 시 "저장 중…" 표시. 재검토·재확인 실행 |
| 2026-11-16 | P1c 기준 재검토 run 2: 10/12 해소, 일부 2(#1 slide-in 4.5 미생성, #6 체크박스 포커스), 새 1(N-1 /visa-check 코드 노출). QA run 2 대기 |
| 2026-11-16 | P1c QA run 2: 11/12(D-2 sticky 바가 Tab 포커스 가림), D-1·O-1 해소, P1b 6/6. O-7(OTP 5회 오류 시 번호 잠금)은 R-104 규정이라 유지·Gate 4 보고. O-9(/admin 리디렉트 localhost)는 배포 전 확인 목록에 추가. P1c run 3(최종) 시작: R2-1~3, D-2, O-8(KST 월 경계), "저장 중…" |
| 2026-11-16 | P1c run 3(커밋 601992f). 테스트 297, e2e 194. 새 토큰 --translate-dialog, --spacing-wizard-bar. 최종 재검토·재확인 실행 |
| 2026-11-16 | P1c 기준 재검토 run 3: 3/3 해소, 새 불일치 0, 전체 68/68. STANDARD v2.8. QA run 3 대기 |
| 2026-11-16 | P1c QA run 3: 14/14, 결함 0. P1c 통과. Gate 4 보고 대상: O-7(OTP 5회 오류 번호 잠금, R-104 규정), O-9(/admin 리디렉트 localhost), TRUST_PROXY·SITE_URL. P1d 시작 |
| 2026-11-16 | P1d run 1(커밋 c2bb5d8 pii-guard, 032f363). 테스트 355, e2e 202. 마이그레이션 job_lead_diagnosis_nullable. Q-12 결정(수요 지도 출처 한정, KSIC 중분류 null, 담당자 수집 고지 검토 표시). 기준 검토·QA 실행 |
| 2026-11-16 | P1d 기준 검토 40/44(N-1 고지 검토 표시, N-2 접수 패널 판정색, N-3 수요 지도 출처, N-4 키 길이 상수). STANDARD v2.9(P-1~P-6) 반영 지시. QA 대기 |
| 2026-11-16 | Q-13(용어 규칙 법적 문서 예외), 기준 수정 지시 N-1~N-6. P1d QA run 1: 23/23, 결함 0. 관찰 O-1(수집 title·companyName 연락처 평문, rawJson 숫자값), O-2(재수집 시 빠진 필드 null 덮어쓰기) → run 2 포함. P1d run 2 시작 |
| 2026-11-16 | P1d run 2(커밋 ef7ea14). 테스트 359, e2e 202(위저드 URL 전이 5초 대기 간헐 실패 — P1e 선행에서 안정화). 재검토·재확인 실행 |
| 2026-11-16 | P1d 기준 재검토 run 2: 6/6 해소, 새 불일치 0, 전체 44/44. QA run 2 대기 |
| 2026-11-16 | P1d QA run 2: 21/22. D-1 `pnpm test` 간헐 실패(16회 중 6회, ledger-trigger 테스트의 TRUNCATE 교착). 필수 실패 0. P1d run 3(최종): 테스트 교착 제거, 위저드 e2e 간헐 대기, rawJson 과잉 가림(O-6) 완화 |
| 2026-11-16 | P1d run 3(커밋 dc04584): ledger TRUNCATE lock_timeout 재시도, 위저드 e2e hydration 대기, rawJson 키 판정 개선. test 13회 연속 통과, wizard-resume ×5 30/30, e2e 202. UI 변경 없어 기준 재검토 생략, QA run 3 실행 |
| 2026-11-16 | P1d QA run 3: 14/14, test 12회 연속 통과, 트리거 끈 DB에서 ledger 테스트 실패 확인(검증력 유지). P1d 통과. 관찰 O-9(사업 숫자 키의 숫자형 전화번호 유지)·O-10(플래그 키 메신저 ID)은 직원 전용 rawJson이라 수용, Gate 4 보고. P1e 시작 |
| 2026-11-16 | P1e run 1(커밋 4beeb9f). 테스트 386, e2e 206. 스키마 변경 없음, AUDIT_ACTIONS에 SEEKER_REVIEW_UPDATE. Q-14(NO_INTENT → DO_NOT_CONTACT, WO §8.2대로) run 2 대상. 기준 검토·QA 실행 |
| 2026-11-16 | P1e 기준 검토 35/41(E-1 원화 포맷, E-2 칸반 "리드 등급" 구분, E-3 Q-14). 터치 영역은 CLAUDE.md 44px 우선으로 STANDARD v2.10 개정 지시(sm 버튼 lg:h-10.5 → 44px, E-4). QA 대기 |
| 2026-11-16 | STANDARD v2.10, Q-15(터치 44px 전면, 푸터 텍스트 링크 포함). 기준 최종 37/42, 수정 E-1~E-5. P1e QA run 1: 21/21, 결함 0. P1e run 2: E-1~E-5 + 푸터 링크 + 권한 거부 응답 정리(O-3) + wizard-focus e2e 간헐(O-4) |
| 2026-11-17 | P1e run 2(커밋 e52a176, 빌더 1회 정지 후 재개). 테스트 390, e2e 208, wizard-focus+admin-core ×5 70/70. adminAction 래퍼 도입(4.5 형태 확인 필요). 재검토·재확인 실행 |
| 2026-11-17 | P1e 기준 재검토 run 2: 5/5 해소, 전체 50/51(F-1 테스트 파일 위치 경미). adminAction 래퍼 4.5 부합. STANDARD v2.11(H-1, H-3) 반영 지시. QA 대기 |
| 2026-11-17 | P1e QA run 2: 19/21, 필수 1 Fail(D-1 ARCHIVED 리드 NO_INTENT/DNC 저장 500), D-2 대시보드 링크 22px. Q-16 결정. P1e run 3(최종): D-1, D-2, 헤더 링크 폭 44, F-1 테스트 위치 |
| 2026-11-17 | P1e run 3(커밋 7380403). 테스트 396, e2e 210. ARCHIVED→DNC 허용, INVALID_TRANSITION 응답, 폭 44 정리(공개 14·관리자 5화면 실측 미달 0). 최종 재검토·재확인 실행 |
| 2026-11-17 | P1e 기준 재검토 run 3: F-1 해소, 새 불일치 0, 전체 60/60. STANDARD v2.12(3.3 폭 포함 명시). QA run 3 대기 |
| 2026-11-17 | P1e QA run 3: 20/20, 결함 0. P1e 통과 → WO Phase 1 완료. P2a 시작 |
| 2026-11-17 | P2a run 1(커밋 463c75e). 테스트 423, e2e 222(플래그 on 서버 추가). 마이그레이션 posting_publish_check(CHECK 제약). Q-17 결정. 관찰: vi 1280 푸터 등록 정보 열 세로 줄바꿈(기존). 기준 검토·QA 실행 |
| 2026-11-17 | P2a 기준 검토 32/35(F-1 관리자 배지 아이콘, F-2 option. 키, F-3 푸터 등록 정보 열). STANDARD v2.13(publicPosting.ts 정정, 트리, 4.5 try 블록 보충 — 수용). QA 대기 |
| 2026-11-17 | P2a QA run 1: 25/27(PRD 기준 실패 0). D-1 pii-guard 보이지 않는 문자·_~* 구분자 우회, D-2 회사명 /_·보이지 않는 문자 우회. P2a run 2: F-1~F-3 + D-1·D-2 + O-2 + 부적합 상태 안내 문구 |
| 2026-11-17 | P2a run 2(커밋 6886cb8). pii-guard 정규화(Cf 제거·NFKC·원문 위치 매핑), SEP 확장, 회사명 정규화. 테스트 427, e2e 226. 남은 관찰: 회사명 inc/corp 제거가 단어 내부(Incheon)도 지움, 분해 자모 한글 숫자. 재검토·재확인 실행 |
| 2026-11-17 | P2a 기준 재검토 run 2: 3/3 해소, 새 불일치 0, 전체 35/35. STANDARD v2.14. QA 대기 |
| 2026-11-17 | P2a QA run 2: 17/18, D-1·D-2 해소, D-3 구분자 ㅡ·•·・·●·→·keycap 숫자 우회. P2a run 3(최종): 구분자 열거 대신 범주 기반, 유니코드 숫자(Nd)·한자 숫자 정규화, 자모 NFC 결합, 법인 표기 단어 경계(O-2) |
| 2026-11-17 | P2a run 3(커밋 be06e4e): 범주 기반 SEP, Nd·한자 숫자·자모 결합·keycap, 라틴 법인 표기 단어 경계. 테스트 440. e2e 224/226 — admin-core B 전이가 개발 DB 누적(B 리드 162건)으로 칸반 상위 50 밖. DB 삭제 대신 E2E를 상한 비의존으로 수정 지시(같은 run 마무리). Gate 4 항목: 개발 DB 초기화 여부 |
| 2026-11-17 | P2a run 3 마무리(커밋 ccf0e6e): admin-core E2E를 상세·DB 확인으로 변경. e2e 226/226, admin-core ×3 24/24. UI 변경 없어 기준 재검토 생략, QA run 3 실행 |
| 2026-11-17 | P2b run 1(커밋 7e18f8d 선행, 421f244, f29d7e1 PDF). 테스트 65 files, e2e 244. 스키마 변경 없음, 테스트용 SAMPLE 구직자 7명 시드(테스트 DB). Q-24 majorField 코드 목록 → run 2. 저장소 typecheck는 사용자 .next/types의 옛 경로 때문에 실패(작업 트리 0). 기준 검토·QA 실행 |
| 2026-11-17 | P2b 기준 검토 30/35(F-1 체류 구간 WO 3구간으로, F-2 폼 간격, F-3 미등록 전환 비자 원문 코드 노출, F-4 통계 등급 GradeBadge, F-5 관리자 "개" 단위). blindSeeker 우회 0. STANDARD v2.15. 관찰: 통계 합계에서 가린 칸 역산 가능 → run 2에서 마스킹 칸이 포함된 합계 숨김. QA 대기 |
| 2026-11-17 | P2b QA run 1: 28/28, 결함 0(개발 DB 구직자 2,100명 직렬화 키 확인, PDF 6개 텍스트 확인). P2b run 2: F-1~F-5 + Q-24 전공 분야 + 통계 합계 역산 차단 |
| 2026-11-17 | P2b run 2(커밋 2644efa): 체류 3구간, 폼 간격, 미등록 전환 비자 null, 통계 GradeBadge, 마스킹 칸 있으면 합계 숨김(+ 사유·정렬 누출 2건 추가 차단), 전공 분야 ISCED-F 대분류 코드(운영자 검토 대기, 마이그레이션 seeker_major_field). 테스트 521, e2e 244. 관찰: 수요 지도 집계도 같은 역산 가능성. 재검토·재확인 실행 |
| 2026-11-17 | P2b 기준 재검토 run 2: 5/5 해소, 새 불일치 0, 35/35. STANDARD v2.16. Gate 4 항목: MAJOR_FIELDS 운영자 검토. QA 대기 |
| 2026-11-17 | P2b QA run 2: 24/24, 결함 0(통계·수요 지도 역산 불가 확인). P2b 통과. P2c 선행: API convertibleVisa 미등록 코드 null(O-5), 테스트 R 태그(R-205) 보강. P2c 시작 |
| 2026-11-18 | P2c run 1(커밋 3a3488f 선행, c5921f5, 7cc2a99). 테스트 552, e2e 수정 전 258/260(테스트 기대값 문제, 수정 후 P2c 스펙만 16/16). 마이그레이션 p2c_matching. 실명 경로 interviewDisclosure.ts 단일화. 오케스트레이터 수용: /me/recommended 본인 추천은 플래그 무관, /employer/requests 플래그 미적용, CONSENT_GRANT 신설 안 함. Gate 4 법무: THIRD_PARTY_INTERVIEW 동의서 수령자 미기재(BR-03). 기준 검토·QA 실행 |
| 2026-11-18 | P2c 기준 검토 33/36(D-1 관리자 폼 간격, D-2 구직자 화면 "블라인드 공고" 용어, D-3 하드코딩 구분자). 블라인드·연락처·원장·권한 결함 0. STANDARD v2.17(interviewDisclosure 두 번째 직렬화기 명시). run 2 후보: schema 주석 경로, 업로드 상한 값 연동, 면접 취소 확인 다이얼로그. QA 대기 |
| 2026-11-18 | P2c QA run 1: 32/32, 결함 0, E2E 전체 260/260. Q-25(결과 기록·취소 시 실명 제공 종료). P2c run 2: D-1~D-3, 6MB 초과 500(O-2), 세션 없는 동의 액션 500(O-5), 매칭 대기 목록 100건 상한(O-4), 면접 취소 확인, 주석·상한 연동 |
| 2026-11-18 | P2c run 2(커밋 04a4fbf, 94d62ed). 테스트 559, e2e 262/262(1차 auth.spec mobile 1건 간헐). 실명 종료 = HIRED·REJECTED·NO_SHOW 또는 확정 후 취소. 간헐 실패 관찰: 단위 테스트 첫 실행 3건, auth.spec:48 mobile. 재검토·재확인 실행 |
| 2026-11-18 | P2c 기준 재검토 run 2: 3/3 해소, 새 D-4(ko "실명" → "이름" 한 줄), 42/43. STANDARD v2.18. QA 대기 |
| 2026-11-18 | P2c QA run 2: 18/21. 결함 F-1(심각): 감사 meta의 내부 id(cuid)에 "fb+숫자"가 있으면 pii-guard가 메신저 ID로 오판해 추천 실행·동의 철회가 500(철회 실패 시 실명 계속 노출), pnpm test 간헐 실패의 원인. P2c run 3(최종): F-1 + D-4 + 종료된 면접 표시(구직자·기업) + 다이얼로그 X 44px + 위저드 UNAUTHENTICATED 문구 + ko 시간 "PM" |
| 2026-11-18 | P2c run 3(커밋 3603090, 6af69eb): 감사 meta 식별자 키+형식 일치 시만 연락처 검사 생략, 종료 면접 표시, X 48px, 재로그인 안내, 테스트 간헐 원인 2건(diagnosis 전역 개수, fixture tag) 수정. test 5회 연속 통과(564), e2e 262. ko "PM"은 환경 ICU → Q-26(ko 24시간제, P2d 선행). 최종 재검토·재확인 실행 |
| 2026-11-18 | P2c 기준 재검토 run 3: 50/50, 새 불일치 0. STANDARD v2.19(감사 meta 식별자 면제 규칙, dialog X 48px, ko 24시간제). P2d 선행 후보: 종료 면접 동의 액션 서버 차단(O-1), ID_META_KEY에서 messengerId 제외(O-2). QA 대기 |
| 2026-11-18 | P2c QA run 3: 20/20, F-1 해소, test 5회 연속 통과, e2e 262. P2c 통과. P2d 선행: Q-26 ko 24시간제, 종료 면접 동의 서버 차단, messengerId 키, 확인 다이얼로그 내 오류 표시, 후보 필터 visa 이상값 500, 면접 폼 입력 유지, 매칭 적합 목록 건수 표시. P2d 시작 |
| 2026-11-19 | P2d run 1(커밋 dc12a09 선행, bdc5f07, 5591566, 6e93c40, 80a647e). 테스트 602 ×3, e2e 270. 마이그레이션 p2d_rule_versions. 패키지 추가 없음(nodemailer 기존). 오케스트레이터 수용: 폐기는 RULE_PUBLISH meta.change, 초안 감사 없음. Gate 4: 실제 SMTP(A-3), 실제 규칙 문구 키(A-7). 기준 검토·QA 실행 |
| 2026-11-19 | P2d 기준 검토 26/28(D-1 합격 점수 숫자 포맷, D-2 lib 안 관리자 한국어 문구). STANDARD v2.20. QA 대기 |
| 2026-11-19 | P2d QA run 1: 24/24, 결함 0. 관찰 O-1(콘솔 전달을 성공으로 봐 운영 시 전원 비활성화 위험) → Q-27. P2d run 2: D-1, D-2, Q-27, 콘솔 토큰 URL 마스킹, 샘플 규칙 게시 버튼 숨김 |
| 2026-11-19 | P2d run 2(커밋 cc82f00, 71865f3): 전달 결과 REAL/SIMULATED/FAILED, 실제 채널 전달 확인만 14일 전이, 마이그레이션 p2d_status_check_delivery. 테스트 611(4회 중 1회 auth route 간헐), e2e 272. 재검토·재확인 실행 |
| 2026-11-19 | P2d 기준 재검토 run 2: 2/2 해소, 새 불일치 0, 39/39. STANDARD v2.21(Q-27 규칙, "점" 단위). Gate 4 항목: SMS 실제 채널 없음 → 이메일 없는 구직자는 자동 비활성화 대상 아님. QA 대기 |
| 2026-11-19 | P2d QA run 2: 16/16, 결함 0, test 5회 연속 통과. P2d 통과. P2e 시작(선행: 샘플 규칙 편집 폼 비자 값, maskLink 문장 내 링크, warn 로그 레벨). db:reset 클린 실행은 개발 DB가 아닌 별도 임시 DB에서 |
| 2026-11-19 | P2e run 1(커밋 dca582b 선행, f24b425, 2e26899). 임시 DB(54329) 클린 실행: db:reset·lint·test:coverage 620·i18n·qa:static·build·e2e 286 통과, lighthouse /ko 성능 82~83 미달(LCP 히어로 리드 reveal) → Q-28. README에 WO §15 매핑·알려진 한계. 기준 검토·QA 실행 |
| 2026-11-19 | P2e 기준 검토 16/21(R-1~R-5 모두 README: 환경 변수 누락, 사람 승인 목록, 법무 확인 2건, 알림 열거, 글꼴 표기). 코드·테스트 일치. STANDARD v2.22(Q-28 히어로 H1·리드 reveal 제외). QA 대기 |
| 2026-11-18 | P2e QA run 1: 12/14(필수 실패 0). D-1 SMTP 실패 warn이 실제 경로에서 console.info, D-2 375px en·vi·uz 홈 대상 탭 3번째가 잘림(overflow-x clip이 가림), D-3 mobile-375 스펙이 clip 때문에 넘침 못 잡음. Lighthouse /ko 84(80~86). P2e run 2: README R-1~R-5 + Q-28 + D-1~D-3 + lighthouse 스크립트 오류 출력 |
| 2026-11-18 | P2e run 2(커밋 dc4cf0f, c28b8de). Lighthouse /ko 88·93·95(중앙 93), 접근성 100. 탭 줄바꿈, 넘침 검사 강화(수정 전 코드에서 4건 실패 대조 확인), ru 등록 완료 버튼 넘침 추가 수정. test 622 ×3, e2e 288(10 skipped). 재검토·재확인 실행 |
| 2026-11-18 | P2e 기준 재검토 run 2: 5/5 해소, Q-28 일치, 새 R2-1(375 탭 라벨이 en·uz에서 단어 중간 분리), 38/39. STANDARD v2.23. QA 대기 후 run 3 |
| 2026-11-18 | P2e QA run 2: 20/21(95.2%), 필수 4/4, 결함 0, 판정불가 1(lighthouse 실패 출력). 임시 DB 클린 실행 전 명령 통과, e2e 288, /ko 중앙 88. 관찰: ru /employer/contract 375 넘침 26px, 기업 가입 수집 고지 없음(법무 목록 누락), 없는 CHROME_PATH 시 다른 브라우저로 측정. P2e run 3(최종): R2-1 탭 단어 분리 + 기업 화면 375 넘침·스펙 확장 + README 법무 목록 + lighthouse CHROME_PATH 검증 |
| 2026-11-18 | P2e run 3(커밋 51e0dfb): 탭 wrap-normal, ru 계약 버튼 줄바꿈, 375 검사 기업 화면 확장·clip 해제 측정(수정 전 2건 실패 대조), README, CHROME_PATH 검증. test 622 ×3, e2e 295, /ko 중앙 86. 최종 기준 재검토 + 5단계 통합 QA(P2e run 3 재확인 포함) 실행 |
| 2026-11-18 | 세션 종료로 두 에이전트 중단(산출물 없음) → 재개. P2e 기준 재검토 run 3: R2-1 해소, 새 불일치 0, P2e 51/51. 프로젝트 전체 기준 549/549. STANDARD v2.24. 통합 QA 진행 중 |
| 2026-11-18 | P2e QA run 3: 8/8. P2e 통과. 5단계 통합 QA run 1: 필수 63/63, 전체 70/70, BR 위반 0, WO §15 11/11, 플래그 false. 출시 명령 중 test:e2e 1회차 실패 → 결함 I-1(관리자 로그아웃 후 늦은 프리페치 응답이 세션 쿠키 재설정 + JWT 서버 무효화 없음, 로그아웃 토큰 재사용 가능). Lighthouse /ko 9회 중앙 86(경계, 위험 R-1). I-1 수정 후 재확인 |
| 2026-11-18 | I-1 수정(커밋 5e2ed93): User.sessionVersion + JWT sv 검사, 로그아웃 시 증가(전 기기), 미들웨어는 읽기 전용(쿠키 재설정 없음). 수정 전 새 E2E 4건 실패 대조. test 633 ×3, e2e 303/303, auth.spec:48 ×20 통과, 프리페치 동시 로그아웃 100라운드 재발 0. 마이그레이션 i1_session_version(개발 DB 적용 후 다시 끔). 통합 QA run 2 + 기준 반영 실행 |
| 2026-11-18 | I-1 기준 검토 12/14(D-1 테스트 태그, D-2 구직자·기업 절대 만료 미검사). STANDARD v2.25(4.11 세션·로그아웃 보안 신설). Q-29. 통합 QA run 2 대기 |
| 2026-11-18 | 통합 QA run 2: 필수 63/63, 전체 70/70, Fail 0, 판정불가 0, I-1 독립 시험 7종 통과(경합 50라운드 부활 0). 클린 실행 전 명령 통과, e2e 303 ×2 연속, Lighthouse /ko 중앙 87. 출시 기준 5/5. Q-29 D-1·D-2 마무리 수정 후 Gate 4 |
| 2026-11-18 | Q-29 수정(커밋 204dc47, e644ba5): 모든 역할 절대 세션 수명(authTime+역할별 수명), 테스트 태그 R-118·R-104·R-123. 빌더 검증 test 637 ×3, 임시 DB e2e 311/311, 만료 검사 제거 시 새 E2E 4건 실패 대조. 별도 QA 재확인은 하지 않음. Gate 4 보고(.workflow/GATE4.md) |
| 2026-11-19 | 배포 준비(Q-30, 커밋 350f0f4): Dockerfile(app·worker·migrate·seed), deploy/docker-compose.yml·Caddyfile(스테이징 basic_auth·noindex), .env.production.example, scripts/gen-secrets.ts, /api/health, O-9 공개 주소 리디렉트, deploy/DEPLOY.md. test 653, Docker 없음으로 이미지 빌드 미검증. 의존성 분류 변경(prisma·tsx·typescript → dependencies, embedded-postgres → dev). AWS 계정이 시드니 리전만 허용 → 고급 기능 활성화 여부 사용자 결정 대기 |
| 2026-11-19 | A-8 일부(push) 사람 승인: 대표 휴대전화 번호를 파일·전체 커밋 기록에서 제거(filter-branch, gc, 전 객체 검색 0건), .workflow 최신본 커밋. 커밋 번호 전부 변경(예: e644ba5 → f6b7ddf, 최신 d2fc68d). 기존 저장소 dokant/visanjob-site는 운영 중인 정적 사이트라 push 보류 → 새 저장소 github.com/dokant/VISA-n-JOB main에 push 완료 |
| 2026-11-18 | Gate 4 사람 승인("출시 승인"). 판정 완료. push·실서버 배포·실제 발송·플래그 켜기·규칙 게시(A-3~A-8)는 각각 별도 승인 시 진행 |
| 2026-11-17 | Q-23: P2a 통과(남은 우회는 알려진 한계, Gate 4 보고). P2b 시작 |
| 2026-11-17 | P2a QA run 8: 18/19. D-8·D-9 해소, 회귀 0, Q-22 확인. 항목 15(새 우회 공략 30가지)에서 D-10(앞자리 덧붙인 번호 10가지)·D-11(+ 없는 외국 번호) — 모두 이전 판부터 있던 틈. 새 오탐 4건(교대 시간 0200-1000, 바코드 등). 사람 결정 요청 |
| 2026-11-17 | P2a run 8(커밋 8e5ab22, Q-22): 금액 범위 예외 제거, 포함 탐지(D-9: 01X·02·지역·070·050X), 겹침 마스킹 병합. 테스트 478, e2e 226. Q-22 수용 오탐 6(쉼표 없는 82만원대 범위 등). 새 오탐: 0으로 시작하는 번호꼴 코드. QA run 8 실행 |
| 2026-11-17 | P2a QA run 7: 15/16. D-7 해소, 회귀 0, Q-21 오탐 12개 거부·입력 유지, 쉼표 형태 저장. 새 D-8(높음, run 4부터): 금액 범위 예외로 `일당 +82 1012345678~950000원` 등 11가지 통과. D-9(중간, 원래부터): `010-1234-56780` 미탐. 관찰: 수집 API는 Q-21 오탐 문구를 가려 날짜가 깨짐. 사람 결정 요청 |
| 2026-11-17 | P2a run 7(커밋 809eca9): 시간·단위·목록번호 예외 제거, D-7 14가지 양성 고정, Q-21 수용 오탐 12개 고정. 테스트 470, e2e 226. 운영 메모: 날짜 옆 시간·인원은 쉼표·글로 구분 안내 필요. QA run 7 실행 |
| 2026-11-17 | P2a run 7 중간: 예외 제거로 고정 QA 목록 중 5문구(날짜 옆 시간·단위)가 거부 → 빌더가 멈추고 보고. Q-21 설명 범위(17:00·3명·2개월) 안의 같은 부류라 오케스트레이터가 수용 오탐 블록 이동(옵션 A) 지시 |
| 2026-11-17 | P2a QA run 6: 16/17. D-6·년월일·O-2 마스킹 해소, 회귀 0. 새 D-7(높음): 시간·단위(%)·목록번호()) 예외로 `문의 010%-1234%-5678% 2026.12.01` 등 14가지 완전한 번호 통과. 이 예외는 오케스트레이터 지시에서 나온 것(Q-20 범위 밖). 사람 결정 요청 |
| 2026-11-17 | P2a run 6(커밋 b411e19, Q-20): 날짜 예외를 "창 전체가 날짜일 때만"으로 단순화, 덧댄 예외 제거, 시간·단위·목록번호는 창에서 분리, 금액 범위 마스킹 범위 수정. 테스트 466, e2e 226(스크래치 작업 트리). QA run 5 복사본의 pnpm이 저장소 node_modules junction을 깨뜨린 것을 빌더가 경로만 복구(864 junction, .bin 150) → QA는 복사본에서 pnpm 금지. QA run 6 실행 |
| 2026-11-17 | P2a QA run 5: 13/14. D-5 해소(변형 28가지 포함), 회귀 0. 새 D-6: `0101234 2026.12.01`, `0101234-2026.12`, `021201 2026.12` 등 붙여 쓴 번호 미탐(09438f0부터). 관찰: 순번 02+날짜 오탐(영향 낮음), 년월일 위장 미탐(기존). 사람 결정 요청 |
| 2026-11-17 | P2a run 5(커밋 f9c5f00, Q-19): 전화 접두 묶음 + 날짜, 연도 흡수 금지. QA 목록 전체를 테스트로 고정. 테스트 457, e2e 226. build가 사용자 next dev(3000)의 .next를 덮어씀 → 재시작 필요 안내. QA run 5 실행 |
| 2026-11-17 | P2a run 4(커밋 09438f0, Q-18) 후 QA run 4: 11/12. D-4·O-1 해소, 새 회귀 D-5(`02 2026.12.01`, `010-1234-2026.12` 등 7가지 미탐, be06e4e는 검출). 관찰: 외부 next dev(3000)가 .next를 덮어씀, 미추적 .claude/ 생김. 사람 결정 요청 |
| 2026-11-17 | P2a QA run 3: 12/13. D-3·O-1·O-2 해소. 필수 1 Fail D-4: 날짜 기간(2026.12.01~2027.01.31 등)이 전화번호로 오탐돼 공고·구인 의뢰 거부(이전부터 있던 동작, → 구분은 신규). run 3 소진 → 사람 결정 요청(추가 run 4 허용 / 한계로 수용) |
