import { FAQ_PATH } from "../../../app/paths";
import { FAQ_HIGHLIGHTS, faqAnchor } from "../../faq/content";
import { HomeListSection, ListRows, RowLink, RowMeta, RowTitle } from "./HomeListSection";

export function FaqHighlightList() {
  return (
    <HomeListSection id="faq-highlights-title" title="유출 대응 상식" moreLabel="더보기 +" moreTo={FAQ_PATH}>
      <ListRows>
        {FAQ_HIGHLIGHTS.map((faq) => (
          <li key={faq.id}>
            <RowLink to={`${FAQ_PATH}#${faqAnchor(faq.id)}`}>
              <RowTitle>{faq.question}</RowTitle>
              <RowMeta aria-hidden="true">›</RowMeta>
            </RowLink>
          </li>
        ))}
      </ListRows>
    </HomeListSection>
  );
}
