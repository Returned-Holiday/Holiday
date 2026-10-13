import { css, type DefaultTheme } from "styled-components";
import { theme } from "./theme";

export type TextStyleName = keyof DefaultTheme["typography"];

export function textStyle(name: TextStyleName) {
  return css`
    font-size: ${({ theme }) => theme.typography[name].fontSize};
    line-height: ${({ theme }) => theme.typography[name].lineHeight};
    font-weight: ${({ theme }) => theme.typography[name].fontWeight};
  `;
}

export const mobileMedia = `@media (max-width: ${theme.breakpoints.mobile})`;
