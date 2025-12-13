"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Card, CardBody, CardHeader } from "@components/dashboard/card";

import styles from "./bills-section.module.css";
import patterns from "../../styles/patterns.module.css";
import controls from "../../styles/controls.module.css";
import { type Bill, type BillReminder, type BillStatus } from "@lib/api/bills";
import { useBillsWorkspace } from "./use-bills-workspace";

const MS_PER_DAY = 86_400_000;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

const weekdayFormatter = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
});

const schedulePriority: Record<string, number> = {
  "Past due": 0,
  "Due today": 1,
  "Coming up (48 hrs)": 2,
  "This week": 3,
  "Next week": 4,
  "Later this month": 5,
};

interface ScheduleGroup {
  label: string;
  bills: Bill[];
}

interface ReminderListItem extends BillReminder {
  billName: string;
  billDueDate: string;
  amountCents: number;
}

function centsToCurrency(cents: number): string {
  return currencyFormatter.format(cents / 100);
}

function getStartOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function toDate(value: string): Date {
  if (value.length === 10) {
    return new Date(`${value}T00:00:00`);
  }

  return new Date(value);
}

function getGroupLabel(reference: Date, dueDate: Date, status: BillStatus): string {
  const start = getStartOfDay(reference);
  const diffDays = Math.floor((getStartOfDay(dueDate).getTime() - start.getTime()) / MS_PER_DAY);

  if (status === "overdue" || diffDays < 0) {
    return "Past due";
  }

  if (status === "dueToday" || diffDays === 0) {
    return "Due today";
  }

  if (diffDays > 0 && diffDays <= 2) {
    return "Coming up (48 hrs)";
  }

  if (diffDays < 7) {
    return "This week";
  }

  if (diffDays < 14) {
    return "Next week";
  }

  if (dueDate.getMonth() === reference.getMonth() && dueDate.getFullYear() === reference.getFullYear()) {
    return "Later this month";
  }

  return monthFormatter.format(dueDate);
}

function buildScheduleGroups(reference: Date, bills: Bill[]): ScheduleGroup[] {
  const byGroup = new Map<string, Bill[]>();

  bills
    .slice()
    .sort((a, b) => toDate(a.dueDate).getTime() - toDate(b.dueDate).getTime())
    .forEach((bill) => {
      const groupLabel = getGroupLabel(reference, toDate(bill.dueDate), bill.status);
      const list = byGroup.get(groupLabel) ?? [];
      list.push(bill);
      byGroup.set(groupLabel, list);
    });

  return Array.from(byGroup.entries())
    .map(([label, groupBills]) => ({ label, bills: groupBills }))
    .sort((a, b) => {
      const priorityA = schedulePriority[a.label] ?? 10;
      const priorityB = schedulePriority[b.label] ?? 10;
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      const firstDueA = toDate(a.bills[0].dueDate).getTime();
      const firstDueB = toDate(b.bills[0].dueDate).getTime();
      return firstDueA - firstDueB;
    });
}

function buildUpcomingReminders(reference: Date, bills: Bill[]): ReminderListItem[] {
  const referenceTime = reference.getTime();

  return bills
    .flatMap<ReminderListItem>((bill) =>
      bill.reminders.map((reminder) => ({
        ...reminder,
        billName: bill.name,
        billDueDate: bill.dueDate,
        amountCents: bill.amountCents,
      })),
    )
    .filter((reminder) => toDate(reminder.scheduledFor).getTime() >= referenceTime)
    .sort((a, b) => toDate(a.scheduledFor).getTime() - toDate(b.scheduledFor).getTime())
    .slice(0, 6);
}

function getStatusClassName(status: BillStatus): string {
  switch (status) {
    case "paid":
      return `${styles.statusChip} ${styles.statusPaid}`;
    case "overdue":
      return `${styles.statusChip} ${styles.statusOverdue}`;
    case "dueSoon":
    case "dueToday":
      return `${styles.statusChip} ${styles.statusDueSoon}`;
    default:
      return `${styles.statusChip} ${styles.statusUpcoming}`;
  }
}

function getStatusLabel(status: BillStatus): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "overdue":
      return "Overdue";
    case "dueSoon":
      return "Due soon";
    case "dueToday":
      return "Due today";
    default:
      return "Upcoming";
  }
}


function getReminderTitle(reminder: BillReminder): string {
  switch (reminder.type) {
    case "dayOf":
      return "Day-of reminder";
    case "overdue":
      return "Overdue alert";
    default:
      return "Lead reminder";
  }
}

function getNextReminder(reference: Date, bill: Bill): BillReminder | undefined {
  const referenceTime = reference.getTime();
  return bill.reminders
    .slice()
    .map((reminder) => ({ reminder, when: toDate(reminder.scheduledFor).getTime() }))
    .filter((item) => item.when >= referenceTime)
    .sort((a, b) => a.when - b.when)
    .at(0)?.reminder;
}

function deriveOriginalStatuses(bills: Bill[]): Record<string, BillStatus> {
  return bills.reduce<Record<string, BillStatus>>((acc, bill) => {
    acc[bill.id] = bill.status;
    return acc;
  }, {});
}

function deriveReferenceMonth(reference: Date): string {
  return monthFormatter.format(reference);
}

export function BillsSection() {
  const { data, isLoading } = useBillsWorkspace();
  const [billState, setBillState] = useState<Bill[]>([]);
  const originalStatusesRef = useRef<Record<string, BillStatus>>({});

  useEffect(() => {
    if (data?.bills?.length) {
      originalStatusesRef.current = deriveOriginalStatuses(data.bills);
      setBillState(data.bills);
    }
  }, [data]);

  const referenceDate = useMemo(() => (data ? getStartOfDay(toDate(data.referenceDate)) : null), [data]);

  const scheduleGroups = useMemo(() => {
    if (!referenceDate) {
      return [];
    }

    return buildScheduleGroups(referenceDate, billState);
  }, [billState, referenceDate]);

  const reminders = useMemo(() => {
    if (!referenceDate) {
      return [];
    }

    return buildUpcomingReminders(referenceDate, billState);
  }, [billState, referenceDate]);

  const summary = useMemo(() => {
    if (!referenceDate) {
      return {
        dueThisMonthCents: 0,
        paidThisMonthCents: 0,
        overdueCount: 0,
        autoPayCount: 0,
        totalCount: 0,
        autoPayTotalCents: 0,
        overdueAmountCents: 0,
        nextReminder: reminders[0],
      } as const;
    }

    const currentMonth = referenceDate.getMonth();
    const currentYear = referenceDate.getFullYear();

    let dueThisMonthCents = 0;
    let paidThisMonthCents = 0;
    let overdueCount = 0;
    let autoPayCount = 0;
    let autoPayTotalCents = 0;
    let overdueAmountCents = 0;

    billState.forEach((bill) => {
      const dueDate = toDate(bill.dueDate);
      const matchesMonth = dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;

      if (matchesMonth) {
        if (bill.status === "paid") {
          paidThisMonthCents += bill.amountCents;
        } else {
          dueThisMonthCents += bill.amountCents;
        }
      }

      if (bill.status === "overdue") {
        overdueCount += 1;
        overdueAmountCents += bill.amountCents;
      }

      if (bill.autoPayEnabled) {
        autoPayCount += 1;
        autoPayTotalCents += bill.amountCents;
      }
    });

    return {
      dueThisMonthCents,
      paidThisMonthCents,
      overdueCount,
      autoPayCount,
      totalCount: billState.length,
      autoPayTotalCents,
      overdueAmountCents,
      nextReminder: reminders[0],
    };
  }, [billState, referenceDate, reminders]);

  const handleToggleStatus = useCallback(
    (billId: string) => {
      if (!referenceDate) {
        return;
      }

      setBillState((prev) =>
        prev.map((bill) => {
          if (bill.id !== billId) {
            return bill;
          }

          const originalStatus = originalStatusesRef.current[bill.id] ?? bill.status;

          if (bill.status === "paid") {
            const shouldRestorePaidState = originalStatus === "paid";
            return {
              ...bill,
              status: originalStatus,
              lastPaidAt: shouldRestorePaidState ? bill.lastPaidAt : undefined,
              confirmationNumber: shouldRestorePaidState ? bill.confirmationNumber : undefined,
            };
          }

          return {
            ...bill,
            status: "paid",
            lastPaidAt: referenceDate.toISOString(),
            confirmationNumber: `MANUAL-${bill.id.slice(-4).toUpperCase()}`,
          };
        }),
      );
    },
    [referenceDate],
  );

  if (!data || !referenceDate) {
    return (
      <section id="bills" className={patterns.section} aria-busy={isLoading}>
        <div className={styles.emptyState}>Loading bills workspace.</div>
      </section>
    );
  }

  const referenceMonthLabel = deriveReferenceMonth(referenceDate);

  return (
    <section id="bills" className={`${patterns.section} ${styles.section}`} aria-live="polite">
      <div className={styles.summaryGrid}>
        <Card>
          <CardHeader title="Monthly obligations" subtitle={referenceMonthLabel} />
          <CardBody className={styles.summaryCard}>
            <span className={styles.summaryMetric}>{centsToCurrency(summary.dueThisMonthCents)}</span>
            <span className={styles.summaryDetail}>
              remaining across {summary.totalCount} active bills this month
            </span>
            <span className={`${styles.summaryTrend} ${styles.summaryTrendUp}`}>
              Paid {centsToCurrency(summary.paidThisMonthCents)} so far
            </span>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Auto-pay coverage" subtitle="Connected accounts" />
          <CardBody className={styles.summaryCard}>
            <span className={styles.summaryMetric}>
              {summary.autoPayCount} / {summary.totalCount}
            </span>
            <span className={styles.summaryDetail}>
              automated for {centsToCurrency(summary.autoPayTotalCents)} in scheduled payments
            </span>
            <span className={styles.summaryTrend}>
              Last auto-pay recorded on Sep 1 for rent
            </span>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Reminder cadence" subtitle="Lead + day-of coverage" />
          <CardBody className={styles.summaryCard}>
            <span className={styles.summaryMetric}>{reminders.length} scheduled</span>
            <span className={styles.summaryDetail}>
              {summary.nextReminder
                ? `Next: ${dateTimeFormatter.format(toDate(summary.nextReminder.scheduledFor))} • ${summary.nextReminder.billName}`
                : "No reminders scheduled"}
            </span>
            <span
              className={`${styles.summaryTrend} ${
                summary.overdueCount > 0 ? styles.summaryTrendDown : styles.summaryTrendUp
              }`}
            >
              {summary.overdueCount > 0
                ? `${summary.overdueCount} overdue totaling ${centsToCurrency(summary.overdueAmountCents)}`
                : "All accounts current"}
            </span>
          </CardBody>
        </Card>
      </div>

      <div className={styles.layout}>
        <Card className={styles.scheduleCard}>
          <CardHeader
            title="Bill schedule"
            subtitle="Organized by urgency"
            actions={
              <button type="button" className={`${controls.button} ${controls.buttonPrimary}`}>
                Manage reminders
              </button>
            }
          />
          <CardBody className={styles.scheduleCard}>
            <div className={styles.scheduleLegend}>
              <span>
                <span className={`${styles.colorDot} ${styles.colorOverdue}`} /> Past due
              </span>
              <span>
                <span className={`${styles.colorDot} ${styles.colorDueSoon}`} /> Due soon
              </span>
              <span>
                <span className={`${styles.colorDot} ${styles.colorUpcoming}`} /> Upcoming / Auto-pay
              </span>
            </div>
            {scheduleGroups.length ? (
              scheduleGroups.map((group) => (
                <div className={styles.scheduleGroup} key={group.label}>
                  <span className={styles.groupHeader}>{group.label}</span>
                  {group.bills.map((bill) => {
                    const nextReminder = getNextReminder(referenceDate, bill);
                    const autoPayClass = bill.autoPayEnabled
                      ? styles.autoPayChip
                      : `${styles.autoPayChip} ${styles.autoPayChipOff}`;
                    const statusClassName = getStatusClassName(bill.status);
                    const dueDate = toDate(bill.dueDate);
                    const dueLabel = `${dateFormatter.format(dueDate)} • ${weekdayFormatter.format(dueDate)}`;
                    const isPaid = bill.status === "paid";

                    return (
                      <div className={styles.billRow} key={bill.id}>
                        <div className={styles.billPrimary}>
                          <span className={styles.billTitle}>{bill.name}</span>
                          <span className={styles.billMeta}>
                            {dueLabel} • {bill.accountName}
                          </span>
                          {bill.notes ? <span className={styles.notes}>{bill.notes}</span> : null}
                        </div>
                        <div className={styles.statusStack}>
                          <span className={statusClassName}>{getStatusLabel(bill.status)}</span>
                          <span className={autoPayClass}>
                            <span>{bill.autoPayEnabled ? "Auto-pay" : "Manual pay"}</span>
                          </span>
                        </div>
                        <div>
                          <div className={styles.amountDue}>{centsToCurrency(bill.amountCents)}</div>
                          {isPaid && bill.lastPaidAt ? (
                            <div className={styles.nextReminder}>
                              Paid {dateFormatter.format(toDate(bill.lastPaidAt))}
                            </div>
                          ) : nextReminder ? (
                            <div className={styles.nextReminder}>
                              Next reminder {dateFormatter.format(toDate(nextReminder.scheduledFor))}
                            </div>
                          ) : null}
                        </div>
                        <div className={`${styles.actionCell}`}>
                          <div className={styles.actionGroup}>
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(bill.id)}
                              className={`${styles.actionButton} ${
                                isPaid ? styles.actionButtonDanger : styles.actionButtonPrimary
                              }`}
                              aria-pressed={isPaid}
                            >
                              {isPaid ? "Undo payment" : "Mark paid"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>No bills scheduled for this period.</div>
            )}
          </CardBody>
        </Card>

        <Card className={styles.remindersCard}>
          <CardHeader title="Upcoming reminders" subtitle="Lead, day-of, and overdue alerts" />
          <CardBody className={styles.remindersCard}>
            {reminders.length ? (
              <div className={styles.remindersList}>
                {reminders.map((reminder) => (
                  <div className={styles.reminderItem} key={reminder.id}>
                    <div className={styles.reminderHeader}>
                      <span className={styles.reminderTitle}>{getReminderTitle(reminder)}</span>
                      <span className={styles.reminderMeta}>
                        {dateTimeFormatter.format(toDate(reminder.scheduledFor))}
                      </span>
                    </div>
                    <span className={styles.reminderMeta}>
                      {reminder.billName} • Due {dateFormatter.format(toDate(reminder.billDueDate))} • {centsToCurrency(reminder.amountCents)}
                    </span>
                    <span className={styles.channelStrip}>
                      Channels:
                      {reminder.channels.map((channel) => (
                        <span className={styles.channelPill} key={`${reminder.id}-${channel}`}>
                          {channel}
                        </span>
                      ))}
                    </span>
                    <span>{reminder.message}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>No upcoming reminders scheduled.</div>
            )}
          </CardBody>
        </Card>
      </div>
    </section>
  );
}
