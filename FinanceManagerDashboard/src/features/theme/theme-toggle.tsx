"use client";

import styles from "./theme-toggle.module.css";

import { useTheme } from "./theme-provider";

export interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const nextThemeLabel = theme === "dark" ? "light" : "dark";
  const buttonLabel = `${theme === "dark" ? "Dark" : "Light"} mode`;
  const classes = [styles.button, className].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      className={classes}
      onClick={toggleTheme}
      aria-pressed={theme === "dark"}
      aria-label={`Switch to ${nextThemeLabel} theme`}
      data-theme-state={theme}
    >
      <span className={styles.indicator} aria-hidden="true" data-theme-state={theme} />
      <span className={styles.label}>{buttonLabel}</span>
    </button>
  );
}
