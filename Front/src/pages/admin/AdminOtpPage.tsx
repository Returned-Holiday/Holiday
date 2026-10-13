import { useRef, useState, type ClipboardEvent, type FormEvent, type KeyboardEvent } from "react";
import { Navigate, useNavigate } from "react-router";
import styled from "styled-components";
import { ADMIN_INCIDENTS_PATH } from "../../app/paths";
import { verifyOtp } from "../../features/admin/api";
import { fetchCurrentUser } from "../../features/auth/api";
import { useAuthStore } from "../../features/auth/useAuthStore";
import { ApiError } from "../../shared/api/errors";
import { Button } from "../../shared/ui/Button";
import { Icon } from "../../shared/ui/Icon";
import { textStyle } from "../../styles/typography";

const Outer = styled.div`
  display: flex;
  justify-content: center;
  padding: 96px 16px;
`;

const Card = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: min(480px, 100%);
  padding: 40px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.surface.card};
  text-align: center;

  h1 {
    ${textStyle("h1")}
  }

  p {
    ${textStyle("bodyMd")}
    color: ${({ theme }) => theme.colors.text.body};
  }
`;

const ShieldBox = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.brand.primarySoft};
  color: ${({ theme }) => theme.colors.brand.primary};
`;

const Digits = styled.fieldset`
  display: flex;
  gap: 10px;
  margin: 0;
  padding: 0;
  border: none;

  legend {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }

  input {
    width: 52px;
    height: 64px;
    border: 1.5px solid ${({ theme }) => theme.colors.text.mute};
    border-radius: ${({ theme }) => theme.radius.lg};
    ${textStyle("h2")}
    text-align: center;
  }
`;

const SubmitButton = styled(Button)`
  min-height: 60px;
`;

const Hint = styled.p`
  && {
    ${textStyle("bodySm")}
    color: ${({ theme }) => theme.colors.text.mute};
  }
`;

const ErrorText = styled.p`
  && {
    ${textStyle("labelSmStrong")}
    color: ${({ theme }) => theme.colors.status.negativeDeep};
  }
`;

const LENGTH = 6;
// 실패 사유 구분 없이 한 문구
const FAILED_MESSAGE = "인증 번호를 확인하지 못했어요. 인증 앱의 새 번호로 다시 입력해 주세요.";

export function AdminOtpPage() {
  const navigate = useNavigate();
  const otpVerified = useAuthStore((state) => state.user?.otpVerified ?? false);
  const setUser = useAuthStore((state) => state.setUser);
  const [digits, setDigits] = useState<string[]>(Array.from({ length: LENGTH }, () => ""));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  if (otpVerified) {
    return <Navigate to={ADMIN_INCIDENTS_PATH} replace />;
  }

  const setDigit = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    setDigits((current) => current.map((item, i) => (i === index ? digit : item)));
    if (digit && index < LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && digits[index] === "" && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (pasted.length === 0) {
      return;
    }
    event.preventDefault();
    setDigits(Array.from({ length: LENGTH }, (_, i) => pasted[i] ?? ""));
    refs.current[Math.min(pasted.length, LENGTH) - 1]?.focus();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = digits.join("");
    if (code.length !== LENGTH) {
      setError("6자리 숫자를 모두 입력해 주세요.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      await verifyOtp(code);
      const user = await fetchCurrentUser();
      if (user !== null) {
        setUser(user);
      }
      navigate(ADMIN_INCIDENTS_PATH, { replace: true });
    } catch (caught) {
      if (!(caught instanceof ApiError || caught instanceof TypeError)) {
        throw caught;
      }
      setError(FAILED_MESSAGE);
      setDigits(Array.from({ length: LENGTH }, () => ""));
      refs.current[0]?.focus();
    } finally {
      setPending(false);
    }
  };

  return (
    <Outer>
      <Card onSubmit={(event) => void submit(event)} noValidate aria-labelledby="otp-title">
        <ShieldBox aria-hidden="true">
          <Icon name="shield" size={26} />
        </ShieldBox>
        <h1 id="otp-title">관리자 2차 인증</h1>
        <p>인증 앱에 표시된 6자리 숫자를 입력해 주세요.</p>
        <Digits>
          <legend>인증 번호 6자리</legend>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                refs.current[index] = element;
              }}
              value={digit}
              onChange={(event) => setDigit(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={handlePaste}
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              maxLength={1}
              aria-label={`${index + 1}번째 숫자`}
            />
          ))}
        </Digits>
        {error ? <ErrorText role="alert">{error}</ErrorText> : null}
        <SubmitButton type="submit" fullWidth disabled={pending}>
          확인
        </SubmitButton>
        <Hint>1분에 5번까지 시도할 수 있어요. 틀리면 같은 안내만 보여드려요.</Hint>
      </Card>
    </Outer>
  );
}
