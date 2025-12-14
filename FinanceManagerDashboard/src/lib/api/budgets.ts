export type BudgetPeriod = "monthly" | "weekly" | "custom";
export type BudgetStatus = "healthy" | "warning" | "critical";

export interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  alertThresholdPercent: number;
  trend: number[];
}

export interface Budget {
  id: string;
  name: string;
  period: BudgetPeriod;
  startDate: string;
  endDate: string;
  targetAmount: number;
  alertThresholdPercent: number;
  rolloverEnabled: boolean;
  alertsEnabled: boolean;
  rolloverFromLastPeriod: number;
  notes?: string;
  categories: BudgetCategory[];
  trend: number[];
  lastUpdated: string;
}

export interface BudgetsWorkspacePayload {
  referenceDate: string;
  budgets: Budget[];
}

export interface SaveBudgetInput {
  budget: Budget;
  mode: "create" | "edit";
}

const initialBudgets: Budget[] = [
  {
    id: "budget-household",
    name: "Household Essentials",
    period: "monthly",
    startDate: "2025-09-01",
    endDate: "2025-09-30",
    targetAmount: 1200,
    alertThresholdPercent: 85,
    rolloverEnabled: true,
    alertsEnabled: true,
    rolloverFromLastPeriod: 120.22,
    notes: "Groceries trending higher due to back-to-school restock.",
    categories: [
      {
        id: "cat-groceries",
        name: "Groceries",
        allocated: 650,
        spent: 540.55,
        alertThresholdPercent: 85,
        trend: [150.12, 130.42, 160.93, 99.08],
      },
      {
        id: "cat-utilities",
        name: "Utilities",
        allocated: 320,
        spent: 220.1,
        alertThresholdPercent: 90,
        trend: [80.15, 70.3, 40.12, 29.53],
      },
      {
        id: "cat-household",
        name: "Household supplies",
        allocated: 230,
        spent: 120.25,
        alertThresholdPercent: 80,
        trend: [40.22, 35.44, 25.3, 19.29],
      },
    ],
    trend: [270.49, 236.16, 226.35, 147.9],
    lastUpdated: "2025-09-18T14:10:00.000Z",
  },
  {
    id: "budget-dining",
    name: "Dining & Entertainment",
    period: "monthly",
    startDate: "2025-09-01",
    endDate: "2025-09-30",
    targetAmount: 600,
    alertThresholdPercent: 90,
    rolloverEnabled: false,
    alertsEnabled: true,
    rolloverFromLastPeriod: 45.5,
    notes: "Consider using dining rewards to offset upcoming events.",
    categories: [
      {
        id: "cat-dining",
        name: "Dining out",
        allocated: 400,
        spent: 360.5,
        alertThresholdPercent: 90,
        trend: [90.25, 120.31, 110.84, 39.1],
      },
      {
        id: "cat-streaming",
        name: "Streaming & events",
        allocated: 200,
        spent: 130.75,
        alertThresholdPercent: 80,
        trend: [40.12, 60.21, 20.18, 10.24],
      },
    ],
    trend: [130.37, 180.52, 131.02, 49.34],
    lastUpdated: "2025-09-17T18:22:00.000Z",
  },
  {
    id: "budget-transport",
    name: "Transportation",
    period: "monthly",
    startDate: "2025-09-01",
    endDate: "2025-09-30",
    targetAmount: 450,
    alertThresholdPercent: 80,
    rolloverEnabled: true,
    alertsEnabled: true,
    rolloverFromLastPeriod: 60,
    notes: "Gas prices stabilized after early month spike.",
    categories: [
      {
        id: "cat-fuel",
        name: "Fuel",
        allocated: 250,
        spent: 210.55,
        alertThresholdPercent: 85,
        trend: [60.12, 70.2, 50.11, 30.12],
      },
      {
        id: "cat-rideshare",
        name: "Rideshare",
        allocated: 120,
        spent: 55,
        alertThresholdPercent: 70,
        trend: [10.3, 15.4, 19.6, 9.7],
      },
      {
        id: "cat-maintenance",
        name: "Maintenance",
        allocated: 80,
        spent: 40.2,
        alertThresholdPercent: 60,
        trend: [15.05, 10.05, 5.05, 10.05],
      },
    ],
    trend: [85.47, 95.65, 74.76, 49.87],
    lastUpdated: "2025-09-16T09:05:00.000Z",
  },
];
const referenceDateIso = "2025-09-15T12:00:00Z";

function cloneBudgets(source: Budget[]): Budget[] {
  return source.map((budget) => ({
    ...budget,
    categories: budget.categories.map((category) => ({ ...category, trend: [...category.trend] })),
    trend: [...budget.trend],
  }));
}

const baseBudgets = cloneBudgets(initialBudgets);

export function getBudgetsFixture(): BudgetsWorkspacePayload {
  return {
    referenceDate: referenceDateIso,
    budgets: cloneBudgets(baseBudgets),
  };
}

const PERSIST_KEY = "fm.budgets.v1";

function loadPersistedBudgets(): Budget[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Budget[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_e) {
    return [];
  }
}

function saveBudgetsToStorage(budgets: Budget[]) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(PERSIST_KEY, JSON.stringify(budgets));
  } catch (_e) {
    // ignore
  }
}

function mergeWithBaseBudgets(): Budget[] {
  const persisted = loadPersistedBudgets();
  const merged = [...persisted, ...baseBudgets];
  return cloneBudgets(merged);
}

export async function fetchBudgetsWorkspace(): Promise<BudgetsWorkspacePayload> {
  return getBudgetsFixture();
}

export async function saveBudget(input: SaveBudgetInput): Promise<Budget> {
  const saved: Budget = { ...input.budget, lastUpdated: new Date().toISOString() };

  try {
    const persisted = loadPersistedBudgets();

    if (input.mode === "create") {
      const next = [saved, ...persisted].slice(0, 200);
      saveBudgetsToStorage(next);
    } else {
      const next = persisted.map((b) => (b.id === saved.id ? saved : b));
      saveBudgetsToStorage(next);
    }
  } catch (_e) {
    // ignore persistence errors
  }

  return Promise.resolve(saved);
}

// Update getBudgetsFixture to include persisted budgets (client-only safe since callers are client components)
export function getBudgetsFixtureWithPersistence(): BudgetsWorkspacePayload {
  return {
    referenceDate: referenceDateIso,
    budgets: mergeWithBaseBudgets(),
  };
}
