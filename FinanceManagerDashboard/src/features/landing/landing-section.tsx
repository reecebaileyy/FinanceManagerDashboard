"use client";

import Link from "next/link";

import { Card, CardBody, CardHeader } from "@components/dashboard/card";

import styles from "./landing-section.module.css";
import controls from "../../styles/controls.module.css";
import patterns from "../../styles/patterns.module.css";

export interface LandingQuickLink {
  href: string;
  title: string;
  description: string;
}

export interface LandingSectionProps {
  isAuthenticated: boolean;
  username: string;
  onGetStarted: () => void;
  onPreviewDashboard: () => void;
  onLogin: () => void;
  onLogout: () => void;
  quickLinks: LandingQuickLink[];
}

export function LandingSection({
  isAuthenticated,
  username,
  onGetStarted,
  onPreviewDashboard,
  onLogin,
  onLogout,
  quickLinks,
}: LandingSectionProps) {
  const previewKpis = [
    {
      label: "This Month Income",
      value: "$5,650",
      delta: "+4.8% vs last month",
      variant: "up" as const,
    },
    {
      label: "This Month Expenses",
      value: "$3,420",
      delta: "-2.1% vs last month",
      variant: "down" as const,
    },
    {
      label: "Net",
      value: "$2,230",
      delta: "+$110",
      variant: "up" as const,
    },
  ];

  const spendingByCategory = [
    { label: "Rent", value: "$1,600", percent: "72%" },
    { label: "Groceries", value: "$420", percent: "24%" },
    { label: "Dining", value: "$260", percent: "36%", tone: "warn" as const },
    { label: "Transport", value: "$180", percent: "16%" },
  ];

  const budgetHealth = [
    { label: "Groceries", value: "$420 / $500", percent: "84%" },
    { label: "Dining", value: "$260 / $250", percent: "104%", tone: "danger" as const },
    { label: "Transport", value: "$180 / $220", percent: "82%" },
  ];

  const trimmedName = username?.trim() ?? "";
  const isPreviewAccount = trimmedName.length === 0 || trimmedName.toLowerCase() === "guest";

  const heroTitle = isAuthenticated
    ? isPreviewAccount
      ? "Welcome back! You're viewing the demo workspace."
      : `Welcome back, ${trimmedName}.`
    : "Take control of your money with a focused, intelligent dashboard.";

  const heroSubtitle = isAuthenticated
    ? isPreviewAccount
      ? "Explore the sample dashboard, connect accounts, and configure budgets when you're ready."
      : "Pick up where you left off - review cash flow, monitor alerts, and act on personalized recommendations."
    : "Track spending, set budgets, and visualize your cashflow with the experience outlined in the CS490 proposal.";

  const authStatusCopy = isAuthenticated
    ? isPreviewAccount
      ? "You're in preview mode with sample data. Create an account to persist your progress and unlock automations."
      : `Signed in as ${trimmedName}. Your preferences, quick actions, and alerts are ready.`
    : null;

  const sellingPoints = [
    "Monitor cash flow, budgets, goals, and bills together so nothing slips.",
    "Get proactive alerts and AI recommendations when spending drifts off plan.",
    "Export audit-ready reports for finance reviews straight from the dashboard.",
  ];

  const primaryCtaLabel = isAuthenticated ? "Continue to Dashboard" : "Get Started";
  const primaryCtaAction = isAuthenticated ? onPreviewDashboard : onGetStarted;
  const secondaryCtaLabel = isAuthenticated ? "Sign out" : "Preview Dashboard";
  const secondaryCtaAction = isAuthenticated ? onLogout : onPreviewDashboard;
  const secondaryButtonClass = isAuthenticated
    ? `${controls.button} ${controls.buttonDanger}`
    : controls.button;

  return (
    <section id="home" className={styles.section}>
      <div className={patterns.hero}>
        <div>
          <span className={styles.eyebrow}>Finance Manager Platform</span>
          <h2 className={patterns.heroTitle}>{heroTitle}</h2>
          <p className={patterns.heroText}>{heroSubtitle}</p>
          {authStatusCopy ? <p className={styles.authStatus}>{authStatusCopy}</p> : null}
          <div className={patterns.heroCta}>
            <button
              type="button"
              className={`${controls.button} ${controls.buttonPrimary}`}
              onClick={primaryCtaAction}
            >
              {primaryCtaLabel}
            </button>
            <button type="button" className={secondaryButtonClass} onClick={secondaryCtaAction}>
              {secondaryCtaLabel}
            </button>
          </div>
          {!isAuthenticated ? (
            <button type="button" className={styles.authLink} onClick={onLogin}>
              Already have an account? Log in
            </button>
          ) : null}
          <div className={styles.mvpNote}>
            MVP focus: Auth - Accounts - Transactions - Budgets - Export & reports
          </div>
          <ul className={`${patterns.blockList} ${styles.highlights}`}>
            {sellingPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          {quickLinks.length > 0 ? (
            <>
              <h3 className={styles.linksHeading}>Jump straight to what matters</h3>
              <ul className={styles.quickLinks}>
                {quickLinks.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className={styles.quickLinkCard}>
                      <span className={styles.quickLinkTitle}>{link.title}</span>
                      <span className={styles.quickLinkDescription}>{link.description}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
        <Card className={patterns.glass}>
          <CardHeader title="Preview" badge="static demo" />
          <CardBody className={styles.previewBody}>
            <div className={patterns.kpis}>
              {previewKpis.map((item) => (
                <div key={item.label} className={patterns.kpi}>
                  <div className={patterns.kpiLabel}>{item.label}</div>
                  <div className={patterns.kpiValue}>{item.value}</div>
                  <div
                    className={`${patterns.kpiDelta} ${
                      item.variant === "up" ? patterns.kpiDeltaUp : patterns.kpiDeltaDown
                    }`}
                  >
                    {item.delta}
                  </div>
                </div>
              ))}
            </div>
            <div className={`${patterns.grid} ${patterns.gridCols2}`}>
              <Card>
                <CardHeader title="Spending by Category" badge="month" />
                <CardBody className={styles.metricsGroup}>
                  {spendingByCategory.map((category) => (
                    <div key={category.label}>
                      <div className={styles.statHeader}>
                        <span>{category.label}</span>
                        <span>{category.value}</span>
                      </div>
                      <div className={patterns.progress}>
                        <span
                          className={`${patterns.progressBar} ${
                            category.tone === "warn" ? patterns.progressWarn : ""
                          }`}
                          style={{ width: category.percent }}
                        />
                      </div>
                    </div>
                  ))}
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Budget Health" badge="current" />
                <CardBody className={styles.metricsGroup}>
                  {budgetHealth.map((item) => (
                    <div key={item.label}>
                      <div className={styles.budgetHeader}>
                        <strong>{item.label}</strong>
                        <span>{item.value}</span>
                      </div>
                      <div className={patterns.progress}>
                        <span
                          className={`${patterns.progressBar} ${
                            item.tone === "danger" ? patterns.progressDanger : ""
                          }`}
                          style={{ width: item.percent }}
                        />
                      </div>
                    </div>
                  ))}
                </CardBody>
              </Card>
            </div>
          </CardBody>
        </Card>
      </div>
    </section>
  );
}
