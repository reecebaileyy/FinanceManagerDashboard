export type DeltaVariant = "up" | "down";
export type GoalStatus = "ahead" | "onTrack" | "behind";
export type AlertTone = "info" | "success" | "warn" | "danger";

export interface DashboardKpi {
  label: string;
  value: string;
  delta: string;
  variant: DeltaVariant;
}

export interface DashboardMonthlySummary {
  month: string;
  budgeted: string;
  spent: string;
  remaining: string;
  variance: {
    label: string;
    tone: "positive" | "negative";
  };
}

export interface DashboardCategorySpending {
  label: string;
  value: string;
  percent: string;
  tone?: "warn" | "danger";
}

export interface DashboardGoal {
  name: string;
  target: string;
  progress: number;
  status: GoalStatus;
}

export interface DashboardAlert {
  title: string;
  description: string;
  tone: AlertTone;
}

export interface DashboardQuickAction {
  label: string;
  description: string;
  cta: string;
  primary?: boolean;
}

export interface DashboardRecentTransaction {
  date: string;
  payee: string;
  category: string;
  type: "income" | "expense" | "transfer";
  amount: string;
}

export interface DashboardOverviewPayload {
  kpis: DashboardKpi[];
  monthlySummary: DashboardMonthlySummary;
  categorySpending: DashboardCategorySpending[];
  goals: DashboardGoal[];
  alerts: DashboardAlert[];
  quickActions: DashboardQuickAction[];
  recentTransactions: DashboardRecentTransaction[];
}

const dashboardOverviewFixture: DashboardOverviewPayload = {
  kpis: [
    { label: "Net worth", value: "$128,450", delta: "+8.4% vs last quarter", variant: "up" },
    { label: "Monthly cash flow", value: "+$2,070", delta: "+$340 vs plan", variant: "up" },
    { label: "Savings rate", value: "18.2%", delta: "+2.1 pts vs goal", variant: "up" },
    { label: "Budget adherence", value: "92%", delta: "-4% vs target", variant: "down" },
  ],
  monthlySummary: {
    month: "September 2024",
    budgeted: "$3,200",
    spent: "$2,680",
    remaining: "$520",
    variance: { label: "Under plan", tone: "positive" },
  },
  categorySpending: [
    { label: "Housing", value: "$1,600", percent: "68%" },
    { label: "Dining", value: "$420", percent: "84%", tone: "warn" },
    { label: "Transportation", value: "$180", percent: "42%" },
    { label: "Subscriptions", value: "$140", percent: "55%" },
  ],
  goals: [
    { name: "Emergency fund", target: "$12,000 goal", progress: 0.72, status: "ahead" },
    { name: "Home down payment", target: "$40,000 goal", progress: 0.48, status: "onTrack" },
    { name: "Vacation fund", target: "$5,000 goal", progress: 0.33, status: "behind" },
  ],
  alerts: [
    {
      title: "Auto-pay scheduled",
      description: "Car insurance renews Sep 12 for $142.00",
      tone: "info",
    },
    {
      title: "Dining budget at 84%",
      description: "Reduce discretionary spend by $120 to stay on track",
      tone: "warn",
    },
    {
      title: "Savings opportunity",
      description: "Move $400 to emergency fund to reach October milestone",
      tone: "success",
    },
  ],
  quickActions: [
    {
      label: "Link new institution",
      description: "Bring in the remaining credit card accounts to unify tracking.",
      cta: "Connect account",
      primary: true,
    },
    {
      label: "Review budget variances",
      description: "Adjust categories that are trending high before month end.",
      cta: "Open budgets",
    },
    {
      label: "Schedule savings transfer",
      description: "Automate a recurring transfer into the home down payment goal.",
      cta: "Plan transfer",
    },
  ],
  recentTransactions: [
    { date: "09/08", payee: "Trader Joe's", category: "Groceries", type: "expense", amount: "-$64.28" },
    { date: "09/07", payee: "Lyft", category: "Transport", type: "expense", amount: "-$13.90" },
    { date: "09/06", payee: "SoFi Savings", category: "Transfer", type: "expense", amount: "-$400.00" },
    { date: "09/05", payee: "Paycheck", category: "Salary", type: "income", amount: "+$2,100.00" },
  ],
};

export const dashboardQueryKeys = {
  all: () => ["dashboard"] as const,
  overview: () => [...dashboardQueryKeys.all(), "overview"] as const,
};

export async function fetchDashboardOverview(): Promise<DashboardOverviewPayload> {
  return Promise.resolve(dashboardOverviewFixture);
}
