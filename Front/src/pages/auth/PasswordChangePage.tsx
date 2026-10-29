import { Link, useNavigate } from "react-router";
import styled from "styled-components";
import { HOME_PATH, MYPAGE_PATH } from "../../app/paths";
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
import { PASSWORD_MAX_LENGTH, PASSWORD_RULE_TEXT } from "../../features/auth/password";
import { useAuthStore } from "../../features/auth/useAuthStore";
import { usePasswordChangeForm } from "../../features/auth/usePasswordChangeForm";
import { useDocumentTitle } from "../../shared/lib/useDocumentTitle";
import { Button } from "../../shared/ui/Button";
import { TextField } from "../../shared/ui/TextField";

const SubmitButton = styled(Button)`
  min-height: 60px;
`;

export function PasswordChangePage() {
  useDocumentTitle("비밀번호 변경");
  const navigate = useNavigate();
  const forced = useAuthStore((state) => state.user?.passwordExpired ?? false);
  const form = usePasswordChangeForm(() => {
    void navigate(forced ? HOME_PATH : MYPAGE_PATH, { replace: true, state: { passwordChanged: true } });
  });
  const { values, setters, errors } = form;

  return (
    <AuthCard width={520} labelledBy="password-title">
      {forced ? (
        <CharacterBubble illustration="alert" width={107} warning>
          비밀번호를 바꾼 지 90일이 지났어요!
        </CharacterBubble>
      ) : null}
      <AuthHeading>
        <AuthTitle id="password-title">비밀번호 변경</AuthTitle>
        <AuthLead>
          {forced
            ? "안전을 위해 비밀번호를 바꿔야 다른 메뉴를 쓸 수 있어요."
            : "비밀번호는 바꾼 뒤 하루가 지나야 다시 바꿀 수 있어요."}
        </AuthLead>
      </AuthHeading>
      <AuthForm onSubmit={(event) => void form.submit(event)} noValidate>
        <TextField
          label="현재 비밀번호"
          type="password"
          autoComplete="current-password"
          placeholder="현재 비밀번호 입력"
          value={values.currentPassword}
          onChange={(event) => setters.setCurrentPassword(event.target.value)}
          onBlur={() => form.touch("currentPassword")}
          maxLength={PASSWORD_MAX_LENGTH}
          error={errors.currentPassword}
        />
        <TextField
          label="새 비밀번호"
          type="password"
          autoComplete="new-password"
          placeholder="새 비밀번호 입력"
          value={values.newPassword}
          onChange={(event) => setters.setNewPassword(event.target.value)}
          onBlur={() => form.touch("newPassword")}
          maxLength={PASSWORD_MAX_LENGTH}
          hint={PASSWORD_RULE_TEXT}
          error={errors.newPassword}
        />
        <TextField
          label="새 비밀번호 확인"
          type="password"
          autoComplete="new-password"
          placeholder="새 비밀번호 다시 입력"
          value={values.newPasswordConfirm}
          onChange={(event) => setters.setNewPasswordConfirm(event.target.value)}
          onBlur={() => form.touch("newPasswordConfirm")}
          maxLength={PASSWORD_MAX_LENGTH}
          error={errors.newPasswordConfirm}
        />
        <InfoNote>비밀번호를 바꾸면 다른 기기에서는 자동으로 로그아웃돼요.</InfoNote>
        {form.formError ? <FormError role="alert">{form.formError}</FormError> : null}
        <SubmitButton type="submit" fullWidth disabled={form.pending}>
          비밀번호 변경
        </SubmitButton>
      </AuthForm>
      {forced ? null : (
        <SwitchRow>
          <Link to={MYPAGE_PATH}>마이페이지로 돌아가기</Link>
        </SwitchRow>
      )}
    </AuthCard>
  );
}
