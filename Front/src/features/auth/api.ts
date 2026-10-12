import { apiClient } from "../../shared/api/client";
import { ApiError } from "../../shared/api/errors";
import type { CurrentUser } from "./types";

type DataResponse<T> = { data: T };

// 401 = 비로그인 → null
export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  try {
    const response = await apiClient.get<DataResponse<CurrentUser>>("/auth/me/");
    return response.data.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }
}

export async function logout(): Promise<void> {
  await apiClient.post("/auth/logout/");
}
