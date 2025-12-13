import { Card, CardBody, CardHeader } from "@components/dashboard/card";
import { Skeleton } from "@components/ui";

import patterns from "@/styles/patterns.module.css";

import styles from "./bills-section.module.css";

export function BillsSectionSkeleton() {
  return (
    <section className={`${patterns.section} ${styles.section}`} aria-busy="true" aria-live="polite">
      <div className={styles.summaryGrid} aria-hidden>
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={`bills-summary-skeleton-${index}`}>
            <CardHeader>
              <Skeleton className={patterns.skeletonText} style={{ width: "10rem" }} />
              <Skeleton className={patterns.skeletonText} style={{ width: "6rem" }} />
            </CardHeader>
            <CardBody className={styles.summaryCard}>
              <Skeleton className={patterns.skeletonText} style={{ width: "45%", height: "1.6rem" }} />
              <Skeleton className={patterns.skeletonText} style={{ width: "70%", marginTop: "0.4rem" }} />
              <Skeleton className={patterns.skeletonText} style={{ width: "60%", marginTop: "0.4rem" }} />
            </CardBody>
          </Card>
        ))}
      </div>
      <div className={styles.layout}>
        <Card className={styles.scheduleCard}>
          <CardHeader
            title={undefined}
            subtitle={undefined}
            actions={<Skeleton className={patterns.skeletonText} style={{ width: "9rem", height: "2.4rem" }} />}
          >
            <Skeleton className={patterns.skeletonText} style={{ width: "12rem" }} />
            <Skeleton className={patterns.skeletonText} style={{ width: "18rem", marginTop: "0.4rem" }} />
          </CardHeader>
          <CardBody>
            <div className={styles.scheduleLegend}>
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={`legend-${index}`} className={patterns.skeletonText} style={{ width: "6rem" }} />
              ))}
            </div>
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`schedule-group-${index}`} className={styles.scheduleGroup} aria-hidden>
                <div className={styles.groupHeader}>
                  <Skeleton className={patterns.skeletonText} style={{ width: "8rem" }} />
                </div>
                {Array.from({ length: 3 }).map((__, billIndex) => (
                  <div key={`schedule-bill-${index}-${billIndex}`} className={styles.billRow}>
                    <Skeleton className={patterns.skeletonText} style={{ width: "80%" }} />
                    <Skeleton className={patterns.skeletonText} style={{ width: "60%" }} />
                    <Skeleton className={patterns.skeletonText} style={{ width: "50%" }} />
                    <Skeleton className={patterns.skeletonText} style={{ width: "3rem" }} />
                  </div>
                ))}
              </div>
            ))}
          </CardBody>
        </Card>
        <Card className={styles.remindersCard}>
          <CardHeader title={undefined} subtitle={undefined}>
            <Skeleton className={patterns.skeletonText} style={{ width: "8rem" }} />
            <Skeleton className={patterns.skeletonText} style={{ width: "5rem" }} />
          </CardHeader>
          <CardBody>
            <div className={styles.remindersList}>
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={`reminder-${index}`} className={styles.reminderItem}>
                  <div className={styles.reminderHeader}>
                    <Skeleton className={patterns.skeletonText} style={{ width: "9rem" }} />
                    <Skeleton className={patterns.skeletonText} style={{ width: "4rem" }} />
                  </div>
                  <Skeleton className={patterns.skeletonText} style={{ width: "70%" }} />
                  <Skeleton className={patterns.skeletonText} style={{ width: "60%" }} />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </section>
  );
}

