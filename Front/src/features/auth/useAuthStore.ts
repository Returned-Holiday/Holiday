import { create } from "zustand";
import type { CurrentUser } from "./types";

type AuthStatus = "loading" | "anonymous" | "authenticated";

type AuthState = {
  status: AuthStatus;
  user: CurrentUser | null;
  sessionExpired: boolean;
  setUser: (user: CurrentUser) => void;
  setAnonymous: () => void;
  expireSession: () => void;
  clearSessionExpired: () => void;
};

// 메모리에만 보관 (storage 저장 X)
export const useAuthStore = create<AuthState>()((set) => ({
  status: "loading",
  user: null,
  sessionExpired: false,
  setUser: (user) => set({ status: "authenticated", user, sessionExpired: false }),
  setAnonymous: () => set({ status: "anonymous", user: null }),
  // 만료 → 사용자 정보 즉시 비움 (화면 데이터 노출 X)
  expireSession: () => set({ status: "anonymous", user: null, sessionExpired: true }),
  clearSessionExpired: () => set({ sessionExpired: false }),
}));
