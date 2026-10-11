import { apiClient } from "../../shared/api/client";
import { ApiError } from "../../shared/api/errors";
import type { CurrentUser } from "./types";

type DataResponse<T> = { data: T };

// 비로그인은 오류가 아니라 정상 상태이므로 null로 돌려준다
export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  try {
    const response = await apiClient.get<DataResponse<CurrentUser>>("/auth/me");
    return response.data.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}
