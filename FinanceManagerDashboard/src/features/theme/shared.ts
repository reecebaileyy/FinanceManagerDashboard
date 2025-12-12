export const VALID_THEMES = ["light", "dark"] as const;

export type Theme = (typeof VALID_THEMES)[number];

export const DEFAULT_THEME: Theme = "light";
export const THEME_COOKIE_NAME = "fm-theme";
export const THEME_STORAGE_KEY = "finance-manager-theme";

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (VALID_THEMES as readonly string[]).includes(value);
}

export function coerceTheme(value: unknown, fallback: Theme = DEFAULT_THEME): Theme {
  return isTheme(value) ? value : fallback;
}
