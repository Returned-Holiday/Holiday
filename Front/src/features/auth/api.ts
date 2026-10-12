import { apiClient } from "../../shared/api/client";
import { ApiError } from "../../shared/api/errors";
import { isRecord } from "../../shared/lib/guards";
import { isCurrentUser, type CurrentUser } from "./types";

// 401 = 비로그인 → null
export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  try {
    const response = await apiClient.get<unknown>("/auth/me/");
    const body = response.data;
    if (!isRecord(body) || !isCurrentUser(body.data)) {
      throw new TypeError("unexpected user response");
    }
    return body.data;
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

export async function login(email: string, password: string): Promise<void> {
  await apiClient.post("/auth/login/", { email, password });
}

export type SignupInput = {
  email: string;
  password: string;
  nickname: string;
  agreeTerms: boolean;
  agreePrivacy: boolean;
  confirmAge: boolean;
};

export async function signup(input: SignupInput): Promise<void> {
  await apiClient.post("/auth/signup/", input);
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.post("/auth/password/", { currentPassword, newPassword });
}
