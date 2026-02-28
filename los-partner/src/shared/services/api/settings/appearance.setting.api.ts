
import api from "../../axios";

export const getAppearance = async (brandId: string) => {
    try {
      const response = await api.get(
        `/partner/brand/${brandId}/settings/appearance`
      );
      return response.data;
    } catch (error) {
      console.error("Error sending SMS:", error);
      throw error;
    }
  };

  // @Post("update")
export const updateAppearance = async (
  brandId: string,
  primaryColor: string,
  secondaryColor: string,
  backgroundColor: string,  
  surfaceColor: string,
  primaryTextColor: string,
  secondaryTextColor: string,
  successColor: string,
  warningColor: string,
  errorColor: string,
  fontFamily: string,
  baseFontSize: number,
  roundedCorners: boolean,
  darkMode: boolean,
  primaryHoverColor: string,
  primaryFocusColor: string,
  primaryActiveColor: string,
  primaryLightColor: string,
  primaryContrastColor: string,
  secondaryHoverColor: string,
  secondaryFocusColor: string,
  secondaryActiveColor: string,
  secondaryLightColor: string,
  secondaryContrastColor: string,
  surfaceTextColor: string,
  backgroundTextColor: string
) => {
    try {
      const response = await api.post(
        `/partner/brand/${brandId}/settings/appearance/update`,
        {
          brandId,
          primaryColor,
          secondaryColor,
          backgroundColor,
          surfaceColor,
          primaryTextColor,
          secondaryTextColor,
          successColor,
          warningColor,
          errorColor,
          fontFamily,
          baseFontSize,
          roundedCorners,
          darkMode,
          primaryHoverColor,
          primaryFocusColor,
          primaryActiveColor,
          primaryLightColor,
          primaryContrastColor,
          secondaryHoverColor,
          secondaryFocusColor,
          secondaryActiveColor,
          secondaryLightColor,
          secondaryContrastColor,
          surfaceTextColor,
          backgroundTextColor
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error updating appearance settings:", error);
      throw error;
    }
  }
