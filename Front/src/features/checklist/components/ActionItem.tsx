import { useId, useState } from "react";
import styled from "styled-components";
import { toSafeHttpsUrl } from "../../../shared/lib/validators";
import { Icon } from "../../../shared/ui/Icon";
import { SafeExternalLink } from "../../../shared/ui/SafeExternalLink";
import { Pill } from "../../../shared/ui/Tag";
import { mobileMedia, textStyle } from "../../../styles/typography";
import { PRIORITY_LABELS, type ChecklistAction } from "../types";

const Item = styled.li`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const Card = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 24px 28px 24px 24px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.surface.card};

  ${mobileMedia} {
    padding: 20px 16px;
    gap: 10px;
  }
`;

const CheckArea = styled.label`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  cursor: pointer;
`;

const Native = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
`;

const Box = styled.span<{ $checked: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 2px solid ${({ theme, $checked }) => ($checked ? theme.colors.brand.primary : theme.colors.text.mute)};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme, $checked }) => ($checked ? theme.colors.brand.primary : theme.colors.surface.card)};
  color: ${({ theme }) => theme.colors.text.onDark};

  input:focus-visible + & {
    outline: 3px solid ${({ theme }) => theme.colors.accent.sky};
    outline-offset: 2px;
  }
`;

const Content = styled.div`
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
`;

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  span {
    ${textStyle("caption")}
    padding: 3px 10px;
  }
`;

const Rank = styled.p<{ $done: boolean }>`
  ${textStyle("labelSmStrong")}
  color: ${({ theme, $done }) => ($done ? theme.colors.status.positiveDeep : theme.colors.brand.primary)};
`;

const Title = styled.h3<{ $done: boolean }>`
  ${textStyle("h3")}
  color: ${({ theme, $done }) => ($done ? theme.colors.text.mute : theme.colors.text.ink)};
  text-decoration: ${({ $done }) => ($done ? "line-through" : "none")};
`;

const Summary = styled.p`
  ${textStyle("bodyMd")}
  color: ${({ theme }) => theme.colors.text.body};
`;

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 6px;

  > * {
    padding: 4px 10px;
    border-radius: ${({ theme }) => theme.radius.sm};
    background: ${({ theme }) => theme.colors.surface.canvas};
    ${textStyle("caption")}
    color: ${({ theme }) => theme.colors.text.body};
    text-decoration: none;
  }
`;

const StepsToggle = styled.button`
  padding: 6px 0 0;
  border: none;
  background: none;
  ${textStyle("labelSmStrong")}
  color: ${({ theme }) => theme.colors.brand.primary};
  cursor: pointer;
`;

const Steps = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px 32px 24px 84px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.brand.primarySoft};

  h4 {
    ${textStyle("labelSmStrong")}
    color: ${({ theme }) => theme.colors.brand.primary};
  }

  ol {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  li {
    display: flex;
    align-items: center;
    gap: 12px;
    ${textStyle("bodyMd")}
    white-space: pre-line;
  }

  ${mobileMedia} {
    padding: 20px;
  }
`;

const StepNumber = styled.span`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.brand.primary};
  ${textStyle("caption")}
  color: ${({ theme }) => theme.colors.text.onDark};
`;

// "1. ..." 줄 단위 → 단계 목록 (텍스트로만 출력)
function splitSteps(steps: string): string[] {
  return steps
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter((line) => line.length > 0);
}

type ActionItemProps = {
  action: ChecklistAction;
  saving: boolean;
  initiallyOpen: boolean;
  onToggle: (completed: boolean) => void;
};

export function ActionItem({ action, saving, initiallyOpen, onToggle }: ActionItemProps) {
  const [open, setOpen] = useState(initiallyOpen);
  const stepsId = useId();
  const steps = splitSteps(action.steps);
  const source = action.sourceUrl ? toSafeHttpsUrl(action.sourceUrl) : null;
  const rank = `${action.priority}순위 · ${PRIORITY_LABELS[action.priority] ?? ""}`;

  return (
    <Item>
      <Card>
        <CheckArea>
          <Native
            type="checkbox"
            checked={action.completed}
            disabled={saving}
            onChange={(event) => onToggle(event.target.checked)}
            aria-label={`${action.title} 완료 표시`}
          />
          <Box $checked={action.completed} aria-hidden="true">
            {action.completed ? <Icon name="check" size={20} /> : null}
          </Box>
        </CheckArea>
        <Content>
          {action.certainty === "CHECK_NEEDED" || action.isNew ? (
            <Tags>
              {action.certainty === "CHECK_NEEDED" ? (
                <Pill tone="notice">확인 필요 · 해당되는지 먼저 확인하세요</Pill>
              ) : null}
              {action.isNew ? <Pill tone="new">새 조치</Pill> : null}
            </Tags>
          ) : null}
          <Rank $done={action.completed}>
            {rank}
            {action.completed ? "  ·  ✓ 완료" : ""}
          </Rank>
          <Title $done={action.completed}>{action.title}</Title>
          {action.summary ? <Summary>{action.summary}</Summary> : null}
          <Meta>
            {source ? (
              <SafeExternalLink href={source.href} showDomain={false}>
                출처: {source.hostname}
              </SafeExternalLink>
            ) : null}
            <span>{action.reason}</span>
          </Meta>
          {steps.length > 0 ? (
            <StepsToggle type="button" aria-expanded={open} aria-controls={stepsId} onClick={() => setOpen(!open)}>
              {open ? "단계별 방법 접기" : "단계별 방법 보기"}
            </StepsToggle>
          ) : null}
        </Content>
      </Card>
      {steps.length > 0 ? (
        <Steps id={stepsId} hidden={!open}>
          <h4>단계별 방법</h4>
          <ol>
            {steps.map((step, index) => (
              <li key={`${index}-${step}`}>
                <StepNumber aria-hidden="true">{index + 1}</StepNumber>
                {step}
              </li>
            ))}
          </ol>
        </Steps>
      ) : null}
    </Item>
  );
}
