import { Link } from "react-router";
import styled from "styled-components";
import { incidentPath } from "../../../app/paths";
import { Icon } from "../../../shared/ui/Icon";
import { Pill } from "../../../shared/ui/Tag";
import { textStyle } from "../../../styles/typography";
import { formatFullDate, incidentTitle } from "../format";
import type { IncidentListItem } from "../types";

const Root = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
  height: 100%;
  padding: 28px;
  border: 1px solid transparent;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.surface.card};
  color: ${({ theme }) => theme.colors.text.ink};
  text-decoration: none;

  &:hover {
    border-color: ${({ theme }) => theme.colors.border.default};
  }
`;

const Title = styled.h2`
  ${textStyle("h3")}
`;

const Items = styled.p`
  ${textStyle("bodySm")}
  color: ${({ theme }) => theme.colors.text.body};
`;

const Meta = styled.p`
  ${textStyle("caption")}
  color: ${({ theme }) => theme.colors.text.mute};
`;

const More = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  padding-top: 4px;
  ${textStyle("labelSmStrong")}
  color: ${({ theme }) => theme.colors.brand.primary};
`;

const MAX_LABELS = 3;

function summarizeLabels(labels: string[]): string {
  if (labels.length === 0) {
    return "유출 항목 발표 전";
  }
  const shown = labels.slice(0, MAX_LABELS).join(", ");
  const rest = labels.length - MAX_LABELS;
  return rest > 0 ? `${shown} 외 ${rest}건` : shown;
}

export function IncidentCard({ incident }: { incident: IncidentListItem }) {
  return (
    <Root to={incidentPath(incident.id)}>
      {incident.responseStatus === "ONGOING" ? (
        <Pill tone="active">대응 진행 중</Pill>
      ) : (
        <Pill tone="neutral">대응 종료</Pill>
      )}
      <Title>{incidentTitle(incident.companyName)}</Title>
      <Items>{summarizeLabels(incident.leakedLabels)}</Items>
      <Meta>공지일 {formatFullDate(incident.notifiedAt) ?? "-"}</Meta>
      <More>
        자세히 보기
        <Icon name="arrow" />
      </More>
    </Root>
  );
}
