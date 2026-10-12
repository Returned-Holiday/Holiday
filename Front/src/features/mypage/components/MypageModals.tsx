import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import styled from "styled-components";
import { HOME_PATH } from "../../../app/paths";
import { ApiError } from "../../../shared/api/errors";
import { Button } from "../../../shared/ui/Button";
import { Modal } from "../../../shared/ui/Modal";
import { TextField } from "../../../shared/ui/TextField";
import { textStyle } from "../../../styles/typography";
import { useAuthStore } from "../../auth/useAuthStore";
import { deleteSurvey } from "../../survey/api";
import { withdraw } from "../api";

const Lead = styled.p`
  ${textStyle("bodyMd")}
  color: ${({ theme }) => theme.colors.text.body};
`;

const DeleteList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px 20px;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.status.negativePale};

  li {
    ${textStyle("bodyMdStrong")}
    color: ${({ theme }) => theme.colors.status.negativeDeep};
  }

  li::before {
    content: "·  ";
  }
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;

  > * {
    flex: 1;
  }
`;

const WithdrawForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const ErrorText = styled.p`
  ${textStyle("labelSmStrong")}
  color: ${({ theme }) => theme.colors.status.negativeDeep};
`;

type DeleteRecordModalProps = {
  target: { incidentId: number; title: string } | null;
  onClose: () => void;
  onDeleted: () => void;
};

export function DeleteRecordModal({ target, onClose, onDeleted }: DeleteRecordModalProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    if (target === null) {
      return;
    }
    setPending(true);
    setError(null);
    try {
      // 본인 기록만 삭제 (서버가 request.user로 처리)
      await deleteSurvey(target.incidentId);
      onDeleted();
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
    <Modal open={target !== null} onClose={onClose} title={`${target?.title ?? ""}의 대응 기록을 지울까요?`}>
      <Lead>아래 기록이 바로 지워지고 되돌릴 수 없어요. 계정과 제보 내역은 그대로 남아요.</Lead>
      <DeleteList>
        <li>설문 응답 (내가 고른 유출 항목 포함)</li>
        <li>체크리스트 완료 기록과 진행률</li>
      </DeleteList>
      {error ? <ErrorText role="alert">{error}</ErrorText> : null}
      <Actions>
        <Button variant="tertiary" onClick={onClose}>
          취소
        </Button>
        <Button variant="danger" onClick={() => void confirm()} disabled={pending}>
          삭제하기
        </Button>
      </Actions>
    </Modal>
  );
}

type WithdrawModalProps = {
  open: boolean;
  onClose: () => void;
};

export function WithdrawModal({ open, onClose }: WithdrawModalProps) {
  const navigate = useNavigate();
  const setAnonymous = useAuthStore((state) => state.setAnonymous);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const close = () => {
    setPassword("");
    setError(null);
    onClose();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password === "") {
      setError("현재 비밀번호를 입력해 주세요.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      // 탈퇴는 현재 비밀번호 매번 확인
      await withdraw(password);
      setAnonymous();
      navigate(HOME_PATH, { replace: true });
    } catch (caught) {
      if (!(caught instanceof ApiError)) {
        throw caught;
      }
      setError(caught.fields.currentPassword?.[0] ?? caught.message);
    } finally {
      setPassword("");
      setPending(false);
    }
  };

  return (
    <Modal open={open} onClose={close} title="정말 탈퇴할까요?">
      <Lead>탈퇴하면 아래 정보가 바로 지워지고, 되돌릴 수 없어요.</Lead>
      <DeleteList>
        <li>계정 정보 (이메일 · 닉네임)</li>
        <li>대응 진행 기록과 설문 응답</li>
        <li>제보 내역 (이미 공개된 사고 정보는 남아요)</li>
      </DeleteList>
      <WithdrawForm onSubmit={(event) => void submit(event)} noValidate>
        <TextField
          label="현재 비밀번호"
          type="password"
          autoComplete="current-password"
          placeholder="본인 확인을 위해 입력해 주세요"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          maxLength={64}
          error={error ?? undefined}
        />
        <Actions>
          <Button variant="tertiary" onClick={close}>
            취소
          </Button>
          <Button type="submit" variant="danger" disabled={pending}>
            탈퇴하기
          </Button>
        </Actions>
      </WithdrawForm>
    </Modal>
  );
}
