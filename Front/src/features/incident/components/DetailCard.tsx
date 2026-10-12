import styled from "styled-components";
import { Card } from "../../../shared/ui/Card";
import { textStyle } from "../../../styles/typography";

export const DetailCard = styled(Card)`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 16px;
`;

export const DetailCardHeader = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
`;

export const DetailCardTitle = styled.h2`
  ${textStyle("h2")}
`;

export const ChipList = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;
