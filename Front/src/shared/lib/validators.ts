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

// 같은 출처 경로만 허용 (오픈 리다이렉트 X)
export function isSafeInternalPath(value: unknown): value is string {
  if (typeof value !== "string" || !value.startsWith("/") || /[\\\s\p{Cc}]/u.test(value)) {
    return false;
  }
  const origin = window.location.origin;
  try {
    return new URL(value, origin).origin === origin;
  } catch (error) {
    if (error instanceof TypeError) {
      return false;
    }
    throw error;
  }
}
