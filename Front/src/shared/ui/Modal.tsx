import { useEffect, useId, useRef, type ReactNode, type SyntheticEvent } from "react";
import styled from "styled-components";
import { mobileMedia, textStyle } from "../../styles/typography";

// wide: 약관 같은 긴 문서용 (내부 스크롤)
const Dialog = styled.dialog<{ $wide: boolean }>`
  width: ${({ $wide }) => ($wide ? "min(880px, calc(100vw - 32px))" : "min(480px, calc(100vw - 32px))")};
  max-height: calc(100vh - 48px);
  overflow-y: auto;

  &:focus-visible {
    outline: none;
  }
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

const Body = styled.div<{ $centered: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $centered }) => ($centered ? "center" : "stretch")};
  gap: 18px;
  text-align: ${({ $centered }) => ($centered ? "center" : "left")};
`;

const Title = styled.h2<{ $centered: boolean }>`
  ${({ $centered }) => ($centered ? textStyle("h2") : textStyle("h1"))}

  ${mobileMedia} {
    ${textStyle("h2")}
  }
`;

type ModalProps = {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  dismissible?: boolean;
  centered?: boolean;
  wide?: boolean;
  illustration?: ReactNode;
  children: ReactNode;
};

export function Modal({
  open,
  title,
  onClose,
  dismissible = true,
  centered = false,
  wide = false,
  illustration,
  children,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const openRef = useRef(open);
  const titleId = useId();

  useEffect(() => {
    openRef.current = open;
    const dialog = ref.current;
    if (dialog === null) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
      // 긴 문서: 첫 버튼으로 포커스가 가면 중간부터 보임 → 창 자체에 포커스, 맨 위부터
      if (wide) {
        dialog.focus();
        dialog.scrollTop = 0;
      }
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, wide]);

  const handleCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    if (!dismissible) {
      event.preventDefault();
    }
  };

  const handleClose = () => {
    if (openRef.current) {
      onClose();
    }
  };

  return (
    <Dialog ref={ref} $wide={wide} tabIndex={-1} aria-labelledby={titleId} onCancel={handleCancel} onClose={handleClose}>
      {open ? (
        <Body $centered={centered}>
          {illustration}
          <Title id={titleId} $centered={centered}>
            {title}
          </Title>
          {children}
        </Body>
      ) : null}
    </Dialog>
  );
}
