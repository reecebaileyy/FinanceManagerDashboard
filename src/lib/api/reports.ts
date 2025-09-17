export type ReportType = "transactions" | "budgets" | "cashflow" | "tax_summary";
export type ReportFormat = "csv" | "pdf" | "xlsx";
export type ReportStatus = "queued" | "processing" | "ready" | "expired" | "failed";
export type ReportDeliveryMode = "download" | "email";

export interface ReportFilters {
  from?: string;
  to?: string;
  accountIds?: string[];
  categoryIds?: string[];
  goalIds?: string[];
}

export interface ReportDelivery {
  mode: ReportDeliveryMode;
  email?: string;
}

export interface ReportShareLink {
  id: string;
  jobId: string;
  shareLink: string;
  createdAt: string;
  expiresAt: string;
  allowDownload: boolean;
  passwordProtected: boolean;
}

export interface ReportJob {
  jobId: string;
  title: string;
  description: string;
  type: ReportType;
  format: ReportFormat;
  status: ReportStatus;
  requestedAt: string;
  completedAt?: string;
  expiresAt?: string;
  downloadUrl?: string;
  sizeBytes?: number;
  estimatedCompletionSeconds?: number;
  filters: ReportFilters;
  delivery: ReportDelivery;
  shareLinks: ReportShareLink[];
  lastSharedAt?: string;
}

export interface CreateReportInput {
  type: ReportType;
  format: ReportFormat;
  filters?: ReportFilters;
  delivery: ReportDelivery;
}

export interface CreateReportResult {
  job: ReportJob;
  message: string;
}

export interface CreateReportShareInput {
  jobId: string;
  expiresInMinutes: number;
  allowDownload: boolean;
  password?: string | null;
}

export interface CreateReportShareResult {
  share: ReportShareLink;
}

interface ReportFixtureState {
  jobs: ReportJob[];
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function createReportJobId() {
  return `rep-${Math.random().toString(36).slice(2, 10)}`;
}

function createShareId() {
  return `shr-${Math.random().toString(36).slice(2, 10)}`;
}

const typeLabel: Record<ReportType, string> = {
  transactions: "Transactions",
  budgets: "Budgets",
  cashflow: "Cash flow",
  tax_summary: "Tax summary",
};

const formatLabel: Record<ReportFormat, string> = {
  csv: "CSV",
  pdf: "PDF",
  xlsx: "Excel",
};

function formatDateRange(from?: string, to?: string) {
  if (!from && !to) {
    return undefined;
  }

  const formatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (from && to) {
    return `${formatter.format(new Date(`${from}T00:00:00Z`))} - ${formatter.format(new Date(`${to}T00:00:00Z`))}`;
  }

  const single = from ?? to;

  if (!single) {
    return undefined;
  }

  return formatter.format(new Date(`${single}T00:00:00Z`));
}

function buildJobTitle(type: ReportType, filters: ReportFilters) {
  const range = formatDateRange(filters.from, filters.to);
  if (range) {
    return `${typeLabel[type]} - ${range}`;
  }
  return `${typeLabel[type]} export`;
}

function buildJobDescription(type: ReportType, filters: ReportFilters, delivery: ReportDelivery) {
  const parts: string[] = [];
  const range = formatDateRange(filters.from, filters.to);
  if (range) {
    parts.push(`Range: ${range}`);
  }
  if (filters.accountIds && filters.accountIds.length) {
    parts.push(`Accounts: ${filters.accountIds.length}`);
  }
  if (filters.categoryIds && filters.categoryIds.length) {
    parts.push(`Categories: ${filters.categoryIds.join(", ")}`);
  }
  if (filters.goalIds && filters.goalIds.length) {
    parts.push(`Goals: ${filters.goalIds.length}`);
  }
  if (delivery.mode === "email" && delivery.email) {
    parts.push(`Delivery: Email to ${delivery.email}`);
  } else if (delivery.mode === "download") {
    parts.push("Delivery: Download");
  }

  if (!parts.length) {
    return `${typeLabel[type]} export queued.`;
  }

  return parts.join(" | ");
}

function cloneShareLink(link: ReportShareLink): ReportShareLink {
  return { ...link };
}

function cloneJob(job: ReportJob): ReportJob {
  return {
    ...job,
    filters: { ...job.filters },
    delivery: { ...job.delivery },
    shareLinks: job.shareLinks.map(cloneShareLink),
  };
}

function cloneJobs(jobs: ReportJob[]): ReportJob[] {
  return jobs.map(cloneJob);
}

const transactionsFilters: ReportFilters = {
  from: "2025-08-01",
  to: "2025-08-31",
  categoryIds: ["dining", "subscriptions"],
};

const transactionsDelivery: ReportDelivery = {
  mode: "download",
};

const budgetsFilters: ReportFilters = {
  from: "2025-09-01",
  to: "2025-09-15",
};

const budgetsDelivery: ReportDelivery = {
  mode: "email",
  email: "jordan@example.com",
};

const cashflowFilters: ReportFilters = {
  from: "2025-07-01",
  to: "2025-09-30",
};

const cashflowDelivery: ReportDelivery = {
  mode: "download",
};

const reportFixtureState: ReportFixtureState = {
  jobs: [
    {
      jobId: "rep-2025-08-transactions",
      title: buildJobTitle("transactions", transactionsFilters),
      description: buildJobDescription("transactions", transactionsFilters, transactionsDelivery),
      type: "transactions",
      format: "csv",
      status: "ready",
      requestedAt: new Date("2025-09-14T15:10:00Z").toISOString(),
      completedAt: new Date("2025-09-14T15:12:45Z").toISOString(),
      expiresAt: new Date("2025-09-21T15:12:45Z").toISOString(),
      downloadUrl: "https://s3.amazonaws.com/financemanager/reports/rep-2025-08-transactions.csv?token=ready",
      sizeBytes: 582312,
      estimatedCompletionSeconds: 60,
      filters: { ...transactionsFilters },
      delivery: { ...transactionsDelivery },
      shareLinks: [
        {
          id: "share-august-transactions",
          jobId: "rep-2025-08-transactions",
          shareLink: "https://reports.financemanager.com/share/shr-aug-transactions",
          createdAt: new Date("2025-09-14T15:13:30Z").toISOString(),
          expiresAt: new Date("2025-09-21T15:13:30Z").toISOString(),
          allowDownload: true,
          passwordProtected: false,
        },
      ],
      lastSharedAt: new Date("2025-09-14T15:13:30Z").toISOString(),
    },
    {
      jobId: "rep-2025-09-budgets",
      title: buildJobTitle("budgets", budgetsFilters),
      description: buildJobDescription("budgets", budgetsFilters, budgetsDelivery),
      type: "budgets",
      format: "pdf",
      status: "processing",
      requestedAt: new Date("2025-09-16T18:40:00Z").toISOString(),
      estimatedCompletionSeconds: 180,
      filters: { ...budgetsFilters },
      delivery: { ...budgetsDelivery },
      shareLinks: [],
    },
    {
      jobId: "rep-2025-q3-cashflow",
      title: buildJobTitle("cashflow", cashflowFilters),
      description: buildJobDescription("cashflow", cashflowFilters, cashflowDelivery),
      type: "cashflow",
      format: "xlsx",
      status: "queued",
      requestedAt: new Date("2025-09-17T04:55:00Z").toISOString(),
      estimatedCompletionSeconds: 320,
      filters: { ...cashflowFilters },
      delivery: { ...cashflowDelivery },
      shareLinks: [],
    },
  ],
};

export const reportsQueryKeys = {
  all: () => ["reports"] as const,
  list: () => ["reports", "list"] as const,
  job: (jobId: string) => ["reports", "job", jobId] as const,
  shares: (jobId: string) => ["reports", "shares", jobId] as const,
};

export async function fetchReportJobs(): Promise<ReportJob[]> {
  await delay(160);
  const cloned = cloneJobs(reportFixtureState.jobs);
  return cloned.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
}

export async function requestReportGeneration(input: CreateReportInput): Promise<CreateReportResult> {
  await delay(180);

  const filters: ReportFilters = { ...(input.filters ?? {}) };
  const delivery: ReportDelivery = { ...input.delivery };

  if (delivery.mode === "email" && !delivery.email) {
    throw new Error("Email address required when delivery mode is email.");
  }

  const jobId = createReportJobId();
  const requestedAt = new Date().toISOString();

  const job: ReportJob = {
    jobId,
    title: buildJobTitle(input.type, filters),
    description: buildJobDescription(input.type, filters, delivery),
    type: input.type,
    format: input.format,
    status: "queued",
    requestedAt,
    estimatedCompletionSeconds: 180,
    filters,
    delivery,
    shareLinks: [],
  };

  reportFixtureState.jobs = [job, ...reportFixtureState.jobs];

  return {
    job: cloneJob(job),
    message: `${typeLabel[input.type]} report in ${formatLabel[input.format]} format queued successfully.`,
  };
}

export async function createReportShareLink(input: CreateReportShareInput): Promise<CreateReportShareResult> {
  await delay(140);

  const job = reportFixtureState.jobs.find((item) => item.jobId === input.jobId);

  if (!job) {
    throw new Error("Report job not found.");
  }

  if (job.status !== "ready") {
    throw new Error("Only completed reports can be shared.");
  }

  const now = new Date();
  const createdAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + input.expiresInMinutes * 60 * 1000).toISOString();
  const shareId = createShareId();

  const link: ReportShareLink = {
    id: shareId,
    jobId: job.jobId,
    shareLink: `https://reports.financemanager.com/share/${shareId}`,
    createdAt,
    expiresAt,
    allowDownload: input.allowDownload,
    passwordProtected: Boolean(input.password && input.password.trim().length > 0),
  };

  job.shareLinks = [link, ...job.shareLinks];
  job.lastSharedAt = createdAt;

  return {
    share: cloneShareLink(link),
  };
}

const initialReportJobsSnapshot = cloneJobs(reportFixtureState.jobs);

export function __resetReportsFixture() {
  reportFixtureState.jobs = cloneJobs(initialReportJobsSnapshot);
}

