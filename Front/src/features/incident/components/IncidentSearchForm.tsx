import { useState, type FormEvent } from "react";
import { createSearchParams, useNavigate } from "react-router";
import styled from "styled-components";
import { INCIDENTS_PATH } from "../../../app/paths";
import { Button } from "../../../shared/ui/Button";
import { VisuallyHidden } from "../../../shared/ui/Page";
import { textStyle } from "../../../styles/typography";
import { SEARCH_QUERY_MAX_LENGTH } from "../api";

const Form = styled.form<{ $bordered: boolean }>`
  position: relative;
  z-index: 1;
  display: flex;
  gap: 8px;
  padding: 8px;
  border: 1px solid
    ${({ theme, $bordered }) => ($bordered ? theme.colors.border.default : "transparent")};
  border-radius: 20px;
  background: ${({ theme }) => theme.colors.surface.card};
`;

const Input = styled.input`
  flex: 1;
  min-width: 0;
  height: 60px;
  padding: 0 22px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.colors.surface.card};
  ${textStyle("bodyLg")}

  &::placeholder {
    color: ${({ theme }) => theme.colors.text.mute};
  }
`;

const SubmitButton = styled(Button)`
  min-height: 60px;
  padding: 0 30px;
`;

type IncidentSearchFormProps = {
  id: string;
  initialQuery?: string;
  bordered?: boolean;
};

export function IncidentSearchForm({ id, initialQuery = "", bordered = false }: IncidentSearchFormProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const q = query.trim();
    navigate({
      pathname: INCIDENTS_PATH,
      search: q ? `?${createSearchParams({ q })}` : "",
    });
  };

  return (
    <Form role="search" onSubmit={handleSubmit} $bordered={bordered}>
      <VisuallyHidden as="label" htmlFor={id}>
        기업 이름으로 사고 검색
      </VisuallyHidden>
      <Input
        id={id}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        maxLength={SEARCH_QUERY_MAX_LENGTH}
        placeholder="기업 이름 (예: ○○통신)"
        autoComplete="off"
      />
      <SubmitButton type="submit">검색</SubmitButton>
    </Form>
  );
}
