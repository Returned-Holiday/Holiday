import { useState, type SubmitEvent } from "react";
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
type SignupValues = { email: string; password: string; passwordConfirm: string; nickname: string; agreements: Agreements };

const FIELDS: Field[] = ["email", "password", "passwordConfirm", "nickname", "agreements"];
// 값이 바뀌면 다시 볼 칸 (비밀번호는 이메일 아이디 규칙, 확인 칸은 비밀번호에 영향받음)
const AFFECTED: Record<keyof SignupValues, Field[]> = {
  email: ["email", "password"],
  password: ["password", "passwordConfirm"],
  passwordConfirm: ["passwordConfirm"],
  nickname: ["nickname"],
  agreements: ["agreements"],
};

function validateSignup(field: Field, v: SignupValues): string | undefined {
  switch (field) {
    case "email":
      return EMAIL_PATTERN.test(v.email.trim()) ? undefined : "이메일 형식을 확인해 주세요.";
    case "password":
      return checkPassword(v.password, v.email.trim()) ?? undefined;
    case "passwordConfirm":
      return v.passwordConfirm === v.password ? undefined : "비밀번호가 서로 달라요.";
    case "nickname":
      return NICKNAME_PATTERN.test(v.nickname.trim())
        ? undefined
        : `닉네임은 한글·영문·숫자 ${NICKNAME_MIN}~${NICKNAME_MAX}자로 입력해 주세요.`;
    case "agreements":
      return v.agreements.terms && v.agreements.privacy && v.agreements.age ? undefined : "필수 항목에 모두 동의해 주세요.";
  }
}

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
  const current: SignupValues = { email, password, passwordConfirm, nickname, agreements };
  const validate = (field: Field) => validateSignup(field, current);

  // 바꾼 칸과 영향받는 칸 중 에러가 떠 있는 칸만 다시 검사 (맞으면 바로 지움, 다른 칸의 서버 문구는 유지)
  const change = <K extends keyof SignupValues>(key: K, setter: (value: SignupValues[K]) => void) => (value: SignupValues[K]) => {
    setter(value);
    const next = { ...current, [key]: value };
    setErrors((shown) => {
      const updated = { ...shown };
      for (const field of AFFECTED[key]) {
        if (shown[field]) {
          updated[field] = validateSignup(field, next);
        }
      }
      return updated;
    });
  };
  const setAgreementsValue = (update: (prev: Agreements) => Agreements) => change("agreements", setAgreements)(update(agreements));
  const setAllAgreed = (checked: boolean) => change("agreements", setAgreements)({ terms: checked, privacy: checked, age: checked });

  const touch = (field: Field) => setErrors((current) => ({ ...current, [field]: validate(field) }));

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: Errors = {};
    for (const field of FIELDS) {
      next[field] = validate(field);
    }
    setErrors(next);
    if (FIELDS.some((field) => next[field])) {
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
      void navigate(LOGIN_PATH, { replace: true, state: { signedUp: true } });
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
    setters: {
      setEmail: change("email", setEmail),
      setPassword: change("password", setPassword),
      setPasswordConfirm: change("passwordConfirm", setPasswordConfirm),
      setNickname: change("nickname", setNickname),
    },
    agreements,
    setAgreements: setAgreementsValue,
    allAgreed,
    setAllAgreed,
    errors,
    touch,
    formError,
    pending,
    submit,
  };
}
