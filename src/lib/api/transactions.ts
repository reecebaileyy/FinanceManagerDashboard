export type TransactionStatus = "pending" | "cleared" | "disputed";
export type TransactionSource = "plaid" | "import" | "manual";
export type TransactionDirection = "debit" | "credit";

export interface Transaction {
  id: string;
  postedAt: string;
  merchantName: string;
  description: string;
  category: string;
  accountName: string;
  amount: number;
  direction: TransactionDirection;
  status: TransactionStatus;
  source: TransactionSource;
  tags: string[];
  notes?: string | null;
}

export type ImportJobStatus = "Completed" | "Processing" | "Queued";

export interface ImportJob {
  id: string;
  fileName: string;
  accountName: string;
  status: ImportJobStatus;
  queuedAt: string;
  records: number;
}

export interface TransactionsWorkspacePayload {
  transactions: Transaction[];
  importJobs: ImportJob[];
  accounts: string[];
  categories: string[];
  lastSyncedAt: string;
}

export interface BulkUpdateTransactionTagsInput {
  transactionIds: string[];
  addTags: string[];
  removeTags: string[];
  replaceTags: boolean;
  category?: string;
}

export interface BulkUpdateTransactionTagsResult {
  updatedTransactionIds: string[];
  updatedAt: string;
}

const initialTransactions: Transaction[] = [
  {
    id: "txn-blue-bottle",
    postedAt: "2025-09-12T15:12:00Z",
    merchantName: "Blue Bottle Coffee",
    description: "BLUE BOTTLE #123",
    category: "Dining",
    accountName: "Chase Sapphire Preferred",
    amount: 7.85,
    direction: "debit",
    status: "cleared",
    source: "plaid",
    tags: ["coffee", "treat"],
  },
  {
    id: "txn-whole-foods",
    postedAt: "2025-09-11T18:32:00Z",
    merchantName: "Whole Foods Market",
    description: "WHOLEFOODS #1043",
    category: "Groceries",
    accountName: "Everyday Checking",
    amount: 82.45,
    direction: "debit",
    status: "cleared",
    source: "plaid",
    tags: ["household"],
  },
  {
    id: "txn-lyft",
    postedAt: "2025-09-10T22:02:00Z",
    merchantName: "Lyft",
    description: "LYFT *RIDE 0909",
    category: "Transportation",
    accountName: "Freedom Unlimited",
    amount: 18.2,
    direction: "debit",
    status: "pending",
    source: "plaid",
    tags: ["rideshare"],
  },
  {
    id: "txn-rent",
    postedAt: "2025-09-01T14:12:00Z",
    merchantName: "Lakeside Apartments",
    description: "September rent",
    category: "Housing",
    accountName: "Everyday Checking",
    amount: 1850,
    direction: "debit",
    status: "cleared",
    source: "manual",
    tags: ["rent", "recurring"],
  },
  {
    id: "txn-paycheck",
    postedAt: "2025-09-05T12:00:00Z",
    merchantName: "Acme Corp Payroll",
    description: "September salary",
    category: "Salary",
    accountName: "Everyday Checking",
    amount: 4200,
    direction: "credit",
    status: "cleared",
    source: "import",
    tags: ["income"],
  },
  {
    id: "txn-spotify",
    postedAt: "2025-09-07T08:10:00Z",
    merchantName: "Spotify",
    description: "Subscription renewal",
    category: "Subscriptions",
    accountName: "Freedom Unlimited",
    amount: 16.99,
    direction: "debit",
    status: "cleared",
    source: "plaid",
    tags: ["music", "recurring"],
  },
  {
    id: "txn-gym",
    postedAt: "2025-09-03T07:05:00Z",
    merchantName: "City Gym",
    description: "Fitness membership",
    category: "Health & Fitness",
    accountName: "Everyday Checking",
    amount: 49,
    direction: "debit",
    status: "pending",
    source: "manual",
    tags: ["fitness"],
  },
  {
    id: "txn-airbnb",
    postedAt: "2025-08-28T09:45:00Z",
    merchantName: "Airbnb",
    description: "Weekend getaway",
    category: "Travel",
    accountName: "Freedom Unlimited",
    amount: 232.89,
    direction: "debit",
    status: "disputed",
    source: "import",
    tags: ["travel"],
  },
  {
    id: "txn-nursery",
    postedAt: "2025-09-09T16:14:00Z",
    merchantName: "Green Thumb Nursery",
    description: "Garden refresh",
    category: "Home",
    accountName: "Freedom Unlimited",
    amount: 64.5,
    direction: "debit",
    status: "cleared",
    source: "manual",
    tags: [],
  },
  {
    id: "txn-savings-transfer",
    postedAt: "2025-09-04T10:30:00Z",
    merchantName: "SoFi Savings",
    description: "Automated transfer",
    category: "Savings",
    accountName: "High-Yield Savings",
    amount: 400,
    direction: "credit",
    status: "cleared",
    source: "plaid",
    tags: ["savings", "automation"],
  },
];

const initialImportJobs: ImportJob[] = [
  {
    id: "job-003",
    fileName: "travel-card.csv",
    accountName: "Freedom Unlimited",
    status: "Queued",
    queuedAt: "2025-09-13T07:15:00Z",
    records: 150,
  },
  {
    id: "job-002",
    fileName: "sapphire-september.csv",
    accountName: "Chase Sapphire Preferred",
    status: "Processing",
    queuedAt: "2025-09-12T11:20:00Z",
    records: 94,
  },
  {
    id: "job-001",
    fileName: "checking-august.csv",
    accountName: "Everyday Checking",
    status: "Completed",
    queuedAt: "2025-09-02T08:30:00Z",
    records: 214,
  },
];

const baseWorkspace = {
  transactions: initialTransactions,
  importJobs: initialImportJobs,
  lastSyncedAt: "2025-09-13T10:15:00Z",
} as const;

function cloneTransactions(source: Transaction[]): Transaction[] {
  return source.map((transaction) => ({
    ...transaction,
    tags: [...transaction.tags],
  }));
}

function cloneImportJobs(source: ImportJob[]): ImportJob[] {
  return source.map((job) => ({ ...job }));
}

function computeUniqueValues(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

function buildWorkspace(): TransactionsWorkspacePayload {
  const transactions = cloneTransactions(baseWorkspace.transactions);
  const importJobs = cloneImportJobs(baseWorkspace.importJobs);
  const accounts = computeUniqueValues(transactions.map((transaction) => transaction.accountName));
  const categories = computeUniqueValues(transactions.map((transaction) => transaction.category));

  return {
    transactions,
    importJobs,
    accounts,
    categories,
    lastSyncedAt: baseWorkspace.lastSyncedAt,
  };
}

export const transactionsQueryKeys = {
  all: () => ["transactions"] as const,
  workspace: () => [...transactionsQueryKeys.all(), "workspace"] as const,
};

export function getTransactionsFixture(): TransactionsWorkspacePayload {
  return buildWorkspace();
}

// Persistence layer (API + localStorage hybrid)
import { transactionsStorage } from './transactions-storage';

export async function fetchTransactionsWorkspace(): Promise<TransactionsWorkspacePayload> {
  try {
    const stored = await transactionsStorage.getTransactionsWorkspace();
    if (stored) {
      return stored;
    }
  } catch (error) {
    console.warn('Failed to load stored transactions, using fixture:', error);
  }
  return getTransactionsFixture();
}

export async function saveTransactionsWorkspace(workspace: TransactionsWorkspacePayload): Promise<void> {
  await transactionsStorage.saveTransactionsWorkspace(workspace);
}

export async function saveTransactions(
  transactions: Transaction[],
  importJobs: ImportJob[],
): Promise<void> {
  const accounts = computeUniqueValues(transactions.map((t) => t.accountName));
  const categories = computeUniqueValues(transactions.map((t) => t.category));
  const workspace: TransactionsWorkspacePayload = {
    transactions: cloneTransactions(transactions),
    importJobs: cloneImportJobs(importJobs),
    accounts,
    categories,
    lastSyncedAt: new Date().toISOString(),
  };
  await saveTransactionsWorkspace(workspace);
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function bulkUpdateTransactionTags(
  input: BulkUpdateTransactionTagsInput,
): Promise<BulkUpdateTransactionTagsResult> {
  await delay(350 + Math.random() * 200);

  return {
    updatedTransactionIds: [...input.transactionIds],
    updatedAt: new Date().toISOString(),
  };
}
