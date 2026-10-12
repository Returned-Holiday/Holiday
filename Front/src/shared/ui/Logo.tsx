import { Link } from "react-router";
import styled from "styled-components";
import { HOME_PATH } from "../../app/paths";
import { textStyle } from "../../styles/typography";
import { Illustration } from "./Illustration";

const Root = styled(Link)<{ $onDark: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: ${({ theme, $onDark }) => ($onDark ? theme.colors.text.onDark : theme.colors.text.ink)};
`;

const Icon = styled(Illustration)`
  border-radius: 10px;
`;

const Words = styled.span`
  display: flex;
  flex-direction: column;
`;

const Name = styled.span`
  font-size: 24px;
  line-height: 1.1;
  font-weight: 700;
  letter-spacing: 0.08em;
`;

const Tagline = styled.span<{ $onDark: boolean }>`
  ${textStyle("caption")}
  color: ${({ theme, $onDark }) => ($onDark ? theme.colors.text.onDarkSub : theme.colors.text.mute)};
`;

export function Logo({ onDark = false }: { onDark?: boolean }) {
  return (
    <Root to={HOME_PATH} $onDark={onDark} aria-label="SEALD 홈">
      <Icon name="appIcon" width={40} />
      <Words aria-hidden="true">
        <Name>SEALD</Name>
        <Tagline $onDark={onDark}>유출 개인정보 대응 헬프데스크</Tagline>
      </Words>
    </Root>
  );
}
