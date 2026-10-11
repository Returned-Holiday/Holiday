import axios from "axios";
import { toApiError } from "./errors";

// 같은 출처의 /api/v1만 호출하므로 CSRF 토큰 헤더가 다른 사이트로 새지 않는다
export const apiClient = axios.create({
  baseURL: "/api/v1",
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
