/** 관리자 화면 오류 문구(한국어 전용, STANDARD 3.6 관리자 예외). 코드 → 문구. */
const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: "이메일 또는 비밀번호가 맞지 않습니다.",
  RATE_LIMITED: "시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.",
  INVALID_CODE: "인증 코드가 맞지 않습니다. 인증 앱의 현재 6자리 코드를 입력해 주세요.",
  CODE_REUSED: "이미 사용한 코드입니다. 인증 앱에 새 코드가 나오면 입력해 주세요.",
  NOT_ENROLLED: "2단계 인증이 설정되지 않았습니다. 다시 로그인해 주세요.",
};

export function adminErrorText(code: string): string {
  return MESSAGES[code] ?? "문제가 생겼습니다. 다시 시도해 주세요.";
}
