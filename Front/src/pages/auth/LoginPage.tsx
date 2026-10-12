import { Link, Navigate, useLocation, useNavigate } from "react-router";
import styled from "styled-components";
import { HOME_PATH, SIGNUP_PATH } from "../../app/paths";
import {
  AuthCard,
  AuthForm,
  AuthLead,
  AuthTitle,
  FormError,
  InfoNote,
  SwitchRow,
} from "../../features/auth/components/AuthCard";
import { useAuthStore } from "../../features/auth/useAuthStore";
import { useLogin } from "../../features/auth/useLogin";
import { isRecord } from "../../shared/lib/guards";
import { isSafeInternalPath } from "../../shared/lib/validators";
import { Button } from "../../shared/ui/Button";
import { Icon } from "../../shared/ui/Icon";
import { TextField } from "../../shared/ui/TextField";
import { textStyle } from "../../styles/typography";

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

const SubmitButton = styled(Button)`
  min-height: 60px;
`;

const Notice = styled.p`
  ${textStyle("labelSmStrong")}
  color: ${({ theme }) => theme.colors.status.positiveDeep};
`;

const ForgotNote = styled.p`
  ${textStyle("bodySm")}
  color: ${({ theme }) => theme.colors.text.mute};
  text-align: center;
`;

function readState(state: unknown): { from: string; signedUp: boolean } {
  if (!isRecord(state)) {
    return { from: HOME_PATH, signedUp: false };
  }
  // 복귀 경로는 내부 경로만 (오픈 리다이렉트 차단)
  const from = isSafeInternalPath(state.from) ? state.from : HOME_PATH;
  return { from, signedUp: state.signedUp === true };
}

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const status = useAuthStore((state) => state.status);
  const { from, signedUp } = readState(location.state);
  const { email, setEmail, password, setPassword, error, pending, submit } = useLogin(() =>
    navigate(from, { replace: true }),
  );

  if (status === "authenticated" && !pending) {
    return <Navigate to={from} replace />;
  }

  return (
    <AuthCard width={480} top={72} bordered={false} labelledBy="login-title">
      <ShieldBox aria-hidden="true">
        <Icon name="shield" size={26} />
      </ShieldBox>
      <AuthTitle id="login-title">로그인</AuthTitle>
      <AuthLead>맞춤 대응 가이드와 문자 캡처 인식은 로그인 후 쓸 수 있어요.</AuthLead>
      {signedUp ? <Notice role="status">가입이 끝났어요. 로그인해 주세요.</Notice> : null}
      <AuthForm onSubmit={(event) => void submit(event)} noValidate>
        <TextField
          label="이메일"
          type="email"
          autoComplete="username"
          placeholder="example@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          maxLength={254}
        />
        <TextField
          label="비밀번호"
          type="password"
          autoComplete="current-password"
          placeholder="비밀번호 입력"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          maxLength={64}
          hint="비밀번호를 5번 틀리면 30분 동안 로그인할 수 없어요"
        />
        {error ? <FormError role="alert">{error}</FormError> : null}
        <SubmitButton type="submit" fullWidth disabled={pending}>
          로그인
        </SubmitButton>
      </AuthForm>
      <SwitchRow>
        처음이신가요? <Link to={SIGNUP_PATH}>회원가입</Link>
      </SwitchRow>
      <ForgotNote>비밀번호 찾기는 제공하지 않아요. 비밀번호를 잊었다면 다른 이메일로 새로 가입해 주세요.</ForgotNote>
      <InfoNote $tone="positive">
        회원가입 때는 이메일 · 비밀번호 · 닉네임만 받아요. 탈퇴하면 바로 삭제돼요.
      </InfoNote>
    </AuthCard>
  );
}
