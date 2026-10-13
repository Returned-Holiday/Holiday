import styled from "styled-components";
import { FAQ_PATH } from "../../../app/paths";
import promoShield from "../../../assets/main/promo-shield.svg";
import { ButtonLink } from "../../../shared/ui/Button";
import { mobileMedia, textStyle } from "../../../styles/typography";
import { faqAnchor } from "../../faq/content";

const Box = styled.section`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 380px;
  flex-shrink: 0;
  padding: 28px 24px 28px 32px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.brand.primarySoft};

  ${mobileMedia} {
    width: 100%;
    padding: 24px 20px;
  }
`;

const Text = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
`;

const Title = styled.h2`
  ${textStyle("h2")}
`;

export function KisaPromo() {
  return (
    <Box aria-labelledby="kisa-promo-title">
      <Text>
        <Title id="kisa-promo-title">
          사칭 문자를 받았다면
          <br />
          KISA 118
        </Title>
        <ButtonLink to={`${FAQ_PATH}#${faqAnchor("report-channels")}`} size="sm">
          신고 방법 보기
        </ButtonLink>
      </Text>
      <img src={promoShield} width={96} height={96} alt="" />
    </Box>
  );
}
