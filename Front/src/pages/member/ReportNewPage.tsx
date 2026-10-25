import styled from "styled-components";
import { MYPAGE_PATH } from "../../app/paths";
import infoIcon from "../../assets/icons/info.svg";
import { COMPANY_NAME_MAX, LEAK_ITEMS_MAX, SOURCE_URL_MAX } from "../../features/report/api";
import { useReportForm } from "../../features/report/useReportForm";
import { useDocumentTitle } from "../../shared/lib/useDocumentTitle";
import { todayDateValue } from "../../shared/lib/validators";
import { Button, ButtonLink } from "../../shared/ui/Button";
import { Card } from "../../shared/ui/Card";
import { Illustration } from "../../shared/ui/Illustration";
import { PageContainer } from "../../shared/ui/Page";
import { PageLead, PageTitle } from "../../shared/ui/SideNav";
import { TextAreaField, TextField } from "../../shared/ui/TextField";
import { textStyle } from "../../styles/typography";

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const FormCard = styled(Card)`
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 40px;
`;

const Required = styled.span`
  margin-left: 8px;
  padding: 2px 8px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.colors.brand.primarySoft};
  ${textStyle("caption")}
  color: ${({ theme }) => theme.colors.brand.primary};
`;

const Warning = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  ${textStyle("labelSmStrong")}
  color: ${({ theme }) => theme.colors.status.warningContent};
`;

const MaskNote = styled.p`
  padding: 16px 20px;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.accent.yellowPale};
  ${textStyle("bodySm")}
  color: ${({ theme }) => theme.colors.status.warningContent};
`;

const SubmitButton = styled(Button)`
  min-height: 60px;
`;

const ErrorText = styled.p`
  ${textStyle("labelSmStrong")}
  color: ${({ theme }) => theme.colors.status.negativeDeep};
`;

const Done = styled(Card)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;

  h2 {
    ${textStyle("h1")}
  }

  p {
    ${textStyle("bodyMd")}
    color: ${({ theme }) => theme.colors.text.body};
  }
`;

function RequiredLabel({ children }: { children: string }) {
  return (
    <>
      {children}
      <Required>필수</Required>
    </>
  );
}

export function ReportNewPage() {
  useDocumentTitle("사고 제보하기");
  const form = useReportForm();

  return (
    <PageContainer $maxWidth={720}>
      <Stack>
        <PageTitle>사고 제보하기</PageTitle>
        <PageLead>아직 등록되지 않은 유출 사고를 알려주세요. 관리자가 공식 출처를 확인한 뒤 공개해요.</PageLead>

        {form.done ? (
          <Done role="status">
            <Illustration name="done" width={200} />
            <h2>제보가 접수됐어요</h2>
            <p>관리자가 공식 출처를 확인한 뒤 결과를 알려드려요. 결과는 마이페이지 › 제보 내역에서 볼 수 있어요.</p>
            <ButtonLink to={MYPAGE_PATH}>제보 내역 보기</ButtonLink>
          </Done>
        ) : (
          <Form onSubmit={(event) => void form.submit(event)} noValidate>
            <FormCard>
              <TextField
                label={<RequiredLabel>기업명</RequiredLabel>}
                placeholder="예: ▲▲마트"
                value={form.values.companyName}
                onChange={(event) => form.setValue("companyName", event.target.value)}
                onBlur={() => form.touch("companyName")}
                maxLength={COMPANY_NAME_MAX}
                error={form.errors.companyName}
                autoComplete="off"
              />
              <TextField
                label={<RequiredLabel>공식 출처 URL</RequiredLabel>}
                type="url"
                inputMode="url"
                placeholder="https://"
                value={form.values.sourceUrl}
                onChange={(event) => form.setValue("sourceUrl", event.target.value)}
                onBlur={() => form.touch("sourceUrl")}
                maxLength={SOURCE_URL_MAX}
                error={form.errors.sourceUrl}
                autoComplete="off"
              />
              <TextField
                label="기업 공지일"
                type="date"
                max={todayDateValue()}
                value={form.values.notifiedAt}
                onChange={(event) => form.setValue("notifiedAt", event.target.value)}
                onBlur={() => form.touch("notifiedAt")}
                hint="공지 원문에 적힌 날짜를 적어주세요"
                error={form.errors.notifiedAt}
              />
              <TextAreaField
                label={<RequiredLabel>유출 항목</RequiredLabel>}
                placeholder="공지에 적힌 유출 항목을 적어주세요 (예: 이름, 휴대전화번호, 이메일)"
                value={form.values.leakItemsText}
                onChange={(event) => form.setValue("leakItemsText", event.target.value)}
                onBlur={() => form.touch("leakItemsText")}
                maxLength={LEAK_ITEMS_MAX}
                hint={
                  <Warning>
                    <img src={infoIcon} width={16} height={16} alt="" />내 이름·전화번호·카드번호 같은 개인정보는
                    입력하지 마세요
                  </Warning>
                }
                error={form.errors.leakItemsText}
              />
              <MaskNote>
                전화번호·이메일·주민번호·카드번호·계좌번호는 저장할 때 자동으로 가려져요. 관리자 확인 전에는 공개되지 않고,
                결과는 마이페이지 › 제보 내역에서 볼 수 있어요.
              </MaskNote>
              {form.formError ? <ErrorText role="alert">{form.formError}</ErrorText> : null}
              <SubmitButton type="submit" fullWidth disabled={form.pending}>
                제보하기
              </SubmitButton>
            </FormCard>
          </Form>
        )}
      </Stack>
    </PageContainer>
  );
}
