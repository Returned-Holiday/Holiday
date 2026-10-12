import { INCIDENTS_PATH, incidentPath } from "../../../app/paths";
import { Button } from "../../../shared/ui/Button";
import { Pill } from "../../../shared/ui/Tag";
import { formatMonthDay, incidentTitle, isRecentlyNotified } from "../../incident/format";
import type { useRecentIncidents } from "../../incident/useRecentIncidents";
import {
  HomeListSection,
  ListMessage,
  ListRows,
  RowLink,
  RowMeta,
  RowTitle,
} from "./HomeListSection";

type RecentIncidentListProps = ReturnType<typeof useRecentIncidents>;

export function RecentIncidentList({ state, retry }: RecentIncidentListProps) {
  return (
    <HomeListSection
      id="recent-incidents-title"
      title="최근 유출 사고"
      moreLabel="공지일 최신순 · 더보기 +"
      moreTo={INCIDENTS_PATH}
    >
      {state.status === "loading" ? (
        <ListMessage role="status">불러오는 중이에요.</ListMessage>
      ) : null}
      {state.status === "error" ? (
        <ListMessage role="alert">
          {state.message}
          <Button variant="tertiary" size="sm" onClick={retry}>
            다시 시도
          </Button>
        </ListMessage>
      ) : null}
      {state.status === "success" && state.items.length === 0 ? (
        <ListMessage>아직 공개된 사고가 없어요.</ListMessage>
      ) : null}
      {state.status === "success" && state.items.length > 0 ? (
        <ListRows>
          {state.items.map((incident) => (
            <li key={incident.id}>
              <RowLink to={incidentPath(incident.id)}>
                <RowTitle>{incidentTitle(incident.companyName)}</RowTitle>
                {isRecentlyNotified(incident.notifiedAt) ? <Pill tone="new">NEW</Pill> : null}
                <RowMeta>
                  <time dateTime={incident.notifiedAt}>{formatMonthDay(incident.notifiedAt)}</time>
                </RowMeta>
              </RowLink>
            </li>
          ))}
        </ListRows>
      ) : null}
    </HomeListSection>
  );
}
