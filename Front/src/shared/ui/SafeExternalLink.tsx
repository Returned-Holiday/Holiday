import type { ReactNode } from "react";
import { toSafeHttpsUrl } from "../lib/validators";

type SafeExternalLinkProps = {
  href: string;
  children: ReactNode;
  showDomain?: boolean;
};

// tabnabbing 방지
export function SafeExternalLink({ href, children, showDomain = true }: SafeExternalLinkProps) {
  const url = toSafeHttpsUrl(href);
  if (url === null) {
    return <span>{children}</span>;
  }
  return (
    <a href={url.href} target="_blank" rel="noopener noreferrer">
      {children}
      {showDomain ? <span> ({url.hostname})</span> : null}
    </a>
  );
}
