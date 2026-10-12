import type { ButtonHTMLAttributes } from "react";
import { Link, type LinkProps } from "react-router";
import styled, { css } from "styled-components";
import { textStyle } from "../../styles/typography";

export type ButtonVariant = "primary" | "accent" | "secondary" | "tertiary" | "danger";
export type ButtonSize = "md" | "sm";

type StyleProps = {
  $variant: ButtonVariant;
  $size: ButtonSize;
  $fullWidth: boolean;
};

const variantStyles: Record<ButtonVariant, ReturnType<typeof css>> = {
  primary: css`
    background: ${({ theme }) => theme.colors.brand.primary};
    color: ${({ theme }) => theme.colors.text.onDark};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.colors.brand.primaryPressed};
    }
  `,
  accent: css`
    background: ${({ theme }) => theme.colors.accent.sky};
    color: ${({ theme }) => theme.colors.text.ink};
  `,
  secondary: css`
    background: ${({ theme }) => theme.colors.brand.primarySoft};
    color: ${({ theme }) => theme.colors.brand.primary};
  `,
  tertiary: css`
    background: ${({ theme }) => theme.colors.surface.card};
    color: ${({ theme }) => theme.colors.text.ink};
    border-color: ${({ theme }) => theme.colors.text.ink};
  `,
  danger: css`
    background: ${({ theme }) => theme.colors.status.negativeDeep};
    color: ${({ theme }) => theme.colors.text.onDark};
  `,
};

const buttonStyle = css<StyleProps>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: ${({ $fullWidth }) => ($fullWidth ? "100%" : "auto")};
  min-height: ${({ $size }) => ($size === "md" ? "54px" : "46px")};
  padding: 0 ${({ $size }) => ($size === "md" ? "28px" : "22px")};
  border: 1.5px solid transparent;
  border-radius: ${({ theme }) => theme.radius.xl};
  ${textStyle("button")}
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  ${({ $variant }) => variantStyles[$variant]}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const StyledButton = styled.button<StyleProps>`
  ${buttonStyle}
`;

const StyledLink = styled(Link)<StyleProps>`
  ${buttonStyle}
`;

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <StyledButton
      type={type}
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
      {...rest}
    />
  );
}

type ButtonLinkProps = CommonProps & LinkProps;

// 내부 경로 전용, 외부 링크는 SafeExternalLink
export function ButtonLink({
  variant = "primary",
  size = "md",
  fullWidth = false,
  ...rest
}: ButtonLinkProps) {
  return <StyledLink $variant={variant} $size={size} $fullWidth={fullWidth} {...rest} />;
}
