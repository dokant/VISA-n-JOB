# 통합 QA I-1 수정 — 기준 일치 검토 run 1

- 대상: 커밋 5e2ed93 `fix(I-1): sign-out ends JWT sessions on the server …` (13 파일)
- 기준: STANDARD v2.24 → 이번 검토에서 v2.25로 보완(4.2·4.5·4.8·4.11 신설·S-41†·S-73‡·S-74‡), CLAUDE.md, `.workflow/qa/integration-run-1.md` I-1
- 방법: 정적 검토만(`git show`, 소스·테스트·`node_modules` Auth.js 코드 열람, `rg`). build·test·E2E·서버 실행 없음, `.next` 미접근
- 결과: **일치 12 / 14**, 불일치 2(I1-11 경미, I1-12 경미·기존 동작)

## 항목별 판정

| # | 기준 | 판정 | 근거 |
|---|---|---|---|
| I1-01 | CLAUDE.md "스키마 변경 시 마이그레이션·시드 함께", 4.11 `User.sessionVersion Int @default(0)` | 일치 | `prisma/schema.prisma` User `sessionVersion Int @default(0)`, `prisma/migrations/20261121100000_i1_session_version/migration.sql`(`ADD COLUMN … NOT NULL DEFAULT 0`, 기존 최신 `20261120100000_…` 뒤). 시드 `user.create`(seed/index.ts:49, sampleSeekers.ts:320)는 기본값으로 충분해 변경 불필요 |
| I1-02 | 4.11 JWT 콜백 DB 비교(로그인 때 부여, 이후 불일치·없음·계정 없음 → null) | 일치 | `src/auth.ts` jwt 콜백이 `applySessionVersion(token, params.user != null)` 후 null이면 `return null`. `src/lib/authCredentials.ts` `applySessionVersion`·`isSessionCurrent`(숫자 정확 일치만). 2FA `unstable_update`(trigger update)도 같은 검사를 먼저 거침. Auth.js `/api/auth/session`은 콜백 null이면 쿠키 정리(@auth/core `lib/actions/session.js`) |
| I1-03 | 4.11 로그아웃 = 서버 측 무효화, 모든 경로 `events.signOut`, 조건부 증가 | 일치 | `src/auth.ts` `events.signOut` → `revokeSessions(token)`: `updateMany where { id: sub, sessionVersion: token.sv }` + `increment: 1`. 관리자 `signOutStaff`(`signOut({redirect:false})`)와 구직자·기업 `/api/auth/signout` 둘 다 같은 이벤트. `rg signOut src` 결과 다른 로그아웃 경로 없음 |
| I1-04 | 4.11·4.5 미들웨어 읽기 전용(Auth.js 인스턴스 없음, 세션 Set-Cookie 없음) | 일치 | `src/middleware.ts`에서 `NextAuth(authConfig)` 제거, `readSessionClaims(request.headers)`만. 응답 쿠키 쓰기는 `keepEntryParams`의 추천·유입 쿠키뿐. `readSessionClaims`(`src/lib/authConfig.ts`)는 쿠키 헤더만으로 `getToken`(Authorization 헤더 무시) |
| I1-05 | 4.11 Edge에서 Prisma·`@/auth` 미사용 | 일치 | middleware → authConfig·authGuard·rbac·limits·i18n. `@prisma/client`는 세 파일 모두 `import type { Role }`뿐, `@/auth`·`NextAuth(` 0건(S-74 명령) |
| I1-06 | 4.5 `/admin/login` 미들웨어 항상 통과, 페이지가 DB로 판단 | 일치 | `src/lib/authGuard.ts` `if (path === ADMIN_LOGIN_PATH) return ALLOW;`. `src/app/admin/login/page.tsx` `hasVerifiedStaffSession()` 참일 때만 `redirect(ADMIN_HOME_PATH)`. `src/lib/admin/session.ts` `hasVerifiedStaffSession` = `auth()`(sv 검사) + `staffState === "VERIFIED"`(authTime 8시간 포함) + DB 직원 역할·`totpEnabledAt`. 무효 토큰 경로 `/admin → requireStaff → /admin/login(통과) → 폼`으로 루프 없음 |
| I1-07 | 4.5 접근 결정은 Node 쪽 DB 검사 | 일치 | `requireStaff`·`requireStaffApi`(`lib/admin/session.ts:32,65`)가 `auth()`로 시작 → JWT 콜백 sv 검사. 기업·구직자 가드도 `auth()` 경유. 미들웨어 통과만으로 데이터를 내는 화면 추가 없음 |
| I1-08 | 4.5·S-40 첫 문장 rbac/공개 주석 | 일치 | `src/server/actions/admin/auth.ts:62` `// rbac: public — 자기 세션만 끝낸다 …`. 로그인 페이지는 공개 화면(rbac 대상 아님) |
| I1-09 | 4.8 감사 대상 여부 | 일치 | 로그인·로그아웃·세션 버전 증가는 BR-15 대상 아님. 감사 액션 추가 없음(올바름). v2.25에서 4.8에 명시 |
| I1-10 | CLAUDE.md 개인정보 필드 검토, 4.4·4.7 | 일치 | `sessionVersion`은 정수 운영 카운터 — PII 아님, `…Enc`·`…Hash` 불필요, `src/lib/serializers` 매치 0건(블라인드·공개 응답에 없음), JWT 클레임에도 PII 추가 없음(`sv` 숫자) |
| I1-11 | 4.10 테스트 위치·명명(교차 테스트 `{모듈}{주제}`, PRD 태그 필수) | **불일치(경미)** | 아래 D-1 |
| I1-12 | 4.11 슬라이딩 만료 없음(로그인 시각 기준 절대 만료) | **불일치(경미, 기존 동작)** | 아래 D-2 |
| I1-13 | 4.2 디렉터리 | 일치 | 새 src 파일 없음(기존 파일에 함수 추가). 새 테스트 `tests/unit/lib/sessionVersion.test.ts`, `tests/e2e/session-revoke.spec.ts`는 허용 폴더. v2.25에서 트리 설명 갱신 |
| I1-14 | 4.7 로그 규칙 | 일치 | 새 `console.*` 없음 |

## 불일치 목록

### D-1 (I1-11, 4.10) 새 테스트의 PRD 태그 없음, 교차 단위 테스트 이름에 모듈 접두 없음
- 위치: `tests/unit/lib/sessionVersion.test.ts`(describe `"I-1 session version"`), `tests/e2e/session-revoke.spec.ts`(describe `"I-1 sign-out ends the session on the server"`), `tests/unit/lib/authGuard.test.ts:64`(`"I-1: …"`)
- 기준: 4.10 "PRD 검증 테스트는 `R-xxx` 태그", 교차 테스트는 "`{모듈}{주제}.test.ts` … PRD 태그(`R-xxx`) 필수"(비기능은 `N-xx`). G-2의 접두 생략은 미러 폴더명이 모듈을 드러낼 때만.
- 실제: 태그가 QA 결함 번호 `I-1`뿐이고 `R-xxx`/`N-xx` 없음. `sessionVersion.test.ts`는 `authCredentials`·`authConfig`·`admin/session`을 함께 보는 교차 테스트인데 파일명에 모듈 접두가 없음(`tests/unit/lib/` 폴더는 모듈을 드러내지 않음).
- 참고: 관리자 부분의 관련 PRD는 R-118(`authGuard.test.ts`의 다른 케이스와 같은 태그). 구직자·기업 로그아웃에 해당하는 PRD 번호는 PRD에 없음 — 태그를 `R-118`(관리자)로 붙일지, 결함 번호 태그를 4.10 예외로 인정할지는 호출자 판단(기준 보완 후보). 이름 예: `authCredentialsSessionVersion.test.ts`. 기능 영향 없음.

### D-2 (I1-12, 4.11) 구직자·기업 세션은 `/api/auth/session` 호출로 만료가 늘어날 수 있음
- 위치: `src/lib/authGuard.ts:46-47`(직원만 `authTime + STAFF_SESSION_MAX_AGE_SEC` 검사), `src/lib/seeker/session.ts`·`src/lib/employer/session.ts`(`authTime` 검사 0건), Auth.js `@auth/core/lib/actions/session.js`(JWT 세션 GET마다 `newExpires = fromDate(sessionMaxAge)`로 토큰 재서명·쿠키 재발급).
- 기준: v2.25 4.11 "세션 수명은 로그인 시각(`authTime`) 기준 절대 만료 … 쿠키·JWT `exp`가 라이브러리 동작으로 다시 서명되더라도 서버 측 판단은 `authTime + 수명`".
- 실제: 직원은 일치(8시간 절대). 앱 코드(미들웨어·페이지·액션)는 이번 수정으로 쿠키를 재발급하지 않음(일치). 하지만 구직자·기업 토큰은 서버가 `authTime + SESSION_MAX_AGE_SEC`를 보지 않으므로, 클라이언트가 7일 안에 `/api/auth/session`을 계속 부르면 `exp`가 계속 늘어난다. 앱 화면은 이 엔드포인트를 부르지 않음(`useSession`·`SessionProvider` 0건, E2E 도우미만 사용).
- 영향: 낮음 — 유효하고 로그아웃되지 않은 토큰 소유자만 늘릴 수 있고, 로그아웃(sv) 무효화는 그대로 작동. 5e2ed93이 만든 문제가 아니며 오히려 미들웨어의 매 요청 슬라이딩을 없앴다. 이 항목은 v2.25에서 새로 명문화한 기준에 대한 기존 동작의 차이다.
- 해소 방향(참고, 수정은 빌더 몫): `applySessionVersion` 또는 JWT 콜백에서 모든 역할에 `authTime + 역할별 수명 < now`면 null.

## v2.25 STANDARD 변경 내역
- 머리말 버전 2.25, 개정 이력 2.25 행.
- 4.2: `lib/authConfig`(readSessionClaims)·`authCredentials`(세션 버전 함수)·`authGuard`(클레임 라우팅) 설명, `src/auth.ts`(JWT 콜백 sv 검사·events.signOut는 여기서만), `src/middleware.ts`(Auth.js 인스턴스 없이 클레임만, 세션 Set-Cookie·Prisma 금지).
- 4.5: 미들웨어는 라우팅 힌트만, 접근 결정은 Node 쪽 DB 검사(`requireStaff`·`requireEmployer`·`requireSeeker`·`auth()`), Node 쪽에서 거부될 수 있는 화면(`/admin/login`)을 미들웨어가 튕기지 않음, `/admin/login`은 `hasVerifiedStaffSession()`으로 페이지가 판단.
- 4.8: 로그인·로그아웃·세션 버전 증가는 감사 대상 아님.
- 4.11 신설(보안 절 — 기존 문서에 독립 보안 절이 없어 4장 끝에 둠): 세션 방식·클레임, 세션 버전 무효화, 로그아웃 = 서버 측 무효화(모든 경로 `events.signOut`, 조건부 증가), 미들웨어 읽기 전용, 슬라이딩 만료 없음(authTime 기준 절대 만료), 마이그레이션 영향, 개인정보 아님, 테스트 범위.
- 점검표: S-41†(접근 결정 위치), S-73‡(서버 측 로그아웃), S-74‡(미들웨어 읽기 전용·슬라이딩 만료 없음).
