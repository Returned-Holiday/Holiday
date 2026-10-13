import { Link, Navigate } from "react-router";
import styled from "styled-components";
import { HOME_PATH, LOGIN_PATH, PRIVACY_PATH, TERMS_PATH } from "../../app/paths";
import {
  AuthCard,
  AuthForm,
  AuthHeading,
  AuthLead,
  AuthTitle,
  CharacterBubble,
  FormError,
  InfoNote,
  SwitchRow,
} from "../../features/auth/components/AuthCard";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_PATTERN_TEXT,
  PASSWORD_RULE_TEXT,
} from "../../features/auth/password";
import { useAuthStore } from "../../features/auth/useAuthStore";
import { NICKNAME_MAX, useSignupForm } from "../../features/auth/useSignupForm";
import { Button } from "../../shared/ui/Button";
import { Checkbox } from "../../shared/ui/Checkbox";
import { TextField } from "../../shared/ui/TextField";
import { textStyle } from "../../styles/typography";

const Agreements = styled.fieldset`
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  padding: 16px 20px;
  border: none;
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface.canvas};

  legend {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
`;

const AgreeRow = styled.div<{ $divider?: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: ${({ $divider }) => ($divider ? "8px 0 14px" : "8px 0")};
  border-bottom: ${({ theme, $divider }) => ($divider ? `1px solid ${theme.colors.border.default}` : "none")};

  a {
    flex-shrink: 0;
    ${textStyle("labelSmStrong")}
    color: ${({ theme }) => theme.colors.brand.primary};
    text-decoration: none;
  }
`;

const SubmitButton = styled(Button)`
  min-height: 60px;
`;

const RuleHint = styled.span`
  display: block;
`;

export function SignupPage() {
  const status = useAuthStore((state) => state.status);
  const form = useSignupForm();
  const { values, setters, errors } = form;

  if (status === "authenticated") {
    return <Navigate to={HOME_PATH} replace />;
  }

  const confirmMatches =
    values.passwordConfirm.length > 0 && values.passwordConfirm === values.password && !errors.passwordConfirm;

  return (
    <AuthCard width={520} labelledBy="signup-title">
      <CharacterBubble illustration="shield" width={108}>
        꼭 필요한 정보만 받아요!
      </CharacterBubble>
      <AuthHeading>
        <AuthTitle id="signup-title">회원가입</AuthTitle>
        <AuthLead>가입하면 내 상황에 맞는 대응 체크리스트를 저장하고 이어서 볼 수 있어요.</AuthLead>
      </AuthHeading>
      <AuthForm onSubmit={(event) => void form.submit(event)} noValidate>
        <TextField
          label="이메일"
          type="email"
          autoComplete="email"
          placeholder="example@email.com"
          value={values.email}
          onChange={(event) => setters.setEmail(event.target.value)}
          onBlur={() => form.touch("email")}
          maxLength={254}
          error={errors.email}
        />
        <TextField
          label="비밀번호"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={(event) => setters.setPassword(event.target.value)}
          onBlur={() => form.touch("password")}
          maxLength={PASSWORD_MAX_LENGTH}
          hint={
            <>
              <RuleHint>{PASSWORD_RULE_TEXT}</RuleHint>
              <RuleHint>{PASSWORD_PATTERN_TEXT}</RuleHint>
            </>
          }
          error={errors.password}
        />
        <TextField
          label="비밀번호 확인"
          type="password"
          autoComplete="new-password"
          value={values.passwordConfirm}
          onChange={(event) => setters.setPasswordConfirm(event.target.value)}
          onBlur={() => form.touch("passwordConfirm")}
          maxLength={PASSWORD_MAX_LENGTH}
          error={errors.passwordConfirm}
          valid={confirmMatches ? "비밀번호가 일치해요" : undefined}
        />
        <TextField
          label="닉네임"
          autoComplete="nickname"
          placeholder={`2~${NICKNAME_MAX}자`}
          value={values.nickname}
          onChange={(event) => setters.setNickname(event.target.value)}
          onBlur={() => form.touch("nickname")}
          maxLength={NICKNAME_MAX}
          hint="제보 내역에 표시돼요. 실명은 쓰지 않아도 돼요"
          error={errors.nickname}
        />
        <Agreements aria-describedby={errors.agreements ? "signup-agreements-error" : undefined}>
          <legend>약관 동의</legend>
          <AgreeRow $divider>
            <Checkbox
              strong
              label="전체 동의하기"
              checked={form.allAgreed}
              onChange={(event) => form.setAllAgreed(event.target.checked)}
            />
          </AgreeRow>
          <AgreeRow>
            <Checkbox
              label="[필수] 이용약관 동의"
              checked={form.agreements.terms}
              onChange={(event) => form.setAgreements((current) => ({ ...current, terms: event.target.checked }))}
            />
            <Link to={TERMS_PATH} target="_blank" rel="noopener noreferrer">
              보기
            </Link>
          </AgreeRow>
          <AgreeRow>
            <Checkbox
              label="[필수] 개인정보 수집·이용 동의"
              checked={form.agreements.privacy}
              onChange={(event) => form.setAgreements((current) => ({ ...current, privacy: event.target.checked }))}
            />
            <Link to={PRIVACY_PATH} target="_blank" rel="noopener noreferrer">
              보기
            </Link>
          </AgreeRow>
          <AgreeRow>
            <Checkbox
              label="[필수] 만 14세 이상이에요"
              checked={form.agreements.age}
              onChange={(event) => form.setAgreements((current) => ({ ...current, age: event.target.checked }))}
            />
          </AgreeRow>
        </Agreements>
        {errors.agreements ? (
          <FormError id="signup-agreements-error" role="alert">
            {errors.agreements}
          </FormError>
        ) : null}
        <InfoNote>이메일 · 비밀번호 · 닉네임만 받아요. 탈퇴하면 모든 기록이 바로 삭제돼요.</InfoNote>
        {form.formError ? <FormError role="alert">{form.formError}</FormError> : null}
        <SubmitButton type="submit" fullWidth disabled={form.pending}>
          가입하기
        </SubmitButton>
      </AuthForm>
      <SwitchRow>
        이미 계정이 있나요? <Link to={LOGIN_PATH}>로그인</Link>
      </SwitchRow>
    </AuthCard>
  );
}
