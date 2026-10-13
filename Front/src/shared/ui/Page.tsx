import styled from "styled-components";
import { mobileMedia } from "../../styles/typography";

export const PageContainer = styled.div<{ $maxWidth?: number }>`
  width: 100%;
  max-width: ${({ theme, $maxWidth }) => ($maxWidth ? `${$maxWidth}px` : theme.layout.contentWidth)};
  margin: 0 auto;
  padding: 40px 0 72px;

  ${mobileMedia} {
    padding: 24px ${({ theme }) => theme.layout.mobileGutter} 48px;
  }
`;

export const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`;
