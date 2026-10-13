import { useState, type FormEvent } from "react";
import { ApiError, GENERIC_ERROR_MESSAGE } from "../../shared/api/errors";
import { changePassword, fetchCurrentUser } from "./api";
import { checkPassword } from "./password";
import { useAuthStore } from "./useAuthStore";

type Field = "currentPassword" | "newPassword" | "newPasswordConfirm";
type Errors = Partial<Record<Field, string>>;

export function usePasswordChangeForm(onSuccess: () => void) {
  const email = useAuthStore((state) => state.user?.email ?? "");
  const setUser = useAuthStore((state) => state.setUser);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const validate = (field: Field): string | undefined => {
    switch (field) {
      case "currentPassword":
        return currentPassword === "" ? "현재 비밀번호를 입력해 주세요." : undefined;
      case "newPassword":
        return checkPassword(newPassword, email) ?? undefined;
      case "newPasswordConfirm":
        return newPasswordConfirm === newPassword ? undefined : "새 비밀번호가 서로 달라요.";
    }
  };

  const touch = (field: Field) => setErrors((current) => ({ ...current, [field]: validate(field) }));

  const clearPasswords = () => {
    setCurrentPassword("");
    setNewPassword("");
    setNewPasswordConfirm("");
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fields: Field[] = ["currentPassword", "newPassword", "newPasswordConfirm"];
    const next: Errors = {};
    for (const field of fields) {
      next[field] = validate(field);
    }
    setErrors(next);
    if (fields.some((field) => next[field])) {
      return;
    }
    setPending(true);
    setFormError(null);
    try {
      await changePassword(currentPassword, newPassword);
      const user = await fetchCurrentUser();
      if (user !== null) {
        setUser(user);
      }
      onSuccess();
    } catch (caught) {
      if (!(caught instanceof ApiError || caught instanceof TypeError)) {
        throw caught;
      }
      if (caught instanceof ApiError) {
        setErrors({
          currentPassword: caught.fields.currentPassword?.[0],
          newPassword: caught.fields.newPassword?.[0],
        });
        setFormError(caught.message);
      } else {
        setFormError(GENERIC_ERROR_MESSAGE);
      }
    } finally {
      // 비밀번호는 전송 후 메모리에서 제거
      clearPasswords();
      setPending(false);
    }
  };

  return {
    values: { currentPassword, newPassword, newPasswordConfirm },
    setters: { setCurrentPassword, setNewPassword, setNewPasswordConfirm },
    errors,
    touch,
    formError,
    pending,
    submit,
  };
}
