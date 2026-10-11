import type { ReactNode } from "react";
import { toSafeHttpsUrl } from "../lib/validators";

type SafeExternalLinkProps = {
  href: string;
  children: ReactNode;
  showDomain?: boolean;
};

// 새 창이 원래 페이지를 조작하지 못하도록 opener와 referrer를 넘기지 않는다
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
