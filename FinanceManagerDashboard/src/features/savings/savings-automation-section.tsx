"use client";

import { ChangeEvent, FormEvent, useCallback, useMemo, useState } from "react";

import { Card, CardBody, CardHeader } from "@components/dashboard/card";
import { useLocalization } from "@features/i18n";

import controls from "../../styles/controls.module.css";
import patterns from "../../styles/patterns.module.css";
import styles from "./savings-automation-section.module.css";

type SavingsRuleType = "fixed" | "percentage" | "round_up";
type SavingsRuleStatus = "active" | "paused";
type SavingsScheduleId = "weekly" | "semimonthly" | "monthly" | "daily";

interface SavingsSchedule {
  id: SavingsScheduleId;
  label: string;
  runsPerMonth: number;
  description: string;
}

interface FundingAccount {
  id: string;
  name: string;
  availableCents: number;
}

interface DestinationAccount {
  id: string;
  name: string;
}

interface SavingsRule {
  id: string;
  name: string;
  type: SavingsRuleType;
  status: SavingsRuleStatus;
  scheduleId: SavingsScheduleId;
  scheduleLabel: string;
  sourceAccountId: string;
  sourceAccountName: string;
  destinationAccountId: string;
  destinationAccountName: string;
  amountCents?: number;
  percentage?: number;
  paycheckAmountCents?: number;
  roundUpTo?: number;
  averageTransactionsPerDay?: number;
  averageTransactionAmountCents?: number;
  nextRunAt: string;
  lastRunAt?: string;
  createdAt: string;
  lowBalanceGuard: boolean;
}

interface SavingsRuleFormState {
  type: SavingsRuleType;
  name: string;
  sourceAccountId: string;
  destinationAccountId: string;
  scheduleId: SavingsScheduleId;
  startDate: string;
  amount: string;
  percentage: string;
  paycheckAmount: string;
  roundUpTo: string;
  averageTransactions: string;
  averageAmount: string;
  lowBalanceGuard: boolean;
  memo: string;
}

interface SimulationResult {
  valid: boolean;
  monthlyCents: number;
  yearlyCents: number;
  details: string;
}

type CurrencyFormatter = (cents: number, options?: Intl.NumberFormatOptions) => string;

const savingsSchedules: Record<SavingsScheduleId, SavingsSchedule> = {
  weekly: {
    id: "weekly",
    label: "Weekly on Friday at 9:00 AM",
    runsPerMonth: 4,
    description: "Great for fixed boosts once income clears.",
  },
  semimonthly: {
    id: "semimonthly",
    label: "1st and 15th at 9:00 AM",
    runsPerMonth: 2,
    description: "Mirrors semimonthly payroll cadence.",
  },
  monthly: {
    id: "monthly",
    label: "1st of the month at 8:30 AM",
    runsPerMonth: 1,
    description: "Aligns with rent or loan cycles.",
  },
  daily: {
    id: "daily",
    label: "Nightly sweep at 9:30 PM",
    runsPerMonth: 30,
    description: "Aggregates round-ups into a single daily transfer.",
  },
};

const fundingAccounts: FundingAccount[] = [
  { id: "acct-checking", name: "Everyday Checking â€¢â€¢â€¢â€¢ 2841", availableCents: 4_820_00 },
  { id: "acct-premium", name: "Premium Checking â€¢â€¢â€¢â€¢ 6621", availableCents: 6_340_00 },
  { id: "acct-savings", name: "High-Yield Savings â€¢â€¢â€¢â€¢ 7782", availableCents: 18_200_00 },
];

const destinationAccounts: DestinationAccount[] = [
  { id: "dest-emergency", name: "Emergency Fund (HYSA)" },
  { id: "dest-downpayment", name: "Down Payment Reserve" },
  { id: "dest-travel", name: "Travel Fund - Lisbon 2026" },
];

const fundingAccountLookup = new Map(fundingAccounts.map((account) => [account.id, account]));
const destinationAccountLookup = new Map(destinationAccounts.map((account) => [account.id, account]));

const initialRules: SavingsRule[] = [
  {
    id: "rule-payday",
    name: "Payday sweep",
    type: "percentage",
    status: "active",
    scheduleId: "semimonthly",
    scheduleLabel: savingsSchedules.semimonthly.label,
    sourceAccountId: "acct-checking",
    sourceAccountName: "Everyday Checking â€¢â€¢â€¢â€¢ 2841",
    destinationAccountId: "dest-emergency",
    destinationAccountName: "Emergency Fund (HYSA)",
    percentage: 10,
    paycheckAmountCents: 4_200_00,
    nextRunAt: "2025-09-30T13:00:00.000Z",
    lastRunAt: "2025-09-15T13:00:00.000Z",
    createdAt: "2024-11-04T15:12:00.000Z",
    lowBalanceGuard: true,
  },
  {
    id: "rule-friday",
    name: "Friday rainy-day boost",
    type: "fixed",
    status: "active",
    scheduleId: "weekly",
    scheduleLabel: savingsSchedules.weekly.label,
    sourceAccountId: "acct-premium",
    sourceAccountName: "Premium Checking â€¢â€¢â€¢â€¢ 6621",
    destinationAccountId: "dest-downpayment",
    destinationAccountName: "Down Payment Reserve",
    amountCents: 150_00,
    nextRunAt: "2025-09-19T16:00:00.000Z",
    lastRunAt: "2025-09-12T16:00:00.000Z",
    createdAt: "2024-12-12T17:40:00.000Z",
    lowBalanceGuard: false,
  },
  {
    id: "rule-roundup",
    name: "Everyday round-ups",
    type: "round_up",
    status: "active",
    scheduleId: "daily",
    scheduleLabel: savingsSchedules.daily.label,
    sourceAccountId: "acct-checking",
    sourceAccountName: "Everyday Checking â€¢â€¢â€¢â€¢ 2841",
    destinationAccountId: "dest-travel",
    destinationAccountName: "Travel Fund - Lisbon 2026",
    roundUpTo: 5,
    averageTransactionsPerDay: 6,
    averageTransactionAmountCents: 3_200,
    nextRunAt: "2025-09-18T01:30:00.000Z",
    lastRunAt: "2025-09-17T01:30:00.000Z",
    createdAt: "2024-08-09T18:25:00.000Z",
    lowBalanceGuard: true,
  },
];

const typeLabel: Record<SavingsRuleType, string> = {
  fixed: "Fixed",
  percentage: "Percentage",
  round_up: "Round-up",
};

const typeClassName: Record<SavingsRuleType, string> = {
  fixed: styles.typeFixed,
  percentage: styles.typePercentage,
  round_up: styles.typeRoundUp,
};

const statusClassName: Record<SavingsRuleStatus, string> = {
  active: styles.statusActive,
  paused: styles.statusPaused,
};

const monthlyTargetCents = 1_200_00;

function parseCurrency(value: string): number | undefined {
  const normalized = value.replace(/[,\s]/g, "");
  if (!normalized) {
    return undefined;
  }
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return Math.round(parsed * 100);
}

function parsePercentage(value: string): number | undefined {
  const normalized = value.replace(/[%\s]/g, "");
  if (!normalized) {
    return undefined;
  }
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) {
    return undefined;
  }
  return parsed;
}

function parseInteger(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return undefined;
  }
  return parsed;
}

function formatInputDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function computeMonthlyForRule(rule: SavingsRule): number {
  const schedule = savingsSchedules[rule.scheduleId];
  if (!schedule) {
    return 0;
  }
  if (rule.type === "fixed") {
    return Math.round((rule.amountCents ?? 0) * schedule.runsPerMonth);
  }
  if (rule.type === "percentage") {
    const paycheck = rule.paycheckAmountCents ?? 0;
    const percent = rule.percentage ?? 0;
    return Math.round(paycheck * (percent / 100) * schedule.runsPerMonth);
  }
  const increment = (rule.roundUpTo ?? 0) * 100;
  const amount = rule.averageTransactionAmountCents ?? 0;
  const remainder = increment > 0 ? amount % increment : 0;
  const perTransaction = increment === 0 ? 0 : remainder === 0 ? Math.round(increment / 2) : increment - remainder;
  const daily = perTransaction * (rule.averageTransactionsPerDay ?? 0);
  return Math.round(daily * 30);
}

function buildSimulation(form: SavingsRuleFormState, formatCurrencyCents: CurrencyFormatter): SimulationResult {
  const schedule = savingsSchedules[form.scheduleId];
  if (!schedule) {
    return { valid: false, monthlyCents: 0, yearlyCents: 0, details: "" };
  }

  if (form.type === "fixed") {
    const amount = parseCurrency(form.amount);
    if (amount === undefined) {
      return { valid: false, monthlyCents: 0, yearlyCents: 0, details: "" };
    }
    const monthly = Math.round(amount * schedule.runsPerMonth);
    return {
      valid: true,
      monthlyCents: monthly,
      yearlyCents: monthly * 12,
      details: "Transfers " + formatCurrencyCents(monthly) + " per month on " + schedule.label.toLowerCase() + ".",
    };
  }

  if (form.type === "percentage") {
    const percent = parsePercentage(form.percentage);
    const paycheck = parseCurrency(form.paycheckAmount);
    if (percent === undefined || paycheck === undefined) {
      return { valid: false, monthlyCents: 0, yearlyCents: 0, details: "" };
    }
    const perRun = Math.round(paycheck * (percent / 100));
    const monthly = Math.round(perRun * schedule.runsPerMonth);
    return {
      valid: true,
      monthlyCents: monthly,
      yearlyCents: monthly * 12,
      details: "Uses " + percent.toFixed(0) + "% of each paycheck for " + schedule.label.toLowerCase() + ".",
    };
  }

  const roundUpTo = parseInteger(form.roundUpTo);
  const averageTransactions = parseInteger(form.averageTransactions);
  const averageAmount = parseCurrency(form.averageAmount);
  if (roundUpTo === undefined || averageTransactions === undefined || averageAmount === undefined) {
    return { valid: false, monthlyCents: 0, yearlyCents: 0, details: "" };
  }
  const increment = roundUpTo * 100;
  const remainder = increment > 0 ? averageAmount % increment : 0;
  const perTransaction = increment === 0 ? 0 : remainder === 0 ? Math.round(increment / 2) : increment - remainder;
  const daily = perTransaction * averageTransactions;
  const monthly = Math.round(daily * 30);
  return {
    valid: true,
    monthlyCents: monthly,
    yearlyCents: monthly * 12,
    details: "Assumes " + averageTransactions + " card transactions averaging " + formatCurrencyCents(averageAmount) + " per day.",
  };
}

const initialFormState: SavingsRuleFormState = {
  type: "fixed",
  name: "Weekly savings boost",
  sourceAccountId: fundingAccounts[0]?.id ?? "",
  destinationAccountId: destinationAccounts[0]?.id ?? "",
  scheduleId: "weekly",
  startDate: formatInputDate(new Date(Date.now() + 2 * 86_400_000)),
  amount: "150",
  percentage: "10",
  paycheckAmount: "4200",
  roundUpTo: "5",
  averageTransactions: "6",
  averageAmount: "32",
  lowBalanceGuard: true,
  memo: "",
};

export function SavingsAutomationSection() {
  const { formatCurrency, formatPercent, formatDate } = useLocalization();
  const formatCurrencyCents = useCallback((cents: number, options?: Intl.NumberFormatOptions) => formatCurrency(cents / 100, options), [formatCurrency]);
  const formatCurrencyCompact = useCallback((cents: number) => formatCurrencyCents(cents, { maximumFractionDigits: 0 }), [formatCurrencyCents]);
  const formatRatio = (value: number) => formatPercent(Math.max(0, Math.min(1, value)), { maximumFractionDigits: 0 });
  const formatScheduleDate = (value: string | Date) =>
    formatDate(value, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  const [rules, setRules] = useState<SavingsRule[]>(initialRules);
  const [formState, setFormState] = useState<SavingsRuleFormState>(initialFormState);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const activeRules = useMemo(() => rules.filter((rule) => rule.status === "active"), [rules]);
  const monthlyAutomationCents = useMemo(
    () => activeRules.reduce((total, rule) => total + computeMonthlyForRule(rule), 0),
    [activeRules],
  );
  const yearlyAutomationCents = monthlyAutomationCents * 12;
  const coverageRatio = monthlyTargetCents ? Math.min(1, monthlyAutomationCents / monthlyTargetCents) : 0;

  const nextRunCopy = useMemo(() => {
    const upcoming = activeRules
      .map((rule) => new Date(rule.nextRunAt))
      .filter((date) => !Number.isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    if (!upcoming.length) {
      return "No queued transfers";
    }
    return "Next transfer " + formatScheduleDate(upcoming[0]);
  }, [activeRules]);

  const simulation = useMemo(() => buildSimulation(formState, formatCurrencyCents), [formState, formatCurrencyCents]);

  function handleTypeChange(newType: SavingsRuleType) {
    setFormState((previous) => {
      const scheduleId = newType === "percentage" ? "semimonthly" : newType === "round_up" ? "daily" : "weekly";
      return {
        ...previous,
        type: newType,
        scheduleId,
      };
    });
    setFormErrors({});
  }

  function handleFieldChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const target = event.target;
    const { name } = target;
    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      setFormState((previous) => ({ ...previous, [name]: target.checked }));
      return;
    }
    setFormState((previous) => ({ ...previous, [name]: target.value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors: Record<string, string> = {};

    if (!formState.name.trim()) {
      errors.name = "Enter a rule name.";
    }
    if (!formState.sourceAccountId) {
      errors.sourceAccountId = "Choose a funding account.";
    }
    if (!formState.destinationAccountId) {
      errors.destinationAccountId = "Choose a destination.";
    }
    if (!formState.startDate) {
      errors.startDate = "Pick a start date.";
    }

    const schedule = savingsSchedules[formState.scheduleId];
    if (!schedule) {
      errors.scheduleId = "Select a schedule.";
    }

    let amountCents: number | undefined;
    let percentage: number | undefined;
    let paycheckAmountCents: number | undefined;
    let roundUpTo: number | undefined;
    let averageTransactionsPerDay: number | undefined;
    let averageTransactionAmountCents: number | undefined;

    if (formState.type === "fixed") {
      amountCents = parseCurrency(formState.amount);
      if (amountCents === undefined) {
        errors.amount = "Provide a positive amount.";
      }
    }

    if (formState.type === "percentage") {
      percentage = parsePercentage(formState.percentage);
      paycheckAmountCents = parseCurrency(formState.paycheckAmount);
      if (percentage === undefined) {
        errors.percentage = "Enter a percentage between 1 and 100.";
      }
      if (paycheckAmountCents === undefined) {
        errors.paycheckAmount = "Estimate the paycheck amount.";
      }
    }

    if (formState.type === "round_up") {
      roundUpTo = parseInteger(formState.roundUpTo);
      averageTransactionsPerDay = parseInteger(formState.averageTransactions);
      averageTransactionAmountCents = parseCurrency(formState.averageAmount);
      if (roundUpTo === undefined || roundUpTo > 20) {
        errors.roundUpTo = "Use a value between 1 and 20.";
      }
      if (averageTransactionsPerDay === undefined) {
        errors.averageTransactions = "Estimate daily transaction volume.";
      }
      if (averageTransactionAmountCents === undefined) {
        errors.averageAmount = "Estimate an average purchase amount.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const now = new Date();
    const startDate = new Date(formState.startDate);
    const sourceAccount = fundingAccountLookup.get(formState.sourceAccountId);
    const destinationAccount = destinationAccountLookup.get(formState.destinationAccountId);

    const newRule: SavingsRule = {
      id: "rule-" + Date.now().toString(36),
      name: formState.name.trim(),
      type: formState.type,
      status: "active",
      scheduleId: formState.scheduleId,
      scheduleLabel: schedule ? schedule.label : "Custom",
      sourceAccountId: formState.sourceAccountId,
      sourceAccountName: sourceAccount ? sourceAccount.name : formState.sourceAccountId,
      destinationAccountId: formState.destinationAccountId,
      destinationAccountName: destinationAccount ? destinationAccount.name : formState.destinationAccountId,
      amountCents,
      percentage,
      paycheckAmountCents,
      roundUpTo,
      averageTransactionsPerDay,
      averageTransactionAmountCents,
      nextRunAt: startDate.toISOString(),
      lastRunAt: undefined,
      createdAt: now.toISOString(),
      lowBalanceGuard: formState.lowBalanceGuard,
    };

    setRules((previous) => [newRule, ...previous]);
    setFormState((previous) => ({
      ...initialFormState,
      type: previous.type,
      sourceAccountId: previous.sourceAccountId,
      destinationAccountId: previous.destinationAccountId,
    }));
    setFormErrors({});
  }

  function toggleRuleStatus(ruleId: string) {
    setRules((previous) =>
      previous.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              status: rule.status === "active" ? "paused" : "active",
            }
          : rule,
      ),
    );
  }

  return (
    <section id="savings" className={styles.section}>
      <Card>
        <CardBody className={styles.summaryCard}>
          <div className={styles.metricBlock}>
            <strong className={styles.metricLabel}>Automated monthly savings</strong>
            <div className={styles.metricValue}>{formatCurrencyCents(monthlyAutomationCents)}</div>
            <p className={styles.metricCopy}>
              Coverage {formatRatio(coverageRatio)} of the target {formatCurrencyCents(monthlyTargetCents)}.
            </p>
          </div>
          <div className={styles.metricBlock}>
            <strong className={styles.metricLabel}>Yearly projection</strong>
            <div className={styles.metricValue}>{formatCurrencyCents(yearlyAutomationCents)}</div>
            <p className={styles.metricCopy}>{nextRunCopy}</p>
          </div>
          <div className={styles.metricBlock}>
            <strong className={styles.metricLabel}>Rules</strong>
            <div className={styles.metricValue}>{rules.filter((rule) => rule.status === "active").length} / {rules.length}</div>
            <p className={styles.metricCopy}>Toggle rules to pause without deleting their history.</p>
          </div>
        </CardBody>
      </Card>

      <div className={styles.layout}>
        <Card>
          <CardHeader title="Automation rules" subtitle="Review cadence, contribution type, and status" />
          <CardBody className={styles.rulesBody}>
            <div className={styles.rulesTableWrapper}>
              <table className={[patterns.table, styles.rulesTable].join(" ")}>
                <thead>
                  <tr>
                    <th scope="col">Rule</th>
                    <th scope="col">Type</th>
                    <th scope="col">Schedule</th>
                    <th scope="col">Monthly</th>
                    <th scope="col">Last run</th>
                    <th scope="col">Status</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.id}>
                      <td>
                        <div className={styles.ruleNameCell}>
                          <strong>{rule.name}</strong>
                          <span className={styles.ruleDestination}>{rule.destinationAccountName}</span>
                        </div>
                      </td>
                      <td>
                        <span className={[styles.typeBadge, typeClassName[rule.type]].join(" ")}>{typeLabel[rule.type]}</span>
                      </td>
                      <td>{rule.scheduleLabel}</td>
                      <td>{formatCurrencyCompact(computeMonthlyForRule(rule))}</td>
                      <td>{rule.lastRunAt ? formatScheduleDate(new Date(rule.lastRunAt)) : "â€”"}</td>
                      <td>
                        <span className={[styles.statusBadge, statusClassName[rule.status]].join(" ")}>{rule.status}</span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={controls.button}
                          onClick={() => toggleRuleStatus(rule.id)}
                        >
                          {rule.status === "active" ? "Pause" : "Resume"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Create automation rule" subtitle="Pick a strategy and preview its impact" />
          <CardBody className={styles.formBody}>
            <div className={styles.typeToggle} role="tablist" aria-label="Rule type selector">
              <button
                type="button"
                role="tab"
                aria-selected={formState.type === "fixed"}
                className={[styles.typeButton, formState.type === "fixed" ? styles.typeButtonActive : ""].join(" ")}
                onClick={() => handleTypeChange("fixed")}
              >
                Fixed
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={formState.type === "percentage"}
                className={[styles.typeButton, formState.type === "percentage" ? styles.typeButtonActive : ""].join(" ")}
                onClick={() => handleTypeChange("percentage")}
              >
                Percentage
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={formState.type === "round_up"}
                className={[styles.typeButton, formState.type === "round_up" ? styles.typeButtonActive : ""].join(" ")}
                onClick={() => handleTypeChange("round_up")}
              >
                Round-up
              </button>
            </div>

            <form className={patterns.form} onSubmit={handleSubmit} noValidate>
              <label className={patterns.formLabel} htmlFor="rule-name">
                Rule name
                <input
                  id="rule-name"
                  name="name"
                  className={[patterns.input, formErrors.name ? styles.fieldError : ""].join(" ")}
                  placeholder="Payday sweep"
                  value={formState.name}
                  onChange={handleFieldChange}
                />
                {formErrors.name ? <span className={styles.errorMessage}>{formErrors.name}</span> : null}
              </label>

              <div className={patterns.formRow}>
                <label className={patterns.formLabel} htmlFor="source-account">
                  Funding account
                  <select
                    id="source-account"
                    name="sourceAccountId"
                    className={[patterns.select, formErrors.sourceAccountId ? styles.fieldError : ""].join(" ")}
                    value={formState.sourceAccountId}
                    onChange={handleFieldChange}
                  >
                    {fundingAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} Â· {formatCurrencyCents(account.availableCents)} available
                      </option>
                    ))}
                  </select>
                  {formErrors.sourceAccountId ? <span className={styles.errorMessage}>{formErrors.sourceAccountId}</span> : null}
                </label>
                <label className={patterns.formLabel} htmlFor="destination-account">
                  Destination
                  <select
                    id="destination-account"
                    name="destinationAccountId"
                    className={[patterns.select, formErrors.destinationAccountId ? styles.fieldError : ""].join(" ")}
                    value={formState.destinationAccountId}
                    onChange={handleFieldChange}
                  >
                    {destinationAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.destinationAccountId ? <span className={styles.errorMessage}>{formErrors.destinationAccountId}</span> : null}
                </label>
              </div>

              <div className={patterns.formRow}>
                <label className={patterns.formLabel} htmlFor="schedule">
                  Schedule
                  <select
                    id="schedule"
                    name="scheduleId"
                    className={[patterns.select, formErrors.scheduleId ? styles.fieldError : ""].join(" ")}
                    value={formState.scheduleId}
                    onChange={handleFieldChange}
                  >
                    {Object.values(savingsSchedules).map((schedule) => (
                      <option key={schedule.id} value={schedule.id}>
                        {schedule.label}
                      </option>
                    ))}
                  </select>
                  {formErrors.scheduleId ? (
                    <span className={styles.errorMessage}>{formErrors.scheduleId}</span>
                  ) : (
                    <span className={styles.helperText}>{savingsSchedules[formState.scheduleId]?.description}</span>
                  )}
                </label>
                <label className={patterns.formLabel} htmlFor="start-date">
                  Start date
                  <input
                    id="start-date"
                    name="startDate"
                    type="date"
                    className={[patterns.input, formErrors.startDate ? styles.fieldError : ""].join(" ")}
                    value={formState.startDate}
                    onChange={handleFieldChange}
                  />
                  {formErrors.startDate ? <span className={styles.errorMessage}>{formErrors.startDate}</span> : null}
                </label>
              </div>

              {formState.type === "fixed" ? (
                <label className={patterns.formLabel} htmlFor="amount">
                  Amount per run
                  <input
                    id="amount"
                    name="amount"
                    className={[patterns.input, formErrors.amount ? styles.fieldError : ""].join(" ")}
                    placeholder="150"
                    value={formState.amount}
                    onChange={handleFieldChange}
                  />
                  {formErrors.amount ? <span className={styles.errorMessage}>{formErrors.amount}</span> : null}
                </label>
              ) : null}

              {formState.type === "percentage" ? (
                <div className={patterns.formRow}>
                  <label className={patterns.formLabel} htmlFor="percentage">
                    Percentage of paycheck
                    <input
                      id="percentage"
                      name="percentage"
                      className={[patterns.input, formErrors.percentage ? styles.fieldError : ""].join(" ")}
                      placeholder="10"
                      value={formState.percentage}
                      onChange={handleFieldChange}
                    />
                    {formErrors.percentage ? <span className={styles.errorMessage}>{formErrors.percentage}</span> : null}
                  </label>
                  <label className={patterns.formLabel} htmlFor="paycheckAmount">
                    Typical paycheck amount
                    <input
                      id="paycheckAmount"
                      name="paycheckAmount"
                      className={[patterns.input, formErrors.paycheckAmount ? styles.fieldError : ""].join(" ")}
                      placeholder="4200"
                      value={formState.paycheckAmount}
                      onChange={handleFieldChange}
                    />
                    {formErrors.paycheckAmount ? <span className={styles.errorMessage}>{formErrors.paycheckAmount}</span> : null}
                  </label>
                </div>
              ) : null}

              {formState.type === "round_up" ? (
                <div className={patterns.formRow}>
                  <label className={patterns.formLabel} htmlFor="roundUpTo">
                    Round to the nearest value
                    <input
                      id="roundUpTo"
                      name="roundUpTo"
                      className={[patterns.input, formErrors.roundUpTo ? styles.fieldError : ""].join(" ")}
                      placeholder="5"
                      value={formState.roundUpTo}
                      onChange={handleFieldChange}
                    />
                    {formErrors.roundUpTo ? <span className={styles.errorMessage}>{formErrors.roundUpTo}</span> : null}
                  </label>
                  <label className={patterns.formLabel} htmlFor="averageTransactions">
                    Avg. card transactions per day
                    <input
                      id="averageTransactions"
                      name="averageTransactions"
                      className={[patterns.input, formErrors.averageTransactions ? styles.fieldError : ""].join(" ")}
                      placeholder="6"
                      value={formState.averageTransactions}
                      onChange={handleFieldChange}
                    />
                    {formErrors.averageTransactions ? <span className={styles.errorMessage}>{formErrors.averageTransactions}</span> : null}
                  </label>
                </div>
              ) : null}

              {formState.type === "round_up" ? (
                <label className={patterns.formLabel} htmlFor="averageAmount">
                  Avg. transaction amount
                  <input
                    id="averageAmount"
                    name="averageAmount"
                    className={[patterns.input, formErrors.averageAmount ? styles.fieldError : ""].join(" ")}
                    placeholder="32"
                    value={formState.averageAmount}
                    onChange={handleFieldChange}
                  />
                  {formErrors.averageAmount ? <span className={styles.errorMessage}>{formErrors.averageAmount}</span> : null}
                </label>
              ) : null}

              <div className={styles.switchCluster}>
                <label className={styles.switchLabel}>
                  <input
                    type="checkbox"
                    name="lowBalanceGuard"
                    checked={formState.lowBalanceGuard}
                    onChange={handleFieldChange}
                  />
                  Pause if balance drops below guardrail
                </label>
              </div>

              <label className={patterns.formLabel} htmlFor="memo">
                Notes (optional)
                <textarea
                  id="memo"
                  name="memo"
                  className={patterns.textarea}
                  rows={3}
                  placeholder="Document coordination with budgets or cash buffers."
                  value={formState.memo}
                  onChange={handleFieldChange}
                />
              </label>

              <div className={patterns.actionRow}>
                <button type="submit" className={[controls.button, controls.buttonPrimary].join(" ")}>
                  Add rule
                </button>
                <button
                  type="button"
                  className={controls.button}
                  onClick={() => {
                    setFormState(initialFormState);
                    setFormErrors({});
                  }}
                >
                  Reset
                </button>
              </div>
            </form>

            <div className={styles.simulationBody}>
              <div className={styles.simulationGrid}>
                <div>
                  <strong className={styles.metricLabel}>Projected monthly</strong>
                  <div className={styles.metricValue}>{simulation.valid ? formatCurrencyCents(simulation.monthlyCents) : "â€”"}</div>
                </div>
                <div>
                  <strong className={styles.metricLabel}>Projected yearly</strong>
                  <div className={styles.metricValue}>{simulation.valid ? formatCurrencyCents(simulation.yearlyCents) : "â€”"}</div>
                </div>
              </div>
              <p className={styles.metricCopy}>
                {simulation.valid ? simulation.details : "Enter the required fields to preview monthly impact."}
              </p>
              <ul className={patterns.blockList}>
                <li>Existing automations cover {formatRatio(coverageRatio)} of the monthly savings objective.</li>
                <li>Adding this rule would raise automation to {formatCurrencyCents(monthlyAutomationCents + (simulation.valid ? simulation.monthlyCents : 0))} per month.</li>
                <li>Use the guardrail toggle to avoid overdrawing funding accounts.</li>
              </ul>
            </div>
          </CardBody>
        </Card>
      </div>
    </section>
  );
}







