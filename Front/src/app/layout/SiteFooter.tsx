import { Link } from "react-router";
import styled from "styled-components";
import { Logo } from "../../shared/ui/Logo";
import { mobileMedia, textStyle } from "../../styles/typography";
import { PRIVACY_PATH, TERMS_PATH } from "../paths";

const Bar = styled.footer`
  background: ${({ theme }) => theme.colors.surface.navy};
  color: ${({ theme }) => theme.colors.text.onDark};
`;

const Inner = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  max-width: calc(${({ theme }) => theme.layout.contentWidth} + 2 * ${({ theme }) => theme.layout.desktopGutter});
  margin: 0 auto;
  padding: 44px ${({ theme }) => theme.layout.desktopGutter};

  ${mobileMedia} {
    padding: 32px ${({ theme }) => theme.layout.mobileGutter};
  }
`;

const Brand = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Tagline = styled.p`
  ${textStyle("bodySm")}
  color: ${({ theme }) => theme.colors.text.onDarkSub};
`;

const Links = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 12px 28px;

  a {
    ${textStyle("bodySm")}
    color: ${({ theme }) => theme.colors.text.onDark};
    text-decoration: none;
  }
`;

const PrivacyLink = styled(Link)`
  && {
    ${textStyle("labelSmStrong")}
  }
`;

export function SiteFooter() {
  return (
    <Bar>
      <Inner>
        <Brand>
          <Logo onDark />
          <Tagline>보안 사고로 유출된 개인정보를 봉(封)하다 · 공식 발표 기반 유출 대응 안내</Tagline>
        </Brand>
        <Links>
          <li>
            <PrivacyLink to={PRIVACY_PATH}>개인정보 처리방침</PrivacyLink>
          </li>
          <li>
            <Link to={TERMS_PATH}>이용약관</Link>
          </li>
          <li>
            <a href="tel:118">KISA 118 상담</a>
          </li>
        </Links>
      </Inner>
    </Bar>
  );
}
