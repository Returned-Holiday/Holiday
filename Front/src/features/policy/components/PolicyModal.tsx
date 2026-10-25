import styled from "styled-components";
import { Button } from "../../../shared/ui/Button";
import { Modal } from "../../../shared/ui/Modal";
import type { PolicyDocumentData } from "../types";
import { PolicyDocument } from "./PolicyDocument";

const Content = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

type PolicyModalProps = {
  document: PolicyDocumentData | null;
  onClose: () => void;
};

// 가입 중 약관 확인 (새 창 X → 입력값 유지)
export function PolicyModal({ document, onClose }: PolicyModalProps) {
  return (
    <Modal open={document !== null} wide title={document?.title ?? ""} onClose={onClose}>
      {document ? (
        <Content>
          <PolicyDocument document={document} embedded />
          <Button fullWidth onClick={onClose}>
            확인
          </Button>
        </Content>
      ) : null}
    </Modal>
  );
}
