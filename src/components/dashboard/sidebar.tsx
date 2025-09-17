"use client";

import styles from "./sidebar.module.css";

import type { MouseEvent } from "react";

export interface NavItem<TId extends string = string> {
  id: TId;
  label: string;
  href: string;
  icon?: string;
  requiresAuth?: boolean;
}

export interface SidebarProps<TId extends string = string> {
  items: NavItem<TId>[];
  activeId: TId;
  onNavigate?: (id: TId) => void;
  isAuthenticated: boolean;
  tip?: string;
  onRequestClose?: () => void;
  className?: string;
  isOpen?: boolean;
}

export function Sidebar<TId extends string = string>({
  items,
  activeId,
  onNavigate,
  isAuthenticated,
  tip,
  onRequestClose,
  className,
  isOpen,
}: SidebarProps<TId>) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>, id: TId) => {
    if (!onNavigate) {
      return;
    }

    event.preventDefault();
    onNavigate(id);
    onRequestClose?.();
  };

  const sidebarClassName = [styles.sidebar, className].filter(Boolean).join(" ");

  return (
    <aside className={sidebarClassName} data-open={isOpen ? "true" : "false"}>
      <div className={styles.brand}>
        <div className={styles.brandBadge}>FM</div>
        <h1 className={styles.brandTitle}>Finance Manager</h1>
      </div>
      <nav className={styles.nav} aria-label="Primary" id="primary-navigation">
        {items
          .filter((item) => (item.requiresAuth ? isAuthenticated : true))
          .map((item) => {
            const navClasses = [styles.navItem];

            if (item.id === activeId) {
              navClasses.push(styles.navItemActive);
            }

            return (
              <a
                key={item.id}
                href={item.href}
                onClick={(event) => handleClick(event, item.id)}
                className={navClasses.join(" ")}
                aria-current={item.id === activeId ? "page" : undefined}
              >
                {item.icon ? (
                  <span className={styles.navIcon} aria-hidden="true">
                    {item.icon}
                  </span>
                ) : null}
                <span>{item.label}</span>
              </a>
            );
          })}
      </nav>
      {tip ? (
        <div className={styles.asideCard} aria-live="polite">
          <strong>Tip</strong>
          <p className={styles.asideCardText}>{tip}</p>
        </div>
      ) : null}
    </aside>
  );
}
