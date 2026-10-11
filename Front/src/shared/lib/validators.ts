const MAX_URL_LENGTH = 500;

// 입력 편의용 검사이고 서버가 같은 규칙으로 다시 검증한다
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

// "//다른도메인" 같은 값으로 외부 사이트로 이동시키는 것을 막는다
export function isSafeInternalPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.startsWith("/\\")
  );
}
