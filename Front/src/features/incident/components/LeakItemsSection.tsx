import styled from "styled-components";
import { LeakChip } from "../../../shared/ui/Tag";
import { textStyle } from "../../../styles/typography";
import { explainTerms } from "../glossary";
import type { LeakItem } from "../types";
import { ChipList, DetailCard, DetailCardHeader, DetailCardTitle } from "./DetailCard";

const Basis = styled.p`
  ${textStyle("caption")}
  color: ${({ theme }) => theme.colors.text.mute};
`;

const Glossary = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  padding: 16px 20px;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.surface.canvas};

  h3 {
    ${textStyle("labelSmStrong")}
    color: ${({ theme }) => theme.colors.brand.primary};
  }

  p {
    ${textStyle("bodySm")}
    color: ${({ theme }) => theme.colors.text.body};
  }
`;

const Empty = styled.p`
  ${textStyle("bodyMd")}
  color: ${({ theme }) => theme.colors.text.body};
`;

function ItemChips({ items }: { items: LeakItem[] }) {
  return (
    <ChipList>
      {items.map((item) => (
        <li key={item.id}>
          <LeakChip leaked={item.isLeaked} label={item.label} />
        </li>
      ))}
    </ChipList>
  );
}

export function LeakItemsSection({ items }: { items: LeakItem[] }) {
  const leaked = items.filter((item) => item.isLeaked);
  const safe = items.filter((item) => !item.isLeaked);
  const explanation = explainTerms(leaked.map((item) => item.label));

  return (
    <>
      <DetailCard aria-labelledby="leaked-items-title">
        <DetailCardHeader>
          <DetailCardTitle id="leaked-items-title">유출된 항목</DetailCardTitle>
          <Basis>기업 공식 발표 기준</Basis>
        </DetailCardHeader>
        {leaked.length > 0 ? (
          <ItemChips items={leaked} />
        ) : (
          <Empty>발표된 유출 항목이 아직 없어요.</Empty>
        )}
        {explanation ? (
          <Glossary>
            <h3>이 용어가 무슨 뜻인가요?</h3>
            <p>{explanation}</p>
          </Glossary>
        ) : null}
      </DetailCard>
      {safe.length > 0 ? (
        <DetailCard aria-labelledby="safe-items-title">
          <DetailCardTitle id="safe-items-title">유출되지 않은 것으로 발표된 항목</DetailCardTitle>
          <ItemChips items={safe} />
        </DetailCard>
      ) : null}
    </>
  );
}
