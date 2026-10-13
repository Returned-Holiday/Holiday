import type { ChangeEvent } from "react";
import styled from "styled-components";
import { Icon } from "../../../shared/ui/Icon";
import { mobileMedia, textStyle } from "../../../styles/typography";

const Card = styled.label<{ $checked: boolean }>`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: ${({ $checked }) => ($checked ? "18px 22px" : "20px 24px")};
  border: ${({ theme, $checked }) => ($checked ? `2px solid ${theme.colors.brand.primary}` : "none")};
  border-radius: 20px;
  background: ${({ theme, $checked }) => ($checked ? theme.colors.brand.primarySoft : theme.colors.surface.card)};
  cursor: pointer;

  &:focus-within {
    outline: 3px solid ${({ theme }) => theme.colors.accent.sky};
    outline-offset: 2px;
  }

  ${mobileMedia} {
    padding: ${({ $checked }) => ($checked ? "14px 16px" : "16px 18px")};
  }
`;

const Native = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
`;

const Mark = styled.span<{ $checked: boolean; $round: boolean }>`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 2px solid
    ${({ theme, $checked }) => ($checked ? theme.colors.brand.primary : theme.colors.text.mute)};
  border-radius: ${({ theme, $round }) => ($round ? theme.radius.pill : theme.radius.md)};
  background: ${({ theme, $checked }) => ($checked ? theme.colors.brand.primary : theme.colors.surface.card)};
  color: ${({ theme }) => theme.colors.text.onDark};
`;

const Text = styled.span`
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
`;

const Title = styled.span`
  ${textStyle("h3")}
  color: ${({ theme }) => theme.colors.text.ink};
`;

const Description = styled.span`
  ${textStyle("bodySm")}
  color: ${({ theme }) => theme.colors.text.body};
`;

type OptionCardProps = {
  type: "checkbox" | "radio";
  name: string;
  value: string;
  checked: boolean;
  label: string;
  description?: string | null;
  round?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
};

export function OptionCard({ type, name, value, checked, label, description, round, onChange }: OptionCardProps) {
  return (
    <Card $checked={checked}>
      <Native type={type} name={name} value={value} checked={checked} onChange={onChange} />
      <Mark $checked={checked} $round={round ?? type === "radio"} aria-hidden="true">
        {checked ? <Icon name="check" /> : null}
      </Mark>
      <Text>
        <Title>{label}</Title>
        {description ? <Description>{description}</Description> : null}
      </Text>
    </Card>
  );
}
