import { useEffect, useId, useRef, type ReactNode, type SyntheticEvent } from "react";
import styled from "styled-components";
import { mobileMedia, textStyle } from "../../styles/typography";

const Dialog = styled.dialog`
  width: min(480px, calc(100vw - 32px));
  padding: 36px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.surface.card};
  color: ${({ theme }) => theme.colors.text.ink};

  &::backdrop {
    background: rgba(31, 45, 58, 0.5);
  }

  ${mobileMedia} {
    padding: 24px;
  }
`;

const Body = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const Title = styled.h2`
  ${textStyle("h1")}

  ${mobileMedia} {
    ${textStyle("h2")}
  }
`;

type ModalProps = {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  dismissible?: boolean;
  children: ReactNode;
};

// 네이티브 dialog: 포커스 가둠·배경 inert·닫힐 때 포커스 복귀
export function Modal({ open, title, onClose, dismissible = true, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    if (!dismissible) {
      event.preventDefault();
    }
  };

  return (
    <Dialog ref={ref} aria-labelledby={titleId} onCancel={handleCancel} onClose={onClose}>
      {open ? (
        <Body>
          <Title id={titleId}>{title}</Title>
          {children}
        </Body>
      ) : null}
    </Dialog>
  );
}
