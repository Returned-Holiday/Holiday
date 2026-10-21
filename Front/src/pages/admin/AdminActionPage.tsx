import { useCallback, useState } from "react";
import styled from "styled-components";
import {
  ADMIN_LIST_LIMIT,
  fetchActions,
  fetchAdminIncidents,
  LEAK_TYPES,
  saveAction,
  SURVEY_KEYS,
  type ActionInput,
  type AdminAction,
  type AdminIncidentRow,
  type PublishStatus,
  type TriggerType,
} from "../../features/admin/api";
import {
  Actions,
  AdminPage,
  AdminTitle,
  FormError,
  ListButton,
  ListPanel,
  Note,
  Panel,
  RadioGroup,
  Select,
  StateMessage,
  TwoColumn,
  TruncatedNote,
} from "../../features/admin/components/AdminUi";
import { useAdminLoad } from "../../features/admin/useAdminLoad";
import { PRIORITY_LABELS } from "../../features/checklist/types";
import { incidentTitle } from "../../features/incident/format";
import { ApiError } from "../../shared/api/errors";
import { toSafeHttpsUrl } from "../../shared/lib/validators";
import { Button } from "../../shared/ui/Button";
import { Pill } from "../../shared/ui/Tag";
import { TextAreaField, TextField } from "../../shared/ui/TextField";
import { textStyle } from "../../styles/typography";

const ItemHead = styled.span`
  && {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
  }
`;

const Rank = styled.span`
  && {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: ${({ theme }) => theme.radius.md};
    background: ${({ theme }) => theme.colors.surface.navy};
    ${textStyle("labelSmStrong")}
    color: ${({ theme }) => theme.colors.text.onDark};
  }
`;

const ItemTitle = styled.strong`
  flex: 1;
`;

const PrioritySegments = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  button {
    padding: 8px 12px;
    border: none;
    border-radius: ${({ theme }) => theme.radius.sm};
    background: ${({ theme }) => theme.colors.surface.canvas};
    ${textStyle("caption")}
    cursor: pointer;
  }

  button[aria-pressed="true"] {
    background: ${({ theme }) => theme.colors.surface.navy};
    color: ${({ theme }) => theme.colors.text.onDark};
  }
`;

const FieldLabel = styled.p`
  ${textStyle("bodyMdStrong")}
`;

type Draft = ActionInput;

const EMPTY: Draft = {
  incidentId: null,
  triggerType: "LEAK_TYPE",
  leakType: "CONTACT",
  surveyKey: null,
  priority: 3,
  title: "",
  steps: "",
  sourceUrl: null,
  status: "PRIVATE",
};

// 입력 필드만 (id·publishedAt은 보내지 않음)
function toDraft(action: AdminAction): Draft {
  const { incidentId, triggerType, leakType, surveyKey, priority, title, steps, sourceUrl, status } = action;
  return { incidentId, triggerType, leakType, surveyKey, priority, title, steps, sourceUrl, status };
}

function triggerText(action: AdminAction, incidents: AdminIncidentRow[]): string {
  const scope =
    action.incidentId === null
      ? "공통"
      : `특수 · ${incidents.find((incident) => incident.id === action.incidentId)?.companyName ?? "사고"}`;
  if (action.triggerType === "LEAK_TYPE") {
    return `${scope} · 유형: ${LEAK_TYPES.find((type) => type.value === action.leakType)?.label ?? ""}`;
  }
  if (action.triggerType === "SURVEY") {
    return `${scope} · ${SURVEY_KEYS.find((key) => key.value === action.surveyKey)?.label ?? "설문"}`;
  }
  return `${scope} · 항상`;
}

// 트리거별 필수값 (서버 체크 제약과 동일)
function validate(draft: Draft): string | null {
  if (draft.title.trim() === "") return "조치 이름을 입력해 주세요.";
  if (draft.triggerType === "LEAK_TYPE" && draft.leakType === null) return "유출 유형을 골라 주세요.";
  if (draft.triggerType === "SURVEY" && draft.surveyKey === null) return "설문 응답을 골라 주세요.";
  if (draft.triggerType === "ALWAYS" && draft.incidentId === null) return "'항상'은 특수 조치에만 쓸 수 있어요.";
  if (draft.steps.trim() === "") return "단계별 설명을 입력해 주세요.";
  if (draft.sourceUrl && !toSafeHttpsUrl(draft.sourceUrl)) return "출처는 https:// 주소만 넣을 수 있어요.";
  return null;
}

function ActionEditor({
  action,
  incidents,
  onSaved,
}: {
  action: AdminAction | null;
  incidents: AdminIncidentRow[];
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(action ? toDraft(action) : EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const setTrigger = (triggerType: TriggerType) =>
    setDraft((current) => ({
      ...current,
      triggerType,
      leakType: triggerType === "LEAK_TYPE" ? (current.leakType ?? "CONTACT") : null,
      surveyKey: triggerType === "SURVEY" ? (current.surveyKey ?? "PAYMENT_LINKED") : null,
    }));

  const save = async (status: PublishStatus) => {
    const next = { ...draft, title: draft.title.trim(), sourceUrl: draft.sourceUrl?.trim() || null, status };
    const problem = validate(next);
    if (problem) {
      setError(problem);
      return;
    }
    setPending(true);
    setError(null);
    try {
      await saveAction(next, action?.id);
      onSaved();
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      setError(caught.message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Panel aria-labelledby="action-editor-title">
      <h2 id="action-editor-title">{action ? action.title : "조치 추가"}</h2>
      <TextField
        label="조치 이름"
        value={draft.title}
        maxLength={200}
        onChange={(event) => setDraft({ ...draft, title: event.target.value })}
      />
      <RadioGroup>
        <legend>구분</legend>
        <label>
          <input
            type="radio"
            name="scope"
            checked={draft.incidentId === null}
            onChange={() =>
              setDraft({ ...draft, incidentId: null, triggerType: draft.triggerType === "ALWAYS" ? "LEAK_TYPE" : draft.triggerType, leakType: draft.triggerType === "ALWAYS" ? "CONTACT" : draft.leakType })
            }
          />
          공통 조치
        </label>
        <label>
          <input
            type="radio"
            name="scope"
            checked={draft.incidentId !== null}
            onChange={() => setDraft({ ...draft, incidentId: incidents[0]?.id ?? null })}
            disabled={incidents.length === 0}
          />
          특수 조치 (사고 하나에만)
        </label>
      </RadioGroup>
      {draft.incidentId !== null ? (
        <Select
          label="대상 사고"
          value={String(draft.incidentId)}
          onChange={(event) => setDraft({ ...draft, incidentId: Number(event.target.value) })}
        >
          {incidents.map((incident) => (
            <option key={incident.id} value={incident.id}>
              {incidentTitle(incident.companyName)}
            </option>
          ))}
        </Select>
      ) : null}
      <RadioGroup>
        <legend>언제 보여줄까요? (트리거)</legend>
        <label>
          <input type="radio" name="trigger" checked={draft.triggerType === "LEAK_TYPE"} onChange={() => setTrigger("LEAK_TYPE")} />
          유출 유형
        </label>
        <label>
          <input type="radio" name="trigger" checked={draft.triggerType === "SURVEY"} onChange={() => setTrigger("SURVEY")} />
          설문 응답
        </label>
        <label>
          <input
            type="radio"
            name="trigger"
            checked={draft.triggerType === "ALWAYS"}
            disabled={draft.incidentId === null}
            onChange={() => setTrigger("ALWAYS")}
          />
          항상 (특수 조치만)
        </label>
      </RadioGroup>
      {draft.triggerType === "LEAK_TYPE" ? (
        <Select
          label="유출 유형"
          value={draft.leakType ?? ""}
          onChange={(event) =>
            setDraft({ ...draft, leakType: LEAK_TYPES.find((type) => type.value === event.target.value)?.value ?? null })
          }
        >
          {LEAK_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>
      ) : null}
      {draft.triggerType === "SURVEY" ? (
        <Select
          label="설문 응답 (예 또는 모름일 때 보여줘요)"
          value={draft.surveyKey ?? ""}
          onChange={(event) =>
            setDraft({ ...draft, surveyKey: SURVEY_KEYS.find((key) => key.value === event.target.value)?.value ?? null })
          }
        >
          {SURVEY_KEYS.map((key) => (
            <option key={key.value} value={key.value}>
              {key.label}
            </option>
          ))}
        </Select>
      ) : null}
      <div>
        <FieldLabel>우선순위</FieldLabel>
        <PrioritySegments role="group" aria-label="우선순위">
          {[1, 2, 3, 4, 5].map((priority) => (
            <button
              key={priority}
              type="button"
              aria-pressed={draft.priority === priority}
              onClick={() => setDraft({ ...draft, priority })}
            >
              {priority} {PRIORITY_LABELS[priority]}
            </button>
          ))}
        </PrioritySegments>
      </div>
      <TextAreaField
        label="단계별 설명"
        value={draft.steps}
        maxLength={5000}
        onChange={(event) => setDraft({ ...draft, steps: event.target.value })}
        hint="한 줄에 한 단계씩 적어요. 공통 기관 연락처도 여기에 적어요"
      />
      <TextField
        label="출처 URL"
        type="url"
        placeholder="https://"
        value={draft.sourceUrl ?? ""}
        maxLength={500}
        onChange={(event) => setDraft({ ...draft, sourceUrl: event.target.value })}
      />
      <Note>조치는 삭제하지 않고 비공개로 내려요. 이미 사용자 체크리스트에 있는 기록을 지키기 위해서예요.</Note>
      {error ? <FormError role="alert">{error}</FormError> : null}
      <Actions>
        {action?.status === "PUBLIC" ? (
          <Button variant="tertiary" onClick={() => void save("PRIVATE")} disabled={pending}>
            비공개로 내리기
          </Button>
        ) : null}
        {action !== null && action.status === "PRIVATE" ? (
          <Button variant="secondary" onClick={() => void save("PUBLIC")} disabled={pending}>
            공개하기
          </Button>
        ) : null}
        <Button onClick={() => void save(action?.status ?? "PRIVATE")} disabled={pending}>
          저장
        </Button>
      </Actions>
    </Panel>
  );
}

export function AdminActionPage() {
  const loader = useCallback(async (signal?: AbortSignal) => {
    const [actions, incidents] = await Promise.all([fetchActions(signal), fetchAdminIncidents({}, signal)]);
    return { actions: actions.items, incidents: incidents.items, truncated: actions.truncated || incidents.truncated };
  }, []);
  const { state, reload } = useAdminLoad(loader);
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);

  const data = state.status === "success" ? state.data : null;
  const selected = typeof selectedId === "number" ? (data?.actions.find((action) => action.id === selectedId) ?? null) : null;

  return (
    <AdminPage>
      <AdminTitle title="조치 관리" action={<Button onClick={() => setSelectedId("new")}>+ 조치 추가</Button>} />
      {data?.truncated ? <TruncatedNote limit={ADMIN_LIST_LIMIT} /> : null}
      {state.status === "loading" ? <StateMessage role="status">불러오는 중이에요.</StateMessage> : null}
      {state.status === "error" ? <StateMessage role="alert">조치 목록을 불러오지 못했어요.</StateMessage> : null}
      {data ? (
        <TwoColumn>
          <ListPanel aria-label="조치 목록">
            {data.actions.length === 0 ? <li>등록된 조치가 없어요.</li> : null}
            {[...data.actions]
              .sort((a, b) => a.priority - b.priority)
              .map((action) => (
                <li key={action.id}>
                  <ListButton
                    type="button"
                    $active={action.id === selectedId}
                    aria-pressed={action.id === selectedId}
                    onClick={() => setSelectedId(action.id)}
                  >
                    <ItemHead>
                      <Rank aria-label={`${action.priority}순위`}>{action.priority}</Rank>
                      <ItemTitle>{action.title}</ItemTitle>
                      {action.status === "PUBLIC" ? <Pill tone="positive">공개</Pill> : <Pill tone="neutral">비공개</Pill>}
                    </ItemHead>
                    <span>{triggerText(action, data.incidents)}</span>
                  </ListButton>
                </li>
              ))}
          </ListPanel>
          {selectedId !== null ? (
            <ActionEditor
              key={String(selectedId)}
              action={selected}
              incidents={data.incidents}
              onSaved={() => {
                setSelectedId(null);
                reload();
              }}
            />
          ) : (
            <StateMessage>왼쪽에서 조치를 고르거나 새로 추가해 주세요.</StateMessage>
          )}
        </TwoColumn>
      ) : null}
    </AdminPage>
  );
}
