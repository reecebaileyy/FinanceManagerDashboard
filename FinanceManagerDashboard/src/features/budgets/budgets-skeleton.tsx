import { Card, CardBody, CardHeader } from "@components/dashboard/card";
import { Skeleton } from "@components/ui";

import controls from "@/styles/controls.module.css";
import patterns from "@/styles/patterns.module.css";

import styles from "./budgets-section.module.css";

export function BudgetsSectionSkeleton() {
  return (
    <section className={styles.section} aria-busy="true" aria-live="polite">
      <Card>
        <CardHeader
          title={undefined}
          subtitle={undefined}
          badge={undefined}
          actions={
            <div className={styles.headerActions}>
              <Skeleton className={patterns.skeletonText} style={{ width: "8rem", height: "2.5rem" }} />
              <Skeleton className={patterns.skeletonText} style={{ width: "7rem", height: "2.5rem" }} />
            </div>
          }
        >
          <Skeleton className={patterns.skeletonText} style={{ width: "12rem" }} />
          <Skeleton className={patterns.skeletonText} style={{ width: "24rem", marginTop: "0.4rem" }} />
        </CardHeader>
        <CardBody className={styles.cardBody}>
          <div className={`${patterns.grid} ${patterns.gridCols2} ${styles.topGrid}`} aria-hidden>
            <div className={`${patterns.glass} ${styles.summaryCard}`}>
              <Skeleton className={patterns.skeletonText} style={{ width: "10rem", height: "1.2rem" }} />
              <Skeleton className={patterns.skeletonText} style={{ width: "16rem" }} />
              <div className={styles.summaryMetrics}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={`budget-summary-metric-${index}`} className={styles.metric}>
                    <Skeleton className={patterns.skeletonText} style={{ width: "60%" }} />
                    <Skeleton className={patterns.skeletonText} style={{ width: "80%", height: "1.2rem", marginTop: "0.4rem" }} />
                  </div>
                ))}
              </div>
              <div className={styles.summaryFooter}>
                <Skeleton className={patterns.skeletonText} style={{ width: "40%" }} />
                <Skeleton className={patterns.skeletonText} style={{ width: "50%" }} />
              </div>
            </div>
            <div className={`${patterns.glass} ${styles.chartCard}`}>
              <Skeleton className={patterns.skeletonText} style={{ width: "12rem", height: "1.2rem" }} />
              <Skeleton className={patterns.skeletonText} style={{ width: "18rem" }} />
              <Skeleton className={patterns.skeletonText} style={{ width: "100%", height: "6rem", marginTop: "1rem" }} />
              <div className={styles.chartLegend}>
                <Skeleton className={patterns.skeletonText} style={{ width: "8rem" }} />
                <Skeleton className={patterns.skeletonText} style={{ width: "8rem" }} />
              </div>
            </div>
          </div>
          <div className={`${patterns.grid} ${patterns.gridCols2} ${styles.bottomGrid}`} aria-hidden>
            <div className={`${patterns.glass} ${styles.alertsPanel}`}>
              <Skeleton className={patterns.skeletonText} style={{ width: "40%", height: "1.1rem" }} />
              <div className={styles.alertsList}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton key={`budget-alert-${index}`} className={patterns.skeletonText} style={{ width: "100%", height: "1.4rem" }} />
                ))}
              </div>
            </div>
            <div className={`${patterns.glass} ${styles.summaryPanel}`}>
              <Skeleton className={patterns.skeletonText} style={{ width: "45%", height: "1.1rem" }} />
              <Skeleton className={patterns.skeletonText} style={{ width: "30%" }} />
              <div className={styles.summaryMetricsGrid}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={`budget-outlook-${index}`} className={styles.summaryMetric}>
                    <Skeleton className={patterns.skeletonText} style={{ width: "60%" }} />
                    <Skeleton className={patterns.skeletonText} style={{ width: "75%", height: "1.1rem", marginTop: "0.35rem" }} />
                  </div>
                ))}
              </div>
              <Skeleton className={patterns.skeletonText} style={{ width: "100%", height: "2.3rem" }} />
              <div className={styles.summaryActions}>
                <Skeleton className={patterns.skeletonText} style={{ width: "8rem", height: "2.4rem" }} />
                <Skeleton className={patterns.skeletonText} style={{ width: "12rem", height: "2.4rem" }} />
              </div>
            </div>
          </div>
          <div className={`${patterns.glass} ${styles.tableCard}`} aria-hidden>
            <div className={styles.panelHeader}>
              <Skeleton className={patterns.skeletonText} style={{ width: "14rem", height: "1.1rem" }} />
              <Skeleton className={patterns.skeletonText} style={{ width: "8rem" }} />
            </div>
            <div style={{ display: "grid", gap: "0.85rem" }}>
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={`budget-table-row-${index}`} className={styles.categoryRow}>
                  <div className={styles.categoryInfo}>
                    <Skeleton className={patterns.skeletonText} style={{ width: "40%" }} />
                    <Skeleton className={patterns.skeletonText} style={{ width: "35%", marginTop: "0.35rem" }} />
                  </div>
                  <Skeleton className={patterns.skeletonText} style={{ width: "100%", height: "0.65rem" }} />
                </div>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>
    </section>
  );
}

