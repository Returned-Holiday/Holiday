import { NavLink } from "react-router";
import styled from "styled-components";
import { useAuthStore } from "../../features/auth/useAuthStore";
import { useLogout } from "../../features/auth/useLogout";
import { ButtonLink } from "../../shared/ui/Button";
import { Logo } from "../../shared/ui/Logo";
import { mobileMedia, textStyle } from "../../styles/typography";
import { FAQ_PATH, INCIDENTS_PATH, LOGIN_PATH, MYPAGE_PATH, REPORT_NEW_PATH } from "../paths";

const Bar = styled.header`
  background: ${({ theme }) => theme.colors.surface.card};
`;

const Inner = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 32px;
  max-width: ${({ theme }) => theme.layout.contentWidth};
  min-height: 80px;
  margin: 0 auto;

  ${mobileMedia} {
    padding: 12px ${({ theme }) => theme.layout.mobileGutter};
  }
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: 32px;

  ${mobileMedia} {
    order: 3;
    width: 100%;
    gap: 20px;
    overflow-x: auto;
  }
`;

const MenuLink = styled(NavLink)`
  ${textStyle("bodyMdStrong")}
  color: ${({ theme }) => theme.colors.text.ink};
  text-decoration: none;
  white-space: nowrap;

  &[aria-current="page"] {
    color: ${({ theme }) => theme.colors.brand.primary};
  }
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
`;

const TextButton = styled.button`
  padding: 0;
  border: none;
  background: none;
  ${textStyle("bodyMd")}
  color: ${({ theme }) => theme.colors.text.body};
  cursor: pointer;
`;

export function SiteHeader() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const { logout, pending } = useLogout();

  const logoutButton = (
    <TextButton type="button" onClick={() => void logout()} disabled={pending}>
      로그아웃
    </TextButton>
  );

  // 비밀번호 만료 → 다른 메뉴 숨김 (서버도 403)
  if (user?.passwordExpired) {
    return (
      <Bar>
        <Inner>
          <Logo />
          <Actions>{logoutButton}</Actions>
        </Inner>
      </Bar>
    );
  }

  return (
    <Bar>
      <Inner>
        <Logo />
        <Nav aria-label="주요 메뉴">
          <MenuLink to={INCIDENTS_PATH}>사고 조회</MenuLink>
          <MenuLink to={FAQ_PATH}>유출 대응 상식</MenuLink>
          <MenuLink to={REPORT_NEW_PATH}>사고 제보</MenuLink>
        </Nav>
        <Actions>
          {status === "authenticated" ? (
            <>
              {logoutButton}
              <ButtonLink to={MYPAGE_PATH} size="sm">
                마이페이지
              </ButtonLink>
            </>
          ) : null}
          {status === "anonymous" ? (
            <ButtonLink to={LOGIN_PATH} size="sm">
              로그인
            </ButtonLink>
          ) : null}
        </Actions>
      </Inner>
    </Bar>
  );
}
