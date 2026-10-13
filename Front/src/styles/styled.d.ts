import "styled-components";

type TextStyle = {
  fontSize: string;
  lineHeight: number;
  fontWeight: number;
};

declare module "styled-components" {
  export interface DefaultTheme {
    colors: {
      brand: {
        primary: string;
        primaryPressed: string;
        primarySoft: string;
      };
      accent: {
        sky: string;
        skyPale: string;
        yellow: string;
        yellowPale: string;
      };
      surface: {
        canvas: string;
        card: string;
        navy: string;
      };
      text: {
        ink: string;
        body: string;
        mute: string;
        onDark: string;
        onDarkSub: string;
      };
      border: {
        default: string;
      };
      status: {
        positive: string;
        positiveDeep: string;
        positivePale: string;
        negative: string;
        negativeDeep: string;
        negativePale: string;
        warningContent: string;
        leak: string;
        leakPale: string;
        leakDeep: string;
      };
    };
    typography: {
      displayXl: TextStyle;
      displayLg: TextStyle;
      h1: TextStyle;
      h2: TextStyle;
      h3: TextStyle;
      bodyLg: TextStyle;
      bodyMd: TextStyle;
      bodyMdStrong: TextStyle;
      bodySm: TextStyle;
      labelSmStrong: TextStyle;
      button: TextStyle;
      caption: TextStyle;
    };
    gradients: {
      hero: string;
    };
    fontFamily: string;
    radius: {
      sm: string;
      md: string;
      lg: string;
      xl: string;
      pill: string;
    };
    layout: {
      contentWidth: string;
      gutter: string;
      mobileGutter: string;
    };
    breakpoints: {
      mobile: string;
    };
  }
}
