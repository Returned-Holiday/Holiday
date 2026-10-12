import { Link } from "react-router";
import styled from "styled-components";
import { MYPAGE_PATH, OCR_PATH, SIGNUP_PATH } from "../../../app/paths";
import { Button, ButtonLink } from "../../../shared/ui/Button";
import { TextField } from "../../../shared/ui/TextField";
import { mobileMedia, textStyle } from "../../../styles/typography";
import { useAuthStore } from "../useAuthStore";
import { useLogin } from "../useLogin";

const Box = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 380px;
  flex-shrink: 0;
  padding: 36px 32px 32px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.surface.card};
  text-align: center;

  ${mobileMedia} {
    width: 100%;
    padding: 28px 20px;
  }
`;

const Title = styled.h2`
  ${textStyle("h2")}
`;

const Description = styled.p`
  ${textStyle("bodySm")}
  color: ${({ theme }) => theme.colors.text.body};
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 14px;
  text-align: left;
`;

const SubmitButton = styled(Button)`
  min-height: 56px;
`;

const ErrorText = styled.p`
  ${textStyle("labelSmStrong")}
  color: ${({ theme }) => theme.colors.status.negativeDeep};
`;

const SignupRow = styled.p`
  display: flex;
  justify-content: center;
  gap: 8px;
  ${textStyle("bodySm")}
  color: ${({ theme }) => theme.colors.text.body};

  a {
    ${textStyle("labelSmStrong")}
    color: ${({ theme }) => theme.colors.brand.primary};
    text-decoration: none;
  }
`;

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: auto;
`;

function LoginForm() {
  const { email, setEmail, password, setPassword, error, pending, submit } = useLogin();
  return (
    <>
      <Title>로그인 해주세요</Title>
      <Description>
        맞춤 대응 가이드와 문자 캡처 인식은
        <br />
        로그인 후 이용할 수 있어요.
      </Description>
      <Form onSubmit={(event) => void submit(event)} noValidate>
        <TextField
          label="이메일"
          hideLabel
          appearance="soft"
          type="email"
          autoComplete="username"
          placeholder="이메일"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          maxLength={254}
        />
        <TextField
          label="비밀번호"
          hideLabel
          appearance="soft"
          type="password"
          autoComplete="current-password"
          placeholder="비밀번호"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          maxLength={64}
        />
        {error ? <ErrorText role="alert">{error}</ErrorText> : null}
        <SubmitButton type="submit" fullWidth disabled={pending}>
          로그인
        </SubmitButton>
      </Form>
      <SignupRow>
        처음이신가요? <Link to={SIGNUP_PATH}>회원가입</Link>
      </SignupRow>
    </>
  );
}

export function LoginCard() {
  const status = useAuthStore((state) => state.status);
  const nickname = useAuthStore((state) => state.user?.nickname);

  if (status === "loading") {
    return <Box aria-busy="true" />;
  }

  if (status === "authenticated") {
    return (
      <Box>
        <Title>{nickname} 님, 반가워요</Title>
        <Description>진행 중인 대응을 이어서 하거나 받은 문자로 사고를 찾아보세요.</Description>
        <Actions>
          <ButtonLink to={MYPAGE_PATH} fullWidth>
            내 대응 이어서 하기
          </ButtonLink>
          <ButtonLink to={OCR_PATH} variant="tertiary" fullWidth>
            문자로 사고 찾기
          </ButtonLink>
        </Actions>
      </Box>
    );
  }

  return (
    <Box>
      <LoginForm />
    </Box>
  );
}
