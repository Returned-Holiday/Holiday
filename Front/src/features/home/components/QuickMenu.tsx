import { Link } from "react-router";
import styled from "styled-components";
import { FAQ_PATH, INCIDENTS_PATH, MYPAGE_PATH, OCR_PATH, REPORT_NEW_PATH } from "../../../app/paths";
import menuChat from "../../../assets/main/menu-chat.svg";
import menuChecklist from "../../../assets/main/menu-checklist.svg";
import menuPhone from "../../../assets/main/menu-phone.svg";
import menuReport from "../../../assets/main/menu-report.svg";
import menuSearch from "../../../assets/main/menu-search.svg";
import { mobileMedia, textStyle } from "../../../styles/typography";

const MENU = [
  { label: "사고 조회", to: INCIDENTS_PATH, icon: menuSearch },
  { label: "문자로 찾기", to: OCR_PATH, icon: menuPhone },
  { label: "맞춤 체크리스트", to: MYPAGE_PATH, icon: menuChecklist },
  { label: "유출 대응 상식", to: FAQ_PATH, icon: menuChat },
  { label: "사고 제보", to: REPORT_NEW_PATH, icon: menuReport },
] as const;

const Box = styled.nav`
  flex: 1;
  min-width: 0;
  padding: 28px 24px;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.surface.card};

  ${mobileMedia} {
    padding: 20px 12px;
  }
`;

const List = styled.ul`
  display: flex;
  justify-content: space-between;
  gap: 8px;

  ${mobileMedia} {
    flex-wrap: wrap;
    justify-content: space-around;
    row-gap: 20px;
  }
`;

const Item = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  ${textStyle("bodyMdStrong")}
  color: ${({ theme }) => theme.colors.text.ink};
  text-decoration: none;
  white-space: nowrap;
`;

const IconCircle = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 88px;
  height: 88px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.colors.accent.skyPale};

  ${mobileMedia} {
    width: 64px;
    height: 64px;
  }
`;

export function QuickMenu() {
  return (
    <Box aria-label="바로가기">
      <List>
        {MENU.map((menu) => (
          <li key={menu.label}>
            <Item to={menu.to}>
              <IconCircle>
                <img src={menu.icon} width={44} height={44} alt="" />
              </IconCircle>
              {menu.label}
            </Item>
          </li>
        ))}
      </List>
    </Box>
  );
}
