import { useId, useState, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from "react";
import styled, { css } from "styled-components";
import { textStyle } from "../../styles/typography";
import checkSmall from "../../assets/icons/check-small.svg";
import { Icon } from "./Icon";
import { VisuallyHidden } from "./Page";

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  ${textStyle("bodyMdStrong")}
  color: ${({ theme }) => theme.colors.text.ink};
`;

type ControlProps = { $invalid: boolean; $soft?: boolean; $valid?: boolean };

const controlStyle = css<ControlProps>`
  width: 100%;
  padding: 0 22px;
  border: ${({ $invalid, $valid }) => ($invalid || $valid ? "2px" : "1.5px")} solid
    ${({ theme, $invalid, $soft, $valid }) =>
      $invalid
        ? theme.colors.status.negative
        : $valid
          ? theme.colors.status.positive
          : $soft
            ? theme.colors.border.default
            : theme.colors.text.mute};
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

const Input = styled.input<ControlProps & { $withToggle?: boolean }>`
  ${controlStyle}
  height: ${({ $soft }) => ($soft ? "56px" : "60px")};
  padding-right: ${({ $withToggle }) => ($withToggle ? "60px" : "22px")};

  /* 브라우저 기본 보기 버튼 X (Edge는 칸을 벗어나면 숨김) → 직접 토글 */
  &::-ms-reveal,
  &::-ms-clear {
    display: none;
  }
`;

const InputWrap = styled.div`
  position: relative;
`;

const RevealButton = styled.button`
  position: absolute;
  top: 50%;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: none;
  color: ${({ theme }) => theme.colors.text.mute};
  cursor: pointer;
  transform: translateY(-50%);

  &:hover {
    color: ${({ theme }) => theme.colors.text.ink};
  }
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

const ValidText = styled.p`
  display: flex;
  align-items: center;
  gap: 6px;
  ${textStyle("labelSmStrong")}
  color: ${({ theme }) => theme.colors.status.positiveDeep};
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
  valid?: string;
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
  valid,
  hintId,
  errorId,
  counter,
}: {
  hint: ReactNode;
  error: string | undefined;
  valid?: string;
  hintId: string;
  errorId: string;
  counter?: ReactNode;
}) {
  if (!hint && !error && !counter && !valid) {
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
      {valid && !error ? (
        <ValidText role="status">
          <img src={checkSmall} width={16} height={16} alt="" />
          {valid}
        </ValidText>
      ) : null}
    </>
  );
}

type TextFieldProps = FieldMeta &
  Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
    hideLabel?: boolean;
    appearance?: "default" | "soft";
  };

export function TextField({
  label,
  hint,
  error,
  valid,
  hideLabel = false,
  appearance = "default",
  type,
  ...rest
}: TextFieldProps) {
  const { id, hintId, errorId, describedBy } = useFieldIds(hint, error);
  const isPassword = type === "password";
  const [revealed, setRevealed] = useState(false);
  return (
    <Field>
      {hideLabel ? (
        <VisuallyHidden as="label" htmlFor={id}>
          {label}
        </VisuallyHidden>
      ) : (
        <Label htmlFor={id}>{label}</Label>
      )}
      <InputWrap>
        <Input
          id={id}
          type={isPassword && revealed ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          $invalid={Boolean(error)}
          $soft={appearance === "soft"}
          $valid={Boolean(valid) && !error}
          $withToggle={isPassword}
          {...rest}
        />
        {isPassword ? (
          <RevealButton
            type="button"
            aria-label={revealed ? "비밀번호 숨기기" : "비밀번호 보기"}
            aria-pressed={revealed}
            aria-controls={id}
            onClick={() => setRevealed((current) => !current)}
          >
            <Icon name={revealed ? "eyeOff" : "eye"} size={22} />
          </RevealButton>
        ) : null}
      </InputWrap>
      <FieldMessages hint={hint} error={error} valid={valid} hintId={hintId} errorId={errorId} />
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
