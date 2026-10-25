import { PRIVACY_PATH, TERMS_PATH } from "../../../app/paths";
import { useDocumentTitle } from "../../../shared/lib/useDocumentTitle";
import { PageContainer } from "../../../shared/ui/Page";
import {
  SideNavContent,
  SideNavLabel,
  SideNavLayout,
  SideNavLink,
  SideNavPanel,
} from "../../../shared/ui/SideNav";
import type { PolicyDocumentData } from "../types";
import { PolicyDocument } from "./PolicyDocument";

export function PolicyPageLayout({ document }: { document: PolicyDocumentData }) {
  useDocumentTitle(document.title);
  return (
    <PageContainer>
      <SideNavLayout>
        <SideNavPanel aria-label="약관 및 정책">
          <SideNavLabel>약관 및 정책</SideNavLabel>
          <SideNavLink to={PRIVACY_PATH}>개인정보처리방침</SideNavLink>
          <SideNavLink to={TERMS_PATH}>이용약관</SideNavLink>
        </SideNavPanel>
        <SideNavContent>
          <PolicyDocument document={document} />
        </SideNavContent>
      </SideNavLayout>
    </PageContainer>
  );
}
