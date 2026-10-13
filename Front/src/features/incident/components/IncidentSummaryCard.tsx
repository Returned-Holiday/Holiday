import styled from "styled-components";
import { toSafeHttpsUrl } from "../../../shared/lib/validators";
import { Icon } from "../../../shared/ui/Icon";
import { SafeExternalLink } from "../../../shared/ui/SafeExternalLink";
import { textStyle } from "../../../styles/typography";
import { DetailCard, DetailCardTitle } from "./DetailCard";

const Summary = styled.p`
  ${textStyle("bodyMd")}
  color: ${({ theme }) => theme.colors.text.body};
  white-space: pre-line;
`;

const Source = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;

  a {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    ${textStyle("labelSmStrong")}
    color: ${({ theme }) => theme.colors.brand.primary};
    text-decoration: none;
  }
`;

const Domain = styled.p`
  ${textStyle("caption")}
  color: ${({ theme }) => theme.colors.text.mute};
`;

type IncidentSummaryCardProps = {
  summary: string;
  sourceUrl: string;
};

export function IncidentSummaryCard({ summary, sourceUrl }: IncidentSummaryCardProps) {
  const source = toSafeHttpsUrl(sourceUrl);
  return (
    <DetailCard aria-labelledby="incident-summary-title">
      <DetailCardTitle id="incident-summary-title">사고 요약</DetailCardTitle>
      <Summary>{summary}</Summary>
      {source ? (
        <Source>
          <SafeExternalLink href={source.href} showDomain={false}>
            공식 출처 원문 보기 (새 창)
            <Icon name="arrow" />
          </SafeExternalLink>
          <Domain>{source.hostname}</Domain>
        </Source>
      ) : null}
    </DetailCard>
  );
}
