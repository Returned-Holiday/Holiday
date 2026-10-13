import type { ReactNode } from "react";
import styled from "styled-components";
import bubbleTailLeft from "../../../assets/icons/bubble-tail-left.svg";
import bubbleTailLeftWarning from "../../../assets/icons/bubble-tail-left-warning.svg";
import { Illustration, type IllustrationName } from "../../../shared/ui/Illustration";
import { mobileMedia, textStyle } from "../../../styles/typography";

const Outer = styled.div<{ $top: number }>`
  display: flex;
  justify-content: center;
  padding: ${({ $top }) => `${$top}px`} ${({ theme }) => theme.layout.mobileGutter} 96px;

  ${mobileMedia} {
    padding-top: 24px;
    padding-bottom: 48px;
  }
`;

const Box = styled.section<{ $width: number; $bordered: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 22px;
  width: min(${({ $width }) => `${$width}px`}, 100%);
  padding: 40px 44px;
  border: 1px solid
    ${({ theme, $bordered }) => ($bordered ? theme.colors.border.default : "transparent")};
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.surface.card};

  ${mobileMedia} {
    padding: 28px 20px;
  }
`;

export const AuthTitle = styled.h1`
  ${textStyle("h1")}
`;

export const AuthLead = styled.p`
  ${textStyle("bodyMd")}
  color: ${({ theme }) => theme.colors.text.body};
`;

export const AuthHeading = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const AuthForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 22px;
`;

export const InfoNote = styled.p<{ $tone?: "positive" | "primary" }>`
  padding: 14px 18px;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.accent.skyPale};
  ${textStyle("bodySm")}
  color: ${({ theme, $tone = "primary" }) =>
    $tone === "positive" ? theme.colors.status.positiveDeep : theme.colors.brand.primary};
`;

export const FormError = styled.p`
  ${textStyle("labelSmStrong")}
  color: ${({ theme }) => theme.colors.status.negativeDeep};
`;

export const SwitchRow = styled.p`
  display: flex;
  justify-content: center;
  gap: 8px;
  ${textStyle("bodySm")}
  color: ${({ theme }) => theme.colors.text.body};

  a {
    ${textStyle("labelSmStrong")}
    color: ${({ theme }) => theme.colors.brand.primary};
    text-decoration: none;
  }
`;

type AuthCardProps = {
  width: number;
  top?: number;
  bordered?: boolean;
  labelledBy: string;
  children: ReactNode;
};

export function AuthCard({ width, top = 56, bordered = true, labelledBy, children }: AuthCardProps) {
  return (
    <Outer $top={top}>
      <Box $width={width} $bordered={bordered} aria-labelledby={labelledBy}>
        {children}
      </Box>
    </Outer>
  );
}

const Character = styled.div`
  display: flex;
  align-items: center;
`;

const Bubble = styled.p<{ $warning: boolean }>`
  padding: 10px 16px;
  border-radius: 14px;
  background: ${({ theme, $warning }) =>
    $warning ? theme.colors.status.leakPale : theme.colors.brand.primarySoft};
  ${textStyle("labelSmStrong")}
  color: ${({ theme, $warning }) => ($warning ? theme.colors.status.leakDeep : theme.colors.brand.primary)};
`;

type CharacterBubbleProps = {
  illustration: IllustrationName;
  width: number;
  warning?: boolean;
  children: ReactNode;
};

export function CharacterBubble({ illustration, width, warning = false, children }: CharacterBubbleProps) {
  return (
    <Character>
      <Illustration name={illustration} width={width} />
      <img src={warning ? bubbleTailLeftWarning : bubbleTailLeft} width={10} height={16} alt="" />
      <Bubble $warning={warning}>{children}</Bubble>
    </Character>
  );
}
