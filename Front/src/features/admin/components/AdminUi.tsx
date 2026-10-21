import type { ReactNode, SelectHTMLAttributes } from "react";
import { useId } from "react";
import styled from "styled-components";
import { mobileMedia, textStyle } from "../../../styles/typography";

export const AdminPage = styled.div<{ $maxWidth?: number }>`
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: ${({ theme, $maxWidth }) => ($maxWidth ? `${$maxWidth}px` : theme.layout.contentWidth)};
  margin: 0 auto;
  padding: 40px 0 72px;

  ${mobileMedia} {
    padding: 24px ${({ theme }) => theme.layout.mobileGutter} 48px;
  }
`;

const TitleRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;

  h1 {
    ${textStyle("displayLg")}

    ${mobileMedia} {
      ${textStyle("h1")}
    }
  }
`;

export function AdminTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <TitleRow>
      <h1>{title}</h1>
      {action}
    </TitleRow>
  );
}

export const AdminLead = styled.p`
  ${textStyle("bodyMd")}
  color: ${({ theme }) => theme.colors.text.body};
`;

export const FilterTabs = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

export const FilterTab = styled.button<{ $active: boolean }>`
  padding: 8px 18px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme, $active }) => ($active ? theme.colors.surface.navy : theme.colors.surface.card)};
  ${textStyle("labelSmStrong")}
  color: ${({ theme, $active }) => ($active ? theme.colors.text.onDark : theme.colors.text.ink)};
  cursor: pointer;
`;

export const Panel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 32px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.surface.card};

  h2 {
    ${textStyle("h2")}
  }

  ${mobileMedia} {
    padding: 20px;
  }
`;

export const TwoColumn = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 440px) minmax(0, 1fr);
  align-items: start;
  gap: 24px;

  ${mobileMedia} {
    grid-template-columns: 1fr;
  }
`;

export const ListPanel = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.surface.card};
`;

export const ListButton = styled.button<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  width: 100%;
  padding: 16px 18px;
  border: 2px solid ${({ theme, $active }) => ($active ? theme.colors.brand.primary : "transparent")};
  border-radius: 18px;
  background: ${({ theme, $active }) => ($active ? theme.colors.brand.primarySoft : "none")};
  text-align: left;
  cursor: pointer;

  strong {
    ${textStyle("h3")}
    color: ${({ theme }) => theme.colors.text.ink};
  }

  span {
    ${textStyle("bodySm")}
    color: ${({ theme }) => theme.colors.text.mute};
  }
`;

export const Note = styled.p`
  padding: 16px 20px;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.accent.yellowPale};
  ${textStyle("bodySm")}
  color: ${({ theme }) => theme.colors.status.warningContent};
  white-space: pre-line;
`;

export function TruncatedNote({ limit }: { limit: number }) {
  return <Note role="status">목록이 많아 앞의 {limit.toLocaleString("ko-KR")}건만 보여요. 검색이나 필터로 좁혀 주세요.</Note>;
}

export const FormError = styled.p`
  ${textStyle("labelSmStrong")}
  color: ${({ theme }) => theme.colors.status.negativeDeep};
`;

export const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
`;

export const StateMessage = styled.p`
  padding: 48px 16px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.surface.card};
  ${textStyle("bodyMd")}
  color: ${({ theme }) => theme.colors.text.body};
  text-align: center;
`;

const SelectField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    ${textStyle("bodyMdStrong")}
  }

  select {
    height: 60px;
    padding: 0 18px;
    border: 1.5px solid ${({ theme }) => theme.colors.text.mute};
    border-radius: ${({ theme }) => theme.radius.lg};
    background: ${({ theme }) => theme.colors.surface.card};
    ${textStyle("bodyLg")}
  }

  p {
    ${textStyle("bodySm")}
    color: ${({ theme }) => theme.colors.text.mute};
  }
`;

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  children: ReactNode;
};

export function Select({ label, hint, children, ...rest }: SelectProps) {
  const id = useId();
  return (
    <SelectField>
      <label htmlFor={id}>{label}</label>
      <select id={id} aria-describedby={hint ? `${id}-hint` : undefined} {...rest}>
        {children}
      </select>
      {hint ? <p id={`${id}-hint`}>{hint}</p> : null}
    </SelectField>
  );
}

export const RadioGroup = styled.fieldset`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
  margin: 0;
  padding: 0;
  border: none;

  legend {
    width: 100%;
    margin-bottom: 8px;
    ${textStyle("bodyMdStrong")}
  }

  label {
    display: flex;
    align-items: center;
    gap: 8px;
    ${textStyle("bodyMd")}
    cursor: pointer;
  }

  input {
    width: 20px;
    height: 20px;
    accent-color: ${({ theme }) => theme.colors.brand.primary};
  }
`;
