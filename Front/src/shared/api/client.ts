import axios, { isAxiosError } from "axios";
import { toCamelKeys, toSnakeKeys } from "./case";
import { toApiError } from "./errors";

// 동일 출처만 호출 (CSRF 헤더 외부 유출 방지)
export const apiClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
  timeout: 15_000,
  headers: { Accept: "application/json" },
});

// 세션 확인·로그인·로그아웃 요청의 401은 만료로 보지 않음
const SESSION_PROBE_URLS = ["/auth/me/", "/auth/login/", "/auth/logout/", "/auth/csrf/"];
let unauthorizedHandler: (() => void) | null = null;
// 서버 세션은 요청마다 연장 → 마지막 응답 시각 = 유휴 기준
let lastResponseAt = Date.now();
let csrfReady = false;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export function getLastResponseAt(): number {
  return lastResponseAt;
}

// 요청 body·params 키 → snake_case
apiClient.interceptors.request.use((config) => {
  config.data = toSnakeKeys(config.data);
  config.params = toSnakeKeys(config.params);
  return config;
});

// 응답·에러 body 키 → camelCase (에러 fields 키 포함)
apiClient.interceptors.response.use(
  (response) => {
    lastResponseAt = Date.now();
    response.data = toCamelKeys(response.data);
    return response;
  },
  (error: unknown) => {
    if (isAxiosError(error) && error.response !== undefined) {
      lastResponseAt = Date.now();
      error.response.data = toCamelKeys(error.response.data);
    }
    const apiError = toApiError(error);
    const url = isAxiosError(error) ? error.config?.url : undefined;
    if (apiError.status === 401 && url !== undefined && !SESSION_PROBE_URLS.includes(url)) {
      unauthorizedHandler?.();
    }
    return Promise.reject(apiError);
  },
);

export async function ensureCsrfCookie(): Promise<void> {
  await apiClient.get("/auth/csrf/");
  csrfReady = true;
}

// 앱 시작 때 발급 실패 → 비로그인 POST 전에 재발급
export async function prepareCsrf(): Promise<void> {
  if (!csrfReady) {
    await ensureCsrfCookie();
  }
}
