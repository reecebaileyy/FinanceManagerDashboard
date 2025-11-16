
"use client";

import { ChangeEvent, FormEvent, KeyboardEvent, useMemo, useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";

import { Card, CardBody, CardHeader } from "@components/dashboard/card";
import { InteractionErrorBoundary } from "@components/error-boundary";

import styles from "./budgets-section.module.css";
import controls from "../../styles/controls.module.css";
import patterns from "../../styles/patterns.module.css";
import {
  getBudgetsFixture,
  fetchBudgetsWorkspace,
  saveBudget,
  type Budget,
  type BudgetCategory,
  type BudgetPeriod,
  type BudgetStatus,
  type BudgetsWorkspacePayload,
  type SaveBudgetInput,
} from "@lib/api/budgets";


interface BudgetFormCategoryState {
  id: string;
  name: string;
  allocated: string;
  spent: string;
  alertThresholdPercent: string;
}

interface BudgetFormState {
  name: string;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  targetAmount: string;
  alertThresholdPercent: string;
  rolloverEnabled: boolean;
  alertsEnabled: boolean;
  rolloverFromLastPeriod: string;
  notes: string;
  categories: BudgetFormCategoryState[];
}

interface BudgetAlert {
  id: string;
  budgetId: string;
  tone: "warning" | "critical";
  message: string;
}

interface TrendPoint {
  label: string;
  spent: number;
  target: number;
}

interface AggregateMetrics {
  totalTarget: number;
  totalSpent: number;
  totalRemaining: number;
  projectedEnd: number;
  variance: number;
  variancePercent: number;
  rollover: number;
  daysRemaining: number;
  daysElapsed: number;
  totalDays: number;
  budgetsCount: number;
  chartPoints: TrendPoint[];
  latestUpdate?: Date;
}

const MS_PER_DAY = 86_400_000;
const TREND_STEPS = 4;

const amountFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  maximumFractionDigits: 1,
});

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function sumCategoryAllocated(categories: BudgetCategory[]): number {
  return categories.reduce((total, category) => total + category.allocated, 0);
}

function sumCategorySpent(categories: BudgetCategory[]): number {
  return categories.reduce((total, category) => total + category.spent, 0);
}

function formatSignedCurrency(value: number): string {
  const formatted = amountFormatter.format(Math.abs(value));
  if (value === 0) {
    return formatted;
  }
  return value > 0 ? `+${formatted}` : `-${formatted}`;
}

function formatPeriodLabel(period: BudgetPeriod): string {
  switch (period) {
    case "monthly":
      return "Monthly";
    case "weekly":
      return "Weekly";
    default:
      return "Custom";
  }
}

function formatDateLabel(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return iso;
  }
  return dateFormatter.format(parsed);
}

function formatDateRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return `${startIso} ? ${endIso}`;
  }
  if (start.toDateString() === end.toDateString()) {
    return dateFormatter.format(start);
  }
  return `${dateFormatter.format(start)} ? ${dateFormatter.format(end)}`;
}

function formatRelativeDate(date: Date, reference: Date): string {
  const diff = Math.round((reference.getTime() - date.getTime()) / MS_PER_DAY);
  if (diff === 0) {
    return "today";
  }
  if (diff === 1) {
    return "1 day ago";
  }
  if (diff > 1) {
    return `${diff} days ago`;
  }
  if (diff === -1) {
    return "in 1 day";
  }
  return `in ${Math.abs(diff)} days`;
}

function diffInDaysInclusive(start: Date, end: Date): number {
  const diff = Math.floor((end.getTime() - start.getTime()) / MS_PER_DAY);
  return diff < 0 ? 0 : diff + 1;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function calculateBudgetProjection(budget: Budget, reference: Date) {
  const start = new Date(budget.startDate);
  const end = new Date(budget.endDate);
  const totalDays = Math.max(1, diffInDaysInclusive(start, end));
  const daysElapsed = clamp(diffInDaysInclusive(start, reference), 0, totalDays);
  const spent = sumCategorySpent(budget.categories);
  const dailyRunRate = spent / Math.max(daysElapsed, 1);
  const projectedEnd = dailyRunRate * totalDays;
  const daysRemaining = Math.max(totalDays - daysElapsed, 0);

  return {
    projectedEnd,
    daysRemaining,
    totalDays,
    daysElapsed,
  };
}

function buildTrendPoints(budgets: Budget[]): TrendPoint[] {
  if (budgets.length === 0) {
    return Array.from({ length: TREND_STEPS }, (_, index) => ({
      label: `Week ${index + 1}`,
      spent: 0,
      target: 0,
    }));
  }

  const totalTarget = budgets.reduce((sum, budget) => sum + budget.targetAmount, 0);
  const targetPerStep = totalTarget / TREND_STEPS;

  return Array.from({ length: TREND_STEPS }, (_, index) => ({
    label: `Week ${index + 1}`,
    spent: budgets.reduce((sum, budget) => sum + (budget.trend[index] ?? 0), 0),
    target: targetPerStep,
  }));
}

function getBudgetStatus(budget: Budget, percentSpent: number): BudgetStatus {
  if (percentSpent >= 1.05) {
    return "critical";
  }
  if (percentSpent >= budget.alertThresholdPercent / 100) {
    return "warning";
  }
  return "healthy";
}

function collectAlerts(budgets: Budget[]): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];

  budgets.forEach((budget) => {
    const spent = sumCategorySpent(budget.categories);
    const percentSpent = budget.targetAmount === 0 ? 0 : spent / budget.targetAmount;
    const status = getBudgetStatus(budget, percentSpent);

    if (status !== "healthy") {
      const variance = spent - budget.targetAmount;
      alerts.push({
        id: `${budget.id}-summary`,
        budgetId: budget.id,
        tone: status === "critical" ? "critical" : "warning",
        message:
          status === "critical"
            ? `${budget.name} is projected to exceed plan by ${formatSignedCurrency(variance)}.`
            : `${budget.name} has reached ${percentFormatter.format(percentSpent)} of its allocation.`,
      });
    }

    budget.categories.forEach((category) => {
      const percent = category.allocated === 0 ? 0 : category.spent / category.allocated;
      if (percent >= category.alertThresholdPercent / 100) {
        alerts.push({
          id: `${budget.id}-${category.id}`,
          budgetId: budget.id,
          tone: percent >= 1 ? "critical" : "warning",
          message: `${category.name} is at ${percentFormatter.format(Math.min(percent, 1.5))} of its category budget.`,
        });
      }
    });
  });

  return alerts;
}

function computeAggregateMetrics(budgets: Budget[], reference: Date): AggregateMetrics {
  if (budgets.length === 0) {
    return {
      totalTarget: 0,
      totalSpent: 0,
      totalRemaining: 0,
      projectedEnd: 0,
      variance: 0,
      variancePercent: 0,
      rollover: 0,
      daysRemaining: 0,
      daysElapsed: 0,
      totalDays: 0,
      budgetsCount: 0,
      chartPoints: buildTrendPoints([]),
      latestUpdate: undefined,
    };
  }

  const totalTarget = budgets.reduce((sum, budget) => sum + budget.targetAmount, 0);
  const totalSpent = budgets.reduce((sum, budget) => sum + sumCategorySpent(budget.categories), 0);
  const totalRemaining = totalTarget - totalSpent;
  const rollover = budgets.reduce((sum, budget) => sum + budget.rolloverFromLastPeriod, 0);

  const projections = budgets.map((budget) => calculateBudgetProjection(budget, reference));
  const projectedEnd = projections.reduce((sum, projection) => sum + projection.projectedEnd, 0);

  const variance = totalSpent - totalTarget;
  const variancePercent = totalTarget === 0 ? 0 : ((projectedEnd - totalTarget) / totalTarget) * 100;

  const earliestStart = budgets.reduce((earliest, budget) => {
    const start = new Date(budget.startDate);
    return start < earliest ? start : earliest;
  }, new Date(budgets[0]?.startDate ?? reference));

  const latestEnd = budgets.reduce((latest, budget) => {
    const end = new Date(budget.endDate);
    return end > latest ? end : latest;
  }, new Date(budgets[0]?.endDate ?? reference));

  const totalDays = diffInDaysInclusive(earliestStart, latestEnd);
  const daysElapsed = Math.min(diffInDaysInclusive(earliestStart, reference), totalDays);
  const daysRemaining = Math.max(totalDays - daysElapsed, 0);

  const latestUpdate = budgets.reduce<Date | undefined>((mostRecent, budget) => {
    const updated = new Date(budget.lastUpdated);
    if (!mostRecent || updated > mostRecent) {
      return updated;
    }
    return mostRecent;
  }, undefined);

  return {
    totalTarget,
    totalSpent,
    totalRemaining,
    projectedEnd,
    variance,
    variancePercent,
    rollover,
    daysRemaining,
    daysElapsed,
    totalDays,
    budgetsCount: budgets.length,
    chartPoints: buildTrendPoints(budgets),
    latestUpdate,
  };
}

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDefaultPeriodDates(reference: Date) {
  // Use current date as start date
  const start = new Date();
  // Set end date to the end of the current month
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
  
  return {
    start: formatDateInput(start),
    end: formatDateInput(end),
  };
}

function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 7);
  return `${prefix}-${timestamp}-${random}`;
}

function createEmptyCategoryState(): BudgetFormCategoryState {
  return {
    id: generateId("category"),
    name: "",
    allocated: "",
    spent: "",
    alertThresholdPercent: "85",
  };
}

function createEmptyFormState(range: { start: string; end: string }): BudgetFormState {
  return {
    name: "",
    period: "monthly",
    startDate: range.start,
    endDate: range.end,
    targetAmount: "",
    alertThresholdPercent: "85",
    rolloverEnabled: true,
    alertsEnabled: true,
    rolloverFromLastPeriod: "0",
    notes: "",
    categories: [createEmptyCategoryState()],
  };
}

function mapBudgetToForm(budget: Budget): BudgetFormState {
  return {
    name: budget.name,
    period: budget.period,
    startDate: budget.startDate,
    endDate: budget.endDate,
    targetAmount: budget.targetAmount.toString(),
    alertThresholdPercent: budget.alertThresholdPercent.toString(),
    rolloverEnabled: budget.rolloverEnabled,
    alertsEnabled: budget.alertsEnabled,
    rolloverFromLastPeriod: budget.rolloverFromLastPeriod.toFixed(2),
    notes: budget.notes ?? "",
    categories: budget.categories.map((category) => ({
      id: category.id,
      name: category.name,
      allocated: category.allocated.toString(),
      spent: category.spent.toString(),
      alertThresholdPercent: category.alertThresholdPercent.toString(),
    })),
  };
}

function toNumber(value: string): number {
  if (!value) {
    return NaN;
  }
  const normalized = value.replace(/[^0-9.-]/g, "");
  if (normalized.trim() === "") {
    return NaN;
  }
  return Number(normalized);
}

function clampThreshold(value: number): number {
  if (!Number.isFinite(value)) {
    return 85;
  }
  return Math.min(Math.max(Math.round(value), 50), 150);
}

function buildTrend(total: number, steps = TREND_STEPS): number[] {
  if (steps <= 0) {
    return [];
  }
  if (total <= 0) {
    return Array.from({ length: steps }, () => 0);
  }

  const base = total / steps;
  const values: number[] = [];
  let remaining = total;

  for (let index = 0; index < steps; index += 1) {
    const variance = 1 + (index - (steps - 1) / 2) * 0.12;
    let value = base * variance;
    if (index === steps - 1) {
      value = remaining;
    } else {
      value = Math.min(remaining, value);
    }
    value = Number(value.toFixed(2));
    values.push(value);
    remaining = Number((remaining - value).toFixed(2));
  }

  if (remaining !== 0 && values.length > 0) {
    values[values.length - 1] = Number((values[values.length - 1] + remaining).toFixed(2));
  }

  return values;
}

function buildBudgetTrendFromCategories(categories: BudgetCategory[]): number[] {
  const total = sumCategorySpent(categories);
  return buildTrend(total);
}
function BudgetTrendChart({ points }: { points: TrendPoint[] }) {
  const maxValue = Math.max(
    1,
    ...points.map((point) => Math.max(point.target, point.spent)),
  );

  return (
    <div className={styles.chartBars} role="img" aria-label="Weekly spending versus target">
      {points.map((point) => {
        const targetWidth = Math.min(100, (point.target / maxValue) * 100);
        const spentWidth = Math.min(100, (point.spent / maxValue) * 100);

        return (
          <div key={point.label} className={styles.chartBar}>
            <div className={styles.chartBarLabel}>{point.label}</div>
            <div className={styles.chartBarTrack} aria-hidden="true">
              <span className={styles.chartBarTarget} style={{ width: `${targetWidth}%` }} />
              <span className={styles.chartBarSpent} style={{ width: `${spentWidth}%` }} />
            </div>
            <div className={styles.chartBarMeta}>
              <span>{amountFormatter.format(point.spent)} spent</span>
              <span>{amountFormatter.format(point.target)} target</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
export function BudgetsSection() {
  const initialWorkspace = useMemo(() => getBudgetsFixture(), []);
  const [workspace, setWorkspace] = useState<BudgetsWorkspacePayload>(initialWorkspace);
  const referenceDate = useMemo(() => new Date(workspace.referenceDate), [workspace.referenceDate]);
  const defaultRange = useMemo(() => getDefaultPeriodDates(new Date()), []);
  const [budgets, setBudgets] = useState<Budget[]>(workspace.budgets);
  const [formState, setFormState] = useState<BudgetFormState>(() => createEmptyFormState(defaultRange));
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [dialogState, setDialogState] = useState<{ open: boolean; mode: "create" | "edit"; budgetId?: string }>(
    {
      open: false,
      mode: "create",
    },
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load persisted data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const persistedWorkspace = await fetchBudgetsWorkspace();
        setWorkspace(persistedWorkspace);
        setBudgets(persistedWorkspace.budgets);
      } catch (error) {
        console.warn('Failed to load persisted budgets, using fixture:', error);
        // Keep the initial fixture data
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);

  const budgetMutation = useMutation<Budget, Error, SaveBudgetInput, { previousBudgets: Budget[]; previousWorkspace: BudgetsWorkspacePayload }>({
    mutationFn: saveBudget,
    onMutate: (input: SaveBudgetInput) => {
      setFormErrors([]);
      const previousBudgets = budgets;
      const previousWorkspace = workspace;

      // Optimistically update the UI
      setBudgets((prev) => {
        if (input.mode === "edit") {
          return prev.map((budget) => (budget.id === input.budget.id ? input.budget : budget));
        }
        return [...prev, input.budget];
      });

      setWorkspace((prev) => ({
        ...prev,
        budgets: input.mode === "edit" 
          ? prev.budgets.map((budget) => (budget.id === input.budget.id ? input.budget : budget))
          : [...prev.budgets, input.budget]
      }));

      return { previousBudgets, previousWorkspace };
    },
    onError: (error, _input, context) => {
      console.error("Failed to save budget", error);
      if (context?.previousBudgets) {
        setBudgets(context.previousBudgets);
      }
      if (context?.previousWorkspace) {
        setWorkspace(context.previousWorkspace);
      }
      setFormErrors(["We couldn't save the budget. Try again."]);
    },
    onSuccess: (result, input) => {
      // Update with the actual result from the server (which may have updated fields like lastUpdated)
      setBudgets((prev) => {
        if (input.mode === "edit") {
          return prev.map((budget) => (budget.id === result.id ? result : budget));
        }
        // For create mode, replace the optimistic update with the server result
        return prev.map((budget) => (budget.id === input.budget.id ? result : budget));
      });
      
      setWorkspace((prev) => ({
        ...prev,
        budgets: input.mode === "edit"
          ? prev.budgets.map((budget) => (budget.id === result.id ? result : budget))
          : prev.budgets.map((budget) => (budget.id === input.budget.id ? result : budget))
      }));
      
      setFormErrors([]);
      closeModal();
    },
  });

  const isSaving = budgetMutation.isPending;

  const metrics = useMemo(() => computeAggregateMetrics(budgets, referenceDate), [budgets, referenceDate]);
  const alerts = useMemo(() => collectAlerts(budgets), [budgets]);
  const lastUpdatedLabel = metrics.latestUpdate ? formatRelativeDate(metrics.latestUpdate, referenceDate) : "?";

  const activeBudget =
    dialogState.mode === "edit" && dialogState.budgetId
      ? budgets.find((budget) => budget.id === dialogState.budgetId)
      : undefined;

  const openCreateModal = () => {
    setFormErrors([]);
    const freshRange = getDefaultPeriodDates(new Date());
    setFormState(createEmptyFormState(freshRange));
    setDialogState({ open: true, mode: "create" });
  };

  const openEditModal = (budgetId: string) => {
    const budget = budgets.find((item) => item.id === budgetId);
    if (!budget) {
      return;
    }
    setFormErrors([]);
    setFormState(mapBudgetToForm(budget));
    setDialogState({ open: true, mode: "edit", budgetId });
  };

  const closeModal = () => {
    setDialogState({ open: false, mode: "create" });
    setFormErrors([]);
    const freshRange = getDefaultPeriodDates(new Date());
    setFormState(createEmptyFormState(freshRange));
  };

  const handleReset = () => {
    const fresh = getBudgetsFixture();
    setBudgets(fresh.budgets);
    setFormErrors([]);
    const freshRange = getDefaultPeriodDates(new Date());
    setFormState(createEmptyFormState(freshRange));
    setDialogState({ open: false, mode: "create" });
    budgetMutation.reset();
  };

  const handleNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, name: event.target.value }));
  };

  const handleTargetChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, targetAmount: event.target.value }));
  };

  const handleAlertThresholdChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, alertThresholdPercent: event.target.value }));
  };

  const handleStartDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, startDate: event.target.value }));
  };

  const handleEndDateChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, endDate: event.target.value }));
  };

  const handlePeriodChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setFormState((prev) => ({ ...prev, period: event.target.value as BudgetPeriod }));
  };

  const handleRolloverEnabledChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, rolloverEnabled: event.target.checked }));
  };

  const handleAlertsEnabledChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, alertsEnabled: event.target.checked }));
  };

  const handleRolloverAmountChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, rolloverFromLastPeriod: event.target.value }));
  };

  const handleNotesChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setFormState((prev) => ({ ...prev, notes: event.target.value }));
  };

  const handleCategoryFieldChange =
    (id: string, field: keyof BudgetFormCategoryState) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFormState((prev) => ({
        ...prev,
        categories: prev.categories.map((category) =>
          category.id === id ? { ...category, [field]: value } : category,
        ),
      }));
    };

  const handleAddCategory = () => {
    setFormState((prev) => ({
      ...prev,
      categories: [...prev.categories, createEmptyCategoryState()],
    }));
  };

  const handleRemoveCategory = (id: string) => {
    setFormState((prev) => ({
      ...prev,
      categories: prev.categories.length === 1 ? prev.categories : prev.categories.filter((category) => category.id !== id),
    }));
  };

  const handleModalKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      closeModal();
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const errors: string[] = [];

    if (!formState.name.trim()) {
      errors.push("Budget name is required.");
    }

    const targetInput = toNumber(formState.targetAmount);
    if (!Number.isFinite(targetInput) || targetInput <= 0) {
      errors.push("Enter a target amount greater than zero.");
    }

    const alertThresholdInput = Number(formState.alertThresholdPercent);
    if (!Number.isFinite(alertThresholdInput) || alertThresholdInput < 50 || alertThresholdInput > 150) {
      errors.push("Alert threshold must be between 50% and 150%.");
    }

    const startDate = new Date(formState.startDate);
    const endDate = new Date(formState.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      errors.push("Provide valid start and end dates.");
    } else if (endDate < startDate) {
      errors.push("End date cannot be before start date.");
    }

    const categories: BudgetCategory[] = [];

    formState.categories.forEach((categoryState, index) => {
      const name = categoryState.name.trim();
      const allocated = toNumber(categoryState.allocated);
      const spent = toNumber(categoryState.spent || "0");
      const thresholdInput = Number(categoryState.alertThresholdPercent || formState.alertThresholdPercent);

      if (!name) {
        errors.push(`Category ${index + 1} needs a name.`);
        return;
      }

      if (!Number.isFinite(allocated) || allocated <= 0) {
        errors.push(`Category ${index + 1} requires an allocated amount greater than zero.`);
        return;
      }

      if (!Number.isFinite(spent) || spent < 0) {
        errors.push(`Category ${index + 1} has an invalid spent amount.`);
        return;
      }

      categories.push({
        id: categoryState.id || generateId("category"),
        name,
        allocated,
        spent,
        alertThresholdPercent: clampThreshold(thresholdInput),
        trend: buildTrend(spent),
      });
    });

    if (categories.length === 0) {
      errors.push("Each budget must include at least one category.");
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    if (isSaving) {
      return;
    }

    const categoriesTotal = sumCategoryAllocated(categories);
    const totalSpent = sumCategorySpent(categories);
    const finalTargetAmount = categoriesTotal > 0 ? categoriesTotal : targetInput;
    const rolloverInput = toNumber(formState.rolloverFromLastPeriod);

    const newBudget: Budget = {
      id:
        dialogState.mode === "edit" && dialogState.budgetId
          ? dialogState.budgetId
          : generateId("budget"),
      name: formState.name.trim(),
      period: formState.period,
      startDate: formState.startDate,
      endDate: formState.endDate,
      targetAmount: finalTargetAmount,
      alertThresholdPercent: clampThreshold(alertThresholdInput),
      rolloverEnabled: formState.rolloverEnabled,
      alertsEnabled: formState.alertsEnabled,
      rolloverFromLastPeriod: Number.isFinite(rolloverInput) && rolloverInput > 0 ? rolloverInput : 0,
      notes: formState.notes.trim() || undefined,
      categories,
      trend: buildTrend(totalSpent),
      lastUpdated: new Date().toISOString(),
    };

    budgetMutation.mutate({
      budget: newBudget,
      mode: dialogState.mode,
      currentWorkspace: workspace,
    });
  };

  const primaryAlert = alerts[0];
  const summaryMessage = primaryAlert
    ? `Focus on ${primaryAlert.message.replace(/\.$/, "").toLowerCase()} before close.`
    : "Keep pacing current plan to carry positive rollover into next month.";
  return (
    <InteractionErrorBoundary
      onReset={handleReset}
      title="Budgets workspace hit a snag"
      description="Reload the budgets section to continue planning."
      actionLabel="Reload budgets"
    >
      <section id="budgets" className={styles.section}>
      {isLoading ? (
        <Card>
          <CardBody>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              Loading budgets...
            </div>
          </CardBody>
        </Card>
      ) : (
      <Card>
        <CardHeader
          title="Budgets"
          subtitle="Monitor allocations, track variance, and adjust plans before month end."
          badge={`${metrics.budgetsCount} active`}
          actions={
            <div className={styles.headerActions}>
              <button
                type="button"
                className={`${controls.button} ${controls.buttonPrimary}`}
                onClick={openCreateModal} disabled={isSaving}
              >
                Add budget
              </button>
              <button type="button" className={controls.button}>
                Export
              </button>
            </div>
          }
        />
        <CardBody className={styles.cardBody}>
          <div className={`${patterns.grid} ${patterns.gridCols2} ${styles.topGrid}`}>
            <div className={`${patterns.glass} ${styles.summaryCard}`}>
              <div className={styles.summaryHeader}>
                <h3 className={styles.panelTitle}>Month-to-date</h3>
                <span className={styles.summaryUpdated}>Updated {lastUpdatedLabel}</span>
              </div>
              <div className={styles.summaryMetrics}>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Allocated</span>
                  <strong className={styles.metricValue}>{amountFormatter.format(metrics.totalTarget)}</strong>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Spent</span>
                  <strong className={styles.metricValue}>{amountFormatter.format(metrics.totalSpent)}</strong>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Remaining</span>
                  <strong className={styles.metricValue}>{amountFormatter.format(Math.max(metrics.totalRemaining, 0))}</strong>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Variance</span>
                  <strong
                    className={`${styles.metricValue} ${
                      metrics.variance > 0 ? styles.metricDeltaNegative : styles.metricDeltaPositive
                    }`}
                  >
                    {formatSignedCurrency(metrics.variance)}
                  </strong>
                </div>
              </div>
              <div className={styles.summaryFooter}>
                <span>{metrics.daysRemaining > 0 ? `${metrics.daysRemaining} days remaining in period` : "Period complete"}</span>
                <span
                  className={
                    metrics.projectedEnd - metrics.totalTarget > 0
                      ? styles.metricDeltaNegative
                      : styles.metricDeltaPositive
                  }
                >
                  Projected {formatSignedCurrency(metrics.projectedEnd - metrics.totalTarget)} vs plan
                </span>
              </div>
            </div>
            <div className={`${patterns.glass} ${styles.chartCard}`}>
              <div className={styles.chartHeader}>
                <div>
                  <h3 className={styles.panelTitle}>Spending velocity</h3>
                  <p className={styles.muted}>Compare weekly actuals against allocation.</p>
                </div>
              </div>
              <BudgetTrendChart points={metrics.chartPoints} />
              <div className={styles.chartLegend}>
                <span className={styles.chartKey}>
                  <span className={`${styles.chartSwatch} ${styles.chartSwatchSpent}`} />
                  Actual spend
                </span>
                <span className={styles.chartKey}>
                  <span className={`${styles.chartSwatch} ${styles.chartSwatchTarget}`} />
                  Weekly target
                </span>
              </div>
            </div>
          </div>
          <div className={`${patterns.grid} ${patterns.gridCols2} ${styles.bottomGrid}`}>
            <div className={`${patterns.glass} ${styles.alertsPanel}`}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>Variance alerts</h3>
                <span className={styles.muted}>{alerts.length ? `${alerts.length} open` : "All clear"}</span>
              </div>
              {alerts.length ? (
                <ul className={styles.alertsList}>
                  {alerts.map((alert) => (
                    <li
                      key={alert.id}
                      className={`${styles.alertItem} ${
                        alert.tone === "critical" ? styles.alertCritical : styles.alertWarning
                      }`}
                    >
                      <span className={styles.alertMessage}>{alert.message}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.alertEmpty}>You're pacing beneath threshold. We'll surface new alerts here.</p>
              )}
            </div>
            <div className={`${patterns.glass} ${styles.summaryPanel}`}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>End-of-month outlook</h3>
                <span className={styles.muted}>
                  {metrics.daysRemaining > 0 ? `${metrics.daysRemaining} days remaining` : "Period closed"}
                </span>
              </div>
              <div className={styles.summaryMetricsGrid}>
                <div className={styles.summaryMetric}>
                  <span className={styles.metricLabel}>Projected end</span>
                  <strong className={styles.summaryMetricValue}>{amountFormatter.format(metrics.projectedEnd)}</strong>
                </div>
                <div className={styles.summaryMetric}>
                  <span className={styles.metricLabel}>Variance vs plan</span>
                  <strong
                    className={`${styles.summaryMetricValue} ${
                      metrics.projectedEnd - metrics.totalTarget > 0
                        ? styles.varianceNegative
                        : styles.variancePositive
                    }`}
                  >
                    {formatSignedCurrency(metrics.projectedEnd - metrics.totalTarget)}
                  </strong>
                </div>
                <div className={styles.summaryMetric}>
                  <span className={styles.metricLabel}>Rollover reserve</span>
                  <strong className={styles.summaryMetricValue}>{amountFormatter.format(metrics.rollover)}</strong>
                </div>
                <div className={styles.summaryMetric}>
                  <span className={styles.metricLabel}>Actual spend</span>
                  <strong className={styles.summaryMetricValue}>{amountFormatter.format(metrics.totalSpent)}</strong>
                </div>
              </div>
              <p className={styles.summaryContext}>{summaryMessage}</p>
              <div className={styles.summaryActions}>
                <button type="button" className={controls.button}>
                  Adjust allocations
                </button>
                <button type="button" className={`${controls.button} ${controls.buttonPrimary}`}>
                  Ask AI for recommendations
                </button>
              </div>
            </div>
          </div>
          <div className={`${patterns.glass} ${styles.tableCard}`}>
            <div className={styles.tableHeader}>
              <div>
                <h3 className={styles.panelTitle}>Active budgets</h3>
                <span className={styles.muted}>
                  {amountFormatter.format(metrics.totalTarget)} allocated ? {amountFormatter.format(metrics.totalSpent)} spent
                </span>
              </div>
              <span className={controls.pill}>{metrics.budgetsCount} active</span>
            </div>
            <div className={styles.budgetList}>
              {budgets.map((budget) => {
                const spent = sumCategorySpent(budget.categories);
                const percentSpent = budget.targetAmount === 0 ? 0 : spent / budget.targetAmount;
                const remaining = budget.targetAmount - spent;
                const variance = spent - budget.targetAmount;
                const status = getBudgetStatus(budget, percentSpent);
                const progressClass = `${styles.progressFill} ${
                  status === "critical"
                    ? styles.progressFillCritical
                    : status === "warning"
                      ? styles.progressFillWarning
                      : ""
                }`;

                return (
                  <article key={budget.id} className={styles.budgetRow}>
                    <header className={styles.budgetHeader}>
                      <div>
                        <h4 className={styles.budgetTitle}>{budget.name}</h4>
                        <div className={styles.budgetMeta}>
                          <span>
                            {formatPeriodLabel(budget.period)} ? {formatDateRange(budget.startDate, budget.endDate)}
                          </span>
                          <span>Updated {formatDateLabel(budget.lastUpdated)}</span>
                        </div>
                      </div>
                      <div className={styles.budgetActions}>
                        <button type="button" className={controls.button} onClick={() => openEditModal(budget.id)}>
                          Edit
                        </button>
                      </div>
                    </header>
                    <div className={styles.budgetProgress}>
                      <div className={styles.progressTrack} aria-hidden="true">
                        <span
                          className={progressClass}
                          style={{ width: `${Math.min(100, Math.max(0, percentSpent * 100))}%` }}
                        />
                      </div>
                      <div className={styles.budgetMetrics}>
                        <div className={styles.budgetMetric}>
                          <span className={styles.budgetMetricLabel}>Spent</span>
                          <strong className={styles.budgetMetricValue}>{amountFormatter.format(spent)}</strong>
                        </div>
                        <div className={styles.budgetMetric}>
                          <span className={styles.budgetMetricLabel}>Remaining</span>
                          <strong className={styles.budgetMetricValue}>
                            {amountFormatter.format(Math.max(remaining, 0))}
                          </strong>
                        </div>
                        <div className={styles.budgetMetric}>
                          <span className={styles.budgetMetricLabel}>Variance</span>
                          <strong
                            className={`${styles.budgetMetricValue} ${
                              variance > 0 ? styles.varianceNegative : styles.variancePositive
                            }`}
                          >
                            {formatSignedCurrency(variance)}
                          </strong>
                        </div>
                        <div className={styles.budgetMetric}>
                          <span className={styles.budgetMetricLabel}>Progress</span>
                          <strong className={styles.budgetMetricValue}>
                            {percentFormatter.format(Math.min(percentSpent, 1.5))}
                          </strong>
                        </div>
                      </div>
                    </div>
                    <div className={styles.categoryList}>
                      {budget.categories.map((category) => {
                        const categoryPercent = category.allocated === 0 ? 0 : category.spent / category.allocated;
                        const showAlert = categoryPercent >= category.alertThresholdPercent / 100;
                        const categoryProgressClass = `${styles.progressFill} ${
                          showAlert
                            ? categoryPercent >= 1
                              ? styles.progressFillCritical
                              : styles.progressFillWarning
                            : ""
                        }`;

                        return (
                          <div key={category.id} className={styles.categoryRow}>
                            <div className={styles.categoryInfo}>
                              <span>{category.name}</span>
                              <span className={styles.categoryAmounts}>
                                {amountFormatter.format(category.spent)} of {amountFormatter.format(category.allocated)}
                              </span>
                            </div>
                            <div className={styles.categoryProgress}>
                              <div className={styles.categoryProgressBar} aria-hidden="true">
                                <span
                                  className={categoryProgressClass}
                                  style={{ width: `${Math.min(100, Math.max(0, categoryPercent * 100))}%` }}
                                />
                              </div>
                              {showAlert ? (
                                <span
                                  className={`${styles.categoryAlert} ${
                                    categoryPercent >= 1
                                      ? styles.categoryAlertCritical
                                      : styles.categoryAlertWarning
                                  }`}
                                >
                                  Alert at {percentFormatter.format(Math.min(categoryPercent, 1.5))}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </CardBody>
      </Card>
      )}
      {dialogState.open ? (
        <div className={styles.modalOverlay} role="presentation" onClick={closeModal}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="budget-modal-title"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={handleModalKeyDown}
          >
            <div className={styles.modalHeader}>
              <div>
                <h2 id="budget-modal-title" className={styles.modalTitle}>
                  {dialogState.mode === "edit" ? "Edit budget" : "Create budget"}
                </h2>
                <p className={styles.muted}>Define allocations, thresholds, and rollovers for this period.</p>
              </div>
              <button type="button" className={controls.button} onClick={closeModal} disabled={isSaving}>
                Close
              </button>
            </div>
            <div className={styles.modalBody}>
              {formErrors.length ? (
                <ul className={styles.errorList} role="alert">
                  {formErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              ) : null}
              <form className={`${patterns.form} ${styles.modalForm}`} onSubmit={handleSubmit} noValidate>
                <div className={styles.modalGrid}>
                  <label className={patterns.formLabel} htmlFor="budget-name">
                    Budget name
                    <input
                      id="budget-name"
                      className={patterns.input}
                      value={formState.name}
                      onChange={handleNameChange}
                      required
                      autoFocus
                    />
                  </label>
                  <label className={patterns.formLabel} htmlFor="budget-target">
                    Target amount
                    <input
                      id="budget-target"
                      className={patterns.input}
                      inputMode="decimal"
                      value={formState.targetAmount}
                      onChange={handleTargetChange}
                      placeholder="1200"
                    />
                  </label>
                  <label className={patterns.formLabel} htmlFor="budget-period">
                    Period
                    <select
                      id="budget-period"
                      className={patterns.select}
                      value={formState.period}
                      onChange={handlePeriodChange}
                    >
                      <option value="monthly">Monthly</option>
                      <option value="weekly">Weekly</option>
                      <option value="custom">Custom</option>
                    </select>
                  </label>
                  <label className={patterns.formLabel} htmlFor="budget-alert-threshold">
                    Alert threshold (%)
                    <input
                      id="budget-alert-threshold"
                      className={patterns.input}
                      type="number"
                      min="50"
                      max="150"
                      value={formState.alertThresholdPercent}
                      onChange={handleAlertThresholdChange}
                    />
                  </label>
                  <label className={patterns.formLabel} htmlFor="budget-start">
                    Start date
                    <input
                      id="budget-start"
                      className={patterns.input}
                      type="date"
                      value={formState.startDate}
                      onChange={handleStartDateChange}
                    />
                  </label>
                  <label className={patterns.formLabel} htmlFor="budget-end">
                    End date
                    <input
                      id="budget-end"
                      className={patterns.input}
                      type="date"
                      value={formState.endDate}
                      onChange={handleEndDateChange}
                    />
                  </label>
                </div>
                <div className={styles.checkboxRow}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formState.rolloverEnabled}
                      onChange={handleRolloverEnabledChange}
                    />
                    Enable rollover to next period
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={formState.alertsEnabled}
                      onChange={handleAlertsEnabledChange}
                    />
                    Send variance alerts
                  </label>
                </div>
                <label className={patterns.formLabel} htmlFor="budget-rollover">
                  Rollover from last period
                  <input
                    id="budget-rollover"
                    className={patterns.input}
                    inputMode="decimal"
                    value={formState.rolloverFromLastPeriod}
                    onChange={handleRolloverAmountChange}
                    placeholder="120"
                  />
                </label>
                <label className={patterns.formLabel} htmlFor="budget-notes">
                  Notes
                  <textarea
                    id="budget-notes"
                    className={patterns.textarea}
                    rows={3}
                    value={formState.notes}
                    onChange={handleNotesChange}
                    placeholder="Add context for this budget (optional)"
                  />
                </label>
                <div className={styles.modalSection}>
                  <div className={styles.modalSectionHeader}>
                    <strong>Categories</strong>
                    <button type="button" className={controls.button} onClick={handleAddCategory}>
                      Add category
                    </button>
                  </div>
                  <div className={styles.modalSectionList}>
                    {formState.categories.map((category) => {
                      const nameId = `category-name-${category.id}`;
                      const allocatedId = `category-allocated-${category.id}`;
                      const spentId = `category-spent-${category.id}`;
                      const thresholdId = `category-threshold-${category.id}`;

                      return (
                        <div key={category.id} className={styles.categoryFormRow}>
                          <div className={styles.categoryFormGrid}>
                            <label className={patterns.formLabel} htmlFor={nameId}>
                              Category name
                              <input
                                id={nameId}
                                className={patterns.input}
                                value={category.name}
                                onChange={handleCategoryFieldChange(category.id, "name")}
                                placeholder="Groceries"
                              />
                            </label>
                            <label className={patterns.formLabel} htmlFor={allocatedId}>
                              Allocated amount
                              <input
                                id={allocatedId}
                                className={patterns.input}
                                inputMode="decimal"
                                value={category.allocated}
                                onChange={handleCategoryFieldChange(category.id, "allocated")}
                                placeholder="500"
                              />
                            </label>
                            <label className={patterns.formLabel} htmlFor={spentId}>
                              Spent to date
                              <input
                                id={spentId}
                                className={patterns.input}
                                inputMode="decimal"
                                value={category.spent}
                                onChange={handleCategoryFieldChange(category.id, "spent")}
                                placeholder="320"
                              />
                            </label>
                            <label className={patterns.formLabel} htmlFor={thresholdId}>
                              Alert threshold (%)
                              <input
                                id={thresholdId}
                                className={patterns.input}
                                type="number"
                                min="50"
                                max="150"
                                value={category.alertThresholdPercent}
                                onChange={handleCategoryFieldChange(category.id, "alertThresholdPercent")}
                              />
                            </label>
                          </div>
                          <div className={styles.categoryControls}>
                            <button
                              type="button"
                              className={`${controls.button} ${controls.buttonDanger}`}
                              onClick={() => handleRemoveCategory(category.id)}
                              disabled={formState.categories.length === 1}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className={styles.modalActions}>
                  <button type="button" className={controls.button} onClick={closeModal} disabled={isSaving}>
                    Cancel
                  </button>
                  <button type="submit" className={`${controls.button} ${controls.buttonPrimary}`} disabled={isSaving} aria-busy={isSaving}>
                    {dialogState.mode === "edit" ? "Save changes" : "Create budget"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </section>
    </InteractionErrorBoundary>
  );
}

