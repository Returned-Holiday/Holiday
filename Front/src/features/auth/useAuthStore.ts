import { create } from "zustand";
import type { CurrentUser } from "./types";

// 로그인 정보가 브라우저 저장소에 남지 않도록 메모리에만 둔다
type AuthStatus = "loading" | "anonymous" | "authenticated";

type AuthState = {
  status: AuthStatus;
  user: CurrentUser | null;
  setUser: (user: CurrentUser) => void;
  setAnonymous: () => void;
};

export const useAuthStore = create<AuthState>()((set) => ({
  status: "loading",
  user: null,
  setUser: (user) => set({ status: "authenticated", user }),
  setAnonymous: () => set({ status: "anonymous", user: null }),
}));
