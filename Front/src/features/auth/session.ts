import { ensureCsrfCookie } from "../../shared/api/client";
import { ApiError } from "../../shared/api/errors";
import { fetchCurrentUser } from "./api";
import { useAuthStore } from "./useAuthStore";

// 상태를 바꾸는 요청보다 먼저 CSRF 쿠키를 받아 둬야 한다
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
    if (error instanceof ApiError) {
      setAnonymous();
      return;
    }
    throw error;
  }
}
