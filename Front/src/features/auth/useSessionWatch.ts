import { useEffect } from "react";
import { getLastResponseAt, setUnauthorizedHandler } from "../../shared/api/client";
import { useAuthStore } from "./useAuthStore";

const IDLE_LIMIT_MS = 15 * 60 * 1000;
const CHECK_INTERVAL_MS = 30 * 1000;

// 서버 유휴 15분 만료를 화면에도 반영. 확인용 요청 X (요청 자체가 세션 연장)
export function useSessionWatch() {
  const status = useAuthStore((state) => state.status);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (useAuthStore.getState().status === "authenticated") {
        useAuthStore.getState().expireSession();
      }
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }
    const check = () => {
      if (Date.now() - getLastResponseAt() >= IDLE_LIMIT_MS) {
        useAuthStore.getState().expireSession();
      }
    };
    // 백그라운드 탭은 타이머 지연 → 돌아올 때 바로 확인
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        check();
      }
    };
    const timer = window.setInterval(check, CHECK_INTERVAL_MS);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [status]);
}
