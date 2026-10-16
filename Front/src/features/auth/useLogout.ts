import { useState } from "react";
import { useNavigate } from "react-router";
import { HOME_PATH } from "../../app/paths";
import { ApiError } from "../../shared/api/errors";
import { logout } from "./api";
import { useAuthStore } from "./useAuthStore";

export function useLogout() {
  const navigate = useNavigate();
  const setAnonymous = useAuthStore((state) => state.setAnonymous);
  const [pending, setPending] = useState(false);

  const run = async () => {
    setPending(true);
    try {
      await logout();
    } catch (error) {
      // 서버 실패해도 화면 정보는 비움 (공용 PC)
      if (!(error instanceof ApiError)) {
        throw error;
      }
    } finally {
      setAnonymous();
      setPending(false);
      void navigate(HOME_PATH, { replace: true });
    }
  };

  return { logout: run, pending };
}
