import { create } from "zustand";
import type { CurrentUser } from "./types";

type AuthStatus = "loading" | "anonymous" | "authenticated";

type AuthState = {
  status: AuthStatus;
  user: CurrentUser | null;
  setUser: (user: CurrentUser) => void;
  setAnonymous: () => void;
};

// 메모리에만 보관 (storage 저장 X)
export const useAuthStore = create<AuthState>()((set) => ({
  status: "loading",
  user: null,
  setUser: (user) => set({ status: "authenticated", user }),
  setAnonymous: () => set({ status: "anonymous", user: null }),
}));
