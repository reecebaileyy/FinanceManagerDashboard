import { Card, CardBody, CardHeader } from "@components/dashboard/card";
import { Skeleton } from "@components/ui";

import patterns from "@/styles/patterns.module.css";

import styles from "./dashboard-section.module.css";

export function DashboardSectionSkeleton() {
  return (
    <section className={styles.section} aria-busy="true" aria-live="polite">
      <div className={styles.customizeBar}>
        <Skeleton className={patterns.skeletonText} style={{ width: "50%", height: "1rem" }} />
        <div className={styles.customizeActions}>
          <Skeleton className={patterns.skeletonText} style={{ width: "6rem", height: "2.4rem" }} />
          <Skeleton className={patterns.skeletonText} style={{ width: "6rem", height: "2.4rem" }} />
          <Skeleton className={patterns.skeletonText} style={{ width: "6rem", height: "2.4rem" }} />
        </div>
      </div>
      <div className={styles.kpiGrid}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={`kpi-skeleton-${index}`} className={patterns.kpi} aria-hidden>
            <Skeleton className={patterns.skeletonText} style={{ width: "45%" }} />
            <Skeleton className={patterns.skeletonText} style={{ width: "70%", height: "1.6rem", marginTop: "0.75rem" }} />
            <Skeleton className={patterns.skeletonText} style={{ width: "40%", marginTop: "0.6rem" }} />
          </div>
        ))}
      </div>
      <div className={styles.overviewGrid}>
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={`dashboard-card-skeleton-${index}`}>
            <CardHeader>
              <Skeleton className={patterns.skeletonText} style={{ width: "35%" }} />
              <Skeleton className={patterns.skeletonText} style={{ width: "55%", marginTop: "0.5rem" }} />
            </CardHeader>
            <CardBody>
              <Skeleton className={patterns.skeletonText} style={{ width: "100%", height: "6rem" }} />
            </CardBody>
          </Card>
        ))}
      </div>
    </section>
  );
}
