import styled from "styled-components";
import { mobileMedia } from "../../styles/typography";

export const Card = styled.section<{ $bordered?: boolean; $padding?: number }>`
  padding: ${({ $padding = 32 }) => `${$padding}px`};
  border: 1px solid
    ${({ theme, $bordered }) => ($bordered ? theme.colors.border.default : "transparent")};
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.surface.card};

  ${mobileMedia} {
    padding: 20px;
  }
`;
