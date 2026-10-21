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

// 탭끼리 마지막 응답 시각만 공유 (다른 탭 요청으로 연장된 세션 반영, storage X)
const activityChannel = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel("session-activity");

function markResponse(): void {
  lastResponseAt = Date.now();
  activityChannel?.postMessage(lastResponseAt);
}

if (activityChannel !== null) {
  activityChannel.onmessage = (event: MessageEvent<unknown>) => {
    const time = event.data;
    // 숫자이고 현재 이전 시각만 (미래 값으로 만료 표시 지연 X)
    if (typeof time === "number" && time > lastResponseAt && time <= Date.now()) {
      lastResponseAt = time;
    }
  };
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
    markResponse();
    response.data = toCamelKeys(response.data);
    return response;
  },
  (error: unknown) => {
    if (isAxiosError(error) && error.response !== undefined) {
      // 5xx는 서버가 세션 저장 X → 연장으로 보지 않음
      if (error.response.status < 500) {
        markResponse();
      }
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
