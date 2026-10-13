import { css } from "styled-components";
import { mobileMedia } from "../../styles/typography";

export type StickyBarProps = {
  $scrolled: boolean;
};

export const stickyBar = css<StickyBarProps>`
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: ${({ $scrolled }) =>
    $scrolled ? "0 1px 0 rgba(31, 45, 58, 0.08), 0 4px 12px rgba(31, 45, 58, 0.06)" : "none"};
  transition: box-shadow 0.2s ease;

  ${mobileMedia} {
    position: static;
    box-shadow: none;
  }
`;
