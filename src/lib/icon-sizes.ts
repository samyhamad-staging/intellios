/** Standardized icon sizes for consistent UI */
export const ICON_SIZE = {
  xs: 12,    // decorative, micro labels
  sm: 14,    // sidebar nav, compact UI
  base: 16,  // default inline, buttons
  lg: 20,    // feature icons, section headers
  xl: 24,    // empty states, hero sections
} as const;

export type IconSize = keyof typeof ICON_SIZE;
