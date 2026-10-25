import { createSearchParams, Navigate, useSearchParams } from "react-router";
import styled from "styled-components";
import { INCIDENTS_PATH, REPORT_NEW_PATH } from "../../app/paths";
import { SEARCH_QUERY_MAX_LENGTH } from "../../features/incident/api";
import { IncidentCard } from "../../features/incident/components/IncidentCard";
import { IncidentSearchForm } from "../../features/incident/components/IncidentSearchForm";
import { parsePageNumber, useIncidentSearch } from "../../features/incident/useIncidentSearch";
import { useDocumentTitle } from "../../shared/lib/useDocumentTitle";
import { Button, ButtonLink } from "../../shared/ui/Button";
import { Illustration } from "../../shared/ui/Illustration";
import { PageContainer } from "../../shared/ui/Page";
import { PageEyebrow, PageLead, PageTitle } from "../../shared/ui/SideNav";
import { textStyle } from "../../styles/typography";

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Summary = styled.p`
  ${textStyle("bodyMdStrong")}
  color: ${({ theme }) => theme.colors.text.body};
`;

const Grid = styled.ul`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
`;

const Pager = styled.nav`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  ${textStyle("bodyMdStrong")}
`;

const Message = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 56px 16px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.surface.card};
  ${textStyle("bodyMd")}
  color: ${({ theme }) => theme.colors.text.body};
  text-align: center;
`;

const PAGE_SIZE = 20;

export function IncidentSearchPage() {
  useDocumentTitle("사고 조회");
  const [params, setParams] = useSearchParams();
  const q = (params.get("q") ?? "").trim().slice(0, SEARCH_QUERY_MAX_LENGTH);
  const page = parsePageNumber(params.get("page"));
  const { state, retry } = useIncidentSearch(q, page);

  const goToPage = (next: number) => {
    const nextParams = new URLSearchParams();
    if (q) {
      nextParams.set("q", q);
    }
    if (next > 1) {
      nextParams.set("page", String(next));
    }
    setParams(nextParams);
    window.scrollTo({ top: 0 });
  };

  if (state.status === "outOfRange") {
    return <Navigate to={{ pathname: INCIDENTS_PATH, search: q ? `?${createSearchParams({ q })}` : "" }} replace />;
  }

  return (
    <PageContainer>
      <Stack>
        <PageEyebrow>사고 조회</PageEyebrow>
        <PageTitle>기업 이름으로 사고 찾기</PageTitle>
        <PageLead>기업·정부기관이 공식 발표한 사고만 보여드려요.</PageLead>
        <IncidentSearchForm key={q} id="incident-search" initialQuery={q} bordered />

        {state.status === "loading" ? <Message role="status">검색 중이에요.</Message> : null}

        {state.status === "error" ? (
          <Message role="alert">
            {state.message}
            <Button variant="tertiary" size="sm" onClick={retry}>
              다시 시도
            </Button>
          </Message>
        ) : null}

        {state.status === "success" && state.page.count === 0 ? (
          <Message>
            <Illustration name="magnifier" width={140} />
            {q ? `'${q}'에 해당하는 공개된 사고가 없어요.` : "아직 공개된 사고가 없어요."}
            <br />
            공식 발표가 있었다면 제보해 주세요. 검수 후 등록해요.
            <ButtonLink to={REPORT_NEW_PATH} variant="secondary" size="sm">
              사고 제보하기
            </ButtonLink>
          </Message>
        ) : null}

        {state.status === "success" && state.page.count > 0 ? (
          <>
            <Summary aria-live="polite">
              {q ? `'${q}' 검색 결과 ${state.page.count}건` : `최근 공지된 사고 ${state.page.count}건`}
            </Summary>
            <Grid>
              {state.page.results.map((incident) => (
                <li key={incident.id}>
                  <IncidentCard incident={incident} />
                </li>
              ))}
            </Grid>
            {state.page.count > PAGE_SIZE ? (
              <Pager aria-label="페이지">
                <Button
                  variant="tertiary"
                  size="sm"
                  disabled={state.page.previous === null}
                  onClick={() => goToPage(page - 1)}
                >
                  이전
                </Button>
                <span>
                  {page} / {Math.ceil(state.page.count / PAGE_SIZE)}
                </span>
                <Button
                  variant="tertiary"
                  size="sm"
                  disabled={state.page.next === null}
                  onClick={() => goToPage(page + 1)}
                >
                  다음
                </Button>
              </Pager>
            ) : null}
          </>
        ) : null}
      </Stack>
    </PageContainer>
  );
}
