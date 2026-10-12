import type { ReactNode } from "react";
import styled, { css } from "styled-components";
import { textStyle } from "../../styles/typography";
import { Icon } from "./Icon";

type LeakChipProps = {
  leaked: boolean;
  label: string;
  size?: "md" | "sm";
};

const ChipBox = styled.span<{ $leaked: boolean; $size: "md" | "sm" }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ $size }) => ($size === "md" ? "8px" : "6px")};
  padding: ${({ $size }) => ($size === "md" ? "10px 18px 10px 16px" : "5px 14px 5px 12px")};
  border: 1.5px solid;
  border-radius: ${({ theme }) => theme.radius.pill};
  ${({ $size }) => ($size === "md" ? textStyle("bodyMdStrong") : textStyle("labelSmStrong"))}
  ${({ theme, $leaked }) =>
    $leaked
      ? css`
          background: ${theme.colors.status.leakPale};
          border-color: ${theme.colors.status.leak};
          color: ${theme.colors.status.leakDeep};
        `
      : css`
          background: ${theme.colors.status.positivePale};
          border-color: ${theme.colors.status.positiveDeep};
          color: ${theme.colors.status.positiveDeep};
        `}
`;

// 색 외에 문구로도 구분 (색각 이상 대응)
export function LeakChip({ leaked, label, size = "md" }: LeakChipProps) {
  return (
    <ChipBox $leaked={leaked} $size={size}>
      <Icon name={leaked ? "x" : "check"} size={size === "md" ? 18 : 14} />
      {label} · {leaked ? "유출됨" : "유출 안 됨"}
    </ChipBox>
  );
}

export type BadgeTone = "urgent" | "recommended";

const BadgeBox = styled.span<{ $tone: BadgeTone }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px 6px 12px;
  border-radius: ${({ theme }) => theme.radius.md};
  ${textStyle("labelSmStrong")}
  background: ${({ theme, $tone }) =>
    $tone === "urgent" ? theme.colors.status.negative : theme.colors.accent.yellow};
  color: ${({ theme, $tone }) =>
    $tone === "urgent" ? theme.colors.text.onDark : theme.colors.status.warningContent};
`;

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <BadgeBox $tone={tone}>
      <Icon name={tone === "urgent" ? "warning" : "clock"} />
      {children}
    </BadgeBox>
  );
}

export type PillTone = "active" | "neutral" | "positive" | "negative" | "notice" | "new";

const pillColors: Record<PillTone, ReturnType<typeof css>> = {
  active: css`
    background: ${({ theme }) => theme.colors.brand.primarySoft};
    color: ${({ theme }) => theme.colors.brand.primary};
  `,
  neutral: css`
    background: ${({ theme }) => theme.colors.surface.canvas};
    color: ${({ theme }) => theme.colors.text.body};
  `,
  positive: css`
    background: ${({ theme }) => theme.colors.status.positivePale};
    color: ${({ theme }) => theme.colors.status.positiveDeep};
  `,
  negative: css`
    background: ${({ theme }) => theme.colors.status.negativePale};
    color: ${({ theme }) => theme.colors.status.negativeDeep};
  `,
  notice: css`
    background: ${({ theme }) => theme.colors.accent.yellowPale};
    color: ${({ theme }) => theme.colors.status.warningContent};
  `,
  new: css`
    background: ${({ theme }) => theme.colors.brand.primarySoft};
    color: ${({ theme }) => theme.colors.brand.primary};
  `,
};

const PillBox = styled.span<{ $tone: PillTone }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  ${textStyle("labelSmStrong")}
  ${({ $tone }) => pillColors[$tone]}
`;

export function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return <PillBox $tone={tone}>{children}</PillBox>;
}
