import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import styled from "styled-components";
import { useAuthStore } from "../../features/auth/useAuthStore";
import { PASSWORD_CHANGE_PATH, PRIVACY_PATH, TERMS_PATH } from "../paths";
import { SessionExpiredModal } from "./SessionExpiredModal";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

const Shell = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
`;

const Main = styled.main`
  flex: 1;
`;

const SkipLink = styled.a`
  position: absolute;
  top: -100px;
  left: 16px;
  z-index: 20;
  padding: 8px 16px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.brand.primary};
  color: ${({ theme }) => theme.colors.text.onDark};

  &:focus {
    top: 16px;
  }
`;

// 비밀번호 만료 → 변경 화면만 (서버도 다른 API 403)
const EXPIRED_ALLOWED_PATHS = [PASSWORD_CHANGE_PATH, PRIVACY_PATH, TERMS_PATH];

export function SiteLayout({ children }: { children?: ReactNode }) {
  const passwordExpired = useAuthStore((state) => state.user?.passwordExpired ?? false);
  const { pathname } = useLocation();

  if (passwordExpired && !EXPIRED_ALLOWED_PATHS.includes(pathname)) {
    return <Navigate to={PASSWORD_CHANGE_PATH} replace />;
  }

  return (
    <Shell>
      <SkipLink href="#main">본문으로 건너뛰기</SkipLink>
      <SiteHeader />
      <Main id="main" tabIndex={-1}>
        {children ?? <Outlet />}
      </Main>
      <SiteFooter />
      <SessionExpiredModal />
    </Shell>
  );
}
