import { useParams } from "react-router";
import styled from "styled-components";
import { incidentPath, surveyPath } from "../../app/paths";
import { ActionItem } from "../../features/checklist/components/ActionItem";
import {
  BaseInfo,
  ChecklistHero,
  NoActions,
  NoticeRevisedBanner,
} from "../../features/checklist/components/ChecklistParts";
import { URGENT_MAX_PRIORITY, type ChecklistAction } from "../../features/checklist/types";
import { useChecklist } from "../../features/checklist/useChecklist";
import { incidentTitle } from "../../features/incident/format";
import { parseIncidentId } from "../../features/incident/useIncidentDetail";
import { Button } from "../../shared/ui/Button";
import { PageContainer } from "../../shared/ui/Page";
import { Badge } from "../../shared/ui/Tag";
import { textStyle } from "../../styles/typography";
import { NotFoundPage } from "../public/NotFoundPage";

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const GroupHeading = styled.h2`
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 16px;
  ${textStyle("h2")}
`;

const List = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const InfoNote = styled.p`
  padding: 14px 20px;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.accent.yellowPale};
  ${textStyle("bodySm")}
  color: ${({ theme }) => theme.colors.status.warningContent};
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

const ErrorText = styled.p`
  ${textStyle("labelSmStrong")}
  color: ${({ theme }) => theme.colors.status.negativeDeep};
`;

type GroupProps = {
  badge: "urgent" | "recommended";
  title: string;
  actions: ChecklistAction[];
  firstOpenId: number | undefined;
  savingId: number | null;
  onToggle: (actionId: number, completed: boolean) => void;
};

function ActionGroup({ badge, title, actions, firstOpenId, savingId, onToggle }: GroupProps) {
  if (actions.length === 0) {
    return null;
  }
  return (
    <section aria-label={title}>
      <Stack>
        <GroupHeading>
          <Badge tone={badge}>{badge === "urgent" ? "긴급" : "권장"}</Badge>
          {title}
        </GroupHeading>
        <List>
          {actions.map((action) => (
            <ActionItem
              key={action.id}
              action={action}
              saving={savingId === action.id}
              initiallyOpen={action.id === firstOpenId}
              onToggle={(completed) => onToggle(action.id, completed)}
            />
          ))}
        </List>
      </Stack>
    </section>
  );
}

export function ChecklistPage() {
  const params = useParams();
  const incidentId = parseIncidentId(params.incidentId);
  const { state, toggle, savingId, saveError, retry } = useChecklist(incidentId);

  if (state.status === "notFound") {
    return <NotFoundPage />;
  }

  return (
    <PageContainer $maxWidth={760}>
      {state.status === "loading" ? <Message role="status">할 일 목록을 만드는 중이에요.</Message> : null}
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
          {state.checklist.noticeRevised ? (
            <NoticeRevisedBanner surveyTo={surveyPath(state.checklist.incidentId)} />
          ) : null}
          {state.checklist.totalCount === 0 ? (
            <NoActions
              surveyTo={surveyPath(state.checklist.incidentId)}
              detailTo={incidentPath(state.checklist.incidentId)}
            />
          ) : (
            <ChecklistHero
              title={incidentTitle(state.checklist.companyName)}
              completed={state.checklist.completedCount}
              total={state.checklist.totalCount}
            />
          )}
          <BaseInfo
            companyName={state.checklist.companyName}
            sourceUrl={state.checklist.sourceUrl}
            contactInfo={state.checklist.contactInfo}
          />
          {state.checklist.leakItemsUnknown ? (
            <InfoNote>해당 항목을 고르지 않아 공지된 모든 항목 기준으로 보여드려요.</InfoNote>
          ) : null}
          {saveError ? <ErrorText role="alert">{saveError}</ErrorText> : null}
          <ActionGroup
            badge="urgent"
            title="지금 바로 하세요"
            actions={state.checklist.actions.filter((action) => action.priority <= URGENT_MAX_PRIORITY)}
            firstOpenId={state.checklist.actions.find((action) => !action.completed)?.id}
            savingId={savingId}
            onToggle={(actionId, completed) => void toggle(actionId, completed)}
          />
          <ActionGroup
            badge="recommended"
            title="여유가 될 때 하세요"
            actions={state.checklist.actions.filter((action) => action.priority > URGENT_MAX_PRIORITY)}
            firstOpenId={undefined}
            savingId={savingId}
            onToggle={(actionId, completed) => void toggle(actionId, completed)}
          />
        </Stack>
      ) : null}
    </PageContainer>
  );
}
