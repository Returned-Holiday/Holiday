import { useParams } from "react-router";
import styled from "styled-components";
import { DiagnosisCta } from "../../features/incident/components/DiagnosisCta";
import { HelpContacts } from "../../features/incident/components/HelpContacts";
import { IncidentHeading } from "../../features/incident/components/IncidentHeading";
import { IncidentSummaryCard } from "../../features/incident/components/IncidentSummaryCard";
import { LeakItemsSection } from "../../features/incident/components/LeakItemsSection";
import { parseIncidentId, useIncidentDetail } from "../../features/incident/useIncidentDetail";
import { Button } from "../../shared/ui/Button";
import { PageContainer } from "../../shared/ui/Page";
import { mobileMedia, textStyle } from "../../styles/typography";
import { NotFoundPage } from "./NotFoundPage";

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding-top: 0;
`;

const Columns = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 24px;

  ${mobileMedia} {
    flex-direction: column;
    align-items: stretch;
  }
`;

const Main = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 20px;
`;

const Aside = styled.aside`
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 380px;
  flex-shrink: 0;

  ${mobileMedia} {
    width: 100%;
  }
`;

const Message = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 80px 0;
  ${textStyle("bodyMd")}
  color: ${({ theme }) => theme.colors.text.body};
`;

export function IncidentDetailPage() {
  const params = useParams();
  const { state, retry } = useIncidentDetail(parseIncidentId(params.incidentId));

  if (state.status === "notFound") {
    return <NotFoundPage />;
  }

  return (
    <PageContainer>
      {state.status === "loading" ? <Message role="status">사고 정보를 불러오는 중이에요.</Message> : null}
      {state.status === "error" ? (
        <Message role="alert">
          {state.message}
          <Button variant="tertiary" size="sm" onClick={retry}>
            다시 시도
          </Button>
        </Message>
      ) : null}
      {state.status === "success" ? (
        <Stack>
          <IncidentHeading incident={state.incident} />
          <Columns>
            <Main>
              <LeakItemsSection items={state.incident.leakItems} />
              <IncidentSummaryCard
                summary={state.incident.summary}
                sourceUrl={state.incident.sourceUrl}
              />
            </Main>
            <Aside>
              <DiagnosisCta incidentId={state.incident.id} />
              <HelpContacts
                companyName={state.incident.companyName}
                contactInfo={state.incident.contactInfo}
              />
            </Aside>
          </Columns>
        </Stack>
      ) : null}
    </PageContainer>
  );
}
