import { Card, CardBody, CardHeader } from "@components/dashboard/card";
import { Skeleton } from "@components/ui";

import patterns from "@/styles/patterns.module.css";

import styles from "./transactions-section.module.css";

export function TransactionsSectionSkeleton() {
  return (
    <section className={styles.section} aria-busy="true" aria-live="polite">
      <Card>
        <CardHeader
          title={undefined}
          subtitle={undefined}
          actions={
            <div className={styles.headerActions}>
              <Skeleton className={patterns.skeletonText} style={{ width: "8rem", height: "2.5rem" }} />
              <Skeleton className={patterns.skeletonText} style={{ width: "10rem", height: "2.5rem" }} />
            </div>
          }
        >
          <Skeleton className={patterns.skeletonText} style={{ width: "14rem" }} />
          <Skeleton className={patterns.skeletonText} style={{ width: "22rem", marginTop: "0.4rem" }} />
        </CardHeader>
        <CardBody>
          <div className={styles.layout}>
            <div className={`${patterns.glass} ${styles.formPanel}`} aria-hidden>
              <Skeleton className={patterns.skeletonText} style={{ width: "55%", height: "1.2rem" }} />
              <Skeleton className={patterns.skeletonText} style={{ width: "85%" }} />
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton
                  key={`transactions-skeleton-form-${index}`}
                  className={patterns.skeletonText}
                  style={{ width: "100%", height: "2.4rem" }}
                />
              ))}
              <div className={styles.selectionActions}>
                <Skeleton className={patterns.skeletonText} style={{ width: "6.5rem", height: "2.4rem" }} />
                <Skeleton className={patterns.skeletonText} style={{ width: "6.5rem", height: "2.4rem" }} />
              </div>
            </div>
            <div className={`${patterns.glass} ${styles.tablePanel}`} aria-hidden>
              <div className={styles.filtersBar}>
                {Array.from({ length: 3 }).map((_, index) => (
                  <Skeleton
                    key={`transactions-skeleton-filter-${index}`}
                    className={patterns.skeletonText}
                    style={{ width: `${60 - index * 10}%`, height: "2.2rem" }}
                  />
                ))}
              </div>
              <div className={styles.tableScroll}>
                <div style={{ display: "grid", gap: "0.75rem", padding: "0.75rem" }}>
                  {Array.from({ length: 6 }).map((_, rowIndex) => (
                    <div
                      key={`transactions-skeleton-row-${rowIndex}`}
                      style={{ display: "grid", gridTemplateColumns: "60px repeat(4, minmax(0, 1fr))", gap: "0.75rem", alignItems: "center" }}
                    >
                      {Array.from({ length: 5 }).map((__, cellIndex) => (
                        <Skeleton
                          key={`transactions-skeleton-cell-${rowIndex}-${cellIndex}`}
                          className={patterns.skeletonText}
                          style={{ width: "100%", height: "1rem" }}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.tableFooter}>
                <Skeleton className={patterns.skeletonText} style={{ width: "8rem", height: "2.4rem" }} />
                <Skeleton className={patterns.skeletonText} style={{ width: "8rem", height: "2.4rem" }} />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </section>
  );
}
