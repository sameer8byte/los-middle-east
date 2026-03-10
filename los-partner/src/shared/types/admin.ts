export interface Brand {
  id: string
  name: string
  logoUrl: string
  createdAt: Date
  updatedAt: Date
  domain: string

}


export interface Appearance {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  primaryTextColor: string;
  secondaryTextColor: string;
  successColor: string;
  warningColor: string;
  errorColor: string;
  fontFamily: string;
  baseFontSize: number;
  roundedCorners: boolean;
  darkMode: boolean;
  primaryHoverColor: string;
  primaryFocusColor: string;
  primaryActiveColor: string;
  primaryLightColor: string;
  primaryContrastColor: string;
  secondaryHoverColor: string;
  secondaryFocusColor: string;
  secondaryActiveColor: string;
  secondaryLightColor: string;
  secondaryContrastColor: string;
  surfaceTextColor: string;
  backgroundTextColor: string;
}

export const FONT_FAMILIES = [
  "Inter",
  "Roboto",
  "Inter",
  "Poppins",
  "Montserrat",
  "Lato",
  "Nunito",
];