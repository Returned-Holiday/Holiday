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

// 세션 확인·로그인 요청의 401은 만료로 보지 않음
const SESSION_PROBE_URLS = ["/auth/me/", "/auth/login/", "/auth/csrf/"];
let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
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
    response.data = toCamelKeys(response.data);
    return response;
  },
  (error: unknown) => {
    if (isAxiosError(error) && error.response !== undefined) {
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
}
