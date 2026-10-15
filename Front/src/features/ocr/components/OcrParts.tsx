import { useRef, useState, type DragEvent } from "react";
import styled, { keyframes } from "styled-components";
import checkPrimary from "../../../assets/icons/check-primary.svg";
import checkResult from "../../../assets/icons/check-result.svg";
import uploadIcon from "../../../assets/icons/upload.svg";
import { Button } from "../../../shared/ui/Button";
import { LeakChip } from "../../../shared/ui/Tag";
import { mobileMedia, textStyle } from "../../../styles/typography";
import { OCR_ACCEPT } from "../api";

const NoticeBox = styled.section`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 24px 32px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.brand.primarySoft};

  h2 {
    ${textStyle("h3")}
    color: ${({ theme }) => theme.colors.brand.primary};
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  li {
    display: flex;
    align-items: center;
    gap: 10px;
    ${textStyle("bodyMd")}
  }

  img {
    flex-shrink: 0;
  }

  ${mobileMedia} {
    padding: 20px;
  }
`;

// 업로드 전에 위탁·삭제 고지
export function OcrNotice() {
  return (
    <NoticeBox aria-labelledby="ocr-notice-title">
      <h2 id="ocr-notice-title">업로드 전에 확인해 주세요</h2>
      <ul>
        <li>
          <img src={checkPrimary} width={20} height={20} alt="" />
          이미지는 저장하지 않고, 분석이 끝나면 바로 삭제돼요
        </li>
        <li>
          <img src={checkPrimary} width={20} height={20} alt="" />
          글자 인식을 위해 네이버 클라우드(CLOVA OCR)로 암호화해 전송돼요
        </li>
        <li>
          <img src={checkPrimary} width={20} height={20} alt="" />
          전화번호·카드번호 같은 개인정보는 가린 뒤, 등록된 공식 사고 정보와 맞춰봐요
        </li>
      </ul>
    </NoticeBox>
  );
}

const Drop = styled.div<{ $active: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 48px 32px;
  border: 2px dashed ${({ theme }) => theme.colors.brand.primary};
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme, $active }) => ($active ? theme.colors.accent.skyPale : theme.colors.surface.card)};
  text-align: center;

  ${mobileMedia} {
    padding: 32px 20px;
  }
`;

const UploadIconBox = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.accent.yellowPale};
`;

const DropTitle = styled.p`
  ${textStyle("h3")}
`;

const Constraint = styled.p`
  ${textStyle("caption")}
  color: ${({ theme }) => theme.colors.text.mute};
`;

const HiddenInput = styled.input`
  display: none;
`;

type DropZoneProps = {
  disabled: boolean;
  onFile: (file: File) => void;
};

export function DropZone({ disabled, onFile }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setActive(false);
    const file = event.dataTransfer.files[0];
    if (file && !disabled) {
      onFile(file);
    }
  };

  return (
    <Drop
      $active={active}
      onDragOver={(event) => {
        event.preventDefault();
        setActive(true);
      }}
      onDragLeave={() => setActive(false)}
      onDrop={handleDrop}
    >
      <UploadIconBox aria-hidden="true">
        <img src={uploadIcon} width={34} height={34} alt="" />
      </UploadIconBox>
      <DropTitle>캡처 이미지를 여기로 끌어오거나</DropTitle>
      <Button variant="tertiary" disabled={disabled} onClick={() => inputRef.current?.click()}>
        이미지 선택
      </Button>
      <HiddenInput
        ref={inputRef}
        type="file"
        accept={OCR_ACCEPT.join(",")}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            onFile(file);
          }
        }}
      />
      <Constraint>JPG · PNG, 5MB 이하 · 1시간에 10번까지 올릴 수 있어요</Constraint>
    </Drop>
  );
}

const ResultBox = styled.section<{ $matched: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
  padding: 32px;
  border: 2px solid
    ${({ theme, $matched }) => ($matched ? theme.colors.status.positive : theme.colors.border.default)};
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.surface.card};

  h2 {
    ${textStyle("h2")}
  }

  p {
    ${textStyle("bodyMd")}
    color: ${({ theme }) => theme.colors.text.body};
  }

  ${mobileMedia} {
    padding: 20px;
  }
`;

const ResultLabel = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  ${textStyle("labelSmStrong")}
  color: ${({ theme }) => theme.colors.status.positiveDeep};
`;

const ResultIcon = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.accent.sky};
`;

const Chips = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;

type OcrResultProps = {
  title: string;
  labels: string[];
  onStart: () => void;
};

export function OcrResult({ title, labels, onStart }: OcrResultProps) {
  return (
    <ResultBox $matched aria-labelledby="ocr-result-title" aria-live="polite">
      <ResultLabel>
        <ResultIcon aria-hidden="true">
          <img src={checkResult} width={16} height={16} alt="" />
        </ResultIcon>
        분석 결과
      </ResultLabel>
      <h2 id="ocr-result-title">{title}와 일치해요</h2>
      {labels.length > 0 ? (
        <Chips>
          {labels.map((label) => (
            <li key={label}>
              <LeakChip leaked label={label} />
            </li>
          ))}
        </Chips>
      ) : null}
      <p>찾은 항목은 다음 단계 설문에 자동으로 체크돼요.</p>
      <Button fullWidth onClick={onStart}>
        설문 시작하기
      </Button>
    </ResultBox>
  );
}

export function OcrUnmatched({ onRetry }: { onRetry: () => void }) {
  return (
    <ResultBox $matched={false} aria-live="polite">
      <h2>등록된 공식 사고와 일치하지 않아요</h2>
      <p>
        기업 공식 발표가 아직 등록되지 않았거나, 이미지에서 기업을 찾지 못했어요. 기업 이름으로 직접 검색하거나 다른
        이미지를 올려 주세요.
      </p>
      <Button variant="tertiary" onClick={onRetry}>
        다른 이미지 올리기
      </Button>
    </ResultBox>
  );
}

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`;

const LoadingBox = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 44px 40px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.surface.card};
  text-align: center;

  h2 {
    ${textStyle("h1")}
  }

  p {
    ${textStyle("bodyMd")}
    color: ${({ theme }) => theme.colors.text.body};
  }
`;

const Spinner = styled.span`
  width: 64px;
  height: 64px;
  border: 7px solid ${({ theme }) => theme.colors.brand.primarySoft};
  border-top-color: ${({ theme }) => theme.colors.brand.primary};
  border-radius: ${({ theme }) => theme.radius.pill};
  animation: ${spin} 0.9s linear infinite;
`;

const LoadingNote = styled.p`
  && {
    ${textStyle("bodySm")}
    color: ${({ theme }) => theme.colors.text.mute};
  }
`;

export function OcrLoading() {
  return (
    <LoadingBox role="status" aria-live="polite">
      <Spinner aria-hidden="true" />
      <h2>문자를 읽고 있어요</h2>
      <p>보통 5초 안에 끝나요. 이 화면을 닫지 말아 주세요.</p>
      <LoadingNote>올린 이미지는 분석이 끝나면 바로 삭제돼요.</LoadingNote>
    </LoadingBox>
  );
}
