import { useCallback, useState } from "react";
import { fetchAdminIncidents, fetchAdminReports, type ReportStatus } from "../../features/admin/api";
import {
  AdminPage,
  AdminTitle,
  FilterTab,
  FilterTabs,
  ListButton,
  ListPanel,
  StateMessage,
  TwoColumn,
} from "../../features/admin/components/AdminUi";
import { ReportReviewPanel } from "../../features/admin/components/ReportReviewPanel";
import { useAdminLoad } from "../../features/admin/useAdminLoad";
import { formatFullDate } from "../../features/incident/format";

const TABS: { value: ReportStatus; label: string }[] = [
  { value: "PENDING", label: "검수 대기" },
  { value: "APPROVED", label: "승인" },
  { value: "REJECTED", label: "반려" },
];

export function AdminReportPage() {
  const [status, setStatus] = useState<ReportStatus>("PENDING");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const loader = useCallback(
    async (signal?: AbortSignal) => {
      const [reports, incidents] = await Promise.all([fetchAdminReports(status, signal), fetchAdminIncidents({}, signal)]);
      return { reports, incidents };
    },
    [status],
  );
  const { state, reload } = useAdminLoad(loader);
  const data = state.status === "success" ? state.data : null;

  return (
    <AdminPage>
      <AdminTitle title="제보 검수" />
      <FilterTabs>
        {TABS.map((tab) => (
          <FilterTab
            key={tab.value}
            type="button"
            $active={status === tab.value}
            aria-pressed={status === tab.value}
            onClick={() => {
              setStatus(tab.value);
              setSelectedId(null);
            }}
          >
            {tab.label}
            {tab.value === status && data ? ` ${data.reports.length}` : ""}
          </FilterTab>
        ))}
      </FilterTabs>
      {state.status === "loading" ? <StateMessage role="status">불러오는 중이에요.</StateMessage> : null}
      {state.status === "error" ? <StateMessage role="alert">제보 목록을 불러오지 못했어요.</StateMessage> : null}
      {data ? (
        <TwoColumn>
          <ListPanel aria-label="제보 목록">
            {data.reports.length === 0 ? <li>해당하는 제보가 없어요.</li> : null}
            {data.reports.map((report) => (
              <li key={report.id}>
                <ListButton
                  type="button"
                  $active={report.id === selectedId}
                  aria-pressed={report.id === selectedId}
                  onClick={() => setSelectedId(report.id)}
                >
                  <strong>{report.companyName}</strong>
                  <span>
                    {report.reporterNickname} · {formatFullDate(report.createdAt)}
                  </span>
                </ListButton>
              </li>
            ))}
          </ListPanel>
          {selectedId !== null ? (
            <ReportReviewPanel
              key={selectedId}
              reportId={selectedId}
              incidents={data.incidents}
              onReviewed={() => {
                setSelectedId(null);
                reload();
              }}
            />
          ) : (
            <StateMessage>왼쪽에서 제보를 골라 주세요.</StateMessage>
          )}
        </TwoColumn>
      ) : null}
    </AdminPage>
  );
}
