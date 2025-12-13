import { Card, CardBody, CardHeader } from "@components/dashboard/card";
import { Skeleton } from "@components/ui";

import patterns from "@/styles/patterns.module.css";

import styles from "./goals-section.module.css";

export function GoalsSectionSkeleton() {
  return (
    <section className={styles.section} aria-busy="true" aria-live="polite">
      <Card>
        <CardHeader
          title={undefined}
          subtitle={undefined}
          actions={<Skeleton className={patterns.skeletonText} style={{ width: "8rem", height: "2.4rem" }} />}
        >
          <Skeleton className={patterns.skeletonText} style={{ width: "14rem" }} />
          <Skeleton className={patterns.skeletonText} style={{ width: "26rem", marginTop: "0.4rem" }} />
        </CardHeader>
        <CardBody className={styles.cardBody}>
          <div className={styles.goalHeader}>
            <div>
              <Skeleton className={patterns.skeletonText} style={{ width: "10rem", height: "1.3rem" }} />
              <Skeleton className={patterns.skeletonText} style={{ width: "18rem", marginTop: "0.5rem" }} />
            </div>
            <Skeleton className={patterns.skeletonText} style={{ width: "6rem", height: "2.4rem" }} />
          </div>
          <div className={styles.goalGrid}>
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={`goal-card-${index}`} className={styles.goalCard} aria-hidden>
                <Skeleton className={patterns.skeletonText} style={{ width: "60%", height: "1.2rem" }} />
                <Skeleton className={patterns.skeletonText} style={{ width: "40%" }} />
                <Skeleton className={patterns.skeletonText} style={{ width: "100%", height: "0.85rem", marginTop: "0.6rem" }} />
                <Skeleton className={patterns.skeletonText} style={{ width: "100%", height: "0.85rem" }} />
              </div>
            ))}
          </div>
          <div className={styles.goalDetails}>
            <section className={styles.goalSection} aria-hidden>
              <Skeleton className={patterns.skeletonText} style={{ width: "12rem", height: "1.2rem" }} />
              <ul className={styles.milestoneList}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <li key={`goal-milestone-${index}`} className={styles.milestonePending}>
                    <Skeleton className={patterns.skeletonText} style={{ width: "70%" }} />
                    <Skeleton className={patterns.skeletonText} style={{ width: "50%", marginTop: "0.35rem" }} />
                  </li>
                ))}
              </ul>
            </section>
            <section className={styles.goalSection} aria-hidden>
              <Skeleton className={patterns.skeletonText} style={{ width: "14rem", height: "1.2rem" }} />
              <ul className={styles.contributionList}>
                {Array.from({ length: 4 }).map((_, index) => (
                  <li key={`goal-contribution-${index}`}>
                    <Skeleton className={patterns.skeletonText} style={{ width: "40%" }} />
                    <Skeleton className={patterns.skeletonText} style={{ width: "60%", marginTop: "0.35rem" }} />
                    <Skeleton className={patterns.skeletonText} style={{ width: "70%", marginTop: "0.35rem" }} />
                  </li>
                ))}
              </ul>
            </section>
            <section className={styles.goalSection} aria-hidden>
              <Skeleton className={patterns.skeletonText} style={{ width: "10rem", height: "1.2rem" }} />
              <div className={styles.projectionGrid}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={`goal-projection-${index}`} className={styles.projectionItem}>
                    <Skeleton className={patterns.skeletonText} style={{ width: "40%" }} />
                    <Skeleton className={patterns.skeletonText} style={{ width: "60%", height: "1.1rem", marginTop: "0.3rem" }} />
                    <Skeleton className={patterns.skeletonText} style={{ width: "60%", marginTop: "0.3rem" }} />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </CardBody>
      </Card>
    </section>
  );
}
