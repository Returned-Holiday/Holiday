import "styled-components";

declare module "styled-components" {
  export interface DefaultTheme {
    colors: {
      text: string;
      background: string;
      primary: string;
      danger: string;
      muted: string;
    };
    fontSizes: {
      body: string;
      heading: string;
    };
  }
}
