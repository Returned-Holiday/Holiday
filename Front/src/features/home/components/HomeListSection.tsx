import type { ReactNode } from "react";
import { Link } from "react-router";
import styled from "styled-components";
import { textStyle } from "../../../styles/typography";

const Section = styled.section`
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 4px;

  &::before {
    content: "";
    width: 36px;
    height: 3px;
    background: ${({ theme }) => theme.colors.brand.primary};
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
`;

const Title = styled.h2`
  ${textStyle("h2")}
`;

const MoreLink = styled(Link)`
  ${textStyle("bodySm")}
  color: ${({ theme }) => theme.colors.text.body};
  text-decoration: none;
  white-space: nowrap;
`;

const Body = styled.div`
  padding: 6px 20px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 20px;
  background: ${({ theme }) => theme.colors.surface.card};
`;

export const ListRows = styled.ul`
  > li + li {
    border-top: 1px solid ${({ theme }) => theme.colors.border.default};
  }
`;

export const RowLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  color: ${({ theme }) => theme.colors.text.ink};
  text-decoration: none;
`;

export const RowTitle = styled.span`
  flex: 1;
  min-width: 0;
  overflow: hidden;
  ${textStyle("bodyMd")}
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const RowMeta = styled.span`
  flex-shrink: 0;
  ${textStyle("bodySm")}
  color: ${({ theme }) => theme.colors.text.mute};
`;

export const ListMessage = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px 0;
  ${textStyle("bodySm")}
  color: ${({ theme }) => theme.colors.text.body};
  text-align: center;
`;

type HomeListSectionProps = {
  id: string;
  title: string;
  moreLabel: string;
  moreTo: string;
  children: ReactNode;
};

export function HomeListSection({ id, title, moreLabel, moreTo, children }: HomeListSectionProps) {
  return (
    <Section aria-labelledby={id}>
      <Header>
        <Title id={id}>{title}</Title>
        <MoreLink to={moreTo}>{moreLabel}</MoreLink>
      </Header>
      <Body>{children}</Body>
    </Section>
  );
}
