import styles from "./card.module.css";
import controls from "../../styles/controls.module.css";

import type { ReactNode } from "react";

export interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  const classes = [styles.card, className].filter(Boolean).join(" ");
  return <div className={classes}>{children}</div>;
}

export interface CardHeaderProps {
  title?: string;
  subtitle?: string;
  badge?: string;
  actions?: ReactNode;
  className?: string;
  children?: ReactNode;
}

export function CardHeader({
  title,
  subtitle,
  badge,
  actions,
  className,
  children,
}: CardHeaderProps) {
  const classes = [styles.cardHeader, className].filter(Boolean).join(" ");
  return (
    <div className={classes}>
      <div className={styles.cardHeaderLeft}>
        {children}
        {title ? <strong className={styles.cardTitle}>{title}</strong> : null}
        {subtitle ? <span className={styles.cardSubtitle}>{subtitle}</span> : null}
      </div>
      <div className={styles.cardHeaderRight}>
        {badge ? <span className={controls.pill}>{badge}</span> : null}
        {actions}
      </div>
    </div>
  );
}

export function CardBody({ children, className }: CardProps) {
  const classes = [styles.cardBody, className].filter(Boolean).join(" ");
  return <div className={classes}>{children}</div>;
}
