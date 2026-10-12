import { useLocation, useNavigate } from "react-router";
import styled from "styled-components";
import { useAuthStore } from "../../features/auth/useAuthStore";
import { Button } from "../../shared/ui/Button";
import { Illustration } from "../../shared/ui/Illustration";
import { Modal } from "../../shared/ui/Modal";
import { textStyle } from "../../styles/typography";
import { LOGIN_PATH } from "../paths";

const Description = styled.p`
  ${textStyle("bodyMd")}
  color: ${({ theme }) => theme.colors.text.body};
`;

const ConfirmButton = styled(Button)`
  min-height: 58px;
`;

export function SessionExpiredModal() {
  const expired = useAuthStore((state) => state.sessionExpired);
  const clear = useAuthStore((state) => state.clearSessionExpired);
  const navigate = useNavigate();
  const location = useLocation();

  const goToLogin = () => {
    clear();
    navigate(LOGIN_PATH, { replace: true, state: { from: location.pathname } });
  };

  return (
    <Modal
      open={expired}
      dismissible={false}
      centered
      onClose={goToLogin}
      illustration={<Illustration name="sleep" width={170} />}
      title={
        <>
          오랫동안 움직임이 없어서
          <br />
          로그아웃됐어요
        </>
      }
    >
      <Description>
        15분 동안 활동이 없으면
        <br />
        안전을 위해 자동으로 로그아웃돼요.
        <br />
        다시 로그인하면 보던 화면으로 돌아가요.
      </Description>
      <ConfirmButton fullWidth onClick={goToLogin}>
        다시 로그인
      </ConfirmButton>
    </Modal>
  );
}
