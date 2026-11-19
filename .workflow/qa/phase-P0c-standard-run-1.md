# Phase P0c — 기준 일치 검토 (run 1)

- 대상 커밋: `1bbf269`(P0b 불일치 수정: 시·군·구 코드 UPPER_SNAKE), `611260c`(P0c 보안 유틸·`*Enc` 확장·rbac·audit·pii-guard·알림)
- 기준: `.workflow/STANDARD.md` v2.2 → 검토 중 **v2.3으로 보완**(4.2·4.5·4.7). v2.3은 기준 공백만 메웠고 산출물에 새 요구를 더하지 않았다. 판정은 v2.3 기준.
- 검토자: wf-standard (모드 B), 2026-11-16
- 실행한 확인: S-36·S-43·S-44·S-45·S-47·S-50·S-53 `rg` 명령, `corepack pnpm qa:static`(오류 0, 경고 1 = S-45/console), `corepack pnpm typecheck`(통과). `vitest --coverage`는 QA 에이전트의 동시 실행과 겹쳐 1차는 coverage 임시 폴더 충돌로 중단, 2차는 117 통과·1건(`seed.test.ts` 멱등 테스트) 30분 지연 후 타임아웃 — 같은 테스트 클러스터를 동시에 쓴 환경 문제로 보고 **판정 근거로 쓰지 않음**(테스트 결과·커버리지 판정은 QA 몫). 화면 없는 Phase라 렌더링 없음.

## 1. 결과 요약

**일치 17 / 18**, 불일치 1(S-50 / 4.10 테스트 파일명 미러), 해당 없음 2(S-40, S-52), 기준 보완 3건(v2.3 반영으로 해소). P0b 불일치(시·군·구 코드)는 해소.

## 2. 항목별 판정

### 2.1 점검표

| 번호 | 판정 | 근거 (파일:줄) |
|---|---|---|
| S-34 | 일치(v2.3) | 새 파일은 `src/lib/` 아래(`crypto.ts`, `rbac.ts`, `audit.ts`, `pii-guard.ts`, `db.ts`, `notifications/`). 새 `src/` 최상위 폴더 없음. 알림 파일 구성은 3절 #1로 4.2 정정 |
| S-35 | 일치 | WO 지정명 그대로(`crypto.ts`·`rbac.ts`·`audit.ts`·`pii-guard.ts`). `notifications/{types,console,index}.ts` camelCase(4.3) |
| S-36 | 일치 | `tsconfig.json:7` `"strict": true`. `rg ": any\b\|as any\b" src tests` 0건. typecheck 통과 |
| S-40 | 해당 없음 | 서버 액션·Route Handler 0개(`"use server"`·`route.ts` 0). 검사 함수 `assertCan(actor, permission)`(`src/lib/rbac.ts:269-275`)은 준비됨 |
| S-43 | 일치 | `rg -i "passport\|arcNo\|alienReg\|residentNo\|registrationNumber" prisma src` 0건 |
| S-44 | 일치 | `rg "encrypt\(\|decrypt\(" src` (crypto.ts·db.ts 제외) 0건. 호출은 `db.ts:67`(쓰기)·`:155`(읽기)뿐. `…Enc` 필터 시 예외(`db.ts:207-210`) — 4.7 "조회는 `…Hash`만"과 일치 |
| S-45 | 일치(v2.3) | 매치 1건 `src/lib/notifications/console.ts:19` `console.info`. 내용: JSON 한 줄, 수신자 `maskRecipient` 끝 2자만(`:12-14`, `:181`), 템플릿 값(dev OTP 포함)은 `env === "production"`이면 제외(`:185`). 4.7 개발용 콘솔 OTP 어댑터 예외에 해당(3절 #2). 그 외 `src`에 로그 0건. 오류 메시지도 페이로드·키를 출력하지 않음(`crypto.ts:115-116`) |
| S-46 | 일치 | `AUDIT_ACTIONS`(`audit.ts:15-27`)가 4.8 11개와 이름·개수 동일(`COMPANY_VERIFY` 포함). PC-14 `auditPiiExport`(`:135-149`)·`PII_VIEW` `auditPiiView`(`:115-129`) 함수 단위. `meta` 평문 PII 차단(`:64-83`). "각 행위에서 기록"은 행위 구현이 없는 Phase라 이후 Phase에서 계속 확인 |
| S-47 | 일치 | `rg "(recommendation\|auditLog)\.(update\|delete\|upsert)" src` 0건. `audit.ts`는 `auditLog.create`만(`:103`) |
| S-49 | 일치 | `1bbf269`가 `regions.ts` 행 플래그를 유지: 시·도·시·군·구 모두 `isSample: true`, `needsReview: true`(`prisma/seed/regions.ts:664-665, 682-683`) |
| S-50 | **불일치** | `src/` 안 테스트 0건(일치). 그러나 `src/lib/db.ts` 확장 테스트가 `tests/unit/lib/enc-extension.test.ts` — 4.10 `tests/unit/{src 경로 미러}/{파일명}.test.ts`에 맞지 않음(파일명이 대상 `db`가 아님). 다른 새 테스트(`crypto`·`rbac`·`audit`·`pii-guard`·`notifications/console`)는 미러 일치 |
| S-52 | 해당 없음 | Route Handler 0개. 오류 본문 형식 자체는 2.2 A-6에서 확인 |
| S-53 | 일치 | 결과 중 `src/app/globals.css` 5건(기존), `audit.ts:17,132`·`rbac.ts:56`(주석 `PC-14`), `pii-guard.ts:2`(주석 `R-012`)·`:97`(정규식 자릿수 `{7,14}`) — 운영 수치 아님. `crypto.ts:21-24` 길이 상수는 알고리즘 규격. 커버리지 90%는 `vitest.config.ts`(src 밖, R-013 값) |
| S-56 | 일치 | `.env.example:279-287` `ENCRYPTION_KEYS=`·`HASH_KEY=` 빈 값 + 생성 방법 주석. 테스트 키는 `tests/setup/env.ts:6-12`에서 실행마다 무작위 생성, 커밋된 비밀값 없음(1.2-10) |

### 2.2 4절·5절 규칙

| 번호 | 규칙 | 판정 | 근거 |
|---|---|---|---|
| A-1 | 4.2 디렉터리 | 일치(v2.3) | 3절 #1. `tests/setup/env.ts`(setupFiles)는 4.10 "실행 설정은 `tests/setup/`"과 일치 |
| A-2 | 4.3 DB 문자열 코드 UPPER_SNAKE (P0b 불일치 재확인) | **일치(해소)** | `sigunguCode()` = `{SIDO}_{로마자}_{GU\|GUN\|SI}`(`prisma/seed/regions.ts:638-647`), 로마자 표(`:423-634`), 없는 이름은 예외. `schema.prisma:589` 주석 갱신, 한글명은 `nameKo` 매칭. 테스트 `tests/unit/db/seed.test.ts:109-128`가 형식·유일성·콜론 0건·`nameKo` 조회 확인(이 테스트는 2차 실행에서 통과). 4.9 관찰도 반영(`schema.prisma:555`). 새 코드 값도 UPPER_SNAKE: `AUDIT_ACTIONS`, `ContactType`(`pii-guard.ts:15-16`), `NotificationChannel`(`notifications/types.ts:10`), 오류 코드 |
| A-3 | 4.5 권한 이름 | 일치(v2.3) | 3절 #3. 전 권한이 `{대상}:{행위}` camelCase(`rbac.ts:28-56`), 4.5 예시 `contact:view`·`visaCase:view` 그대로 존재 |
| A-4 | 4.7 `*Enc` 자동 암·복호 | 일치 | `db.ts:29-47` 이름이 `Enc`로 끝나는 필드 + `User.totpSecret`(`:23-25`, WO 원안 이름 유지 — PLAN P0c-2). 중첩 쓰기·`createMany`·`upsert`(`:74-143`), 결과 복호(`:146-161`). 키는 환경변수만(`crypto.ts:10-13, 70-76`) |
| A-5 | 4.8 감사 액션·meta | 일치 | S-46 근거와 같음 |
| A-6 | 5절 API 오류 형식 | 일치 | `AuthzError.toBody()` `{ error: { code, message } }`, `UNAUTHENTICATED`/401·`FORBIDDEN`/403(`rbac.ts:248-261, 269-275`) = 5절 401 미인증·403 권한. `ContactInfoError` `CONTACT_INFO_DETECTED`/422(`pii-guard.ts:20-34`) = 5절 422 업무 규칙 위반(BR-14). 코드 전부 UPPER_SNAKE |

## 3. 빌더 보고 판단과 STANDARD v2.3 보완

| # | 빌더 보고 | 판단 | STANDARD 변경 |
|---|---|---|---|
| 1 | 4.2 `notifications/(provider.ts, console.ts, smtp.ts)` ↔ 구현 `types.ts, console.ts, index.ts` | **수용.** WO §4는 `notifications/` 폴더만 지정, 4.2 파일명은 [제안]이었고 PLAN P0c가 `{types,console,index}`를 정함(P0b `scripts/db.ts`와 같은 처리). 인터페이스=`types.ts`, 선택=`index.ts`로 역할이 분명하고 `smtp.ts`는 P2d | 4.2 트리 `notifications/ (types.ts, index.ts, console.ts, smtp.ts[P2d])` |
| 2 | qa:static 경고: `notifications/console.ts`의 `console.info` | **4.7 예외 해당 → S-45 일치.** 수신자 마스킹, OTP 등 템플릿 값은 production 외에서만, JSON 한 줄. 다만 기준에 예외의 범위가 적혀 있지 않아 매 Phase 같은 경고가 판단 대상이 됨 | 4.7에 예외 범위(이 파일 한 곳, 마스킹, production 조건, JSON 한 줄) 명시. 경고는 qa:static에 남겨 두고 검토 때 조건을 확인 |
| 3 | 권한 이름 `agency:visaRequest`(PLAN 예시 `agency:visaRequestOnly`), `company:verify` PLACEMENT·ADMIN, `seeker:review` 직원 3역할 | **명명 문제 없음.** 4.5는 예시만 있었고 형식 규칙이 없었음. 구현 25개 이름 모두 `{대상}:{행위}` camelCase로 일관. PLAN의 `…Only`는 "권한 예"라 이름 고정이 아님. 역할 배정의 업무 타당성은 판정하지 않음(QA·사람 몫) | 4.5에 형식 `{대상}:{행위}` camelCase, 목록은 `rbac.ts` `PERMISSIONS` 한 곳 명시 |
| 4 | pii-guard가 1600·1800 대표번호 접두를 오탐 회피로 제외 | **기준 밖.** STANDARD는 pii-guard 탐지 범위를 정하지 않음(4.6은 "기업 자유 입력에 pii-guard"만). 탐지 범위는 WO §11·R-012로 QA가 판정 | 변경 없음. 5절 관찰 1로 QA에 넘김 |

개정 이력에 v2.3 행 추가.

## 4. 불일치 목록과 수정 지시

| # | 항목 | 위치 | 기준 | 실제 | 수정 지시 |
|---|---|---|---|---|---|
| 1 | S-50 / 4.10 | `tests/unit/lib/enc-extension.test.ts` | 단위 테스트 = `tests/unit/{src 경로 미러}/{파일명}.test.ts` | 대상 `src/lib/db.ts`의 테스트 파일명이 `enc-extension` | `git mv tests/unit/lib/enc-extension.test.ts tests/unit/lib/db.test.ts`(내용 변경 없음). PLAN P0c 파일 목록에 이 이름이 적혀 있으나 PLAN이 정한 예시일 뿐 4.10 원칙이 우선 — 오케스트레이터가 PLAN 목록도 함께 갱신 |

## 5. 점검표 밖 관찰 (판정에 넣지 않음)

1. (QA 몫) `pii-guard.ts:69` `REPRESENTATIVE`는 15xx 5종·16xx 6종·18xx 4종만 허용하고 구분자가 있어야 탐지(`:100`). `1600-xxxx`·`1800-xxxx`, `1522`·`1670` 같은 실제 대표번호 접두와 구분자 없는 `16001234`는 놓친다. BR-01·BR-14 미탐 위험과 금액·인원 오탐 위험의 균형은 QA가 R-012 기준으로 판정할 것.
2. 로컬 개발 DB(127.0.0.1:54320)는 P0b 시드를 이미 실행했다면 옛 `GYEONGBUK:의성군` 형식 행이 남아 있을 수 있다(`seedRegions`는 `upsert … update: {}`라 옛 행을 지우지 않음). 실데이터가 없으므로 `pnpm db:reset` 후 재시드 권장. 조회로 확인하지는 않음.
3. 4.5 예시 `requirePermission(perm)` ↔ 구현 `assertCan(actor, perm)`. 4.5는 "예"라 불일치 아님. P1에서 서버 액션이 생기면 S-40은 `assertCan` 또는 이를 감싼 함수가 첫 문장인지로 본다.
4. 이번 검토 중 테스트 실행이 QA 동시 실행과 충돌(coverage 임시 폴더 삭제, 테스트 클러스터 공유로 30분 대기). 무거운 검증은 한 에이전트만 돌리도록 순서를 정하는 편이 좋다.
