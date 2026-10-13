import { NavLink } from "react-router";
import styled, { css } from "styled-components";
import { mobileMedia, textStyle } from "../../styles/typography";

export const SideNavLayout = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 32px;

  ${mobileMedia} {
    flex-direction: column;
    align-items: stretch;
    gap: 20px;
  }
`;

export const SideNavPanel = styled.nav`
  position: sticky;
  top: 104px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 260px;
  flex-shrink: 0;
  padding: 20px 12px 12px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.surface.card};

  ${mobileMedia} {
    position: static;
    width: 100%;
    flex-direction: row;
    flex-wrap: nowrap;
    padding: 8px;
    overflow-x: auto;
  }
`;

export const SideNavLabel = styled.p`
  padding: 0 12px 0 0;
  ${textStyle("caption")}
  color: ${({ theme }) => theme.colors.text.mute};

  ${mobileMedia} {
    display: none;
  }
`;

const itemStyle = css`
  display: block;
  width: 100%;
  padding: 12px 14px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: none;
  ${textStyle("bodyMd")}
  color: ${({ theme }) => theme.colors.text.body};
  text-align: left;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;

  &[aria-current="page"],
  &[aria-current="true"] {
    background: ${({ theme }) => theme.colors.brand.primarySoft};
    color: ${({ theme }) => theme.colors.brand.primary};
    font-weight: 700;
  }

  ${mobileMedia} {
    width: auto;
  }
`;

export const SideNavButton = styled.button`
  ${itemStyle}
`;

export const SideNavLink = styled(NavLink)`
  ${itemStyle}
`;

export const SideNavContent = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 24px;
`;

export const PageEyebrow = styled.p`
  ${textStyle("labelSmStrong")}
  color: ${({ theme }) => theme.colors.brand.primary};
`;

export const PageTitle = styled.h1`
  ${textStyle("displayLg")}
  letter-spacing: -0.01em;

  ${mobileMedia} {
    ${textStyle("h1")}
  }
`;

export const PageLead = styled.p`
  ${textStyle("bodyLg")}
  color: ${({ theme }) => theme.colors.text.body};

  ${mobileMedia} {
    ${textStyle("bodyMd")}
  }
`;
