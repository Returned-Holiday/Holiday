import { Link, NavLink, Outlet } from "react-router";
import styled from "styled-components";
import { useAuthStore } from "../../features/auth/useAuthStore";
import { useLogout } from "../../features/auth/useLogout";
import { useScrolled } from "../../shared/hooks/useScrolled";
import { mobileMedia, textStyle } from "../../styles/typography";
import {
  ADMIN_ACTIONS_PATH,
  ADMIN_COMPANIES_PATH,
  ADMIN_INCIDENTS_PATH,
  ADMIN_REPORTS_PATH,
} from "../paths";
import { SessionExpiredModal } from "./SessionExpiredModal";
import { stickyBar, type StickyBarProps } from "./stickyBar";

const Shell = styled.div`
  min-height: 100vh;
  background: ${({ theme }) => theme.colors.surface.canvas};
`;

const Bar = styled.header<StickyBarProps>`
  ${stickyBar}
  background: ${({ theme }) => theme.colors.surface.navy};
  color: ${({ theme }) => theme.colors.text.onDark};
`;

const Inner = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px 32px;
  max-width: ${({ theme }) => theme.layout.contentWidth};
  min-height: 72px;
  margin: 0 auto;

  ${mobileMedia} {
    padding: 12px ${({ theme }) => theme.layout.mobileGutter};
  }
`;

const Brand = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: inherit;
  text-decoration: none;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.06em;
`;

const RoleTag = styled.span`
  padding: 3px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.accent.sky};
  color: ${({ theme }) => theme.colors.text.ink};
  ${textStyle("caption")}
  letter-spacing: 0;
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: 32px;

  ${mobileMedia} {
    gap: 20px;
    overflow-x: auto;
  }
`;

const MenuLink = styled(NavLink)`
  ${textStyle("bodyMd")}
  color: ${({ theme }) => theme.colors.text.onDarkSub};
  text-decoration: none;
  white-space: nowrap;

  &[aria-current="page"] {
    color: ${({ theme }) => theme.colors.text.onDark};
    font-weight: 700;
  }
`;

const LogoutButton = styled.button`
  padding: 6px 14px;
  border: 1px solid ${({ theme }) => theme.colors.text.onDarkSub};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: none;
  ${textStyle("bodySm")}
  color: ${({ theme }) => theme.colors.text.onDark};
  cursor: pointer;
`;

export function AdminLayout() {
  const otpVerified = useAuthStore((state) => state.user?.otpVerified ?? false);
  const { logout, pending } = useLogout();
  const scrolled = useScrolled();

  return (
    <Shell>
      <Bar $scrolled={scrolled}>
        <Inner>
          <Brand to={ADMIN_INCIDENTS_PATH}>
            SEALD <RoleTag>관리자</RoleTag>
          </Brand>
          <Nav aria-label="관리자 메뉴">
            {otpVerified ? (
              <>
                <MenuLink to={ADMIN_INCIDENTS_PATH}>사고 관리</MenuLink>
                <MenuLink to={ADMIN_COMPANIES_PATH}>기업 관리</MenuLink>
                <MenuLink to={ADMIN_ACTIONS_PATH}>조치 관리</MenuLink>
                <MenuLink to={ADMIN_REPORTS_PATH}>제보 검수</MenuLink>
              </>
            ) : null}
            <LogoutButton type="button" onClick={() => void logout()} disabled={pending}>
              로그아웃
            </LogoutButton>
          </Nav>
        </Inner>
      </Bar>
      <main>
        <Outlet />
      </main>
      <SessionExpiredModal />
    </Shell>
  );
}
