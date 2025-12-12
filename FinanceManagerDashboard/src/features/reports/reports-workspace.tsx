"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Card, CardBody, CardHeader } from "@components/dashboard/card";
import controls from "@/styles/controls.module.css";
import patterns from "@/styles/patterns.module.css";
import {
  createReportShareLink,
  fetchReportJobs,
  reportsQueryKeys,
  requestReportGeneration,
  type ReportDelivery,
  type ReportDeliveryMode,
  type ReportFilters,
  type ReportFormat,
  type ReportJob,
  type ReportShareLink,
  type ReportStatus,
  type ReportType,
} from "@lib/api/reports";

import styles from "./reports-workspace.module.css";

const reportTypeOptions: Array<{ value: ReportType; label: string }> = [
  { value: "transactions", label: "Transactions" },
  { value: "budgets", label: "Budgets" },
  { value: "cashflow", label: "Cash flow" },
  { value: "tax_summary", label: "Tax summary" },
];

const reportFormatOptions: Array<{ value: ReportFormat; label: string }> = [
  { value: "csv", label: "CSV" },
  { value: "pdf", label: "PDF" },
  { value: "xlsx", label: "Excel" },
];

const shareExpiryOptions = [
  { value: 60, label: "1 hour" },
  { value: 240, label: "4 hours" },
  { value: 1440, label: "24 hours" },
  { value: 4320, label: "3 days" },
  { value: 10080, label: "7 days" },
];

const statusLabel: Record<ReportStatus, string> = {
  queued: "Queued",
  processing: "Processing",
  ready: "Ready",
  expired: "Expired",
  failed: "Failed",
};

const formatName: Record<ReportFormat, string> = {
  csv: "CSV",
  pdf: "PDF",
  xlsx: "Excel",
};

const typeName: Record<ReportType, string> = {
  transactions: "Transactions",
  budgets: "Budgets",
  cashflow: "Cash flow",
  tax_summary: "Tax summary",
};

const statusClassName: Record<ReportStatus, string> = {
  queued: styles.statusQueued,
  processing: styles.statusProcessing,
  ready: styles.statusReady,
  expired: styles.statusExpired,
  failed: styles.statusFailed,
};

function formatDateTime(iso?: string) {
  if (!iso) {
    return "-";
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) {
    return "-";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const precision = size < 10 && unitIndex > 0 ? 1 : 0;

  return `${size.toFixed(precision)} ${units[unitIndex]}`;
}

function parseListInput(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function ReportsWorkspace() {
  const queryClient = useQueryClient();
  const { data: jobsData, isLoading } = useQuery({
    queryKey: reportsQueryKeys.list(),
    queryFn: fetchReportJobs,
  });
  const jobs = jobsData ?? [];

  const readyCount = useMemo(() => jobs.filter((job) => job.status === "ready").length, [jobs]);
  const pendingCount = useMemo(
    () => jobs.filter((job) => job.status === "queued" || job.status === "processing").length,
    [jobs],
  );
  const recentShares = useMemo(() => {
    const entries: Array<{ job: ReportJob; link: ReportShareLink }> = [];
    jobs.forEach((job) => {
      job.shareLinks.forEach((link) => {
        entries.push({ job, link });
      });
    });
    return entries
      .sort((a, b) => new Date(b.link.createdAt).getTime() - new Date(a.link.createdAt).getTime())
      .slice(0, 5);
  }, [jobs]);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [exportType, setExportType] = useState<ReportType>("transactions");
  const [exportFormat, setExportFormat] = useState<ReportFormat>("csv");
  const [deliveryMode, setDeliveryMode] = useState<ReportDeliveryMode>("download");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [exportEmail, setExportEmail] = useState("");
  const [exportCategories, setExportCategories] = useState("");
  const [exportAccounts, setExportAccounts] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [activeJob, setActiveJob] = useState<ReportJob | null>(null);
  const [shareExpiryMinutes, setShareExpiryMinutes] = useState<number>(1440);
  const [shareAllowDownload, setShareAllowDownload] = useState(true);
  const [sharePassword, setSharePassword] = useState("");
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareResult, setShareResult] = useState<ReportShareLink | null>(null);
  const [shareCopyMessage, setShareCopyMessage] = useState<string | null>(null);

  const exportMutation = useMutation({
    mutationFn: requestReportGeneration,
  });

  const shareMutation = useMutation({
    mutationFn: createReportShareLink,
  });

  function resetExportForm() {
    setExportType("transactions");
    setExportFormat("csv");
    setDeliveryMode("download");
    setFromDate("");
    setToDate("");
    setExportEmail("");
    setExportCategories("");
    setExportAccounts("");
  }

  function openExportModal() {
    setIsExportModalOpen(true);
    setErrorMessage(null);
  }

  function closeExportModal() {
    setIsExportModalOpen(false);
  }

  function openShareModal(job: ReportJob) {
    setActiveJob(job);
    setShareExpiryMinutes(1440);
    setShareAllowDownload(true);
    setSharePassword("");
    setShareResult(null);
    setShareCopyMessage(null);
    setShareError(null);
    setIsShareModalOpen(true);
  }

  function closeShareModal() {
    setIsShareModalOpen(false);
    setActiveJob(null);
    setShareResult(null);
    setShareCopyMessage(null);
    setShareError(null);
  }

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: reportsQueryKeys.list() });
  }

  async function handleExportSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (exportMutation.isPending) {
      return;
    }

    setErrorMessage(null);

    if (deliveryMode === "email" && !exportEmail.trim()) {
      setErrorMessage("Enter an email address or switch delivery back to download.");
      return;
    }

    const filters: ReportFilters = {};

    if (fromDate) {
      filters.from = fromDate;
    }

    if (toDate) {
      filters.to = toDate;
    }

    const categories = parseListInput(exportCategories);
    if (categories.length) {
      filters.categoryIds = categories;
    }

    const accounts = parseListInput(exportAccounts);
    if (accounts.length) {
      filters.accountIds = accounts;
    }

    const delivery: ReportDelivery =
      deliveryMode === "email"
        ? { mode: "email", email: exportEmail.trim() }
        : { mode: "download" };

    try {
      const result = await exportMutation.mutateAsync({
        type: exportType,
        format: exportFormat,
        filters,
        delivery,
      });

      queryClient.setQueryData(reportsQueryKeys.list(), (previous?: ReportJob[]) => {
        if (!previous) {
          return [result.job];
        }

        return [result.job, ...previous.filter((job) => job.jobId !== result.job.jobId)];
      });

      setFeedbackMessage(result.message);
      setIsExportModalOpen(false);
      resetExportForm();
    } catch (error) {
      console.error("Failed to queue report export", error);
      setErrorMessage("We could not queue the export. Check the details and try again.");
    }
  }

  async function handleShareSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!activeJob || shareMutation.isPending) {
      return;
    }

    setShareError(null);
    setShareCopyMessage(null);

    try {
      const result = await shareMutation.mutateAsync({
        jobId: activeJob.jobId,
        expiresInMinutes: shareExpiryMinutes,
        allowDownload: shareAllowDownload,
        password: sharePassword.trim() ? sharePassword : undefined,
      });

      queryClient.setQueryData(reportsQueryKeys.list(), (previous?: ReportJob[]) => {
        if (!previous) {
          return previous;
        }

        return previous.map((job) => {
          if (job.jobId !== activeJob.jobId) {
            return job;
          }

          return {
            ...job,
            shareLinks: [result.share, ...job.shareLinks],
            lastSharedAt: result.share.createdAt,
          };
        });
      });

      setActiveJob((prev) => {
        if (!prev || prev.jobId !== activeJob.jobId) {
          return prev;
        }

        return {
          ...prev,
          shareLinks: [result.share, ...prev.shareLinks],
          lastSharedAt: result.share.createdAt,
        };
      });

      setShareResult(result.share);
    } catch (error) {
      console.error("Failed to create share link", error);
      setShareError("Creating the share link failed. Try again.");
    }
  }

  async function handleCopyShareLink() {
    if (!shareResult) {
      return;
    }

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(shareResult.shareLink);
        setShareCopyMessage("Share link copied to clipboard.");
        return;
      } catch (error) {
        console.error("Failed to copy share link", error);
        setShareCopyMessage("Copy failed. Select the link and copy it manually.");
        return;
      }
    }

    setShareCopyMessage("Copy is not supported here. Select the link and copy it manually.");
  }

  const tableSubtitle = pendingCount
    ? `${pendingCount} export${pendingCount === 1 ? "" : "s"} currently in progress`
    : "Download ready reports or share them directly with stakeholders.";

  return (
    <section id="reports" className={styles.section} aria-busy={isLoading && !jobs.length}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>Reports & exports</h1>
          <p className={styles.subheading}>
            Queue exports, monitor their status, and distribute secure share links for collaborators.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={`${controls.button} ${controls.buttonPrimary}`}
            onClick={openExportModal}
          >
            New export
          </button>
          <button
            type="button"
            className={controls.button}
            onClick={handleRefresh}
            disabled={isLoading}
          >
            Refresh
          </button>
        </div>
      </div>

      {feedbackMessage ? (
        <div className={`${styles.callout} ${styles.calloutSuccess}`} role="status">
          {feedbackMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className={`${styles.callout} ${styles.calloutError}`} role="alert">
          {errorMessage}
        </div>
      ) : null}

      <div className={styles.layout}>
        <Card className={styles.primaryCard}>
          <CardHeader
            title="Scheduled exports"
            subtitle={tableSubtitle}
            badge={jobs.length ? `${readyCount} ready` : undefined}
            actions={
              <button
                type="button"
                className={`${controls.button} ${controls.buttonPrimary}`}
                onClick={openExportModal}
              >
                Queue export
              </button>
            }
          />
          <CardBody>
            <div className={styles.tableWrapper}>
              <table className={patterns.table}>
                <thead>
                  <tr>
                    <th scope="col">Report</th>
                    <th scope="col">Status</th>
                    <th scope="col">Requested</th>
                    <th scope="col">Completed</th>
                    <th scope="col">Last shared</th>
                    <th scope="col" className={styles.actionsHeader}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && !jobs.length ? (
                    <tr>
                      <td colSpan={6}>
                        <div className={styles.emptyState}>Loading export jobs...</div>
                      </td>
                    </tr>
                  ) : null}
                  {!isLoading && !jobs.length ? (
                    <tr>
                      <td colSpan={6}>
                        <div className={styles.emptyState}>
                          No exports queued yet. Queue your first report to generate downloads.
                        </div>
                      </td>
                    </tr>
                  ) : null}
                  {jobs.map((job) => {
                    const metaItems = [
                      typeName[job.type],
                      formatName[job.format],
                      job.delivery.mode === "email"
                        ? `Email to ${job.delivery.email ?? ""}`
                        : "Download",
                    ];

                    if (job.sizeBytes) {
                      metaItems.push(formatBytes(job.sizeBytes));
                    }

                    const metaText = metaItems.join(" | ");
                    const statusClass = `${styles.statusBadge} ${statusClassName[job.status] ?? ""}`;
                    const isShareDisabled = job.status !== "ready";
                    const downloadDisabled = job.status !== "ready" || !job.downloadUrl;

                    return (
                      <tr key={job.jobId}>
                        <td>
                          <div className={styles.jobTitle}>{job.title}</div>
                          <div className={styles.jobMeta}>{metaText}</div>
                          <div className={styles.jobDescription}>{job.description}</div>
                        </td>
                        <td>
                          <span className={statusClass}>{statusLabel[job.status]}</span>
                          {job.estimatedCompletionSeconds && job.status !== "ready" ? (
                            <div className={styles.metaHint}>
                              ~{Math.ceil(job.estimatedCompletionSeconds / 60)} min estimate
                            </div>
                          ) : null}
                        </td>
                        <td className={styles.metaCell}>{formatDateTime(job.requestedAt)}</td>
                        <td className={styles.metaCell}>{formatDateTime(job.completedAt)}</td>
                        <td className={styles.metaCell}>{formatDateTime(job.lastSharedAt)}</td>
                        <td>
                          <div className={styles.actions}>
                            {job.downloadUrl ? (
                              <a
                                className={`${controls.button} ${controls.buttonPrimary} ${styles.actionButton}`}
                                href={job.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-disabled={downloadDisabled}
                                tabIndex={downloadDisabled ? -1 : undefined}
                                onClick={(event) => {
                                  if (downloadDisabled) {
                                    event.preventDefault();
                                  }
                                }}
                              >
                                Download
                              </a>
                            ) : (
                              <button
                                type="button"
                                className={`${controls.button} ${styles.actionButton}`}
                                disabled
                              >
                                Download
                              </button>
                            )}
                            <button
                              type="button"
                              className={`${controls.button} ${styles.actionButton}`}
                              onClick={() => openShareModal(job)}
                              disabled={isShareDisabled}
                            >
                              Share
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>
        <Card className={styles.secondaryCard}>
          <CardHeader
            title="Recent share links"
            subtitle="Active links automatically expire after their configured window."
            badge={recentShares.length ? `${recentShares.length} active` : undefined}
          />
          <CardBody className={styles.shareBody}>
            {recentShares.length ? (
              <ul className={styles.shareList}>
                {recentShares.map(({ job, link }) => (
                  <li key={`${link.id}-${link.createdAt}`} className={styles.shareItem}>
                    <div className={styles.shareItemHeader}>
                      <span className={styles.shareJob}>{job.title}</span>
                      <span className={styles.shareExpires}>Expires {formatDateTime(link.expiresAt)}</span>
                    </div>
                    <div className={styles.shareMeta}>
                      <span>Shared {formatDateTime(link.createdAt)}</span>
                      <span>{link.allowDownload ? "Downloads enabled" : "View only"}</span>
                      <span>{link.passwordProtected ? "Password required" : "No password"}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.emptyStateSmall}>
                Share links will appear here after you generate them.
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {isExportModalOpen ? (
        <div className={styles.modalOverlay} role="presentation" onClick={closeExportModal}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <h2 id="export-modal-title" className={styles.modalTitle}>
                  Queue new export
                </h2>
                <p className={styles.modalSubtitle}>
                  Configure the data set and we will notify you when the file is ready.
                </p>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={closeExportModal}
                aria-label="Close export modal"
              >
                X
              </button>
            </div>
            <form className={`${patterns.form} ${styles.modalBody}`} onSubmit={handleExportSubmit}>
              <div className={patterns.formRow}>
                <label className={patterns.formLabel}>
                  Report type
                  <select
                    className={patterns.select}
                    value={exportType}
                    onChange={(event) => setExportType(event.target.value as ReportType)}
                  >
                    {reportTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={patterns.formLabel}>
                  Format
                  <select
                    className={patterns.select}
                    value={exportFormat}
                    onChange={(event) => setExportFormat(event.target.value as ReportFormat)}
                  >
                    {reportFormatOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className={patterns.formRow}>
                <label className={patterns.formLabel}>
                  From date
                  <input
                    type="date"
                    className={patterns.input}
                    value={fromDate}
                    onChange={(event) => setFromDate(event.target.value)}
                    max={toDate || undefined}
                  />
                </label>
                <label className={patterns.formLabel}>
                  To date
                  <input
                    type="date"
                    className={patterns.input}
                    value={toDate}
                    onChange={(event) => setToDate(event.target.value)}
                    min={fromDate || undefined}
                  />
                </label>
              </div>
              <div className={patterns.formRow}>
                <label className={patterns.formLabel}>
                  Filter categories
                  <input
                    type="text"
                    className={patterns.input}
                    placeholder="Example: dining, subscriptions"
                    value={exportCategories}
                    onChange={(event) => setExportCategories(event.target.value)}
                  />
                </label>
                <label className={patterns.formLabel}>
                  Filter accounts
                  <input
                    type="text"
                    className={patterns.input}
                    placeholder="Example: checking-1, savings-2"
                    value={exportAccounts}
                    onChange={(event) => setExportAccounts(event.target.value)}
                  />
                </label>
              </div>
              <fieldset className={styles.deliveryFieldset}>
                <legend className={styles.fieldsetLegend}>Delivery</legend>
                <div className={styles.radioGroup}>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="delivery-mode"
                      value="download"
                      checked={deliveryMode === "download"}
                      onChange={() => setDeliveryMode("download")}
                    />
                    <span>Download</span>
                  </label>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="delivery-mode"
                      value="email"
                      checked={deliveryMode === "email"}
                      onChange={() => setDeliveryMode("email")}
                    />
                    <span>Email</span>
                  </label>
                </div>
                {deliveryMode === "email" ? (
                  <label className={`${patterns.formLabel} ${styles.emailInput}`}>
                    Email address
                    <input
                      type="email"
                      className={patterns.input}
                      value={exportEmail}
                      onChange={(event) => setExportEmail(event.target.value)}
                      required
                    />
                  </label>
                ) : null}
              </fieldset>
              <p className={styles.modalHint}>
                Exports typically complete in under three minutes. Large date ranges may require extra time.
              </p>
              <div className={styles.modalFooter}>
                <button type="button" className={controls.button} onClick={closeExportModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`${controls.button} ${controls.buttonPrimary}`}
                  disabled={exportMutation.isPending}
                >
                  {exportMutation.isPending ? "Queuing..." : "Queue export"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isShareModalOpen && activeJob ? (
        <div className={styles.modalOverlay} role="presentation" onClick={closeShareModal}>
          <div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <div>
                <h2 id="share-modal-title" className={styles.modalTitle}>
                  Share {activeJob.title}
                </h2>
                <p className={styles.modalSubtitle}>
                  Generate a time bound link that you can send to teammates or auditors.
                </p>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={closeShareModal}
                aria-label="Close share modal"
              >
                X
              </button>
            </div>
            <form className={`${patterns.form} ${styles.modalBody}`} onSubmit={handleShareSubmit}>
              <label className={patterns.formLabel}>
                Expiry
                <select
                  className={patterns.select}
                  value={shareExpiryMinutes}
                  onChange={(event) => setShareExpiryMinutes(Number(event.target.value))}
                >
                  {shareExpiryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={shareAllowDownload}
                  onChange={(event) => setShareAllowDownload(event.target.checked)}
                />
                <span>Allow viewers to download the file</span>
              </label>
              <label className={patterns.formLabel}>
                Optional password
                <input
                  type="text"
                  className={patterns.input}
                  placeholder="Leave blank for no password"
                  value={sharePassword}
                  onChange={(event) => setSharePassword(event.target.value)}
                />
              </label>
              {shareError ? (
                <div className={`${styles.callout} ${styles.calloutError}`} role="alert">
                  {shareError}
                </div>
              ) : null}
              {shareResult ? (
                <div className={styles.shareResult} role="status">
                  <p className={styles.shareResultTitle}>Share link ready</p>
                  <div className={styles.shareLinkRow}>
                    <input
                      type="text"
                      className={`${patterns.input} ${styles.shareLinkInput}`}
                      value={shareResult.shareLink}
                      readOnly
                      aria-label="Share link"
                    />
                    <button
                      type="button"
                      className={`${controls.button} ${styles.actionButton}`}
                      onClick={handleCopyShareLink}
                    >
                      Copy link
                    </button>
                  </div>
                  {shareCopyMessage ? (
                    <p className={styles.shareCopyMessage}>{shareCopyMessage}</p>
                  ) : null}
                  <p className={styles.shareMetaLine}>
                    Expires {formatDateTime(shareResult.expiresAt)} | {" "}
                    {shareResult.allowDownload ? "Downloads enabled" : "View only"} | {" "}
                    {shareResult.passwordProtected ? "Password required" : "No password"}
                  </p>
                </div>
              ) : null}
              <div className={styles.modalFooter}>
                <button type="button" className={controls.button} onClick={closeShareModal}>
                  Close
                </button>
                <button
                  type="submit"
                  className={`${controls.button} ${controls.buttonPrimary}`}
                  disabled={shareMutation.isPending}
                >
                  {shareMutation.isPending ? "Creating..." : "Create link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}


