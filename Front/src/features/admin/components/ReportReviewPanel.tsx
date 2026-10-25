import { useCallback, useState } from "react";
import styled from "styled-components";
import { ApiError, errorText } from "../../../shared/api/errors";
import { toSafeHttpsUrl } from "../../../shared/lib/validators";
import { Button } from "../../../shared/ui/Button";
import { Checkbox } from "../../../shared/ui/Checkbox";
import { SafeExternalLink } from "../../../shared/ui/SafeExternalLink";
import { TextAreaField } from "../../../shared/ui/TextField";
import { textStyle } from "../../../styles/typography";
import { formatFullDate, incidentTitle } from "../../incident/format";
import { approveReport, fetchAdminReport, rejectReport, type AdminIncidentRow } from "../api";
import { useAdminLoad } from "../useAdminLoad";
import { Actions, FormError, Panel, RadioGroup, Select, StateMessage } from "./AdminUi";

const Facts = styled.dl`
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 12px 16px;

  dt {
    ${textStyle("bodySm")}
    color: ${({ theme }) => theme.colors.text.mute};
  }

  dd {
    min-width: 0;
    ${textStyle("bodyMd")}
    overflow-wrap: anywhere;
  }

  a {
    ${textStyle("bodyMdStrong")}
    color: ${({ theme }) => theme.colors.brand.primary};
  }
`;

// 저장 시 마스킹된 값, 텍스트로만 출력
const RawText = styled.p`
  padding: 16px 20px;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.surface.canvas};
  ${textStyle("bodyMd")}
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

const Box = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 24px;
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.surface.canvas};

  h3 {
    ${textStyle("h3")}
  }
`;

const CHECKS = [
  "출처가 기업·정부기관·언론사의 공식 페이지인가요?",
  "제보 내용이 출처 내용과 일치하나요?",
  "이미 등록된 사고와 중복되지 않나요?",
];

type ReportReviewPanelProps = {
  reportId: number;
  incidents: AdminIncidentRow[];
  onReviewed: () => void;
};

export function ReportReviewPanel({ reportId, incidents, onReviewed }: ReportReviewPanelProps) {
  const loader = useCallback((signal?: AbortSignal) => fetchAdminReport(reportId, signal), [reportId]);
  const { state, reload } = useAdminLoad(loader);
  const [checked, setChecked] = useState<boolean[]>(CHECKS.map(() => false));
  const [linkMode, setLinkMode] = useState<"NEW" | "EXISTING">("NEW");
  const [linkedId, setLinkedId] = useState<number | null>(incidents[0]?.id ?? null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  // 사유 미입력은 사유 칸 아래 (쓰기 시작하면 지움)
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const run = async (task: () => Promise<void>) => {
    setPending(true);
    setError(null);
    try {
      await task();
      onReviewed();
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      // 다른 관리자가 먼저 검수 → 409, 상세를 다시 불러와 검수 결과 표시
      if (caught.status === 409) {
        reload();
        return;
      }
      setError(errorText(caught));
    } finally {
      setPending(false);
    }
  };

  if (state.status === "loading") {
    return <StateMessage role="status">불러오는 중이에요.</StateMessage>;
  }
  if (state.status === "error") {
    return <StateMessage role="alert">제보를 불러오지 못했어요.</StateMessage>;
  }

  const report = state.data;
  const source = toSafeHttpsUrl(report.sourceUrl);
  const pendingReview = report.status === "PENDING";

  return (
    <Panel aria-labelledby="report-title">
      <h2 id="report-title">{report.companyName}</h2>
      <Facts>
        <dt>공식 출처</dt>
        <dd>
          {source ? (
            <SafeExternalLink href={source.href}>{source.href}</SafeExternalLink>
          ) : (
            report.sourceUrl
          )}
        </dd>
        <dt>기업 공지일</dt>
        <dd>{formatFullDate(report.notifiedAt) ?? "없음"}</dd>
        <dt>제보자</dt>
        <dd>
          {report.reporterNickname} · {formatFullDate(report.createdAt)}
        </dd>
      </Facts>
      <Box>
        <h3>제보한 유출 항목</h3>
        <RawText>{report.leakItemsText}</RawText>
      </Box>

      {pendingReview ? (
        <>
          <Box>
            <h3>검수 체크</h3>
            {CHECKS.map((label, index) => (
              <Checkbox
                key={label}
                label={label}
                strong
                checked={checked[index] ?? false}
                onChange={(event) =>
                  setChecked((current) => current.map((value, i) => (i === index ? event.target.checked : value)))
                }
              />
            ))}
          </Box>
          <Box>
            <h3>승인하면 어떻게 반영할까요?</h3>
            <RadioGroup>
              <legend>반영 방법</legend>
              <label>
                <input type="radio" name="link" checked={linkMode === "NEW"} onChange={() => setLinkMode("NEW")} />
                새 사고로 등록 (승인 후 사고 관리에서 비공개로 작성)
              </label>
              <label>
                <input
                  type="radio"
                  name="link"
                  checked={linkMode === "EXISTING"}
                  disabled={incidents.length === 0}
                  onChange={() => setLinkMode("EXISTING")}
                />
                이미 있는 사고에 연결
              </label>
            </RadioGroup>
            {linkMode === "EXISTING" ? (
              <Select label="연결할 사고" value={String(linkedId ?? "")} onChange={(event) => setLinkedId(Number(event.target.value))}>
                {incidents.map((incident) => (
                  <option key={incident.id} value={incident.id}>
                    {incidentTitle(incident.companyName)} ({formatFullDate(incident.notifiedAt)})
                  </option>
                ))}
              </Select>
            ) : null}
          </Box>
          <TextAreaField
            label="반려 사유 (반려할 때 필수 · 제보자 마이페이지에 표시)"
            placeholder="예: 공식 출처를 확인할 수 없어요"
            value={reason}
            maxLength={500}
            onChange={(event) => {
              setReason(event.target.value);
              setReasonError(null);
            }}
            error={reasonError ?? undefined}
          />
          {error ? <FormError role="alert">{error}</FormError> : null}
          <Actions>
            <Button
              variant="tertiary"
              disabled={pending}
              onClick={() => {
                if (reason.trim() === "") {
                  setReasonError("반려 사유를 입력해 주세요.");
                  return;
                }
                void run(() => rejectReport(report.id, reason.trim()));
              }}
            >
              반려
            </Button>
            <Button
              disabled={pending || checked.some((value) => !value)}
              onClick={() => void run(() => approveReport(report.id, linkMode === "EXISTING" ? linkedId : null))}
            >
              승인
            </Button>
          </Actions>
        </>
      ) : (
        <Box>
          <h3>{report.status === "APPROVED" ? "승인한 제보예요" : "반려한 제보예요"}</h3>
          {report.rejectReason ? <RawText>{report.rejectReason}</RawText> : null}
        </Box>
      )}
    </Panel>
  );
}
