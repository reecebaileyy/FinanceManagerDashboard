"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";

import { Card, CardBody, CardHeader } from "@components/dashboard/card";
import { InteractionErrorBoundary } from "@components/error-boundary";
import { useLocalization } from "@features/i18n";
import { useDialogFocusTrap } from "@lib/a11y/use-dialog-focus-trap";
import {
  bulkUpdateTransactionTags,
  getTransactionsFixture,
  fetchTransactionsWorkspace,
  saveTransactions,
  type BulkUpdateTransactionTagsInput,
  type BulkUpdateTransactionTagsResult,
  type ImportJob,
  type Transaction,
  type TransactionDirection,
  type TransactionSource,
  type TransactionStatus,
} from "@lib/api/transactions";

import styles from "./transactions-section.module.css";
import controls from "../../styles/controls.module.css";
import patterns from "../../styles/patterns.module.css";



type Filters = {
  search: string;
  status: TransactionStatus | "all";
  direction: TransactionDirection | "all";
  source: TransactionSource | "all";
  category: string | "all";
  account: string | "all";
  minAmount: string;
  maxAmount: string;
  from: string;
  to: string;
};

type SortField = "postedAt" | "merchantName" | "category" | "amount" | "status";
type SortDirection = "asc" | "desc";
type SortState = { field: SortField; direction: SortDirection };



const statusRank: Record<TransactionStatus, number> = {
  cleared: 3,
  pending: 2,
  disputed: 1,
};

const statusClassName: Record<TransactionStatus, string> = {
  cleared: styles.statusCleared,
  pending: styles.statusPending,
  disputed: styles.statusDisputed,
};

const defaultFilters: Filters = {
  search: "",
  status: "all",
  direction: "all",
  source: "all",
  category: "all",
  account: "all",
  minAmount: "",
  maxAmount: "",
  from: "",
  to: "",
};

const defaultImportForm = {
  accountId: "",
  fileName: "",
  hasHeaderRow: true,
  dateColumn: "Transaction Date",
  descriptionColumn: "Description",
  amountColumn: "Amount",
  directionColumn: "Type",
};

const columnPresets = {
  date: ["Transaction Date", "Posted", "Date", "Timestamp"],
  description: ["Description", "Details", "Memo", "Narrative"],
  amount: ["Amount", "Amount (USD)", "Debit", "Credit"],
  direction: ["Type", "Credit/Debit", "Dr/Cr", "Direction"],
};

const parseTags = (value: string): string[] =>
  value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

const createId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `id-${Math.random().toString(36).slice(2, 10)}`;
};

const getSignedAmount = (transaction: Transaction) =>
  transaction.direction === "debit" ? -transaction.amount : transaction.amount;

export function TransactionsSection() {
  const { formatCurrency, formatDate } = useLocalization();
  const initialWorkspace = useMemo(() => getTransactionsFixture(), []);
  const [transactions, setTransactions] = useState<Transaction[]>(initialWorkspace.transactions);
  const [filters, setFilters] = useState<Filters>({ ...defaultFilters });
  const [sort, setSort] = useState<SortState>({ field: "postedAt", direction: "desc" });
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<string | null>(null);

  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkForm, setBulkForm] = useState({
    addTags: "",
    removeTags: "",
    category: "",
    replaceTags: false,
  });

  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importForm, setImportForm] = useState({ ...defaultImportForm });
  const [importJobs, setImportJobs] = useState<ImportJob[]>(initialWorkspace.importJobs);

  const transactionsRef = useRef(transactions);
  const bulkUpdateMutation = useMutation<
    BulkUpdateTransactionTagsResult, 
    Error, 
    BulkUpdateTransactionTagsInput,
    { previousTransactions: Transaction[] }
  >({
    mutationFn: bulkUpdateTransactionTags,
    onMutate: (variables) => {
      setBulkError(null);
      setFeedback(null);

      const previousTransactions = transactionsRef.current;
      const selectedIds = new Set(variables.transactionIds);
      const nextTransactions = previousTransactions.map((transaction) => {
        if (!selectedIds.has(transaction.id)) {
          return transaction;
        }

        const tagSet = variables.replaceTags ? new Set<string>() : new Set(transaction.tags);
        variables.addTags.forEach((tag) => tagSet.add(tag));
        variables.removeTags.forEach((tag) => tagSet.delete(tag));

        return {
          ...transaction,
          category: variables.category ?? transaction.category,
          tags: Array.from(tagSet),
        };
      });

      setTransactions(nextTransactions);

      return { previousTransactions };
    },
    onError: (error, _variables, context) => {
      if (context?.previousTransactions) {
        setTransactions(context.previousTransactions);
      }
      const message =
        error instanceof Error
          ? error.message
          : "We couldn't save your changes. Try again.";
      setBulkError(message);
      setFeedback("We couldn't update your transactions. Please try again.");
    },
    onSuccess: (_result, variables) => {
      const count = variables.transactionIds.length;
      const summary = 'Updated ' + count + ' transaction' + (count === 1 ? '' : 's') + ' successfully.';
      setFeedback(summary);
      setBulkError(null);
      setBulkModalOpen(false);
      setBulkForm({ addTags: '', removeTags: '', category: '', replaceTags: false });
      setSelection(new Set());
      // Persist updated transactions
      void saveTransactions(transactionsRef.current, importJobs).catch((err) => {
        console.warn('Failed to persist bulk update:', err);
      });
    },
  });

  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  // Load any persisted workspace (API/localStorage) after mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const persisted = await fetchTransactionsWorkspace();
        if (!mounted) return;
        setTransactions(persisted.transactions);
        setImportJobs(persisted.importJobs);
      } catch (error) {
        console.warn('Failed to load persisted transactions, using fixture:', error);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const closeBulkModal = () => {
    setBulkModalOpen(false);
    setBulkError(null);
    bulkUpdateMutation.reset();
  };

  const bulkDialogRef = useRef<HTMLDivElement>(null);
  const importDialogRef = useRef<HTMLDivElement>(null);

  useDialogFocusTrap(bulkDialogRef as React.RefObject<HTMLElement>, {
    active: bulkModalOpen,
    onEscape: () => setBulkModalOpen(false),
  });


  const handleReset = () => {
    const fresh = getTransactionsFixture();
    setTransactions(fresh.transactions);
    setFilters({ ...defaultFilters });
    setSort({ field: "postedAt", direction: "desc" });
    setSelection(new Set());
    setFeedback(null);
    setBulkModalOpen(false);
    setBulkError(null);
    setBulkForm({ addTags: "", removeTags: "", category: "", replaceTags: false });
    setImportModalOpen(false);
    setImportError(null);
    setImportForm({ ...defaultImportForm });
    setImportJobs(fresh.importJobs);
    bulkUpdateMutation.reset();
    transactionsRef.current = fresh.transactions;
  };

  useDialogFocusTrap(importDialogRef as React.RefObject<HTMLElement>, {
    active: importModalOpen,
    onEscape: () => {
      setImportModalOpen(false);
      setImportError(null);
    },
  });

  const formatAmount = (value: number) => formatCurrency(Math.abs(value));
  const formatTableDate = (value: string | Date) =>
    formatDate(value, { month: "2-digit", day: "2-digit" });
  const formatSummaryDate = (value: string | Date) =>
    formatDate(value, { month: "short", day: "numeric" });

  const selectAllRef = useRef<HTMLInputElement>(null);

  const filterableAccounts = useMemo(
    () => Array.from(new Set(transactions.map((transaction) => transaction.accountName))).sort(),
    [transactions],
  );

  const filterableCategories = useMemo(
    () => Array.from(new Set(transactions.map((transaction) => transaction.category))).sort(),
    [transactions],
  );

  const filteredTransactions = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();
    const minAmount = filters.minAmount ? Number.parseFloat(filters.minAmount) : undefined;
    const maxAmount = filters.maxAmount ? Number.parseFloat(filters.maxAmount) : undefined;

    return transactions.filter((transaction) => {
      if (searchTerm) {
        const haystack = [
          transaction.merchantName,
          transaction.description,
          transaction.category,
          transaction.accountName,
          ...transaction.tags,
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(searchTerm)) {
          return false;
        }
      }

      if (filters.status !== "all" && transaction.status !== filters.status) {
        return false;
      }

      if (filters.direction !== "all" && transaction.direction !== filters.direction) {
        return false;
      }

      if (filters.source !== "all" && transaction.source !== filters.source) {
        return false;
      }

      if (filters.category !== "all" && transaction.category !== filters.category) {
        return false;
      }

      if (filters.account !== "all" && transaction.accountName !== filters.account) {
        return false;
      }

      if (typeof minAmount === "number" && !Number.isNaN(minAmount) && transaction.amount < minAmount) {
        return false;
      }

      if (typeof maxAmount === "number" && !Number.isNaN(maxAmount) && transaction.amount > maxAmount) {
        return false;
      }

      const postedDate = transaction.postedAt.slice(0, 10);
      if (filters.from && postedDate < filters.from) {
        return false;
      }

      if (filters.to && postedDate > filters.to) {
        return false;
      }

      return true;
    });
  }, [transactions, filters]);

  const sortedTransactions = useMemo(() => {
    const data = [...filteredTransactions];

    data.sort((a, b) => {
      let compare = 0;

      switch (sort.field) {
        case "postedAt":
          compare = Date.parse(a.postedAt) - Date.parse(b.postedAt);
          break;
        case "merchantName":
          compare = a.merchantName.localeCompare(b.merchantName);
          break;
        case "category":
          compare = a.category.localeCompare(b.category);
          break;
        case "amount":
          compare = a.amount - b.amount;
          break;
        case "status":
          compare = statusRank[a.status] - statusRank[b.status];
          break;
        default:
          compare = 0;
      }

      return sort.direction === "asc" ? compare : -compare;
    });

    return data;
  }, [filteredTransactions, sort]);

  const totals = useMemo(() => {
    const debit = sortedTransactions.reduce(
      (sum, transaction) => (transaction.direction === "debit" ? sum + transaction.amount : sum),
      0,
    );
    const credit = sortedTransactions.reduce(
      (sum, transaction) => (transaction.direction === "credit" ? sum + transaction.amount : sum),
      0,
    );

    return { debit, credit, net: credit - debit };
  }, [sortedTransactions]);
  useEffect(() => {
    if (!selectAllRef.current) {
      return;
    }

    const allVisibleSelected =
      sortedTransactions.length > 0 && selection.size === sortedTransactions.length;
    selectAllRef.current.checked = allVisibleSelected;
    selectAllRef.current.indeterminate =
      selection.size > 0 && selection.size < sortedTransactions.length;
  }, [selection, sortedTransactions]);

  useEffect(() => {
    setSelection((previous) => {
      if (previous.size === 0) {
        return previous;
      }

      const visibleIds = new Set(sortedTransactions.map((transaction) => transaction.id));
      let changed = false;
      const next = new Set<string>();

      previous.forEach((id) => {
        if (visibleIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });

      if (!changed && next.size === previous.size) {
        return previous;
      }

      return next;
    });
  }, [sortedTransactions]);

  const handleFiltersChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const key = event.target.name as keyof Filters;
    const value = event.target.value;
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({ ...defaultFilters });
  };

  const handleSort = (field: SortField) => {
    setSort((current) => {
      if (current.field === field) {
        return { field, direction: current.direction === "asc" ? "desc" : "asc" };
      }

      return { field, direction: field === "postedAt" ? "desc" : "asc" };
    });
  };

  const toggleTransactionSelection = (id: string) => {
    setSelection((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const handleSelectAll = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelection(new Set(sortedTransactions.map((transaction) => transaction.id)));
    } else {
      setSelection(new Set());
    }
  };

  const clearSelection = () => {
    setSelection(new Set());
  };

  const handleCreateTransaction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    const dateValue = (data.get("date") as string) || new Date().toISOString().slice(0, 10);
    const amountValue = Number.parseFloat((data.get("amount") as string) ?? "0");

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setFeedback("Enter an amount greater than zero to record the transaction.");
      return;
    }

    const direction = (data.get("direction") as TransactionDirection) ?? "debit";
    const merchantName = (data.get("merchant") as string) || "Manual entry";
    const category = (data.get("category") as string) || "Uncategorized";
    const accountName = (data.get("account") as string) || "Everyday Checking";
    const notes = (data.get("notes") as string) || "";
    const tags = parseTags((data.get("tags") as string) || "");

    const newTransaction: Transaction = {
      id: createId(),
      postedAt: `${dateValue}T12:00:00Z`,
      merchantName,
      description: notes || merchantName,
      category,
      accountName,
      amount: Math.round(amountValue * 100) / 100,
      direction,
      status: "pending",
      source: "manual",
      tags,
      notes: notes || null,
    };

    const nextTransactions = [newTransaction, ...transactionsRef.current];
    setTransactions(nextTransactions);
    // Persist workspace
    void saveTransactions(nextTransactions, importJobs).catch((err) => {
      console.warn('Failed to persist new transaction:', err);
    });
    setFeedback(`Transaction drafted for ${accountName}.`);
    form.reset();
  };

  const openBulkModal = () => {
    setBulkError(null);
    setBulkForm({
      addTags: "",
      removeTags: "",
      category: "",
      replaceTags: false,
    });
    setBulkModalOpen(true);
  };

  const handleBulkSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (selection.size === 0) {
      setBulkModalOpen(false);
      return;
    }

    if (bulkUpdateMutation.isPending) {
      return;
    }

    const addTags = parseTags(bulkForm.addTags);
    const removeTags = parseTags(bulkForm.removeTags);
    const nextCategory = bulkForm.category.trim();

    if (!addTags.length && !removeTags.length && !nextCategory) {
      setBulkError("Add or remove at least one tag, or choose a new category.");
      return;
    }

    const payload: BulkUpdateTransactionTagsInput = {
      transactionIds: Array.from(selection),
      addTags,
      removeTags,
      category: nextCategory ? nextCategory : undefined,
      replaceTags: bulkForm.replaceTags,
    };

    bulkUpdateMutation.mutate(payload);
  };


  const handleImportSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!importForm.fileName) {
      setImportError("Select a CSV export to queue the import.");
      return;
    }

    if (!importForm.accountId) {
      setImportError("Choose the account that these transactions belong to.");
      return;
    }

    const newJob: ImportJob = {
      id: createId(),
      fileName: importForm.fileName,
      accountName: importForm.accountId,
      status: "Queued",
      queuedAt: new Date().toISOString(),
      records: 0,
    };

    const nextJobs = [newJob, ...importJobs].slice(0, 5);
    setImportJobs(nextJobs);
    // Persist workspace
    void saveTransactions(transactionsRef.current, nextJobs).catch((err) => {
      console.warn('Failed to persist import job:', err);
    });
    setImportForm({ ...defaultImportForm });
    setImportError(null);
    setImportModalOpen(false);
    setFeedback(`Import queued for ${newJob.fileName}. We will confirm once processing completes.`);
  };

  const handleImportFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setImportForm((current) => ({
      ...current,
      fileName: file?.name ?? "",
    }));
  };

  const handleImportFieldChange = (key: keyof typeof defaultImportForm, value: string | boolean) => {
    setImportForm((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const selectionCount = selection.size;
  const headerSort = (field: SortField) =>
    sort.field === field ? (sort.direction === "asc" ? "ascending" : "descending") : "none";
  return (
    <InteractionErrorBoundary
      onReset={handleReset}
      title="Transactions workspace hit a snag"
      description="Reload the section to continue reviewing recent activity."
      actionLabel="Reload section"
    >
      <section id="transactions" className={styles.section}>
      <Card>
        <CardHeader
          title="Transactions"
          subtitle="Review, categorize, and audit recent activity."
          actions={
            <div className={styles.headerActions}>
              <button
                type="button"
                className={controls.button}
                onClick={() => setImportModalOpen(true)}
              >
                Import transactions
              </button>
              <button
                type="button"
                className={`${controls.button} ${controls.buttonPrimary}`}
                onClick={() => {
                  const quickAddDate = document.getElementById("quick-add-date") as
                    | HTMLInputElement
                    | null;
                  quickAddDate?.focus();
                }}
              >
                New manual entry
              </button>
            </div>
          }
        />
        <CardBody>
          <div className={styles.layout}>
            <form
              className={`${patterns.glass} ${styles.formPanel} ${patterns.form}`}
              onSubmit={handleCreateTransaction}
            >
              <div>
                <h3>Quick add transaction</h3>
                <p className={styles.muted}>
                  Capture manually tracked activity while your linked institutions sync.
                </p>
              </div>
              <div className={patterns.formRow}>
                <label className={patterns.formLabel} htmlFor="quick-add-date">
                  Date
                  <input
                    id="quick-add-date"
                    name="date"
                    type="date"
                    required
                    className={patterns.input}
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                </label>
                <label className={patterns.formLabel} htmlFor="quick-add-direction">
                  Type
                  <select
                    id="quick-add-direction"
                    name="direction"
                    className={patterns.select}
                    defaultValue="debit"
                  >
                    <option value="debit">Debit</option>
                    <option value="credit">Credit</option>
                  </select>
                </label>
              </div>
              <div className={patterns.formRow}>
                <label className={patterns.formLabel} htmlFor="quick-add-amount">
                  Amount
                  <input
                    id="quick-add-amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="0.00"
                    className={patterns.input}
                  />
                </label>
                <label className={patterns.formLabel} htmlFor="quick-add-category">
                  Category
                  <select
                    id="quick-add-category"
                    name="category"
                    className={patterns.select}
                    defaultValue={filterableCategories[0] ?? "Dining"}
                  >
                    {filterableCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                    <option value="Uncategorized">Uncategorized</option>
                  </select>
                </label>
              </div>
              <div className={patterns.formRow}>
                <label className={patterns.formLabel} htmlFor="quick-add-merchant">
                  Merchant or payee
                  <input
                    id="quick-add-merchant"
                    name="merchant"
                    placeholder="Store or payee"
                    required
                    className={patterns.input}
                  />
                </label>
                <label className={patterns.formLabel} htmlFor="quick-add-account">
                  Account
                  <select
                    id="quick-add-account"
                    name="account"
                    className={patterns.select}
                    defaultValue={filterableAccounts[0] ?? "Everyday Checking"}
                  >
                    {filterableAccounts.map((account) => (
                      <option key={account} value={account}>
                        {account}
                      </option>
                    ))}
                    <option value="Everyday Checking">Everyday Checking</option>
                  </select>
                </label>
              </div>
              <div className={patterns.formRow}>
                <label className={patterns.formLabel} htmlFor="quick-add-notes">
                  Notes
                  <input
                    id="quick-add-notes"
                    name="notes"
                    placeholder="Optional memo"
                    className={patterns.input}
                  />
                </label>
                <label className={patterns.formLabel} htmlFor="quick-add-tags">
                  Tags
                  <input
                    id="quick-add-tags"
                    name="tags"
                    placeholder="Comma separated tags"
                    className={patterns.input}
                  />
                </label>
              </div>
              <div className={patterns.actionRow}>
                <button type="reset" className={controls.button}>
                  Reset
                </button>
                <button type="submit" className={`${controls.button} ${controls.buttonPrimary}`}>
                  Save transaction
                </button>
              </div>
            </form>
            <div className={`${patterns.glass} ${styles.tablePanel}`}>
              <div className={styles.filtersBar}>
                <input
                  name="search"
                  value={filters.search}
                  onChange={handleFiltersChange}
                  placeholder="Search transactions"
                  className={`${patterns.input} ${styles.searchInput}`}
                />
                <div className={styles.filtersGroup}>
                  <select
                    name="status"
                    value={filters.status}
                    onChange={handleFiltersChange}
                    className={patterns.select}
                  >
                    <option value="all">All statuses</option>
                    <option value="cleared">Cleared</option>
                    <option value="pending">Pending</option>
                    <option value="disputed">Disputed</option>
                  </select>
                  <select
                    name="direction"
                    value={filters.direction}
                    onChange={handleFiltersChange}
                    className={patterns.select}
                  >
                    <option value="all">All types</option>
                    <option value="debit">Debits</option>
                    <option value="credit">Credits</option>
                  </select>
                  <select
                    name="source"
                    value={filters.source}
                    onChange={handleFiltersChange}
                    className={patterns.select}
                  >
                    <option value="all">All sources</option>
                    <option value="plaid">Plaid</option>
                    <option value="import">Import</option>
                    <option value="manual">Manual</option>
                  </select>
                  <select
                    name="category"
                    value={filters.category}
                    onChange={handleFiltersChange}
                    className={patterns.select}
                  >
                    <option value="all">All categories</option>
                    {filterableCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                  <select
                    name="account"
                    value={filters.account}
                    onChange={handleFiltersChange}
                    className={patterns.select}
                  >
                    <option value="all">All accounts</option>
                    {filterableAccounts.map((account) => (
                      <option key={account} value={account}>
                        {account}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.filtersGroup}>
                  <input
                    name="from"
                    type="date"
                    value={filters.from}
                    onChange={handleFiltersChange}
                    className={patterns.input}
                    aria-label="From date"
                  />
                  <input
                    name="to"
                    type="date"
                    value={filters.to}
                    onChange={handleFiltersChange}
                    className={patterns.input}
                    aria-label="To date"
                  />
                  <input
                    name="minAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Min $"
                    value={filters.minAmount}
                    onChange={handleFiltersChange}
                    className={patterns.input}
                  />
                  <input
                    name="maxAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Max $"
                    value={filters.maxAmount}
                    onChange={handleFiltersChange}
                    className={patterns.input}
                  />
                </div>
                <button type="button" className={styles.lightButton} onClick={resetFilters}>
                  Clear filters
                </button>
              </div>
              {feedback ? (
                <div className={styles.feedback}>
                  <span>{feedback}</span>
                  <button
                    type="button"
                    className={styles.lightButton}
                    onClick={() => setFeedback(null)}
                    aria-label="Dismiss notification"
                  >
                    Ã—
                  </button>
                </div>
              ) : null}
              {selectionCount > 0 ? (
                <div className={styles.selectionBar}>
                  <div className={styles.selectionSummary}>
                    <strong>{selectionCount}</strong>
                    <span>selected</span>
                  </div>
                  <div className={styles.selectionActions}>
                    <button type="button" className={controls.button} onClick={openBulkModal}>
                      Bulk edit tags
                    </button>
                    <button type="button" className={controls.button} onClick={clearSelection}>
                      Clear selection
                    </button>
                  </div>
                </div>
              ) : null}
              <div className={styles.tableScroll}>
                <table className={patterns.table}>
                  <thead>
                    <tr>
                      <th scope="col">
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          className={styles.checkbox}
                          aria-label="Select all transactions"
                          onChange={handleSelectAll}
                          disabled={sortedTransactions.length === 0}
                        />
                      </th>
                      <th scope="col" aria-sort={headerSort("postedAt")}>
                        <button
                          type="button"
                          className={styles.sortButton}
                          onClick={() => handleSort("postedAt")}
                        >
                          Date
                          <span className={styles.sortIndicator}>
                            {sort.field === "postedAt" ? (sort.direction === "asc" ? "?" : "?") : "?"}
                          </span>
                        </button>
                      </th>
                      <th scope="col" aria-sort={headerSort("merchantName")}>
                        <button
                          type="button"
                          className={styles.sortButton}
                          onClick={() => handleSort("merchantName")}
                        >
                          Merchant
                          <span className={styles.sortIndicator}>
                            {sort.field === "merchantName"
                              ? sort.direction === "asc"
                                ? "?"
                                : "?"
                              : "?"}
                          </span>
                        </button>
                      </th>
                      <th scope="col">Account</th>
                      <th scope="col" aria-sort={headerSort("category")}>
                        <button
                          type="button"
                          className={styles.sortButton}
                          onClick={() => handleSort("category")}
                        >
                          Category
                          <span className={styles.sortIndicator}>
                            {sort.field === "category"
                              ? sort.direction === "asc"
                                ? "?"
                                : "?"
                              : "?"}
                          </span>
                        </button>
                      </th>
                      <th scope="col">Tags</th>
                      <th scope="col" aria-sort={headerSort("status")}>
                        <button
                          type="button"
                          className={styles.sortButton}
                          onClick={() => handleSort("status")}
                        >
                          Status
                          <span className={styles.sortIndicator}>
                            {sort.field === "status" ? (sort.direction === "asc" ? "?" : "?") : "?"}
                          </span>
                        </button>
                      </th>
                      <th scope="col">Source</th>
                      <th scope="col" aria-sort={headerSort("amount")} style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className={styles.sortButton}
                          onClick={() => handleSort("amount")}
                        >
                          Amount
                          <span className={styles.sortIndicator}>
                            {sort.field === "amount" ? (sort.direction === "asc" ? "?" : "?") : "?"}
                          </span>
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={9}>
                          <div className={styles.emptyState}>
                            No transactions match the filters right now. Try widening your search.
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sortedTransactions.map((transaction) => {
                        const isSelected = selection.has(transaction.id);
                        const signedAmount = getSignedAmount(transaction);

                        return (
                          <tr
                            key={transaction.id}
                            className={isSelected ? styles.rowSelected : undefined}
                          >
                            <td>
                              <input
                                type="checkbox"
                                className={styles.checkbox}
                                aria-label={`Select ${transaction.merchantName}`}
                                checked={isSelected}
                                onChange={() => toggleTransactionSelection(transaction.id)}
                              />
                            </td>
                            <td>{formatTableDate(transaction.postedAt)}</td>
                            <td>
                              <div>{transaction.merchantName}</div>
                              <div className={styles.muted}>{transaction.description}</div>
                            </td>
                            <td>{transaction.accountName}</td>
                            <td>{transaction.category}</td>
                            <td>
                              <div className={styles.tagList}>
                                {transaction.tags.length > 0 ? (
                                  transaction.tags.map((tag) => (
                                    <span key={tag} className={styles.tag}>
                                      {tag}
                                    </span>
                                  ))
                                ) : (
                                  <span className={styles.muted}>No tags</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span
                                className={`${styles.statusBadge} ${statusClassName[transaction.status]}`}
                              >
                                {transaction.status}
                              </span>
                            </td>
                            <td>
                              <span className={styles.muted}>
                                {transaction.source === "plaid"
                                  ? "Plaid"
                                  : transaction.source === "import"
                                    ? "Import"
                                    : "Manual"}
                              </span>
                            </td>
                            <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                              <span>{`${signedAmount >= 0 ? "+" : "-"}${formatAmount(signedAmount)}`}</span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
              <div className={styles.tableFooter}>
                <span>
                  Showing {sortedTransactions.length} of {transactions.length} transactions
                </span>
                <span>
                  Debits {formatCurrency(totals.debit)} â€¢ Credits {formatCurrency(totals.credit)} â€¢ Net {`${totals.net >= 0 ? "+" : "-"}${formatCurrency(Math.abs(totals.net))}`}
                </span>
              </div>
              {importJobs.length > 0 ? (
                <div className={styles.importJobs}>
                  <h4>Recent imports</h4>
                  {importJobs.map((job) => (
                    <div key={job.id} className={styles.importJobItem}>
                      <div className={styles.importJobMeta}>
                        <strong>{job.fileName}</strong>
                        <span className={styles.muted}>
                          {job.accountName} â€¢ queued {formatSummaryDate(job.queuedAt)}
                        </span>
                        <span className={styles.muted}>
                          Records: {job.records === 0 ? "Pending" : job.records}
                        </span>
                      </div>
                      <span
                        className={`${styles.statusBadge} ${
                          job.status === "Completed" ? styles.statusCleared : styles.statusPending
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </CardBody>
      </Card>
      {bulkModalOpen ? (
        <div className={styles.modalOverlay}>
          <div
            ref={bulkDialogRef}
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="bulk-edit-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <h3 id="bulk-edit-title" className={styles.modalTitle}>
                  Bulk edit tags
                </h3>
                <p className={styles.muted}>
                  Apply changes to {selectionCount} selected transaction
                  {selectionCount === 1 ? "" : "s"}.
                </p>
              </div>
              <button
                type="button"
                className={styles.lightButton}
                onClick={() => setBulkModalOpen(false)}
                aria-label="Close bulk edit modal"
              >
                Ã—
              </button>
            </div>
            <form className={styles.modalBody} onSubmit={handleBulkSubmit}>
              <div className={patterns.form}>
                <div className={patterns.formRow}>
                  <label className={patterns.formLabel} htmlFor="bulk-add-tags">
                    Add tags
                    <input
                      id="bulk-add-tags"
                      className={patterns.input}
                      placeholder="e.g. groceries, shared"
                      value={bulkForm.addTags}
                      onChange={(event) =>
                        setBulkForm((current) => ({ ...current, addTags: event.target.value }))
                      }
                    />
                  </label>
                  <label className={patterns.formLabel} htmlFor="bulk-remove-tags">
                    Remove tags
                    <input
                      id="bulk-remove-tags"
                      className={patterns.input}
                      placeholder="Tags to remove"
                      value={bulkForm.removeTags}
                      onChange={(event) =>
                        setBulkForm((current) => ({ ...current, removeTags: event.target.value }))
                      }
                    />
                  </label>
                </div>
                <label className={patterns.formLabel} htmlFor="bulk-category">
                  Replace category
                  <select
                    id="bulk-category"
                    className={patterns.select}
                    value={bulkForm.category}
                    onChange={(event) =>
                      setBulkForm((current) => ({ ...current, category: event.target.value }))
                    }
                  >
                    <option value="">Keep existing</option>
                    {filterableCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.inlineCheckbox} htmlFor="bulk-replace-tags">
                  <input
                    id="bulk-replace-tags"
                    type="checkbox"
                    checked={bulkForm.replaceTags}
                    onChange={(event) =>
                      setBulkForm((current) => ({ ...current, replaceTags: event.target.checked }))
                    }
                  />
                  Replace existing tags instead of merging
                </label>
              </div>
              {bulkError ? (
                <div role="alert" className={styles.error}>
                  {bulkError}
                </div>
              ) : null}
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={controls.button}
                  onClick={() => setBulkModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={`${controls.button} ${controls.buttonPrimary}`}>
                  Apply updates
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {importModalOpen ? (
        <div className={styles.modalOverlay}>
          <div
            ref={importDialogRef}
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-modal-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <h3 id="import-modal-title" className={styles.modalTitle}>
                  Import transactions
                </h3>
                <p className={styles.muted}>
                  Upload CSV exports from your institution and map columns for ingestion.
                </p>
              </div>
              <button
                type="button"
                className={styles.lightButton}
                onClick={() => setImportModalOpen(false)}
                aria-label="Close import modal"
              >
                Ã—
              </button>
            </div>
            <form className={`${styles.modalBody} ${styles.modalGrid}`} onSubmit={handleImportSubmit}>
              <label className={patterns.formLabel} htmlFor="import-file">
                CSV file
                <input
                  id="import-file"
                  type="file"
                  accept=".csv"
                  className={patterns.input}
                  onChange={handleImportFileChange}
                />
                {importForm.fileName ? (
                  <span className={styles.helpText}>Selected: {importForm.fileName}</span>
                ) : (
                  <span className={styles.helpText}>Supports up to 50,000 rows per file.</span>
                )}
              </label>
              <label className={patterns.formLabel} htmlFor="import-account">
                Account
                <select
                  id="import-account"
                  className={patterns.select}
                  value={importForm.accountId}
                  onChange={(event) => handleImportFieldChange("accountId", event.target.value)}
                >
                  <option value="">Choose account</option>
                  {filterableAccounts.map((account) => (
                    <option key={account} value={account}>
                      {account}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.inlineCheckbox} htmlFor="import-header">
                <input
                  id="import-header"
                  type="checkbox"
                  checked={importForm.hasHeaderRow}
                  onChange={(event) =>
                    handleImportFieldChange("hasHeaderRow", event.target.checked)
                  }
                />
                File includes header row
              </label>
              <div className={patterns.formRow}>
                <label className={patterns.formLabel} htmlFor="import-date-column">
                  Date column
                  <select
                    id="import-date-column"
                    className={patterns.select}
                    value={importForm.dateColumn}
                    onChange={(event) =>
                      handleImportFieldChange("dateColumn", event.target.value)
                    }
                  >
                    {columnPresets.date.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={patterns.formLabel} htmlFor="import-direction-column">
                  Direction column
                  <select
                    id="import-direction-column"
                    className={patterns.select}
                    value={importForm.directionColumn}
                    onChange={(event) =>
                      handleImportFieldChange("directionColumn", event.target.value)
                    }
                  >
                    {columnPresets.direction.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className={patterns.formRow}>
                <label className={patterns.formLabel} htmlFor="import-description-column">
                  Description column
                  <select
                    id="import-description-column"
                    className={patterns.select}
                    value={importForm.descriptionColumn}
                    onChange={(event) =>
                      handleImportFieldChange("descriptionColumn", event.target.value)
                    }
                  >
                    {columnPresets.description.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={patterns.formLabel} htmlFor="import-amount-column">
                  Amount column
                  <select
                    id="import-amount-column"
                    className={patterns.select}
                    value={importForm.amountColumn}
                    onChange={(event) =>
                      handleImportFieldChange("amountColumn", event.target.value)
                    }
                  >
                    {columnPresets.amount.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {importError ? (
                <div role="alert" className={styles.error}>
                  {importError}
                </div>
              ) : null}
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={controls.button}
                  onClick={() => {
                    setImportModalOpen(false);
                    setImportError(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className={`${controls.button} ${controls.buttonPrimary}`}>
                  Queue import
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
    </InteractionErrorBoundary>
  );
}


