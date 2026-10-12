import type { ReactNode } from "react";
import { Outlet } from "react-router";
import styled from "styled-components";
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

export function SiteLayout({ children }: { children?: ReactNode }) {
  return (
    <Shell>
      <SkipLink href="#main">본문으로 건너뛰기</SkipLink>
      <SiteHeader />
      <Main id="main" tabIndex={-1}>
        {children ?? <Outlet />}
      </Main>
      <SiteFooter />
    </Shell>
  );
}
