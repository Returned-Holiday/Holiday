import { useState } from "react";
import styled from "styled-components";
import { ApiError, errorText } from "../../../shared/api/errors";
import { Button } from "../../../shared/ui/Button";
import { TextField } from "../../../shared/ui/TextField";
import { textStyle } from "../../../styles/typography";
import {
  addLeakItem,
  deleteLeakItem,
  LEAK_TYPES,
  updateLeakItem,
  type AdminLeakItem,
  type LeakItemInput,
} from "../api";
import { FormError, Note, Panel, Select } from "./AdminUi";

const Rows = styled.ul`
  display: flex;
  flex-direction: column;

  > li + li {
    border-top: 1px solid ${({ theme }) => theme.colors.border.default};
  }
`;

const Row = styled.li`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 12px 0;

  strong {
    flex: 1;
    min-width: 160px;
    ${textStyle("bodyMdStrong")}
  }

  span {
    ${textStyle("bodySm")}
    color: ${({ theme }) => theme.colors.text.body};
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const EMPTY: LeakItemInput = { label: "", isLeaked: true, leakType: "CONTACT" };

type LeakItemEditorProps = {
  incidentId: number;
  items: AdminLeakItem[];
  onChanged: () => void;
};

export function LeakItemEditor({ incidentId, items, onChanged }: LeakItemEditorProps) {
  const [draft, setDraft] = useState<LeakItemInput>(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const run = async (task: () => Promise<void>) => {
    setPending(true);
    setError(null);
    try {
      await task();
      setDraft(EMPTY);
      setEditingId(null);
      onChanged();
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      // 사용자가 고른 항목 삭제 → 409
      setError(caught.status === 409 ? "사용자가 이미 고른 항목은 지울 수 없어요. 수정으로 정정해 주세요." : errorText(caught));
    } finally {
      setPending(false);
    }
  };

  const save = () => {
    if (draft.label.trim() === "") {
      setError("발표 원문 표현을 입력해 주세요.");
      return;
    }
    const input = { ...draft, label: draft.label.trim() };
    void run(() =>
      editingId === null ? addLeakItem(incidentId, input) : updateLeakItem(incidentId, editingId, input),
    );
  };

  return (
    <Panel aria-labelledby="leak-items-title">
      <h2 id="leak-items-title">유출 항목</h2>
      {items.length > 0 ? (
        <Rows>
          {items.map((item) => (
            <Row key={item.id}>
              <strong>
                {item.label} · {item.isLeaked ? "유출됨" : "유출 안 됨"}
              </strong>
              <span>{LEAK_TYPES.find((type) => type.value === item.leakType)?.label}</span>
              <Button
                variant="tertiary"
                size="sm"
                onClick={() => {
                  setEditingId(item.id);
                  setDraft({ label: item.label, isLeaked: item.isLeaked, leakType: item.leakType });
                }}
              >
                수정
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                disabled={pending || item.selectedByUsers === true}
                title={item.selectedByUsers === true ? "사용자가 고른 항목은 지울 수 없어요" : undefined}
                onClick={() => void run(() => deleteLeakItem(incidentId, item.id))}
              >
                삭제
              </Button>
            </Row>
          ))}
        </Rows>
      ) : null}
      <FormGrid>
        <TextField
          label={editingId === null ? "발표 원문 표현" : "발표 원문 표현 (수정 중)"}
          placeholder="예: 휴대전화번호"
          value={draft.label}
          maxLength={100}
          onChange={(event) => setDraft({ ...draft, label: event.target.value })}
        />
        <Select
          label="유출 유형 (필수)"
          value={draft.leakType}
          onChange={(event) => {
            const type = LEAK_TYPES.find((item) => item.value === event.target.value);
            if (type) {
              setDraft({ ...draft, leakType: type.value });
            }
          }}
        >
          {LEAK_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </Select>
        <Select
          label="발표 기준"
          value={draft.isLeaked ? "LEAKED" : "SAFE"}
          onChange={(event) => setDraft({ ...draft, isLeaked: event.target.value === "LEAKED" })}
        >
          <option value="LEAKED">유출</option>
          <option value="SAFE">미유출</option>
        </Select>
      </FormGrid>
      {error ? <FormError role="alert">{error}</FormError> : null}
      <div>
        <Button variant="secondary" size="sm" onClick={save} disabled={pending}>
          {editingId === null ? "+ 항목 추가" : "수정 저장"}
        </Button>
      </div>
      <Note>
        {"· 사용자가 이미 고른 유출 항목은 지울 수 없어요. 고칠 때는 수정해 주세요.\n· 유출 항목을 바꾸면 대응 중인 사용자에게 \"공지 갱신\" 배너가 떠요."}
      </Note>
    </Panel>
  );
}
