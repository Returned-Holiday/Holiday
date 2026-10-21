import { useCallback, useState } from "react";
import { Link } from "react-router";
import styled from "styled-components";
import { ADMIN_INCIDENTS_PATH } from "../../app/paths";
import { ADMIN_LIST_LIMIT, fetchAdminIncidents, type PublishStatus } from "../../features/admin/api";
import {
  AdminPage,
  AdminTitle,
  FilterTab,
  FilterTabs,
  Note,
  StateMessage,
  TruncatedNote,
} from "../../features/admin/components/AdminUi";
import { useAdminLoad } from "../../features/admin/useAdminLoad";
import { formatFullDate, incidentTitle } from "../../features/incident/format";
import { ButtonLink } from "../../shared/ui/Button";
import { VisuallyHidden } from "../../shared/ui/Page";
import { Pill } from "../../shared/ui/Tag";
import { mobileMedia, textStyle } from "../../styles/typography";

const Toolbar = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;

  input {
    width: min(420px, 100%);
    height: 52px;
    padding: 0 22px;
    border: 1.5px solid ${({ theme }) => theme.colors.text.mute};
    border-radius: ${({ theme }) => theme.radius.lg};
    background: ${({ theme }) => theme.colors.surface.card};
    ${textStyle("bodyLg")}
  }
`;

const TableWrap = styled.div`
  overflow-x: auto;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.surface.card};
`;

const Table = styled.table`
  width: 100%;
  min-width: 860px;
  border-collapse: collapse;

  th,
  td {
    padding: 8px 24px;
    text-align: left;
    white-space: nowrap;
  }

  thead th {
    background: ${({ theme }) => theme.colors.brand.primarySoft};
    ${textStyle("labelSmStrong")}
    color: ${({ theme }) => theme.colors.brand.primary};
  }

  tbody tr + tr td {
    border-top: 1px solid ${({ theme }) => theme.colors.border.default};
  }

  td {
    ${textStyle("bodyMd")}
  }

  td:first-child {
    ${textStyle("bodyMdStrong")}
  }

  a {
    ${textStyle("labelSmStrong")}
    color: ${({ theme }) => theme.colors.brand.primary};
    text-decoration: none;
  }

  ${mobileMedia} {
    th,
    td {
      padding: 8px 16px;
    }
  }
`;

type Filter = "ALL" | PublishStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "PUBLIC", label: "공개" },
  { value: "PRIVATE", label: "비공개" },
];

export function AdminIncidentListPage() {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");

  const loader = useCallback(
    (signal?: AbortSignal) =>
      fetchAdminIncidents(
        { q: submittedQuery || undefined, status: filter === "ALL" ? undefined : filter },
        signal,
      ),
    [filter, submittedQuery],
  );
  const { state } = useAdminLoad(loader);

  return (
    <AdminPage>
      <AdminTitle title="사고 관리" action={<ButtonLink to={`${ADMIN_INCIDENTS_PATH}/new`}>+ 사고 등록</ButtonLink>} />
      <Toolbar>
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            setSubmittedQuery(query.trim());
          }}
        >
          <VisuallyHidden as="label" htmlFor="admin-incident-search">
            사고명이나 기업명으로 검색
          </VisuallyHidden>
          <input
            id="admin-incident-search"
            type="search"
            placeholder="사고명이나 기업명으로 검색"
            value={query}
            maxLength={50}
            onChange={(event) => setQuery(event.target.value)}
          />
        </form>
        <FilterTabs>
          {FILTERS.map((item) => (
            <FilterTab
              key={item.value}
              type="button"
              $active={filter === item.value}
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
            >
              {item.label}
            </FilterTab>
          ))}
        </FilterTabs>
      </Toolbar>

      {state.status === "loading" ? <StateMessage role="status">불러오는 중이에요.</StateMessage> : null}
      {state.status === "error" ? <StateMessage role="alert">목록을 불러오지 못했어요.</StateMessage> : null}
      {state.status === "success" && state.data.truncated ? <TruncatedNote limit={ADMIN_LIST_LIMIT} /> : null}
      {state.status === "success" && state.data.items.length === 0 ? <StateMessage>조건에 맞는 사고가 없어요.</StateMessage> : null}
      {state.status === "success" && state.data.items.length > 0 ? (
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <th scope="col">사고명</th>
                <th scope="col">공지일</th>
                <th scope="col">유출 항목</th>
                <th scope="col">대응 상태</th>
                <th scope="col">공개</th>
                <th scope="col">
                  <VisuallyHidden>수정</VisuallyHidden>
                </th>
              </tr>
            </thead>
            <tbody>
              {state.data.items.map((row) => (
                <tr key={row.id}>
                  <td>{incidentTitle(row.companyName)}</td>
                  <td>{formatFullDate(row.notifiedAt)}</td>
                  <td>{row.leakItemCount}개</td>
                  <td>{row.responseStatus === "ONGOING" ? "진행 중" : "종료"}</td>
                  <td>
                    {row.status === "PUBLIC" ? <Pill tone="positive">● 공개</Pill> : <Pill tone="neutral">◷ 비공개</Pill>}
                  </td>
                  <td>
                    <Link to={`${ADMIN_INCIDENTS_PATH}/${row.id}`}>수정</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      ) : null}
      <Note>새로 등록한 사고는 비공개로 저장돼요. 검토가 끝나면 수정 화면에서 공개로 바꿔주세요.</Note>
    </AdminPage>
  );
}
