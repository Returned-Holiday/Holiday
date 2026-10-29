import type { DefaultTheme } from "styled-components";

export const theme: DefaultTheme = {
  colors: {
    brand: {
      primary: "#3b7199",
      primaryPressed: "#2f5f80",
      primarySoft: "#e3f1f9",
    },
    accent: {
      sky: "#91c8e4",
      skyPale: "#eef6fb",
      yellow: "#f3d98b",
      yellowPale: "#fbf4e0",
    },
    surface: {
      canvas: "#fcfcf9",
      card: "#ffffff",
      navy: "#2c4f68",
    },
    text: {
      ink: "#1f2d3a",
      body: "#4a5560",
      mute: "#69737d",
      onDark: "#ffffff",
      onDarkSub: "#cfdde8",
    },
    border: {
      default: "#e4e0d3",
    },
    status: {
      positive: "#4c9a6a",
      positiveDeep: "#2f6b45",
      positivePale: "#e8f3ec",
      negative: "#c4473f",
      negativeDeep: "#9b2c31",
      negativePale: "#fbecea",
      warningContent: "#5a4a22",
      leak: "#ed7740",
      leakPale: "#fef1e9",
      leakDeep: "#a5481c",
    },
  },
  typography: {
    displayXl: { fontSize: "52px", lineHeight: 1.25, fontWeight: 700 },
    displayLg: { fontSize: "40px", lineHeight: 1.3, fontWeight: 700 },
    h1: { fontSize: "32px", lineHeight: 1.35, fontWeight: 700 },
    h2: { fontSize: "24px", lineHeight: 1.4, fontWeight: 700 },
    h3: { fontSize: "20px", lineHeight: 1.45, fontWeight: 700 },
    bodyLg: { fontSize: "19px", lineHeight: 1.6, fontWeight: 400 },
    bodyMd: { fontSize: "17px", lineHeight: 1.6, fontWeight: 400 },
    bodyMdStrong: { fontSize: "17px", lineHeight: 1.6, fontWeight: 700 },
    bodySm: { fontSize: "15px", lineHeight: 1.55, fontWeight: 400 },
    labelSmStrong: { fontSize: "15px", lineHeight: 1.5, fontWeight: 700 },
    button: { fontSize: "17px", lineHeight: 1.5, fontWeight: 700 },
    caption: { fontSize: "14px", lineHeight: 1.5, fontWeight: 500 },
  },
  gradients: {
    hero: "linear-gradient(90deg, #eef6fb 0%, #b0dbf0 100%)",
  },
  fontFamily:
    '"Noto Sans KR", system-ui, -apple-system, "Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
  radius: {
    sm: "8px",
    md: "10px",
    lg: "14px",
    xl: "24px",
    pill: "999px",
  },
  layout: {
    contentWidth: "1120px",
    gutter: "80px",
    mobileGutter: "16px",
    // 창이 콘텐츠 폭보다 좁을 때 좌우 여백 (넓을 때는 가운데 정렬로 가려짐)
    desktopGutter: "32px",
  },
  breakpoints: {
    mobile: "768px",
    // 콘텐츠 폭 + 좌우 여백 근처, 겹치는 장식 숨김
    narrow: "1180px",
  },
};
