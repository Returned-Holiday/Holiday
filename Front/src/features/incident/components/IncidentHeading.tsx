import { Link } from "react-router";
import styled from "styled-components";
import { INCIDENTS_PATH } from "../../../app/paths";
import { Pill } from "../../../shared/ui/Tag";
import { mobileMedia, textStyle } from "../../../styles/typography";
import { formatCount, formatFullDate, incidentTitle } from "../format";
import type { IncidentDetail } from "../types";

const Breadcrumb = styled.nav`
  ${textStyle("bodySm")}
  color: ${({ theme }) => theme.colors.text.body};

  ol {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  li + li::before {
    content: "›";
    margin-right: 8px;
  }

  a {
    color: inherit;
    text-decoration: none;
  }
`;

const Heading = styled.header`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
`;

const Title = styled.h1`
  ${textStyle("displayLg")}
  letter-spacing: -0.01em;

  ${mobileMedia} {
    ${textStyle("h1")}
  }
`;

const Facts = styled.dl`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const Fact = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 12px;
  background: ${({ theme }) => theme.colors.surface.card};

  dt {
    ${textStyle("bodySm")}
    color: ${({ theme }) => theme.colors.text.body};
  }

  dd {
    ${textStyle("labelSmStrong")}
    color: ${({ theme }) => theme.colors.text.ink};
  }
`;

const NOT_ANNOUNCED = "발표 없음";

export function IncidentHeading({ incident }: { incident: IncidentDetail }) {
  const title = incidentTitle(incident.companyName);
  return (
    <>
      <Breadcrumb aria-label="현재 위치">
        <ol>
          <li>
            <Link to={INCIDENTS_PATH}>사고 조회</Link>
          </li>
          <li aria-current="page">{title}</li>
        </ol>
      </Breadcrumb>
      <Heading>
        {incident.responseStatus === "ONGOING" ? (
          <Pill tone="active">대응 진행 중</Pill>
        ) : (
          <Pill tone="neutral">대응 종료</Pill>
        )}
        <Title>{title}</Title>
        <Facts>
          <Fact>
            <dt>발생일</dt>
            <dd>{formatFullDate(incident.occurredAt) ?? NOT_ANNOUNCED}</dd>
          </Fact>
          <Fact>
            <dt>공지일</dt>
            <dd>{formatFullDate(incident.notifiedAt) ?? NOT_ANNOUNCED}</dd>
          </Fact>
          <Fact>
            <dt>영향 인원</dt>
            <dd>{formatCount(incident.affectedCount) ?? NOT_ANNOUNCED}</dd>
          </Fact>
        </Facts>
      </Heading>
    </>
  );
}
