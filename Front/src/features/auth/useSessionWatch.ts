import { useEffect } from "react";
import { setUnauthorizedHandler } from "../../shared/api/client";
import { ApiError } from "../../shared/api/errors";
import { fetchCurrentUser } from "./api";
import { useAuthStore } from "./useAuthStore";

const IDLE_LIMIT_MS = 15 * 60 * 1000;
const CHECK_INTERVAL_MS = 60 * 1000;
const ACTIVITY_EVENTS = ["pointerdown", "keydown", "scroll"] as const;

// 서버 유휴 15분 만료를 화면에도 반영
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
    let lastActivity = Date.now();
    let checking = false;
    const markActive = () => {
      lastActivity = Date.now();
    };
    const check = async () => {
      if (checking || Date.now() - lastActivity < IDLE_LIMIT_MS) {
        return;
      }
      checking = true;
      try {
        const user = await fetchCurrentUser();
        if (user === null) {
          useAuthStore.getState().expireSession();
        }
      } catch (error) {
        if (!(error instanceof ApiError || error instanceof TypeError)) {
          throw error;
        }
      } finally {
        checking = false;
      }
    };
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActive, { passive: true });
    }
    const timer = window.setInterval(() => void check(), CHECK_INTERVAL_MS);
    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActive);
      }
      window.clearInterval(timer);
    };
  }, [status]);
}
