import { useState } from "react";
import styled from "styled-components";
import { Icon } from "../../../shared/ui/Icon";
import { Pill } from "../../../shared/ui/Tag";
import { mobileMedia, textStyle } from "../../../styles/typography";
import { formatFullDate } from "../../incident/format";
import type { MyReport, ReportStatus } from "../../report/api";

const List = styled.ul`
  padding: 8px 32px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.surface.card};

  ${mobileMedia} {
    padding: 4px 20px;
  }

  > li + li {
    border-top: 1px solid ${({ theme }) => theme.colors.border.default};
  }
`;

const Row = styled.li`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 18px 0;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;

  h3 {
    ${textStyle("h3")}
  }

  p {
    ${textStyle("bodySm")}
    color: ${({ theme }) => theme.colors.text.mute};
  }
`;

const Toggle = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  align-self: flex-start;
  padding: 0;
  border: none;
  background: none;
  ${textStyle("labelSmStrong")}
  color: ${({ theme }) => theme.colors.status.negativeDeep};
  cursor: pointer;
`;

const Reason = styled.div`
  padding-left: 16px;
  border-left: 3px solid ${({ theme }) => theme.colors.status.negative};

  p {
    ${textStyle("bodyMd")}
    color: ${({ theme }) => theme.colors.text.body};
    white-space: pre-line;
    overflow-wrap: anywhere;
  }

  small {
    ${textStyle("caption")}
    color: ${({ theme }) => theme.colors.text.mute};
  }
`;

const Empty = styled.p`
  padding: 32px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.surface.card};
  ${textStyle("bodyMd")}
  color: ${({ theme }) => theme.colors.text.body};
  text-align: center;

  ${mobileMedia} {
    padding: 20px;
  }
`;

const STATUS: Record<ReportStatus, { tone: "neutral" | "positive" | "negative"; label: string }> = {
  PENDING: { tone: "neutral", label: "◷ 검수 대기" },
  APPROVED: { tone: "positive", label: "✓ 승인됨" },
  REJECTED: { tone: "negative", label: "✕ 반려됨" },
};

function ReportRow({ report }: { report: MyReport }) {
  const [open, setOpen] = useState(false);
  const status = STATUS[report.status];
  const reasonId = `report-reason-${report.id}`;
  return (
    <Row>
      <Head>
        <div>
          <h3>{report.companyName}</h3>
          <p>{formatFullDate(report.createdAt)} 제보</p>
        </div>
        <Pill tone={status.tone}>{status.label}</Pill>
      </Head>
      {report.status === "REJECTED" && report.rejectReason ? (
        <>
          <Toggle type="button" aria-expanded={open} aria-controls={reasonId} onClick={() => setOpen(!open)}>
            {open ? "반려 사유 접기" : "반려 사유 보기"}
            <Icon name="arrow" size={14} />
          </Toggle>
          {/* 반려 사유는 텍스트로만 출력 */}
          <Reason id={reasonId} hidden={!open}>
            <p>{report.rejectReason}</p>
            {report.reviewedAt ? <small>검수일 {formatFullDate(report.reviewedAt)}</small> : null}
          </Reason>
        </>
      ) : null}
    </Row>
  );
}

export function MyReportList({ reports }: { reports: MyReport[] }) {
  if (reports.length === 0) {
    return <Empty>아직 제보한 사고가 없어요.</Empty>;
  }
  return (
    <List>
      {reports.map((report) => (
        <ReportRow key={report.id} report={report} />
      ))}
    </List>
  );
}
