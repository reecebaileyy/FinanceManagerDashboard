"use client";

import { ThemeToggle } from "@features/theme";

import styles from "./topbar.module.css";
import controls from "../../styles/controls.module.css";

import type { ChangeEvent, FormEvent } from "react";

export interface TopBarProps {
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  onSearch?: (value: string) => void;
  username: string;
  userInitials: string;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
}

export function TopBar({
  searchTerm,
  onSearchTermChange,
  onSearch,
  username,
  userInitials,
  onToggleSidebar,
  isSidebarOpen,
}: TopBarProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchTermChange(event.target.value);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSearch?.(searchTerm);
  };

  const handleToggleSidebar = () => {
    onToggleSidebar?.();
  };

  const toggleLabel = isSidebarOpen ? "Close" : "Menu";
  const topbarState = isSidebarOpen ? "true" : "false";

  return (
    <header className={styles.topbar} data-sidebar-open={topbarState}>
      {onToggleSidebar ? (
        <button
          type="button"
          className={styles.menuToggle}
          onClick={handleToggleSidebar}
          aria-label={isSidebarOpen ? "Hide navigation" : "Show navigation"}
          aria-controls="primary-navigation"
          aria-expanded={Boolean(isSidebarOpen)}
        >
          <span className={styles.menuToggleIcon} aria-hidden="true">
            <span className={styles.menuToggleBar} data-position="top" />
            <span className={styles.menuToggleBar} data-position="middle" />
            <span className={styles.menuToggleBar} data-position="bottom" />
          </span>
          <span className={styles.menuToggleLabel}>{toggleLabel}</span>
        </button>
      ) : null}
      <form className={styles.search} role="search" onSubmit={handleSubmit}>
        <input
          aria-label="Search"
          placeholder="Search transactions, categories, notes..."
          value={searchTerm}
          onChange={handleChange}
          className={styles.searchInput}
        />
        <button type="submit" className={controls.button}>
          Search
        </button>
      </form>
      <div className={styles.actions}>
        <ThemeToggle className={styles.themeToggle} />
        <div className={styles.userChip}>
          <span aria-hidden="true">{userInitials}</span>
          <span>{username}</span>
        </div>
      </div>
    </header>
  );
}







