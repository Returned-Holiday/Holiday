const MAX_URL_LENGTH = 500;

// UX용, 서버에서 재검증
export function toSafeHttpsUrl(value: string): URL | null {
  if (value.length === 0 || value.length > MAX_URL_LENGTH) {
    return null;
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch (error) {
    if (error instanceof TypeError) {
      return null;
    }
    throw error;
  }
  if (url.protocol !== "https:") {
    return null;
  }
  if (url.username !== "" || url.password !== "") {
    return null;
  }
  return url;
}

// //외부도메인 오픈 리다이렉트 차단. 백슬래시·공백·제어문자 거부 (브라우저가 지우거나 /로 바꿔 //가 될 수 있음)
export function isSafeInternalPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !/[\\\s\p{Cc}]/u.test(value)
  );
}
