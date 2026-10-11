import axios from "axios";
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

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
);

export async function ensureCsrfCookie(): Promise<void> {
  await apiClient.get("/auth/csrf");
}
