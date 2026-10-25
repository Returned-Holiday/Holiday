import { useCallback, useState, type KeyboardEvent } from "react";
import styled from "styled-components";
import { ADMIN_LIST_LIMIT, fetchCompanies, saveCompany, type Company } from "../../features/admin/api";
import {
  Actions,
  AdminLead,
  AdminPage,
  AdminTitle,
  FormError,
  ListButton,
  ListPanel,
  Panel,
  StateMessage,
  TwoColumn,
  TruncatedNote,
} from "../../features/admin/components/AdminUi";
import { useAdminLoad } from "../../features/admin/useAdminLoad";
import { ApiError, errorText } from "../../shared/api/errors";
import { useDocumentTitle } from "../../shared/lib/useDocumentTitle";
import { Button } from "../../shared/ui/Button";
import { TextField } from "../../shared/ui/TextField";
import { textStyle } from "../../styles/typography";

const AliasList = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  li {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.colors.brand.primarySoft};
    ${textStyle("labelSmStrong")}
    color: ${({ theme }) => theme.colors.brand.primary};
  }

  button {
    padding: 0;
    border: none;
    background: none;
    color: inherit;
    cursor: pointer;
  }
`;

const SmallAliases = styled.span`
  && {
    ${textStyle("caption")}
  }
`;

// 저장 규칙과 동일 (NFKC·공백 제거·소문자) → 중복 미리 안내
const normalize = (value: string) => value.normalize("NFKC").replace(/\s+/g, "").toLowerCase();
// 서버 상한과 같음 (기업당 20개, 정규화 후 1~50자)
const ALIASES_MAX = 20;
const ALIAS_MAX_LENGTH = 50;

function CompanyEditor({
  company,
  others,
  onSaved,
  onCancel,
}: {
  company: Company | null;
  others: Company[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(company?.name ?? "");
  const [aliases, setAliases] = useState<string[]>(company?.aliases ?? []);
  const [aliasInput, setAliasInput] = useState("");
  // 칸별 문구는 그 칸 아래, 칸 없는 서버 문구만 아래쪽에
  const [nameError, setNameError] = useState<string | null>(null);
  const [aliasError, setAliasError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const addAlias = () => {
    const alias = aliasInput.trim();
    if (alias === "") {
      return;
    }
    const owner = others.find(
      (other) => normalize(other.name) === normalize(alias) || other.aliases.some((item) => normalize(item) === normalize(alias)),
    );
    if (owner) {
      setAliasError(`다른 기업(${owner.name})에 이미 있는 이름이라 별칭으로 쓸 수 없어요`);
      return;
    }
    if (normalize(alias).length > ALIAS_MAX_LENGTH) {
      setAliasError(`별칭은 ${ALIAS_MAX_LENGTH}자까지 쓸 수 있어요.`);
      return;
    }
    if (!aliases.some((item) => normalize(item) === normalize(alias))) {
      if (aliases.length >= ALIASES_MAX) {
        setAliasError(`별칭은 ${ALIASES_MAX}개까지 넣을 수 있어요.`);
        return;
      }
      setAliases([...aliases, alias]);
    }
    setAliasInput("");
    setAliasError(null);
  };

  const handleKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addAlias();
    }
  };

  const save = async () => {
    if (name.trim() === "") {
      setNameError("기업명을 입력해 주세요.");
      return;
    }
    setPending(true);
    setNameError(null);
    setAliasError(null);
    setFormError(null);
    try {
      await saveCompany({ name: name.trim(), aliases }, company?.id);
      onSaved();
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      const nameMessage = caught.fields.name?.[0] ?? null;
      const aliasMessage = caught.fields.aliases?.[0] ?? null;
      setNameError(nameMessage);
      setAliasError(aliasMessage);
      setFormError(nameMessage === null && aliasMessage === null ? errorText(caught) : null);
    } finally {
      setPending(false);
    }
  };

  return (
    <Panel aria-labelledby="company-editor-title">
      <h2 id="company-editor-title">{company ? `${company.name} 수정` : "기업 추가"}</h2>
      <TextField
        label="기업명"
        value={name}
        maxLength={100}
        onChange={(event) => {
          setName(event.target.value);
          setNameError(null);
          setFormError(null);
        }}
        error={nameError ?? undefined}
      />
      {aliases.length > 0 ? (
        <AliasList aria-label="별칭">
          {aliases.map((alias) => (
            <li key={alias}>
              {alias}
              <button
                type="button"
                aria-label={`${alias} 별칭 지우기`}
                onClick={() => setAliases(aliases.filter((item) => item !== alias))}
              >
                ×
              </button>
            </li>
          ))}
        </AliasList>
      ) : null}
      <TextField
        label="별칭 추가"
        placeholder="입력 후 Enter"
        value={aliasInput}
        maxLength={ALIAS_MAX_LENGTH}
        onChange={(event) => {
          setAliasInput(event.target.value);
          setAliasError(null);
          setFormError(null);
        }}
        onKeyDown={handleKey}
        error={aliasError ?? undefined}
        hint="띄어쓰기와 대소문자는 구분하지 않고 저장돼요."
      />
      {formError ? <FormError role="alert">{formError}</FormError> : null}
      <Actions>
        <Button variant="tertiary" onClick={onCancel}>
          취소
        </Button>
        <Button onClick={() => void save()} disabled={pending}>
          저장
        </Button>
      </Actions>
    </Panel>
  );
}

export function AdminCompanyPage() {
  useDocumentTitle("기업 관리");
  const loader = useCallback((signal?: AbortSignal) => fetchCompanies(signal), []);
  const { state, reload } = useAdminLoad(loader);
  const [selectedId, setSelectedId] = useState<number | "new" | null>(null);

  const companies = state.status === "success" ? state.data.items : [];
  const selected = typeof selectedId === "number" ? (companies.find((company) => company.id === selectedId) ?? null) : null;

  return (
    <AdminPage>
      <AdminTitle title="기업 관리" action={<Button onClick={() => setSelectedId("new")}>+ 기업 추가</Button>} />
      <AdminLead>별칭은 검색과 문자 캡처 인식에서 같은 기업으로 찾는 데 쓰여요.</AdminLead>
      {state.status === "success" && state.data.truncated ? <TruncatedNote limit={ADMIN_LIST_LIMIT} /> : null}
      {state.status === "loading" ? <StateMessage role="status">불러오는 중이에요.</StateMessage> : null}
      {state.status === "error" ? <StateMessage role="alert">기업 목록을 불러오지 못했어요.</StateMessage> : null}
      {state.status === "success" ? (
        <TwoColumn>
          <ListPanel aria-label="기업 목록">
            {companies.length === 0 ? <li>등록된 기업이 없어요.</li> : null}
            {companies.map((company) => (
              <li key={company.id}>
                <ListButton
                  type="button"
                  $active={company.id === selectedId}
                  aria-pressed={company.id === selectedId}
                  onClick={() => setSelectedId(company.id)}
                >
                  <strong>{company.name}</strong>
                  <SmallAliases>{company.aliases.length > 0 ? company.aliases.join(" · ") : "별칭 없음"}</SmallAliases>
                </ListButton>
              </li>
            ))}
          </ListPanel>
          {selectedId !== null ? (
            <CompanyEditor
              key={String(selectedId)}
              company={selected}
              others={companies.filter((company) => company.id !== selected?.id)}
              onSaved={() => {
                setSelectedId(null);
                reload();
              }}
              onCancel={() => setSelectedId(null)}
            />
          ) : (
            <StateMessage>왼쪽에서 기업을 고르거나 새로 추가해 주세요.</StateMessage>
          )}
        </TwoColumn>
      ) : null}
    </AdminPage>
  );
}
