import type { InputHTMLAttributes, ReactNode } from "react";
import styled from "styled-components";
import checkboxCheck from "../../assets/icons/checkbox-check.svg";
import { textStyle } from "../../styles/typography";

const Label = styled.label<{ $strong: boolean }>`
  display: flex;
  flex: 1;
  align-items: center;
  gap: 12px;
  min-width: 0;
  ${({ $strong }) => ($strong ? textStyle("bodyMdStrong") : textStyle("bodyMd"))}
  color: ${({ theme, $strong }) => ($strong ? theme.colors.text.ink : theme.colors.text.body)};
  cursor: pointer;
`;

const Native = styled.input`
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
`;

const Box = styled.span`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 2px solid ${({ theme }) => theme.colors.text.mute};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.surface.card};

  img {
    visibility: hidden;
  }

  input:checked + & {
    border-color: ${({ theme }) => theme.colors.brand.primary};
    background: ${({ theme }) => theme.colors.brand.primary};
  }

  input:checked + & img {
    visibility: visible;
  }

  input:focus-visible + & {
    outline: 3px solid ${({ theme }) => theme.colors.accent.sky};
    outline-offset: 2px;
  }
`;

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: ReactNode;
  strong?: boolean;
};

export function Checkbox({ label, strong = false, ...rest }: CheckboxProps) {
  return (
    <Label $strong={strong}>
      <Native type="checkbox" {...rest} />
      <Box aria-hidden="true">
        <img src={checkboxCheck} width={16} height={16} alt="" />
      </Box>
      {label}
    </Label>
  );
}
