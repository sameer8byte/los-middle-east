// Theme utility functions for consistent use of CSS custom properties

export const themeColors = {
  // Primary colors
  primary: 'var(--color-primary)',
  primaryActive: 'var(--color-primary-active)',
  primaryHover: 'var(--color-primary-hover)',
  primaryContrast: 'var(--color-primary-contrast)',
  primaryFocus: 'var(--color-primary-focus)',
  primaryLight: 'var(--color-primary-light)',

  // Secondary colors
  secondary: 'var(--color-secondary)',
  secondaryActive: 'var(--color-secondary-active)',
  secondaryHover: 'var(--color-secondary-hover)',
  secondaryContrast: 'var(--color-secondary-contrast)',
  secondaryFocus: 'var(--color-secondary-focus)',
  secondaryLight: 'var(--color-secondary-light)',

  // Background colors
  background: 'var(--color-background)',
  surface: 'var(--color-surface)',

  // Text colors
  onBackground: 'var(--color-on-background)',
  onSurface: 'var(--color-on-surface)',
  onPrimary: 'var(--color-on-primary)',
  onSecondary: 'var(--color-on-secondary)',

  // Semantic colors
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
  
  // Muted
  muted: 'var(--color-muted)',
} as const;

export const themeTypography = {
  fontFamily: 'var(--font-brand)',
  fontSize: 'var(--text-base)',
  borderRadius: 'var(--radius-brand)',
} as const;

// Helper function to get CSS custom property value
export const getCSSCustomProperty = (property: string): string => {
  return getComputedStyle(document.documentElement).getPropertyValue(property).trim();
};

// Helper function to apply theme-aware styles
export const getThemeClasses = (variant: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'muted' = 'primary') => {
  const baseClasses = 'transition-colors duration-200';
  
  switch (variant) {
    case 'primary':
      return `${baseClasses} bg-[var(--color-primary)] text-[var(--color-primary-contrast)] hover:bg-[var(--color-primary-hover)] focus:bg-[var(--color-primary-focus)] active:bg-[var(--color-primary-active)]`;
    case 'secondary':
      return `${baseClasses} bg-[var(--color-secondary)] text-[var(--color-secondary-contrast)] hover:bg-[var(--color-secondary-hover)] focus:bg-[var(--color-secondary-focus)] active:bg-[var(--color-secondary-active)]`;
    case 'success':
      return `${baseClasses} bg-[var(--color-success)] text-white`;
    case 'warning':
      return `${baseClasses} bg-[var(--color-warning)] text-white`;
    case 'error':
      return `${baseClasses} bg-[var(--color-error)] text-white`;
    case 'muted':
      return `${baseClasses} bg-[var(--color-muted)] text-[var(--color-on-background)]`;
    default:
      return baseClasses;
  }
};

// Helper for border radius based on theme setting
export const getBorderRadius = (size: 'sm' | 'md' | 'lg' | 'full' = 'md') => {
  const baseRadius = 'var(--radius-brand)';
  const fallbacks = {
    sm: '4px',
    md: '6px',
    lg: '8px',
    full: '9999px'
  };
  
  // If rounded corners are disabled, use fallback for 'full' only
  if (getCSSCustomProperty('--radius-brand') === '0px' && size !== 'full') {
    return '0px';
  }
  
  return size === 'full' ? fallbacks.full : baseRadius;
};
