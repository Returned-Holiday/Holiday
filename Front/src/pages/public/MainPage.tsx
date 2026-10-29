import styled from "styled-components";
import { LoginCard } from "../../features/auth/components/LoginCard";
import { FaqHighlightList } from "../../features/home/components/FaqHighlightList";
import { HomeHero } from "../../features/home/components/HomeHero";
import { KisaPromo } from "../../features/home/components/KisaPromo";
import { QuickMenu } from "../../features/home/components/QuickMenu";
import { RecentIncidentList } from "../../features/home/components/RecentIncidentList";
import { useRecentIncidents } from "../../features/incident/useRecentIncidents";
import { useDocumentTitle } from "../../shared/lib/useDocumentTitle";
import { PageContainer } from "../../shared/ui/Page";
import { mobileMedia } from "../../styles/typography";

const RECENT_LIMIT = 4;
const HERO_CHIP_LIMIT = 3;

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Row = styled.div<{ $spaced?: boolean }>`
  display: flex;
  align-items: stretch;
  gap: 24px;
  padding-top: ${({ $spaced }) => ($spaced ? "16px" : "0")};

  ${mobileMedia} {
    flex-direction: column;
    padding-top: 0;
  }
`;

export function MainPage() {
  useDocumentTitle("");
  const recent = useRecentIncidents(RECENT_LIMIT);
  const heroItems =
    recent.state.status === "success" ? recent.state.items.slice(0, HERO_CHIP_LIMIT) : [];

  return (
    <PageContainer>
      <Stack>
        <Row>
          <HomeHero recent={heroItems} />
          <LoginCard />
        </Row>
        <Row>
          <QuickMenu />
          <KisaPromo />
        </Row>
        <Row $spaced>
          <RecentIncidentList {...recent} />
          <FaqHighlightList />
        </Row>
      </Stack>
    </PageContainer>
  );
}
