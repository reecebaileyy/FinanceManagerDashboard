import { cloneElement, isValidElement, type ReactNode } from "react";

import styles from "./dashboard-shell.module.css";

export interface DashboardShellProps {
  sidebar: ReactNode;
  topbar: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  isSidebarOpen?: boolean;
  onSidebarClose?: () => void;
}

export function DashboardShell({
  sidebar,
  topbar,
  children,
  footer,
  isSidebarOpen = true,
  onSidebarClose,
}: DashboardShellProps) {
  const renderFooter = () => {
    if (!footer) {
      return null;
    }

    if (isValidElement<{ className?: string }>(footer)) {
      const existingClassName = footer.props.className ?? "";
      const footerClassName = [styles.footer, existingClassName].filter(Boolean).join(" "
      );

      return cloneElement(footer, {
        className: footerClassName,
      });
    }

    return <div className={styles.footer}>{footer}</div>;
  };

  return (
    <div className={styles.root} data-sidebar-open={isSidebarOpen ? "true" : "false"}>
      <a className={styles.skipLink} href="#main-content">Skip to main content</a>
      {sidebar}
      {onSidebarClose && isSidebarOpen ? (
        <button
          type="button"
          className={styles.overlay}
          aria-label="Close navigation menu"
          onClick={onSidebarClose}
        />
      ) : null}
      <div className={styles.mainColumn}>
        {topbar}
        <main id="main-content" tabIndex={-1} className={styles.content}>
          {children}
        </main>
        {renderFooter()}
      </div>
    </div>
  );
}
