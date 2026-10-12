import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import styled, { css } from "styled-components";
import { textStyle } from "../../styles/typography";
import { Icon } from "./Icon";

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  ${textStyle("bodyMdStrong")}
  color: ${({ theme }) => theme.colors.text.ink};
`;

const controlStyle = css<{ $invalid: boolean }>`
  width: 100%;
  padding: 0 22px;
  border: 1.5px solid
    ${({ theme, $invalid }) => ($invalid ? theme.colors.status.negative : theme.colors.text.mute)};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.surface.card};
  ${textStyle("bodyLg")}
  color: ${({ theme }) => theme.colors.text.ink};

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.mute};
  }

  &:disabled {
    background: ${({ theme }) => theme.colors.surface.canvas};
  }
`;

const Input = styled.input<{ $invalid: boolean }>`
  ${controlStyle}
  height: 60px;
`;

const TextArea = styled.textarea<{ $invalid: boolean }>`
  ${controlStyle}
  min-height: 140px;
  padding: 16px 22px;
  resize: vertical;
`;

const Helper = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
`;

const Hint = styled.p`
  ${textStyle("bodySm")}
  color: ${({ theme }) => theme.colors.text.mute};
`;

const ErrorText = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  ${textStyle("labelSmStrong")}
  color: ${({ theme }) => theme.colors.status.negativeDeep};
`;

const Counter = styled.span`
  flex-shrink: 0;
  ${textStyle("bodySm")}
  color: ${({ theme }) => theme.colors.text.mute};
`;

type FieldMeta = {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
};

function useFieldIds(hint: ReactNode, error: string | undefined) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");
  return { id, hintId, errorId, describedBy: describedBy || undefined };
}

function FieldMessages({
  hint,
  error,
  hintId,
  errorId,
  counter,
}: {
  hint: ReactNode;
  error: string | undefined;
  hintId: string;
  errorId: string;
  counter?: ReactNode;
}) {
  if (!hint && !error && !counter) {
    return null;
  }
  return (
    <>
      {hint || counter ? (
        <Helper>
          {hint ? <Hint id={hintId}>{hint}</Hint> : <span />}
          {counter}
        </Helper>
      ) : null}
      {error ? (
        <ErrorText id={errorId} role="alert">
          <Icon name="warning" size={16} />
          {error}
        </ErrorText>
      ) : null}
    </>
  );
}

type TextFieldProps = FieldMeta & Omit<InputHTMLAttributes<HTMLInputElement>, "id">;

export function TextField({ label, hint, error, ...rest }: TextFieldProps) {
  const { id, hintId, errorId, describedBy } = useFieldIds(hint, error);
  return (
    <Field>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        $invalid={Boolean(error)}
        {...rest}
      />
      <FieldMessages hint={hint} error={error} hintId={hintId} errorId={errorId} />
    </Field>
  );
}

type TextAreaFieldProps = FieldMeta &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "value" | "maxLength"> & {
    value: string;
    maxLength: number;
  };

export function TextAreaField({ label, hint, error, value, maxLength, ...rest }: TextAreaFieldProps) {
  const { id, hintId, errorId, describedBy } = useFieldIds(hint, error);
  return (
    <Field>
      <Label htmlFor={id}>{label}</Label>
      <TextArea
        id={id}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        $invalid={Boolean(error)}
        {...rest}
      />
      <FieldMessages
        hint={hint}
        error={error}
        hintId={hintId}
        errorId={errorId}
        counter={
          <Counter>
            {value.length.toLocaleString("ko-KR")} / {maxLength.toLocaleString("ko-KR")}
          </Counter>
        }
      />
    </Field>
  );
}
