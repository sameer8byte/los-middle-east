import React, { useEffect } from "react";
import { useAppSelector } from "../../redux/store";
import { useBrandMeta } from "../../hooks/useBrandMeta";

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const brandData = useAppSelector((state) => state.index);
  useEffect(() => {
    const root = document.documentElement;
    const theme = brandData.brand_themes;

    if (!theme) return;

    // Core Colors
    root.style.setProperty("--primary", theme.primaryColor);
    root.style.setProperty("--primary-active", theme.primaryActiveColor);
    root.style.setProperty("--primary-hover", theme.primaryHoverColor);
    root.style.setProperty("--primary-contrast", theme.primaryContrastColor);
    root.style.setProperty("--primary-focus", theme.primaryFocusColor);
    root.style.setProperty("--primary-light", theme.primaryLightColor);

    root.style.setProperty("--secondary", theme.secondaryColor);
    root.style.setProperty("--secondary-active", theme.secondaryActiveColor);
    root.style.setProperty("--secondary-hover", theme.secondaryHoverColor);
    root.style.setProperty(
      "--secondary-contrast",
      theme.secondaryContrastColor
    );
    root.style.setProperty("--secondary-focus", theme.secondaryFocusColor);
    root.style.setProperty("--secondary-light", theme.secondaryLightColor);

    root.style.setProperty("--background", theme.backgroundColor);
    root.style.setProperty("--on-background", theme.backgroundTextColor);

    root.style.setProperty("--surface", theme.surfaceColor);
    root.style.setProperty("--on-surface", theme.surfaceTextColor);

    // Text Colors
    root.style.setProperty("--on-primary", theme.primaryTextColor);
    root.style.setProperty("--on-secondary", theme.secondaryTextColor);

    // Status Colors
    root.style.setProperty("--success", theme.successColor);
    root.style.setProperty("--warning", theme.warningColor);
    root.style.setProperty("--error", theme.errorColor);

    // Typography
    root.style.setProperty("--font-family", theme.fontFamily);
    root.style.setProperty("--base-font-size", `${theme.baseFontSize}px`);

    // Theme Features
    root.style.setProperty(
      "--rounded-corners",
      theme.roundedCorners ? "1rem" : "0"
    );
    root.style.setProperty("--dark-mode", theme.darkMode ? "true" : "false");

    root.style.setProperty("--muted", "#c8c8c8");
  }, [brandData]);
  useBrandMeta();
  return <>{children}</>;
};
