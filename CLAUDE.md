# CLAUDE.md – 비자앤잡

## 최우선 원칙

- docs/WORK_ORDER.md §2 비즈니스 규칙(BR-01~15)을 위반하는 코드를 작성하지 않는다.
- 구직자와 기업 간 직접 연락 수단을 만들지 않는다.
- 기업에 나가는 구직자 데이터는 반드시 lib/serializers/blindSeeker.ts를 거친다.
- 법령 요건, 비자 점수 배점, 허용 업종 등 법적 수치를 추정해 하드코딩하지 않는다. 필요하면 DB 시드에 isSample=true, DRAFT로 넣고 TODO를 남긴다.
- 외국인등록번호와 여권번호 필드를 Phase 3 이전에 만들지 않는다.

## 작업 방식

- 작업 시작 전에 해당 Phase의 완료 기준을 확인하고, 끝나면 테스트를 실행해 결과를 보고한다.
- 스키마를 바꾸면 마이그레이션과 시드를 함께 갱신한다.
- 새 화면을 만들면 6개 언어 키를 모두 추가한다 (번역 미검수 표시).
- 개인정보 필드를 추가하면 암호화, 감사 로그, 블라인드 화이트리스트 영향도를 함께 검토한다.
- 규칙과 요구가 충돌하거나 불명확하면 구현을 멈추고 질문한다.

## 명령어

- pnpm dev / pnpm test / pnpm test:e2e / pnpm lint / pnpm db:migrate / pnpm db:seed

## 환경 메모 (이 저장소 추가)

- `pnpm`이 PATH에 없으면 `corepack pnpm <명령>`으로 실행한다(예: `corepack pnpm test`).
- 매 Phase 끝에 `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm i18n:check`, `pnpm qa:static`, `pnpm build`, `pnpm test:e2e`를 실행한다.
- 기준서: `.workflow/STANDARD.md` (디자인 토큰, 컴포넌트, 디렉터리, 명명 규칙).
- shadcn 컴포넌트 추가 후 `from "cn"` import가 생기면 `from "@/lib/utils"`로 바꾸고 `cn` 패키지는 설치하지 않는다(승인 목록 밖). 버튼 등 터치 영역은 44px(`h-11`) 이상, 임의값 클래스(`p-[..]`, `rounded-[..]`)와 `text-xs` 금지.
