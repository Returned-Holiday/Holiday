import { PolicyPageLayout } from "../../features/policy/components/PolicyPageLayout";
import { PRIVACY_POLICY } from "../../features/policy/privacy";

export function PrivacyPolicyPage() {
  return <PolicyPageLayout document={PRIVACY_POLICY} />;
}
