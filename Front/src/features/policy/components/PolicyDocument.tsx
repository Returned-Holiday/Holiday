import { useState } from "react";
import styled from "styled-components";
import checkCircle from "../../../assets/icons/check-circle.svg";
import { PageEyebrow, PageLead, PageTitle } from "../../../shared/ui/SideNav";
import { mobileMedia, textStyle } from "../../../styles/typography";
import type { PolicyBody, PolicyDocumentData, PolicySection } from "../types";

const EffectiveDate = styled.p`
  align-self: flex-start;
  padding: 6px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.colors.surface.card};
  ${textStyle("labelSmStrong")}
  color: ${({ theme }) => theme.colors.text.body};
`;

const Summary = styled.section`
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 32px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.accent.skyPale};

  h2 {
    ${textStyle("h3")}
    color: ${({ theme }) => theme.colors.status.positiveDeep};
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  li {
    display: flex;
    align-items: center;
    gap: 12px;
    ${textStyle("bodyMdStrong")}
  }

  img {
    flex-shrink: 0;
  }

  ${mobileMedia} {
    padding: 20px;
  }
`;

const Section = styled.section`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const SectionTitle = styled.h2`
  ${textStyle("h2")}
  white-space: pre-wrap;
`;

const TableScroll = styled.div`
  overflow-x: auto;
  border: 1px solid ${({ theme }) => theme.colors.border.default};
  border-radius: 16px;
  background: ${({ theme }) => theme.colors.surface.card};
`;

const Table = styled.table`
  width: 100%;
  min-width: 560px;
  border-collapse: collapse;
  table-layout: fixed;

  th,
  td {
    padding: 14px 18px;
    border-bottom: 1px solid ${({ theme }) => theme.colors.border.default};
    text-align: left;
    vertical-align: top;
  }

  tr:last-child td {
    border-bottom: none;
  }

  th {
    background: ${({ theme }) => theme.colors.brand.primarySoft};
    ${textStyle("labelSmStrong")}
    color: ${({ theme }) => theme.colors.brand.primary};
  }

  td {
    ${textStyle("bodyMd")}
    color: ${({ theme }) => theme.colors.text.body};
  }

  td:first-child {
    ${textStyle("bodyMdStrong")}
    color: ${({ theme }) => theme.colors.text.ink};
  }
`;

const Numbered = styled.ol<{ $boxed: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 12px;
  counter-reset: policy;
  ${({ $boxed, theme }) =>
    $boxed
      ? `padding: 24px; border-radius: ${theme.radius.xl}; background: ${theme.colors.surface.card};`
      : ""}

  li {
    display: flex;
    gap: 10px;
    ${textStyle("bodySm")}
    color: ${({ theme }) => theme.colors.text.body};
    counter-increment: policy;
  }

  li::before {
    content: counter(policy);
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: ${({ theme }) => theme.radius.pill};
    background: ${({ theme }) => theme.colors.brand.primarySoft};
    ${textStyle("caption")}
    color: ${({ theme }) => theme.colors.brand.primary};
  }
`;

const Paragraphs = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  p {
    ${textStyle("bodyMd")}
    color: ${({ theme }) => theme.colors.text.body};
  }
`;

const Collapsibles = styled.ul`
  padding: 6px 32px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.colors.surface.card};

  > li + li {
    border-top: 1px solid ${({ theme }) => theme.colors.border.default};
  }

  ${mobileMedia} {
    padding: 4px 16px;
  }
`;

const CollapsibleButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  padding: 20px 0;
  border: none;
  background: none;
  ${textStyle("h3")}
  color: ${({ theme }) => theme.colors.text.ink};
  text-align: left;
  white-space: pre-wrap;
  cursor: pointer;

  span {
    ${textStyle("h2")}
    color: ${({ theme }) => theme.colors.brand.primary};
  }
`;

const CollapsiblePanel = styled.div`
  padding: 0 0 20px;
`;

function Body({ body, boxed }: { body: PolicyBody; boxed: boolean }) {
  if (body.kind === "table") {
    return (
      <TableScroll>
        <Table>
          <colgroup>
            {body.columns.map((column) => (
              <col key={column.label} style={{ width: `${column.width}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {body.columns.map((column) => (
                <th key={column.label} scope="col">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {body.rows.map((row) => (
              <tr key={row.join("|")}>
                {row.map((cell, index) => (
                  <td key={`${index}-${cell}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      </TableScroll>
    );
  }
  if (body.kind === "numbered") {
    return (
      <Numbered $boxed={boxed}>
        {body.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </Numbered>
    );
  }
  return (
    <Paragraphs>
      {body.paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </Paragraphs>
  );
}

function CollapsibleSections({ sections }: { sections: PolicySection[] }) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
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
    <Collapsibles>
      {sections.map((section) => {
        const open = openIds.has(section.id);
        const panelId = `policy-${section.id}`;
        return (
          <li key={section.id}>
            <h2>
              <CollapsibleButton
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggle(section.id)}
              >
                {section.title}
                <span aria-hidden="true">{open ? "−" : "+"}</span>
              </CollapsibleButton>
            </h2>
            <CollapsiblePanel id={panelId} hidden={!open}>
              <Body body={section.body} boxed={false} />
            </CollapsiblePanel>
          </li>
        );
      })}
    </Collapsibles>
  );
}

export function PolicyDocument({ document }: { document: PolicyDocumentData }) {
  const visible = document.sections.filter((section) => !section.collapsed);
  const collapsed = document.sections.filter((section) => section.collapsed);

  return (
    <>
      <PageEyebrow>약관 및 정책</PageEyebrow>
      <PageTitle>{document.title}</PageTitle>
      <EffectiveDate>시행일 {document.effectiveDate}</EffectiveDate>
      <PageLead>{document.lead}</PageLead>
      <Summary aria-labelledby="policy-summary-title">
        <h2 id="policy-summary-title">한눈에 보기</h2>
        <ul>
          {document.highlights.map((highlight) => (
            <li key={highlight}>
              <img src={checkCircle} width={24} height={24} alt="" />
              {highlight}
            </li>
          ))}
        </ul>
      </Summary>
      {visible.map((section) => (
        <Section key={section.id} aria-labelledby={`policy-title-${section.id}`}>
          <SectionTitle id={`policy-title-${section.id}`}>{section.title}</SectionTitle>
          <Body body={section.body} boxed />
        </Section>
      ))}
      {collapsed.length > 0 ? <CollapsibleSections sections={collapsed} /> : null}
    </>
  );
}
