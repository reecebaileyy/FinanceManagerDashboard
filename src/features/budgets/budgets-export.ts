import { type Budget, type BudgetCategory } from '@lib/api/budgets';

export interface BuildBudgetCsvOptions {
  referenceDate?: string | Date;
  locale?: string;
}

export interface BudgetCsvExport {
  fileName: string;
  csv: string;
}

const DEFAULT_LOCALE = 'en-US';
const CSV_LINE_BREAK = '\r\n';
const CSV_HEADERS = [
  'Budget Name',
  'Budget Period',
  'Start Date',
  'End Date',
  'Category',
  'Allocated',
  'Spent',
  'Variance',
  'Variance %',
  'Alert Threshold',
  'Rollover Applied',
  'Notes',
  'Last Updated',
];

const PERIOD_LABEL: Record<Budget['period'], string> = {
  monthly: 'Monthly',
  weekly: 'Weekly',
  custom: 'Custom',
};

function normaliseDate(input: string | Date | undefined): Date {
  if (!input) {
    return new Date();
  }

  if (input instanceof Date) {
    return input;
  }

  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

function formatIsoDate(dateIso: string): string {
  const parsed = new Date(dateIso);
  if (Number.isNaN(parsed.getTime())) {
    return dateIso;
  }
  return parsed.toISOString().slice(0, 10);
}

function formatCurrency(value: number, locale: string): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(value);
}

function formatPercent(value: number, locale: string): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
  return formatter.format(value);
}

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const stringValue = String(value);
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
}

function buildRow(
  budget: Budget,
  category: BudgetCategory,
  locale: string,
  includeRollover: boolean,
): string {
  const variance = category.spent - category.allocated;
  const variancePercent = category.allocated === 0 ? 0 : variance / category.allocated;

  return [
    escapeCsv(budget.name),
    escapeCsv(PERIOD_LABEL[budget.period]),
    escapeCsv(formatIsoDate(budget.startDate)),
    escapeCsv(formatIsoDate(budget.endDate)),
    escapeCsv(category.name),
    escapeCsv(formatCurrency(category.allocated, locale)),
    escapeCsv(formatCurrency(category.spent, locale)),
    escapeCsv(formatCurrency(variance, locale)),
    escapeCsv(formatPercent(variancePercent, locale)),
    escapeCsv(`${category.alertThresholdPercent}%`),
    includeRollover ? escapeCsv(formatCurrency(budget.rolloverFromLastPeriod, locale)) : '""',
    escapeCsv(budget.notes ?? ''),
    escapeCsv(budget.lastUpdated),
  ].join(',');
}

function buildRows(budgets: Budget[], locale: string): string[] {
  const rows: string[] = [];

  budgets.forEach((budget) => {
    budget.categories.forEach((category, index) => {
      const includeRollover =
        index === 0 && budget.rolloverEnabled && budget.rolloverFromLastPeriod !== 0;
      rows.push(buildRow(budget, category, locale, includeRollover));
    });
  });

  return rows;
}

function buildFileName(reference: Date, budgetsCount: number): string {
  const iso = reference.toISOString();
  const datePart = iso.slice(0, 10).replace(/-/g, '');
  const timePart = iso.slice(11, 16).replace(':', '');
  return `budget-export-${datePart}-${timePart}-${budgetsCount}budgets.csv`;
}

export function buildBudgetCsv(
  budgets: Budget[],
  options: BuildBudgetCsvOptions = {},
): BudgetCsvExport {
  const locale = options.locale ?? DEFAULT_LOCALE;
  const reference = normaliseDate(options.referenceDate);
  const headerLine = CSV_HEADERS.join(',');
  const rows = buildRows(budgets, locale);
  const csv = rows.length
    ? `${headerLine}${CSV_LINE_BREAK}${rows.join(CSV_LINE_BREAK)}${CSV_LINE_BREAK}`
    : `${headerLine}${CSV_LINE_BREAK}`;

  return {
    fileName: buildFileName(reference, budgets.length),
    csv,
  };
}

export function downloadBudgetsCsv(
  budgets: Budget[],
  options: BuildBudgetCsvOptions = {},
): BudgetCsvExport {
  const exportData = buildBudgetCsv(budgets, options);

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return exportData;
  }

  const blob = new Blob([exportData.csv], { type: 'text/csv;charset=utf-8;' });

  if (typeof navigator !== 'undefined' && 'msSaveOrOpenBlob' in navigator) {
    // @ts-expect-error - msSaveOrOpenBlob exists in IE/Edge legacy
    navigator.msSaveOrOpenBlob(blob, exportData.fileName);
    return exportData;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = exportData.fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return exportData;
}
