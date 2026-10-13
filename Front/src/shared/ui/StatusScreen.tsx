import type { ReactNode } from "react";
import styled from "styled-components";
import { mobileMedia, textStyle } from "../../styles/typography";
import { Illustration, type IllustrationName } from "./Illustration";

const Wrap = styled.div`
  display: flex;
  justify-content: center;
  padding: 80px ${({ theme }) => theme.layout.mobileGutter} 120px;

  ${mobileMedia} {
    padding: 48px ${({ theme }) => theme.layout.mobileGutter} 72px;
  }
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: min(560px, 100%);
  text-align: center;
`;

const Code = styled.p`
  ${textStyle("displayXl")}
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.colors.brand.primary};
`;

const Title = styled.h1`
  ${textStyle("h1")}

  ${mobileMedia} {
    ${textStyle("h2")}
  }
`;

const Description = styled.p`
  ${textStyle("bodyLg")}
  color: ${({ theme }) => theme.colors.text.body};
  white-space: pre-line;

  ${mobileMedia} {
    ${textStyle("bodyMd")}
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
`;

const Note = styled.p`
  padding: 10px 16px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface.card};
  ${textStyle("bodySm")}
  color: ${({ theme }) => theme.colors.text.body};
`;

type StatusScreenProps = {
  illustration: IllustrationName;
  illustrationWidth: number;
  code?: string;
  title: string;
  description: string;
  actions?: ReactNode;
  note?: ReactNode;
};

export function StatusScreen({
  illustration,
  illustrationWidth,
  code,
  title,
  description,
  actions,
  note,
}: StatusScreenProps) {
  return (
    <Wrap>
      <Body>
        <Illustration name={illustration} width={illustrationWidth} />
        {code ? <Code aria-hidden="true">{code}</Code> : null}
        <Title>{title}</Title>
        <Description>{description}</Description>
        {actions ? <Actions>{actions}</Actions> : null}
        {note ? <Note>{note}</Note> : null}
      </Body>
    </Wrap>
  );
}
