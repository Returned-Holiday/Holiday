import { Link, useNavigate } from "react-router";
import styled from "styled-components";
import { INCIDENTS_PATH, surveyPath } from "../../app/paths";
import { incidentTitle } from "../../features/incident/format";
import { DropZone, OcrLoading, OcrNotice, OcrResult, OcrUnmatched } from "../../features/ocr/components/OcrParts";
import { useOcrUpload } from "../../features/ocr/useOcrUpload";
import { PageContainer } from "../../shared/ui/Page";
import { PageLead, PageTitle } from "../../shared/ui/SideNav";
import { textStyle } from "../../styles/typography";

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Breadcrumb = styled.p`
  ${textStyle("bodySm")}
  color: ${({ theme }) => theme.colors.text.body};
`;

const ErrorText = styled.p`
  ${textStyle("labelSmStrong")}
  color: ${({ theme }) => theme.colors.status.negativeDeep};
`;

const SearchLink = styled(Link)`
  ${textStyle("labelSmStrong")}
  color: ${({ theme }) => theme.colors.brand.primary};
  text-decoration: none;
`;

export function OcrUploadPage() {
  const navigate = useNavigate();
  const { state, upload, reset } = useOcrUpload();

  return (
    <PageContainer $maxWidth={760}>
      <Stack>
        <Breadcrumb>문자로 사고 찾기</Breadcrumb>
        <PageTitle>
          받은 유출 안내 문자를
          <br />
          올려주세요
        </PageTitle>
        <PageLead>캡처 이미지에서 기업과 유출 항목을 찾아, 다음 단계 설문에 미리 체크해 드려요.</PageLead>
        <OcrNotice />

        {state.status === "uploading" ? (
          <OcrLoading />
        ) : (
          <DropZone disabled={false} onFile={(file) => void upload(file)} />
        )}

        {state.status === "error" ? <ErrorText role="alert">{state.message}</ErrorText> : null}

        {state.status === "matched" ? (
          <OcrResult
            title={incidentTitle(state.result.incident.companyName)}
            labels={state.result.matchedItems.map((item) => item.label)}
            onStart={() => {
              void navigate(surveyPath(state.result.incident.id), {
                state: { prefillItemIds: state.result.matchedItems.map((item) => item.id) },
              });
            }}
          />
        ) : null}

        {state.status === "unmatched" ? <OcrUnmatched onRetry={reset} /> : null}

        <SearchLink to={INCIDENTS_PATH}>자동 인식이 안 되나요?  기업 이름으로 검색하기</SearchLink>
      </Stack>
    </PageContainer>
  );
}
