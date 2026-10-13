import styled from "styled-components";
import { LOGIN_PATH, surveyPath } from "../../../app/paths";
import { ButtonLink } from "../../../shared/ui/Button";
import { mobileMedia, textStyle } from "../../../styles/typography";
import { useAuthStore } from "../../auth/useAuthStore";

const Box = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 32px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.brand.primary};
  color: ${({ theme }) => theme.colors.text.onDark};

  ${mobileMedia} {
    padding: 24px 20px;
  }
`;

const Title = styled.h2`
  ${textStyle("displayLg")}
  letter-spacing: -0.01em;

  ${mobileMedia} {
    ${textStyle("h1")}
  }
`;

const Lead = styled.p`
  ${textStyle("bodyMd")}
`;

const Note = styled.p`
  ${textStyle("caption")}
  text-align: center;
`;

export function DiagnosisCta({ incidentId }: { incidentId: number }) {
  const authenticated = useAuthStore((state) => state.status === "authenticated");
  const target = surveyPath(incidentId);

  return (
    <Box aria-labelledby="diagnosis-title">
      <Title id="diagnosis-title">개인별 맞춤 대응 진단 받기</Title>
      <Lead>질문 5개에 답하면, 내 상황에 맞는 할 일 목록을 순서대로 만들어 드려요.</Lead>
      {authenticated ? (
        <ButtonLink to={target} variant="accent" fullWidth>
          내 대응법 보기
        </ButtonLink>
      ) : (
        <>
          <ButtonLink to={LOGIN_PATH} state={{ from: target }} variant="accent" fullWidth>
            내 대응법 보기
          </ButtonLink>
          <Note>로그인 후 이용할 수 있어요</Note>
        </>
      )}
    </Box>
  );
}
