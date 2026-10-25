import { useState, type SubmitEvent } from "react";
import { ApiError, GENERIC_ERROR_MESSAGE } from "../../shared/api/errors";
import { changePassword, fetchCurrentUser } from "./api";
import { checkPassword } from "./password";
import { useAuthStore } from "./useAuthStore";

type Field = "currentPassword" | "newPassword" | "newPasswordConfirm";
type Errors = Partial<Record<Field, string>>;

type Values = Record<Field, string>;

// 값이 바뀌면 다시 볼 칸 (확인 칸은 새 비밀번호에 영향받음)
const AFFECTED: Record<Field, Field[]> = {
  currentPassword: ["currentPassword"],
  newPassword: ["newPassword", "newPasswordConfirm"],
  newPasswordConfirm: ["newPasswordConfirm"],
};

function validatePasswordChange(field: Field, v: Values, email: string): string | undefined {
  switch (field) {
    case "currentPassword":
      return v.currentPassword === "" ? "현재 비밀번호를 입력해 주세요." : undefined;
    case "newPassword":
      return checkPassword(v.newPassword, email) ?? undefined;
    case "newPasswordConfirm":
      return v.newPasswordConfirm === v.newPassword ? undefined : "새 비밀번호가 서로 달라요.";
  }
}

export function usePasswordChangeForm(onSuccess: () => void) {
  const email = useAuthStore((state) => state.user?.email ?? "");
  const setUser = useAuthStore((state) => state.setUser);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const current: Values = { currentPassword, newPassword, newPasswordConfirm };
  const validate = (field: Field) => validatePasswordChange(field, current, email);

  // 바꾼 칸과 영향받는 칸 중 에러가 떠 있는 칸만 다시 검사 (맞으면 바로 지움)
  const change = (key: Field, setter: (value: string) => void) => (value: string) => {
    setter(value);
    const next = { ...current, [key]: value };
    setErrors((shown) => {
      const updated = { ...shown };
      for (const field of AFFECTED[key]) {
        if (shown[field]) {
          updated[field] = validatePasswordChange(field, next, email);
        }
      }
      return updated;
    });
  };

  const touch = (field: Field) => setErrors((current) => ({ ...current, [field]: validate(field) }));

  const clearPasswords = () => {
    setCurrentPassword("");
    setNewPassword("");
    setNewPasswordConfirm("");
  };

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
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
    setters: {
      setCurrentPassword: change("currentPassword", setCurrentPassword),
      setNewPassword: change("newPassword", setNewPassword),
      setNewPasswordConfirm: change("newPasswordConfirm", setNewPasswordConfirm),
    },
    errors,
    touch,
    formError,
    pending,
    submit,
  };
}
