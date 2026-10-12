import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import styled from "styled-components";
import { ADMIN_INCIDENTS_PATH } from "../../app/paths";
import {
  createAdminIncident,
  fetchAdminIncident,
  fetchCompanies,
  updateAdminIncident,
  type AdminIncident,
  type Company,
  type IncidentInput,
  type PublishStatus,
} from "../../features/admin/api";
import {
  Actions,
  AdminPage,
  AdminTitle,
  FormError,
  Panel,
  Select,
  StateMessage,
} from "../../features/admin/components/AdminUi";
import { LeakItemEditor } from "../../features/admin/components/LeakItemEditor";
import { useAdminLoad } from "../../features/admin/useAdminLoad";
import { parseIncidentId } from "../../features/incident/useIncidentDetail";
import { ApiError } from "../../shared/api/errors";
import { toSafeHttpsUrl } from "../../shared/lib/validators";
import { Button } from "../../shared/ui/Button";
import { Pill } from "../../shared/ui/Tag";
import { TextAreaField, TextField } from "../../shared/ui/TextField";
import { NotFoundPage } from "../public/NotFoundPage";

const Row3 = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

type FormValues = {
  companyId: string;
  occurredAt: string;
  notifiedAt: string;
  affectedCount: string;
  sourceUrl: string;
  contactInfo: string;
  summary: string;
  responseStatus: "ONGOING" | "CLOSED";
};

const EMPTY: FormValues = {
  companyId: "",
  occurredAt: "",
  notifiedAt: "",
  affectedCount: "",
  sourceUrl: "",
  contactInfo: "",
  summary: "",
  responseStatus: "ONGOING",
};

function toValues(incident: AdminIncident): FormValues {
  return {
    companyId: String(incident.companyId),
    occurredAt: incident.occurredAt ?? "",
    notifiedAt: incident.notifiedAt,
    affectedCount: incident.affectedCount === null ? "" : String(incident.affectedCount),
    sourceUrl: incident.sourceUrl,
    contactInfo: incident.contactInfo ?? "",
    summary: incident.summary,
    responseStatus: incident.responseStatus,
  };
}

// 입력 검사는 사용성용 (서버가 https·길이·범위 재검증)
function validate(values: FormValues): string | null {
  if (values.companyId === "") return "기업을 골라 주세요.";
  if (values.notifiedAt === "") return "공지일을 입력해 주세요.";
  if (values.affectedCount !== "" && !/^\d{1,10}$/.test(values.affectedCount)) return "영향 인원은 숫자로 입력해 주세요.";
  if (!toSafeHttpsUrl(values.sourceUrl.trim())) return "공식 출처는 https:// 주소만 넣을 수 있어요.";
  if (values.summary.trim() === "") return "사고 요약을 입력해 주세요.";
  return null;
}

function toInput(values: FormValues, status: PublishStatus): IncidentInput {
  return {
    companyId: Number(values.companyId),
    occurredAt: values.occurredAt || null,
    notifiedAt: values.notifiedAt,
    affectedCount: values.affectedCount === "" ? null : Number(values.affectedCount),
    sourceUrl: values.sourceUrl.trim(),
    contactInfo: values.contactInfo.trim() || null,
    summary: values.summary.trim(),
    status,
    responseStatus: values.responseStatus,
  };
}

function IncidentForm({ incident, companies, onSaved }: {
  incident: AdminIncident | null;
  companies: Company[];
  onSaved: (saved: AdminIncident) => void;
}) {
  const [values, setValues] = useState<FormValues>(incident ? toValues(incident) : EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const set = (key: keyof FormValues, value: string) => setValues((current) => ({ ...current, [key]: value }));

  const save = async (status: PublishStatus) => {
    const problem = validate(values);
    if (problem) {
      setError(problem);
      return;
    }
    setPending(true);
    setError(null);
    try {
      const input = toInput(values, status);
      // 신규 등록은 항상 비공개
      const saved = incident ? await updateAdminIncident(incident.id, input) : await createAdminIncident({ ...input, status: "PRIVATE" });
      onSaved(saved);
    } catch (caught) {
      if (!(caught instanceof ApiError || caught instanceof TypeError)) {
        throw caught;
      }
      setError(caught instanceof ApiError ? caught.message : "저장하지 못했어요.");
    } finally {
      setPending(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void save("PRIVATE");
  };

  return (
    <Form onSubmit={handleSubmit} noValidate>
      <Panel aria-labelledby="basic-title">
        <h2 id="basic-title">기본 정보</h2>
        <Select
          label="기업"
          value={values.companyId}
          onChange={(event) => set("companyId", event.target.value)}
          hint="필수. 사고 제목은 따로 쓰지 않고 기업명 · 공지일 · 유출 항목으로 자동 표시돼요"
        >
          <option value="">기업 선택 (기업 관리에 등록된 기업)</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </Select>
        <Row3>
          <TextField label="발생일" type="date" value={values.occurredAt} onChange={(event) => set("occurredAt", event.target.value)} />
          <TextField label="공지일" type="date" value={values.notifiedAt} onChange={(event) => set("notifiedAt", event.target.value)} />
          <TextField
            label="영향 인원"
            inputMode="numeric"
            placeholder="기업 발표 기준"
            value={values.affectedCount}
            maxLength={10}
            onChange={(event) => set("affectedCount", event.target.value)}
          />
        </Row3>
        <TextField
          label="공식 출처 URL"
          type="url"
          placeholder="https://"
          value={values.sourceUrl}
          maxLength={500}
          onChange={(event) => set("sourceUrl", event.target.value)}
        />
        <TextAreaField
          label="기업 상담 채널"
          placeholder="예: ○○통신 전담 상담센터 080-000-0000 (평일 9~18시)"
          value={values.contactInfo}
          maxLength={500}
          onChange={(event) => set("contactInfo", event.target.value)}
          hint="사고 상세와 체크리스트 맨 위에 보여줘요"
        />
        <Select
          label="대응 상태"
          value={values.responseStatus}
          onChange={(event) => set("responseStatus", event.target.value === "CLOSED" ? "CLOSED" : "ONGOING")}
          hint="사고 상세 제목 위 배지로 보여요 (대응 진행 중 / 대응 종료). 공개 여부와 별개"
        >
          <option value="ONGOING">대응 진행 중</option>
          <option value="CLOSED">대응 종료</option>
        </Select>
      </Panel>
      <Panel aria-labelledby="summary-title">
        <h2 id="summary-title">사고 요약</h2>
        <TextAreaField
          label="요약"
          placeholder="공지 원문을 바탕으로 3~4문장, 쉬운 말로 요약"
          value={values.summary}
          maxLength={2000}
          onChange={(event) => set("summary", event.target.value)}
        />
      </Panel>
      {error ? <FormError role="alert">{error}</FormError> : null}
      <Actions>
        <Button type="submit" variant="tertiary" disabled={pending}>
          비공개로 저장
        </Button>
        {incident ? (
          <Button onClick={() => void save("PUBLIC")} disabled={pending}>
            검토 완료 · 공개하기
          </Button>
        ) : null}
      </Actions>
    </Form>
  );
}

export function AdminIncidentEditPage() {
  const params = useParams();
  const navigate = useNavigate();
  const isNew = params.incidentId === "new";
  const incidentId = isNew ? null : parseIncidentId(params.incidentId);

  const loader = useCallback(
    async (signal?: AbortSignal) => {
      const [companies, incident] = await Promise.all([
        fetchCompanies(signal),
        incidentId === null ? Promise.resolve(null) : fetchAdminIncident(incidentId, signal),
      ]);
      return { companies, incident };
    },
    [incidentId],
  );
  const { state, reload } = useAdminLoad(loader);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => setNotice(null), [incidentId]);

  if (!isNew && incidentId === null) {
    return <NotFoundPage />;
  }

  const incident = state.status === "success" ? state.data.incident : null;

  return (
    <AdminPage $maxWidth={880}>
      <AdminTitle
        title={isNew ? "사고 등록" : "사고 수정"}
        action={
          incident?.status === "PUBLIC" ? <Pill tone="positive">● 공개</Pill> : <Pill tone="notice">◷ 비공개 · 검토 중</Pill>
        }
      />
      {notice ? <Pill tone="positive">{notice}</Pill> : null}
      {state.status === "loading" ? <StateMessage role="status">불러오는 중이에요.</StateMessage> : null}
      {state.status === "error" ? <StateMessage role="alert">사고 정보를 불러오지 못했어요.</StateMessage> : null}
      {state.status === "success" ? (
        <>
          <IncidentForm
            key={incident?.id ?? "new"}
            incident={incident}
            companies={state.data.companies}
            onSaved={(saved) => {
              if (isNew) {
                navigate(`${ADMIN_INCIDENTS_PATH}/${saved.id}`, { replace: true });
                return;
              }
              setNotice("저장했어요");
              reload();
            }}
          />
          {incident ? (
            <LeakItemEditor incidentId={incident.id} items={incident.leakItems} onChanged={reload} />
          ) : (
            <StateMessage>사고를 먼저 저장하면 유출 항목을 추가할 수 있어요.</StateMessage>
          )}
          <Panel aria-labelledby="actions-title">
            <h2 id="actions-title">대응 조치 연결</h2>
            <p>공통 조치는 유출 항목의 유형으로 자동 연결돼요. 이 화면에서는 조치를 고르지 않아요.</p>
            <p>이 사고만의 특수 조치(예: 유심 보호 서비스 가입)는 조치 관리에서 추가해 주세요.</p>
          </Panel>
        </>
      ) : null}
    </AdminPage>
  );
}
