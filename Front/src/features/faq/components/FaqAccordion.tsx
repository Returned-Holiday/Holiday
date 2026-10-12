import styled from "styled-components";
import { SafeExternalLink } from "../../../shared/ui/SafeExternalLink";
import { mobileMedia, textStyle } from "../../../styles/typography";
import { faqAnchor, type FaqItem } from "../content";

const List = styled.ul`
  padding: 8px 32px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.surface.card};

  > li + li {
    border-top: 1px solid ${({ theme }) => theme.colors.border.default};
  }

  ${mobileMedia} {
    padding: 4px 16px;
  }
`;

const Item = styled.li`
  padding: 22px 0;
`;

const Question = styled.button`
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 0;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
`;

const QBadge = styled.span<{ $open: boolean }>`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radius.md};
  ${textStyle("labelSmStrong")}
  background: ${({ theme, $open }) => ($open ? theme.colors.brand.primary : theme.colors.surface.canvas)};
  color: ${({ theme, $open }) => ($open ? theme.colors.text.onDark : theme.colors.text.body)};
`;

const QuestionText = styled.span`
  flex: 1;
  min-width: 0;
  ${textStyle("h3")}
  color: ${({ theme }) => theme.colors.text.ink};
`;

const Toggle = styled.span`
  flex-shrink: 0;
  ${textStyle("h2")}
  color: ${({ theme }) => theme.colors.brand.primary};
`;

const Answer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 0 0 48px;

  p {
    ${textStyle("bodyMd")}
    color: ${({ theme }) => theme.colors.text.body};
  }

  a {
    ${textStyle("labelSmStrong")}
    color: ${({ theme }) => theme.colors.brand.primary};
    text-decoration: none;
  }

  ${mobileMedia} {
    padding-left: 0;
  }
`;

type FaqAccordionProps = {
  items: FaqItem[];
  openIds: Set<string>;
  onToggle: (id: string) => void;
};

export function FaqAccordion({ items, openIds, onToggle }: FaqAccordionProps) {
  return (
    <List>
      {items.map((item) => {
        const open = openIds.has(item.id);
        const panelId = `${faqAnchor(item.id)}-answer`;
        return (
          <Item key={item.id} id={faqAnchor(item.id)}>
            <h2>
              <Question
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => onToggle(item.id)}
              >
                <QBadge $open={open} aria-hidden="true">
                  Q
                </QBadge>
                <QuestionText>{item.question}</QuestionText>
                <Toggle aria-hidden="true">{open ? "−" : "+"}</Toggle>
              </Question>
            </h2>
            <Answer id={panelId} hidden={!open}>
              <p>{item.answer}</p>
              <SafeExternalLink href={item.source.url} showDomain={false}>
                출처: {item.source.label}
              </SafeExternalLink>
            </Answer>
          </Item>
        );
      })}
    </List>
  );
}
