import { useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router";
import { PASSWORD_CHANGE_PATH } from "../../app/paths";
import { ApiError, GENERIC_ERROR_MESSAGE } from "../../shared/api/errors";
import { fetchCurrentUser, login } from "./api";
import { useAuthStore } from "./useAuthStore";

const EMPTY_INPUT_MESSAGE = "이메일과 비밀번호를 입력해 주세요.";

export function useLogin(onSuccess?: () => void) {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (email.trim() === "" || password === "") {
      setError(EMPTY_INPUT_MESSAGE);
      return;
    }
    setPending(true);
    setError(null);
    try {
      await login(email.trim(), password);
      const user = await fetchCurrentUser();
      if (user === null) {
        throw new ApiError("UNAUTHENTICATED", GENERIC_ERROR_MESSAGE, 401);
      }
      setUser(user);
      if (user.passwordExpired) {
        void navigate(PASSWORD_CHANGE_PATH, { replace: true });
        return;
      }
      onSuccess?.();
    } catch (caught) {
      // 실패 문구는 서버 문구 하나 (계정 존재 여부 비노출)
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      setError(caught.message);
    } finally {
      // 비밀번호는 전송 후 메모리에서 제거
      setPassword("");
      setPending(false);
    }
  };

  return { email, setEmail, password, setPassword, error, pending, submit };
}
