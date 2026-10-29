import styled from "styled-components";
import { Icon } from "../../../shared/ui/Icon";
import { textStyle } from "../../../styles/typography";
import { DetailCard } from "./DetailCard";

const Box = styled(DetailCard)`
  gap: 4px;
`;

const Title = styled.h2`
  ${textStyle("h3")}
`;

const List = styled.ul`
  width: 100%;
`;

const Row = styled.li`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
`;

const IconBox = styled.span`
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 18px;
  background: ${({ theme }) => theme.colors.accent.skyPale};
  color: ${({ theme }) => theme.colors.status.positiveDeep};
`;

const Text = styled.div`
  flex: 1;
  min-width: 0;
`;

const Name = styled.p`
  ${textStyle("bodyMdStrong")}
`;

const Desc = styled.p`
  ${textStyle("bodySm")}
  color: ${({ theme }) => theme.colors.text.body};
  white-space: pre-line;
  overflow-wrap: anywhere;
`;

const PhoneNumber = styled.a`
  flex-shrink: 0;
  ${textStyle("h3")}
  color: ${({ theme }) => theme.colors.brand.primary};
  text-decoration: none;
`;

type HelpContactsProps = {
  companyName: string;
  contactInfo: string | null;
};

export function HelpContacts({ companyName, contactInfo }: HelpContactsProps) {
  return (
    <Box aria-labelledby="help-contacts-title">
      <Title id="help-contacts-title">도움받을 수 있는 곳</Title>
      <List>
        {contactInfo ? (
          <Row>
            <IconBox>
              <Icon name="phone" size={26} />
            </IconBox>
            <Text>
              <Name>{companyName} 상담 채널</Name>
              <Desc>{contactInfo}</Desc>
            </Text>
          </Row>
        ) : null}
        <Row>
          <IconBox>
            <Icon name="phone" size={26} />
          </IconBox>
          <Text>
            <Name>KISA 118 상담센터</Name>
            <Desc>사칭 문자·전화 신고</Desc>
          </Text>
          <PhoneNumber href="tel:118" aria-label="KISA 118 상담센터 전화하기">
            118
          </PhoneNumber>
        </Row>
      </List>
    </Box>
  );
}
