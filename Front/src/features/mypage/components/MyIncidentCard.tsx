import styled from "styled-components";
import { checklistPath } from "../../../app/paths";
import tail from "../../../assets/icons/bubble-tail-left-leak.svg";
import { ButtonLink } from "../../../shared/ui/Button";
import { Illustration } from "../../../shared/ui/Illustration";
import { mobileMedia, textStyle } from "../../../styles/typography";
import { incidentTitle } from "../../incident/format";
import type { MyIncident } from "../api";

const Card = styled.article`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 32px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.surface.card};

  ${mobileMedia} {
    padding: 20px;
  }
`;

const Head = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  h3 {
    ${textStyle("h2")}
  }
`;

const ProgressRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const Track = styled.div`
  flex: 1;
  max-width: 600px;
  height: 12px;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.border.default};
`;

const Fill = styled.div<{ $ratio: number }>`
  width: ${({ $ratio }) => `${Math.round($ratio * 100)}%`};
  height: 100%;
  border-radius: inherit;
  background: ${({ theme }) => theme.colors.brand.primary};
`;

const ProgressText = styled.p`
  flex-shrink: 0;
  ${textStyle("h3")}
  color: ${({ theme }) => theme.colors.brand.primary};
`;

const Message = styled.div`
  display: flex;
  align-items: center;

  ${mobileMedia} {
    > img:first-child {
      display: none;
    }
  }
`;

const Bubble = styled.p`
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 18px;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.status.leakPale};

  strong {
    ${textStyle("bodyMdStrong")}
    color: ${({ theme }) => theme.colors.status.leakDeep};
  }

  span {
    ${textStyle("bodySm")}
    color: ${({ theme }) => theme.colors.text.body};
  }
`;

const DeleteRow = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const DeleteButton = styled.button`
  padding: 0;
  border: none;
  background: none;
  ${textStyle("caption")}
  color: ${({ theme }) => theme.colors.text.mute};
  text-decoration: underline;
  cursor: pointer;
`;

type MyIncidentCardProps = {
  incident: MyIncident;
  onDelete: () => void;
};

export function MyIncidentCard({ incident, onDelete }: MyIncidentCardProps) {
  const title = incidentTitle(incident.companyName);
  const ratio = incident.totalCount === 0 ? 0 : incident.completedCount / incident.totalCount;
  return (
    <Card aria-label={title}>
      <Head>
        <h3>{title}</h3>
        <ButtonLink to={checklistPath(incident.incidentId)}>이어서 하기</ButtonLink>
      </Head>
      <ProgressRow>
        <Track
          role="progressbar"
          aria-label={`${title} 진행률`}
          aria-valuemin={0}
          aria-valuemax={incident.totalCount}
          aria-valuenow={incident.completedCount}
        >
          <Fill $ratio={ratio} />
        </Track>
        <ProgressText>
          {incident.completedCount} / {incident.totalCount} 완료
        </ProgressText>
      </ProgressRow>
      {incident.urgentRemaining > 0 ? (
        <Message>
          <Illustration name="warning" width={157} />
          <img src={tail} width={12} height={20} alt="" />
          <Bubble>
            <strong>긴급 조치가 {incident.urgentRemaining}개 남았어요!</strong>
            {/* 조치 제목 끝맺음이 제각각(~하기, ~하세요) → 뒤에 말을 붙이지 않고 앞에 이름표 */}
            {incident.nextUrgentTitle ? <span>먼저 할 일: {incident.nextUrgentTitle}</span> : null}
          </Bubble>
        </Message>
      ) : null}
      <DeleteRow>
        <DeleteButton type="button" onClick={onDelete}>
          대응 기록 삭제
        </DeleteButton>
      </DeleteRow>
    </Card>
  );
}
