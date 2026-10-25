import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import styled from "styled-components";
import { INCIDENTS_PATH } from "../../app/paths";
import infoIcon from "../../assets/icons/info.svg";
import { FaqAccordion } from "../../features/faq/components/FaqAccordion";
import { FAQ_CATEGORIES, faqAnchor, resolveFaqHash } from "../../features/faq/content";
import { useDocumentTitle } from "../../shared/lib/useDocumentTitle";
import { ButtonLink } from "../../shared/ui/Button";
import { PageContainer } from "../../shared/ui/Page";
import {
  PageEyebrow,
  PageLead,
  PageTitle,
  SideNavButton,
  SideNavContent,
  SideNavLabel,
  SideNavLayout,
  SideNavPanel,
} from "../../shared/ui/SideNav";
import { mobileMedia, textStyle } from "../../styles/typography";

const Notice = styled.p`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px 24px;
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.accent.yellowPale};
  ${textStyle("bodyMd")}
  color: ${({ theme }) => theme.colors.status.warningContent};

  img {
    flex-shrink: 0;
  }
`;

const Cta = styled.section`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 24px 24px 24px 32px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.accent.skyPale};

  h2 {
    ${textStyle("h3")}
    color: ${({ theme }) => theme.colors.status.positiveDeep};
  }

  ${mobileMedia} {
    padding: 20px;
  }
`;

const FIRST_CATEGORY = FAQ_CATEGORIES[0];

export function FaqPage() {
  useDocumentTitle("유출 대응 상식");
  const { hash } = useLocation();
  const [categoryId, setCategoryId] = useState(FIRST_CATEGORY?.id ?? "");
  const [openIds, setOpenIds] = useState<Set<string>>(
    () => new Set(FIRST_CATEGORY?.items[0] ? [FIRST_CATEGORY.items[0].id] : []),
  );
  const [scrollTarget, setScrollTarget] = useState<string | null>(null);

  useEffect(() => {
    const target = resolveFaqHash(hash);
    if (target === null) {
      return;
    }
    setCategoryId(target.categoryId);
    if (target.itemId !== null) {
      const itemId = target.itemId;
      setOpenIds((current) => new Set(current).add(itemId));
    }
    setScrollTarget(faqAnchor(target.itemId ?? target.categoryId));
  }, [hash]);

  useEffect(() => {
    if (scrollTarget === null) {
      return;
    }
    document.getElementById(scrollTarget)?.scrollIntoView({ block: "start" });
    setScrollTarget(null);
  }, [scrollTarget, categoryId]);

  const category = FAQ_CATEGORIES.find((item) => item.id === categoryId) ?? FIRST_CATEGORY;
  if (category === undefined) {
    return null;
  }

  const toggle = (id: string) =>
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  return (
    <PageContainer>
      <SideNavLayout>
        <SideNavPanel aria-label="상식 분류">
          <SideNavLabel>분류</SideNavLabel>
          {FAQ_CATEGORIES.map((item) => (
            <SideNavButton
              key={item.id}
              type="button"
              aria-current={item.id === category.id ? "true" : undefined}
              onClick={() => setCategoryId(item.id)}
            >
              {item.label}
            </SideNavButton>
          ))}
        </SideNavPanel>
        <SideNavContent id={faqAnchor(category.id)}>
          <PageEyebrow>유출 대응 상식</PageEyebrow>
          <PageTitle>{category.label}</PageTitle>
          <PageLead>{category.description}</PageLead>
          <Notice>
            <img src={infoIcon} width={22} height={22} alt="" />
            아래 내용은 모두 기업·정부기관 공식 자료를 근거로 하며, 답변 끝에 출처 링크가 있어요.
          </Notice>
          <FaqAccordion items={category.items} openIds={openIds} onToggle={toggle} />
          <Cta>
            <h2>내 상황에 맞는 조치가 궁금하다면</h2>
            <ButtonLink to={INCIDENTS_PATH}>사고 검색하기</ButtonLink>
          </Cta>
        </SideNavContent>
      </SideNavLayout>
    </PageContainer>
  );
}
