import { ensureCsrfCookie } from "../../shared/api/client";
import { ApiError } from "../../shared/api/errors";
import { fetchCurrentUser } from "./api";
import { useAuthStore } from "./useAuthStore";

// 변경 요청 전에 CSRF 쿠키 확보
export async function bootstrapSession(): Promise<void> {
  const { setUser, setAnonymous } = useAuthStore.getState();
  try {
    await ensureCsrfCookie();
    const user = await fetchCurrentUser();
    if (user === null) {
      setAnonymous();
    } else {
      setUser(user);
    }
  } catch (error) {
    if (error instanceof ApiError || error instanceof TypeError) {
      setAnonymous();
      return;
    }
    throw error;
  }
}
