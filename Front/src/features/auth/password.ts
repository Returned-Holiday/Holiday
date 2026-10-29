// 입력 중 안내용 (실제 검증은 서버, docs/security.md 1)
export const PASSWORD_MAX_LENGTH = 64;
export const PASSWORD_RULE_TEXT =
  "영문 대·소문자, 숫자, 특수문자 중 2가지로 10자 이상 또는 3가지로 8자 이상";
export const PASSWORD_PATTERN_TEXT = "1234·aaaa 같은 연속·반복 문자와 이메일 아이디는 쓸 수 없어요";

// 서버 검증기와 같은 기준 (특수문자 = ASCII 문장부호, 숫자 키보드 줄 1234567890 포함)
const SEQUENCES = ["0123456789", "1234567890", "abcdefghijklmnopqrstuvwxyz", "qwertyuiop", "asdfghjkl", "zxcvbnm"];
const PUNCTUATION = "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";
const RUN_LENGTH = 4;

function countKinds(password: string): number {
  const kinds = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    [...password].some((char) => PUNCTUATION.includes(char)),
  ];
  return kinds.filter(Boolean).length;
}

function hasRepeat(password: string): boolean {
  return new RegExp(`(.)\\1{${RUN_LENGTH - 1}}`).test(password);
}

function hasSequence(password: string): boolean {
  const lower = password.toLowerCase();
  for (const sequence of SEQUENCES) {
    const both = [sequence, [...sequence].reverse().join("")];
    for (const source of both) {
      for (let start = 0; start + RUN_LENGTH <= source.length; start += 1) {
        if (lower.includes(source.slice(start, start + RUN_LENGTH))) {
          return true;
        }
      }
    }
  }
  return false;
}

export function checkPassword(password: string, email: string): string | null {
  if (password.length > PASSWORD_MAX_LENGTH) {
    return `비밀번호는 ${PASSWORD_MAX_LENGTH}자 이하로 입력해 주세요.`;
  }
  const kinds = countKinds(password);
  const longEnough = (kinds >= 2 && password.length >= 10) || (kinds >= 3 && password.length >= 8);
  if (!longEnough) {
    return `${PASSWORD_RULE_TEXT}으로 만들어 주세요.`;
  }
  if (hasRepeat(password) || hasSequence(password)) {
    return "연속되거나 반복되는 문자는 쓸 수 없어요.";
  }
  const localPart = email.split("@")[0]?.toLowerCase() ?? "";
  if (localPart.length >= 3 && password.toLowerCase().includes(localPart)) {
    return "이메일 아이디가 들어간 비밀번호는 쓸 수 없어요.";
  }
  return null;
}
