import { Link } from "react-router";
import styled from "styled-components";
import { incidentPath } from "../../../app/paths";
import bubbleTail from "../../../assets/main/bubble-tail.svg";
import { Illustration } from "../../../shared/ui/Illustration";
import { mobileMedia, textStyle } from "../../../styles/typography";
import { IncidentSearchForm } from "../../incident/components/IncidentSearchForm";
import type { IncidentListItem } from "../../incident/types";

const Banner = styled.section`
  position: relative;
  flex: 1;
  min-width: 0;
  padding: 44px 32px 44px 48px;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.gradients.hero};

  ${mobileMedia} {
    padding: 28px 20px;
  }
`;

const Content = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const TrustTag = styled.p`
  align-self: flex-start;
  padding: 6px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.surface.card};
  ${textStyle("labelSmStrong")}
  color: ${({ theme }) => theme.colors.brand.primary};
`;

const Title = styled.h1`
  ${textStyle("displayLg")}
  letter-spacing: -0.01em;

  ${mobileMedia} {
    ${textStyle("h1")}
  }
`;

const Lead = styled.p`
  ${textStyle("bodyLg")}
  color: ${({ theme }) => theme.colors.text.body};

  ${mobileMedia} {
    ${textStyle("bodyMd")}
  }
`;

const Recent = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`;

const RecentLabel = styled.span`
  ${textStyle("bodySm")}
  color: ${({ theme }) => theme.colors.text.body};
`;

const RecentChip = styled(Link)`
  padding: 7px 14px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255, 255, 255, 0.7);
  ${textStyle("labelSmStrong")}
  color: ${({ theme }) => theme.colors.text.ink};
  text-decoration: none;
`;

const Character = styled.div`
  position: absolute;
  top: 77px;
  right: 27px;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 234px;
  pointer-events: none;

  ${mobileMedia} {
    display: none;
  }
`;

const Bubble = styled.p`
  padding: 10px 16px;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.surface.card};
  ${textStyle("labelSmStrong")}
  color: ${({ theme }) => theme.colors.brand.primary};
  white-space: nowrap;
`;

type HomeHeroProps = {
  recent: IncidentListItem[];
};

export function HomeHero({ recent }: HomeHeroProps) {
  return (
    <Banner aria-labelledby="home-hero-title">
      <Character aria-hidden="true">
        <Bubble>잠깐! 공식 발표부터 확인해요</Bubble>
        <img src={bubbleTail} width={20} height={12} alt="" />
        <Illustration name="magnifier" width={164} />
      </Character>
      <Content>
        <TrustTag>✓ 기업·정부기관 공식 발표만 사용해요</TrustTag>
        <Title id="home-hero-title">
          개인정보 유출 안내를
          <br />
          받으셨나요?
        </Title>
        <Lead>
          기업 이름만 검색하면 무엇이 유출됐는지,
          <br />
          지금 무엇을 해야 하는지 알려드려요.
        </Lead>
        <IncidentSearchForm id="home-search" />
        {recent.length > 0 ? (
          <Recent>
            <RecentLabel>최근 공지된 사고</RecentLabel>
            {recent.map((incident) => (
              <RecentChip key={incident.id} to={incidentPath(incident.id)}>
                {incident.companyName}
              </RecentChip>
            ))}
          </Recent>
        ) : null}
      </Content>
    </Banner>
  );
}
