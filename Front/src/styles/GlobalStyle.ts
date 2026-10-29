import { createGlobalStyle } from "styled-components";
import { mobileMedia, textStyle } from "./typography";

export const GlobalStyle = createGlobalStyle`
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  html {
    scroll-padding-top: 96px;

    ${mobileMedia} {
      scroll-padding-top: 16px;
    }
  }

  body {
    margin: 0;
    color: ${({ theme }) => theme.colors.text.ink};
    background: ${({ theme }) => theme.colors.surface.canvas};
    font-family: ${({ theme }) => theme.fontFamily};
    ${textStyle("bodyMd")}
    -webkit-font-smoothing: antialiased;
    word-break: keep-all;
  }

  h1,
  h2,
  h3,
  h4,
  p,
  ul,
  ol,
  dl,
  dd,
  figure {
    margin: 0;
  }

  ul,
  ol {
    padding: 0;
    list-style: none;
  }

  button,
  input,
  textarea,
  select {
    font: inherit;
    color: inherit;
  }

  a {
    color: inherit;
  }

  [hidden] {
    display: none !important;
  }

  img {
    display: block;
    max-width: 100%;
  }

  :focus-visible {
    outline: 3px solid ${({ theme }) => theme.colors.accent.sky};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
    }
  }
`;
