import type { ReactNode } from "react";

export type IconName =
  | "search"
  | "chat"
  | "doc"
  | "shield"
  | "phone"
  | "x"
  | "check"
  | "warning"
  | "clock"
  | "arrow";

type IconShape = {
  viewBox: number;
  strokeWidth: number;
  paths: ReactNode;
};

const ICONS: Record<IconName, IconShape> = {
  search: {
    viewBox: 26,
    strokeWidth: 2.4,
    paths: (
      <>
        <circle cx="11.92" cy="11.92" r="7.58" />
        <path d="M21.67 21.67L17.88 17.88" />
      </>
    ),
  },
  chat: {
    viewBox: 26,
    strokeWidth: 2.2,
    paths: (
      <>
        <path d="M4.33 5.42H21.67V17.33H9.75L4.33 21.67V5.42Z" />
        <path d="M8.67 10.83H17.33" />
      </>
    ),
  },
  doc: {
    viewBox: 26,
    strokeWidth: 2.2,
    paths: (
      <>
        <path d="M6.5 3.25H15.17L19.5 7.58V22.75H6.5V3.25Z" />
        <path d="M9.75 13H16.25M9.75 17.33H16.25" />
      </>
    ),
  },
  shield: {
    viewBox: 26,
    strokeWidth: 2.4,
    paths: (
      <>
        <path d="M13 3.25L21.67 6.5V13C21.67 17.88 17.98 21.88 13 22.75C8.02 21.88 4.33 17.88 4.33 13V6.5L13 3.25Z" />
        <path d="M9.21 13L11.92 15.71L16.79 10.29" />
      </>
    ),
  },
  phone: {
    viewBox: 26,
    strokeWidth: 2.2,
    paths: (
      <>
        <rect x="6.5" y="2.71" width="13" height="20.58" rx="3.25" />
        <path d="M11.38 19.5H14.63" />
      </>
    ),
  },
  x: {
    viewBox: 18,
    strokeWidth: 3,
    paths: <path d="M4.5 4.5L13.5 13.5M13.5 4.5L4.5 13.5" />,
  },
  check: {
    viewBox: 18,
    strokeWidth: 3,
    paths: <path d="M15 4.5L6.75 12.75L3 9" />,
  },
  warning: {
    viewBox: 18,
    strokeWidth: 2.4,
    paths: (
      <>
        <path d="M9 2.25L1.5 15H16.5L9 2.25Z" />
        <path d="M9 7.5V10.5M9 12.75H9.01" />
      </>
    ),
  },
  clock: {
    viewBox: 18,
    strokeWidth: 2.4,
    paths: (
      <>
        <circle cx="9" cy="9" r="6.75" />
        <path d="M9 5.63V9L11.25 10.5" />
      </>
    ),
  },
  arrow: {
    viewBox: 18,
    strokeWidth: 2.4,
    paths: <path d="M3.75 9H14.25M9.75 13.5L14.25 9L9.75 4.5" />,
  },
};

type IconProps = {
  name: IconName;
  size?: number;
};

export function Icon({ name, size = 18 }: IconProps) {
  const icon = ICONS[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${icon.viewBox} ${icon.viewBox}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={icon.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {icon.paths}
    </svg>
  );
}
