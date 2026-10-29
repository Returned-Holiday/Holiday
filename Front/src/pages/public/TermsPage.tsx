import { PolicyPageLayout } from "../../features/policy/components/PolicyPageLayout";
import { TERMS_OF_SERVICE } from "../../features/policy/terms";

export function TermsPage() {
  return <PolicyPageLayout document={TERMS_OF_SERVICE} />;
}
