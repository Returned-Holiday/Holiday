import styled from "styled-components";
import { LeakChip, Pill } from "../../../shared/ui/Tag";
import { textStyle } from "../../../styles/typography";
import type { LeakItem } from "../../incident/types";

const Progress = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const ProgressText = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  ${textStyle("bodySm")}
  color: ${({ theme }) => theme.colors.text.body};

  strong {
    ${textStyle("labelSmStrong")}
    color: ${({ theme }) => theme.colors.brand.primary};
  }
`;

// 화면 제목(h1)은 작게, 큰 글씨는 질문
const ProgressTitle = styled.h1`
  ${textStyle("bodySm")}
`;

const Track = styled.div`
  height: 10px;
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

const Summary = styled.section`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 20px;
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface.card};
`;

const SummaryHead = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;

  h2 {
    ${textStyle("labelSmStrong")}
    color: ${({ theme }) => theme.colors.text.body};
  }
`;

const Chips = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

type SurveyHeaderProps = {
  title: string;
  step: number;
  total: number;
  leakedItems: LeakItem[];
  activeCount?: number;
};

export function SurveyHeader({ title, step, total, leakedItems, activeCount }: SurveyHeaderProps) {
  return (
    <>
      <Progress>
        <ProgressText>
          <ProgressTitle>{title} · 내 상황 확인</ProgressTitle>
          <strong aria-label={`${total}단계 중 ${step}단계`}>
            {step} / {total}
          </strong>
        </ProgressText>
        <Track
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={step}
          aria-label="설문 진행"
        >
          <Fill $ratio={step / total} />
        </Track>
      </Progress>
      <Summary aria-labelledby="survey-leak-summary">
        <SummaryHead>
          <h2 id="survey-leak-summary">이 사고의 유출 항목</h2>
          {activeCount !== undefined ? (
            <Pill tone="active">지금 {activeCount.toLocaleString("ko-KR")}명이 대응 중</Pill>
          ) : null}
        </SummaryHead>
        <Chips>
          {leakedItems.map((item) => (
            <li key={item.id}>
              <LeakChip leaked label={item.label} size="sm" />
            </li>
          ))}
        </Chips>
      </Summary>
    </>
  );
}
