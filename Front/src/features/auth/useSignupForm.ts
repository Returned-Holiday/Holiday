import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { LOGIN_PATH } from "../../app/paths";
import { ApiError } from "../../shared/api/errors";
import { signup } from "./api";
import { checkPassword } from "./password";

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 20;
// 서버 규칙과 같음 (한글·영문·숫자만)
const NICKNAME_PATTERN = /^[가-힣A-Za-z0-9]{2,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Field = "email" | "password" | "passwordConfirm" | "nickname" | "agreements";
type Errors = Partial<Record<Field, string>>;

type Agreements = { terms: boolean; privacy: boolean; age: boolean };

export function useSignupForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [nickname, setNickname] = useState("");
  const [agreements, setAgreements] = useState<Agreements>({ terms: false, privacy: false, age: false });
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const allAgreed = agreements.terms && agreements.privacy && agreements.age;
  const setAllAgreed = (checked: boolean) => setAgreements({ terms: checked, privacy: checked, age: checked });

  const validate = (field: Field): string | undefined => {
    switch (field) {
      case "email":
        return EMAIL_PATTERN.test(email.trim()) ? undefined : "이메일 형식을 확인해 주세요.";
      case "password":
        return checkPassword(password, email.trim()) ?? undefined;
      case "passwordConfirm":
        return passwordConfirm === password ? undefined : "비밀번호가 서로 달라요.";
      case "nickname":
        return NICKNAME_PATTERN.test(nickname.trim())
          ? undefined
          : `닉네임은 한글·영문·숫자 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 입력해 주세요.`;
      case "agreements":
        return allAgreed ? undefined : "필수 항목에 모두 동의해 주세요.";
    }
  };

  const touch = (field: Field) => setErrors((current) => ({ ...current, [field]: validate(field) }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fields: Field[] = ["email", "password", "passwordConfirm", "nickname", "agreements"];
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
      await signup({
        email: email.trim(),
        password,
        nickname: nickname.trim(),
        agreeTerms: agreements.terms,
        agreePrivacy: agreements.privacy,
        confirmAge: agreements.age,
      });
      navigate(LOGIN_PATH, { replace: true, state: { signedUp: true } });
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      setErrors({
        email: caught.fields.email?.[0],
        password: caught.fields.password?.[0],
        nickname: caught.fields.nickname?.[0],
        agreements: caught.fields.agreeTerms?.[0] ?? caught.fields.agreePrivacy?.[0] ?? caught.fields.confirmAge?.[0],
      });
      setFormError(caught.message);
    } finally {
      // 비밀번호는 전송 후 메모리에서 제거
      setPassword("");
      setPasswordConfirm("");
      setPending(false);
    }
  };

  return {
    values: { email, password, passwordConfirm, nickname },
    setters: { setEmail, setPassword, setPasswordConfirm, setNickname },
    agreements,
    setAgreements,
    allAgreed,
    setAllAgreed,
    errors,
    touch,
    formError,
    pending,
    submit,
  };
}
