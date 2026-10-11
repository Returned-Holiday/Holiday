import { apiClient } from "../../shared/api/client";
import { ApiError } from "../../shared/api/errors";
import type { CurrentUser } from "./types";

type DataResponse<T> = { data: T };

// 401은 비로그인 상태로 보고, 그 밖의 오류는 호출한 쪽에서 처리한다
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
