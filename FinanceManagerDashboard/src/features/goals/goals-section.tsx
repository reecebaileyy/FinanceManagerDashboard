"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Card, CardBody, CardHeader } from "@components/dashboard/card";
import { GameModal } from "@components/unity-game";
import { useLocalization } from "@features/i18n";

import {
  Goal,
  GoalDraft,
  GoalRecommendationResponse,
  GoalsWorkspaceOverview,
  GoalsWorkspacePayload,
  buildGoalFromDraft,
  fetchGoalsWorkspace,
  goalsQueryKeys,
  requestGoalRecommendation,
} from "@lib/api/goals";
import { getDifficultyRecommendation } from "@lib/game-difficulty";

import patterns from "../../styles/patterns.module.css";
import controls from "../../styles/controls.module.css";
import styles from "./goals-section.module.css";

function goalCompletion(goal: Goal): number {
  if (goal.targetAmountCents === 0) {
    return 1;
  }
  return Math.max(0, Math.min(1, goal.currentAmountCents / goal.targetAmountCents));
}

function computeOverview(
  goals: Goal[],
  fallback?: GoalsWorkspaceOverview,
): GoalsWorkspaceOverview {
  if (goals.length === 0) {
    return (
      fallback ?? {
        totalGoals: 0,
        totalTargetCents: 0,
        totalCurrentCents: 0,
        averageCompletionPercent: 0,
        monthlyCommitmentCents: 0,
        flaggedGoals: 0,
        highlight: "Create your first goal to start tracking progress.",
        focusGoalId: undefined,
      }
    );
  }

  const totals = goals.reduce(
    (acc, goal) => {
      acc.totalTarget += goal.targetAmountCents;
      acc.totalCurrent += goal.currentAmountCents;
      acc.totalProgress += goalCompletion(goal) * 100;
      acc.monthlyCommitment += goal.planContributionCents;
      if (goal.health === "attention" || goal.health === "behind") {
        acc.flagged += 1;
      }
      return acc;
    },
    { totalTarget: 0, totalCurrent: 0, totalProgress: 0, monthlyCommitment: 0, flagged: 0 },
  );

  const averageCompletionPercent = Math.round(totals.totalProgress / goals.length);
  const highlight =
    totals.flagged > 0
      ? "One or more goals need a quick tune-up to stay on plan."
      : fallback?.highlight ?? "Every goal is pacing on plan - great work.";
  const focusGoal =
    goals.find((goal) => goal.health === "attention" || goal.health === "behind")?.id ??
    fallback?.focusGoalId ??
    goals[0]?.id;

  return {
    totalGoals: goals.length,
    totalTargetCents: totals.totalTarget,
    totalCurrentCents: totals.totalCurrent,
    averageCompletionPercent: Math.max(0, Math.min(100, averageCompletionPercent)),
    monthlyCommitmentCents: totals.monthlyCommitment,
    flaggedGoals: totals.flagged,
    highlight,
    focusGoalId: focusGoal,
  };
}

const healthLabels: Record<Goal["health"], string> = {
  ahead: "Ahead",
  onTrack: "On track",
  attention: "Needs attention",
  behind: "Off track",
  completed: "Completed",
};

const healthToneClass: Record<Goal["health"], string> = {
  ahead: styles.healthAhead,
  onTrack: styles.healthOnTrack,
  attention: styles.healthAttention,
  behind: styles.healthBehind,
  completed: styles.healthCompleted,
};

const progressToneClass: Record<Goal["health"], string> = {
  ahead: styles.progressAhead,
  onTrack: styles.progressOnTrack,
  attention: styles.progressAttention,
  behind: styles.progressBehind,
  completed: styles.progressCompleted,
};

type WizardStep = 1 | 2 | 3;

interface GoalWizardFormState {
  name: string;
  type: Goal["type"];
  category: string;
  priority: Goal["priority"];
  targetAmount: string;
  startingAmount: string;
  targetDate: string;
  contributionAmount: string;
  contributionFrequency: Goal["contributionFrequency"];
  autopilot: boolean;
  sourceAccount: string;
  motivation: string;
  tags: string;
}

const initialFormState: GoalWizardFormState = {
  name: "",
  type: "savings",
  category: "",
  priority: "medium",
  targetAmount: "",
  startingAmount: "",
  targetDate: "",
  contributionAmount: "",
  contributionFrequency: "monthly",
  autopilot: true,
  sourceAccount: "Household Checking",
  motivation: "",
  tags: "",
};

function parseCurrencyToCents(input: string): number {
  if (!input) {
    return 0;
  }
  const numeric = Number.parseFloat(input.replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.round(numeric * 100);
}

function buildDraftFromForm(form: GoalWizardFormState, referenceDate: string): GoalDraft {
  const targetAmountCents = Math.max(0, parseCurrencyToCents(form.targetAmount));
  const startingAmountCents = Math.max(0, parseCurrencyToCents(form.startingAmount));
  const contributionCents = Math.max(0, parseCurrencyToCents(form.contributionAmount));

  const tags = form.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);

  return {
    name: form.name.trim(),
    type: form.type,
    category: form.category.trim(),
    priority: form.priority,
    targetAmountCents,
    startingAmountCents,
    targetDate: form.targetDate,
    tags: tags.length ? tags : undefined,
    motivation: form.motivation.trim() ? form.motivation.trim() : undefined,
    plan: {
      contributionCents,
      frequency: form.contributionFrequency,
      autopilot: form.autopilot,
      sourceAccount: form.sourceAccount.trim() || "Household Checking",
      startDate: referenceDate,
    },
  };
}

function validateStep(
  step: WizardStep,
  form: GoalWizardFormState,
  referenceDate: string,
): string[] {
  const errors: string[] = [];

  if (step === 1) {
    if (!form.name.trim()) {
      errors.push("Give the goal a name.");
    }
    if (!form.category.trim()) {
      errors.push("Select a category to group the goal.");
    }
    if (parseCurrencyToCents(form.targetAmount) <= 0) {
      errors.push("Set a target amount greater than zero.");
    }
    if (!form.targetDate) {
      errors.push("Choose a target date.");
    } else {
      const targetDate = new Date(form.targetDate);
      const reference = new Date(referenceDate);
      if (targetDate <= reference) {
        errors.push("Pick a target date in the future.");
      }
    }
    if (parseCurrencyToCents(form.startingAmount) < 0) {
      errors.push("Starting amount cannot be negative.");
    }
  }

  if (step === 2) {
    if (parseCurrencyToCents(form.contributionAmount) <= 0) {
      errors.push("Plan a contribution amount to build momentum.");
    }
    if (!form.sourceAccount.trim()) {
      errors.push("Specify which account funds the goal.");
    }
  }

  if (step === 3) {
    if (parseCurrencyToCents(form.targetAmount) < parseCurrencyToCents(form.startingAmount)) {
      errors.push("Starting amount cannot exceed the target amount.");
    }
  }

  return errors;
}

export function GoalsSection() {
  const { formatCurrency, formatPercent, formatDate } = useLocalization();
  const formatCents = (cents: number) => formatCurrency(cents / 100);
  const formatRatio = (ratio: number) => formatPercent(Math.max(0, Math.min(1, ratio)));
  const formatShortDate = (value: string | Date) => formatDate(value, { month: "short", day: "numeric" });
  const queryClient = useQueryClient();
  const { data: workspace, isLoading, isError } = useQuery({
    queryKey: goalsQueryKeys.workspace(),
    queryFn: fetchGoalsWorkspace,
  });

  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [formState, setFormState] = useState<GoalWizardFormState>(initialFormState);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [customFocus, setCustomFocus] = useState<string>("");
  const [customQuestion, setCustomQuestion] = useState<string>("");
  const [aiResponse, setAiResponse] = useState<GoalRecommendationResponse | null>(null);
  const [aiStatus, setAiStatus] = useState<"idle" | "loading" | "ready">("idle");
  const [aiError, setAiError] = useState<string | null>(null);
  const [showGameModal, setShowGameModal] = useState(false);
  const [gameRecommendation, setGameRecommendation] = useState<{
    difficulty: string;
    reason: string;
  } | null>(null);

  const referenceDate = workspace?.referenceDate ?? new Date().toISOString().slice(0, 10);
  const goals = workspace?.goals ?? [];

  const overview = useMemo(() => computeOverview(goals, workspace?.overview), [goals, workspace?.overview]);

  useEffect(() => {
    if (!overview.focusGoalId) {
      return;
    }
    setSelectedGoalId((current) => current ?? overview.focusGoalId ?? null);
  }, [overview.focusGoalId]);

  const selectedGoal = useMemo(() => {
    if (!goals.length) {
      return undefined;
    }
    if (!selectedGoalId) {
      return goals[0];
    }
    return goals.find((goal) => goal.id === selectedGoalId) ?? goals[0];
  }, [goals, selectedGoalId]);

  const insights = useMemo(() => {
    if (!workspace?.insights) {
      return [];
    }
    if (!selectedGoal) {
      return workspace.insights;
    }
    return workspace.insights.filter((insight) => !insight.goalId || insight.goalId === selectedGoal.id);
  }, [workspace?.insights, selectedGoal?.id]);

  const prompts = workspace?.prompts ?? [];

  function handleFieldChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) {
    const { name } = event.target;
    const key = name as keyof GoalWizardFormState;
    let value: string | boolean =
      event.target instanceof HTMLInputElement && event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;

    if (key === "type") {
      value = (value as string) as Goal["type"];
    }

    if (key === "priority") {
      value = (value as string) as Goal["priority"];
    }

    if (key === "contributionFrequency") {
      value = (value as string) as Goal["contributionFrequency"];
    }

    setFormState((prev) => ({
      ...prev,
      [key]: value as GoalWizardFormState[keyof GoalWizardFormState],
    }));
  }

  function goToNextStep() {
    const errors = validateStep(wizardStep, formState, referenceDate);
    if (errors.length) {
      setFormErrors(errors);
      return;
    }

    setFormErrors([]);
    setWizardStep((current) => (current < 3 ? ((current + 1) as WizardStep) : current));
  }

  function goToPreviousStep() {
    setFormErrors([]);
    setWizardStep((current) => (current > 1 ? ((current - 1) as WizardStep) : current));
  }

  async function handleWizardSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (wizardStep !== 3) {
      goToNextStep();
      return;
    }

    const errors = validateStep(3, formState, referenceDate);
    if (errors.length) {
      setFormErrors(errors);
      return;
    }

    const draft = buildDraftFromForm(formState, referenceDate);
    const newGoal = buildGoalFromDraft(draft, { referenceDate });

    queryClient.setQueryData<GoalsWorkspacePayload>(goalsQueryKeys.workspace(), (previous) => {
      if (!previous) {
        return {
          referenceDate,
          goals: [newGoal],
          overview: computeOverview([newGoal]),
          insights: [],
          prompts: [],
        } satisfies GoalsWorkspacePayload;
      }

      const updatedGoals = [...previous.goals, newGoal];

      return {
        ...previous,
        goals: updatedGoals,
        overview: computeOverview(updatedGoals, previous.overview),
      };
    });

    setSelectedGoalId(newGoal.id);
    setWizardStep(1);
    setFormState(initialFormState);
    setFormErrors([]);
    setSuccessMessage(`Added ${newGoal.name} to active goals.`);
    setCustomFocus("");
    setCustomQuestion("");
    setSelectedPromptId(null);
    setAiResponse(null);
    setAiStatus("idle");
    setAiError(null);

    if (typeof window !== "undefined") {
      window.setTimeout(() => setSuccessMessage(null), 4500);
    }
  }

  async function handleAskAssistant() {
    if (!selectedGoal) {
      return;
    }

    setAiStatus("loading");
    setAiError(null);

    try {
      const response = await requestGoalRecommendation(selectedGoal, {
        focus: customFocus.trim() || undefined,
        questions: customQuestion.trim() ? [customQuestion.trim()] : undefined,
      });
      setAiResponse(response);
      setAiStatus("ready");
    } catch (error) {
      console.error(error);
      setAiError("Unable to contact the assistant. Try again in a moment.");
      setAiStatus("idle");
    }
  }

  function handlePromptSelect(promptId: string) {
    setSelectedPromptId(promptId);
    const prompt = prompts.find((item) => item.id === promptId);
    if (prompt) {
      setCustomFocus(prompt.description);
    }
  }

  function handleOpenGame() {
    const recommendation = getDifficultyRecommendation(undefined, goals, referenceDate);
    setGameRecommendation(recommendation);
    setShowGameModal(true);
  }

  function handleCloseGame() {
    setShowGameModal(false);
    setGameRecommendation(null);
  }

  if (isLoading) {
    return <div className={styles.loadingState}>Loading goals workspace...</div>;
  }

  if (isError || !workspace) {
    return <div className={styles.errorState}>Unable to load financial goals right now.</div>;
  }

  const wizardSteps: Array<{ id: WizardStep; title: string; description: string }> = [
    { id: 1, title: "Define goal", description: "Name, amount, and timeline" },
    { id: 2, title: "Plan funding", description: "Contribution cadence" },
    { id: 3, title: "Review & confirm", description: "Double-check the plan" },
  ];

  const sortedContributions = selectedGoal
    ? [...selectedGoal.contributions].sort(
        (a, b) => new Date(b.contributedAt).getTime() - new Date(a.contributedAt).getTime(),
      )
    : [];

  const upcomingMilestones = selectedGoal?.milestones ?? [];
  const projection = selectedGoal?.projection ?? [];

  const insightToneClass: Record<string, string> = {
    positive: styles.insightPositive,
    attention: styles.insightAttention,
    warning: styles.insightWarning,
  };

  const wizardPrimaryActionLabel = wizardStep === 3 ? "Create goal" : "Next";
  return (
    <div className={styles.goalsWorkspace}>
      <div className={styles.summaryGrid}>
        <Card className={styles.summaryCard}>
          <CardHeader 
            title="Goal commitments" 
            subtitle={overview.highlight}
            actions={
              <button
                type="button"
                className={[controls.button, controls.buttonPrimary].join(" ")}
                onClick={handleOpenGame}
                aria-label="Play budgeting game"
              >
                🎮 Play Game
              </button>
            }
          />
          <CardBody className={styles.summaryBody}>
            <div className={styles.summaryMetric}>{formatCents(overview.totalCurrentCents)}</div>
            <div className={styles.summaryLabel}>of {formatCents(overview.totalTargetCents)} funded</div>
            <div className={styles.summarySubtext}>
              {overview.flaggedGoals > 0
                ? `${overview.flaggedGoals} goal${overview.flaggedGoals === 1 ? "" : "s"} need attention`
                : "All goals are pacing on plan"}
            </div>
          </CardBody>
        </Card>
        <Card className={styles.summaryCard}>
          <CardHeader title="Monthly plan" subtitle="Recurring contributions scheduled" />
          <CardBody className={styles.summaryBody}>
            <div className={styles.summaryMetric}>{formatCents(overview.monthlyCommitmentCents)}</div>
            <div className={styles.summaryLabel}>planned each month</div>
            <div className={styles.summarySubtext}>
              {selectedGoal
                ? `Next focus: ${selectedGoal.name} on ${formatShortDate(selectedGoal.nextContributionDate)}`
                : "Add a goal to get started"}
            </div>
          </CardBody>
        </Card>
        <Card className={styles.summaryCard}>
          <CardHeader title="Average completion" subtitle="Percent funded across goals" />
          <CardBody className={styles.summaryBody}>
            <div className={styles.summaryMetric}>{overview.averageCompletionPercent}%</div>
            <div className={styles.summaryLabel}>average funded</div>
            <div className={styles.summarySubtext}>
              {goals.length} active goal{goals.length === 1 ? "" : "s"}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className={styles.mainGrid}>
        <Card className={styles.goalListCard}>
          <CardHeader title="Active goals" subtitle="Track progress and nudge plans" />
          <CardBody className={styles.goalListBody}>
            {goals.map((goal) => {
              const completion = goalCompletion(goal);
              const percent = Math.round(completion * 100);
              const isActive = goal.id === selectedGoal?.id;

              return (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() => setSelectedGoalId(goal.id)}
                  className={[styles.goalRow, isActive ? styles.goalRowActive : ""].filter(Boolean).join(" ")}
                  aria-pressed={isActive}
                >
                  <div className={styles.goalRowHeader}>
                    <div className={styles.goalTitleGroup}>
                      <span className={styles.goalName}>{goal.name}</span>
                      <span className={styles.goalCategory}>{goal.category}</span>
                    </div>
                    <div className={styles.goalAmountBlock}>
                      <span className={styles.goalAmountCurrent}>{formatCents(goal.currentAmountCents)}</span>
                      <span className={styles.goalAmountTarget}>of {formatCents(goal.targetAmountCents)}</span>
                    </div>
                  </div>
                  <div className={styles.goalStatusRow}>
                    <span className={[styles.goalHealthTag, healthToneClass[goal.health]].join(" ")}>
                      {healthLabels[goal.health]}
                    </span>
                    <span className={styles.goalTimelineLabel}>Target {formatShortDate(goal.targetDate)}</span>
                  </div>
                  <div className={styles.goalProgressRow}>
                    <div className={[patterns.progress, styles.goalProgressTrack].join(" ")}>
                      <span
                        className={[patterns.progressBar, progressToneClass[goal.health]].join(" ")}
                        style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
                      />
                    </div>
                    <span className={styles.goalProgressValue}>{percent}%</span>
                  </div>
                  <div className={styles.goalMetaRow}>
                    <div>
                      <span className={styles.goalMetaLabel}>Next contribution</span>
                      <span className={styles.goalMetaValue}>
                        {formatShortDate(goal.nextContributionDate)} â€¢ {formatCents(goal.planContributionCents)}
                      </span>
                    </div>
                    <div>
                      <span className={styles.goalMetaLabel}>Last update</span>
                      <span className={styles.goalMetaValue}>
                        {goal.lastContributionDate ? formatShortDate(goal.lastContributionDate) : "â€”"}
                      </span>
                    </div>
                  </div>
                  {goal.tags.length ? (
                    <div className={styles.goalTags} aria-label={`Tags for ${goal.name}`}>
                      {goal.tags.map((tag) => (
                        <span key={tag} className={styles.goalTag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </CardBody>
        </Card>

        <Card className={styles.goalDetailCard}>
          <CardHeader
            title={selectedGoal ? selectedGoal.name : "Goal details"}
            subtitle={selectedGoal ? selectedGoal.planSummary : "Select a goal to review projections."}
            badge={selectedGoal ? healthLabels[selectedGoal.health] : undefined}
            className={selectedGoal ? healthToneClass[selectedGoal.health] : undefined}
          />
          <CardBody className={styles.goalDetailBody}>
            {selectedGoal ? (
              <div className={styles.goalDetailContent}>
                <div className={styles.goalStatsGrid}>
                  <div>
                    <span className={styles.goalStatLabel}>Progress</span>
                    <span className={styles.goalStatValue}>{formatRatio(goalCompletion(selectedGoal))}</span>
                  </div>
                  <div>
                    <span className={styles.goalStatLabel}>Funding rate</span>
                    <span className={styles.goalStatValue}>{formatCents(selectedGoal.planContributionCents)} / {selectedGoal.contributionFrequency}</span>
                  </div>
                  <div>
                    <span className={styles.goalStatLabel}>Timeline</span>
                    <span className={styles.goalStatValue}>
                      {formatShortDate(selectedGoal.startDate)} ? {formatShortDate(selectedGoal.targetDate)}
                    </span>
                  </div>
                </div>
                <p className={styles.goalNarrative}>{selectedGoal.aiSummary}</p>

                <section className={styles.goalSection}>
                  <h3 className={styles.goalSectionTitle}>Milestones</h3>
                  <ul className={styles.milestoneList}>
                    {upcomingMilestones.map((milestone) => (
                      <li key={milestone.id} className={milestone.achieved ? styles.milestoneComplete : styles.milestonePending}>
                        <div>
                          <span className={styles.milestoneLabel}>{milestone.label}</span>
                          <span className={styles.milestoneDate}>{formatShortDate(milestone.targetDate)}</span>
                        </div>
                        <div className={styles.milestoneMeta}>
                          <span>{formatCents(milestone.targetAmountCents)}</span>
                          {milestone.achievedAt ? <span className={styles.milestoneAchieved}>Hit {formatShortDate(milestone.achievedAt)}</span> : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>

                <section className={styles.goalSection}>
                  <h3 className={styles.goalSectionTitle}>Recent contributions</h3>
                  <ul className={styles.contributionList}>
                    {sortedContributions.slice(0, 5).map((contribution) => (
                      <li key={contribution.id}>
                        <span className={styles.contributionAmount}>{formatCents(contribution.amountCents)}</span>
                        <span className={styles.contributionMeta}>
                          {formatShortDate(contribution.contributedAt)} â€¢ {contribution.source}
                        </span>
                        {contribution.note ? <span className={styles.contributionNote}>{contribution.note}</span> : null}
                      </li>
                    ))}
                    {!sortedContributions.length ? (
                      <li className={styles.emptyState}>Contributions will appear here once you start funding.</li>
                    ) : null}
                  </ul>
                </section>

                <section className={styles.goalSection}>
                  <h3 className={styles.goalSectionTitle}>Projection</h3>
                  <div className={styles.projectionGrid}>
                    {projection.map((point) => (
                      <div key={point.month} className={styles.projectionItem}>
                        <span className={styles.projectionMonth}>{point.month}</span>
                        <span className={styles.projectionValue}>{formatCents(point.projectedAmountCents)}</span>
                        <span className={styles.projectionTarget}>Target {formatCents(point.targetAmountCents)}</span>
                      </div>
                    ))}
                    {!projection.length ? (
                      <p className={styles.emptyState}>Add projection data to visualize the runway.</p>
                    ) : null}
                  </div>
                </section>
              </div>
            ) : (
              <p className={styles.goalEmptyState}>Create a goal to unlock detailed insights.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <div className={styles.lowerGrid}>
        <Card className={styles.wizardCard}>
          <CardHeader title="Create a new goal" subtitle="Draft a plan the assistant can refine." />
          <CardBody className={styles.wizardBody}>
            <ol className={styles.wizardStepper}>
              {wizardSteps.map((step) => (
                <li
                  key={step.id}
                  className={[styles.wizardStep, step.id === wizardStep ? styles.wizardStepActive : "", step.id < wizardStep ? styles.wizardStepComplete : ""].filter(Boolean).join(" ")}
                >
                  <span className={styles.wizardStepNumber}>{step.id}</span>
                  <div>
                    <span className={styles.wizardStepTitle}>{step.title}</span>
                    <span className={styles.wizardStepDescription}>{step.description}</span>
                  </div>
                </li>
              ))}
            </ol>

            <form className={styles.wizardForm} onSubmit={handleWizardSubmit}>
              {wizardStep === 1 ? (
                <div className={patterns.form}>
                  <label className={patterns.formLabel}>
                    Goal name
                    <input
                      className={patterns.input}
                      name="name"
                      value={formState.name}
                      onChange={handleFieldChange}
                      placeholder="Emergency fund"
                      required
                    />
                  </label>
                  <div className={patterns.formRow}>
                    <label className={patterns.formLabel}>
                      Goal type
                      <select
                        className={patterns.select}
                        name="type"
                        value={formState.type}
                        onChange={handleFieldChange}
                      >
                        <option value="savings">Savings</option>
                        <option value="debt">Debt payoff</option>
                        <option value="investment">Investment</option>
                      </select>
                    </label>
                    <label className={patterns.formLabel}>
                      Priority
                      <select
                        className={patterns.select}
                        name="priority"
                        value={formState.priority}
                        onChange={handleFieldChange}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </label>
                  </div>
                  <div className={patterns.formRow}>
                    <label className={patterns.formLabel}>
                      Target amount
                      <input
                        className={patterns.input}
                        name="targetAmount"
                        value={formState.targetAmount}
                        onChange={handleFieldChange}
                        placeholder="$10,000"
                        inputMode="decimal"
                      />
                    </label>
                    <label className={patterns.formLabel}>
                      Starting amount
                      <input
                        className={patterns.input}
                        name="startingAmount"
                        value={formState.startingAmount}
                        onChange={handleFieldChange}
                        placeholder="$1,500"
                        inputMode="decimal"
                      />
                    </label>
                  </div>
                  <div className={patterns.formRow}>
                    <label className={patterns.formLabel}>
                      Target date
                      <input
                        className={patterns.input}
                        type="date"
                        name="targetDate"
                        value={formState.targetDate}
                        onChange={handleFieldChange}
                      />
                    </label>
                    <label className={patterns.formLabel}>
                      Category
                      <input
                        className={patterns.input}
                        name="category"
                        value={formState.category}
                        onChange={handleFieldChange}
                        placeholder="Emergency"
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              {wizardStep === 2 ? (
                <div className={patterns.form}>
                  <div className={patterns.formRow}>
                    <label className={patterns.formLabel}>
                      Contribution amount
                      <input
                        className={patterns.input}
                        name="contributionAmount"
                        value={formState.contributionAmount}
                        onChange={handleFieldChange}
                        placeholder="$500"
                        inputMode="decimal"
                      />
                    </label>
                    <label className={patterns.formLabel}>
                      Frequency
                      <select
                        className={patterns.select}
                        name="contributionFrequency"
                        value={formState.contributionFrequency}
                        onChange={handleFieldChange}
                      >
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Every 2 weeks</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </label>
                  </div>
                  <label className={styles.checkboxField}>
                    <input
                      type="checkbox"
                      name="autopilot"
                      checked={formState.autopilot}
                      onChange={handleFieldChange}
                    />
                    <span>Enable automatic transfers</span>
                  </label>
                  <label className={patterns.formLabel}>
                    Source account
                    <input
                      className={patterns.input}
                      name="sourceAccount"
                      value={formState.sourceAccount}
                      onChange={handleFieldChange}
                      placeholder="High-yield savings"
                    />
                  </label>
                  <label className={patterns.formLabel}>
                    Motivation (optional)
                    <textarea
                      className={patterns.textarea}
                      name="motivation"
                      value={formState.motivation}
                      onChange={handleFieldChange}
                      placeholder="Keep three months of expenses ready for surprises."
                      rows={3}
                    />
                  </label>
                  <label className={patterns.formLabel}>
                    Tags (comma separated)
                    <input
                      className={patterns.input}
                      name="tags"
                      value={formState.tags}
                      onChange={handleFieldChange}
                      placeholder="Emergency, Family"
                    />
                  </label>
                </div>
              ) : null}

              {wizardStep === 3 ? (
                <div className={styles.reviewGrid}>
                  <div>
                    <span className={styles.reviewLabel}>Goal name</span>
                    <span className={styles.reviewValue}>{formState.name || "â€”"}</span>
                  </div>
                  <div>
                    <span className={styles.reviewLabel}>Target amount</span>
                    <span className={styles.reviewValue}>{formState.targetAmount || "â€”"}</span>
                  </div>
                  <div>
                    <span className={styles.reviewLabel}>Contribution</span>
                    <span className={styles.reviewValue}>
                      {formState.contributionAmount || "â€”"} â€¢ {formState.contributionFrequency}
                    </span>
                  </div>
                  <div>
                    <span className={styles.reviewLabel}>Timeline</span>
                    <span className={styles.reviewValue}>
                      {formState.targetDate ? formatShortDate(formState.targetDate) : "â€”"}
                    </span>
                  </div>
                  <div>
                    <span className={styles.reviewLabel}>Autopilot</span>
                    <span className={styles.reviewValue}>{formState.autopilot ? "On" : "Manual"}</span>
                  </div>
                  <div>
                    <span className={styles.reviewLabel}>Tags</span>
                    <span className={styles.reviewValue}>{formState.tags || "â€”"}</span>
                  </div>
                  {formState.motivation ? (
                    <div className={styles.reviewFullRow}>
                      <span className={styles.reviewLabel}>Motivation</span>
                      <span className={styles.reviewValue}>{formState.motivation}</span>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {formErrors.length ? (
                <div className={styles.formErrors} role="alert">
                  <ul>
                    {formErrors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {successMessage ? (
                <div className={styles.successMessage} role="status">
                  {successMessage}
                </div>
              ) : null}

              <div className={patterns.actionRow}>
                {wizardStep > 1 ? (
                  <button type="button" className={controls.button} onClick={goToPreviousStep}>
                    Back
                  </button>
                ) : null}
                <button
                  type="submit"
                  className={[controls.button, controls.buttonPrimary].join(" ")}
                >
                  {wizardPrimaryActionLabel}
                </button>
              </div>
            </form>
          </CardBody>
        </Card>

        <Card className={styles.aiCard}>
          <CardHeader title="Assistant" subtitle="Ask for help improving your plan." />
          <CardBody className={styles.aiBody}>
            <div className={styles.promptList}>
              {prompts.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => handlePromptSelect(prompt.id)}
                  className={[
                    styles.promptButton,
                    selectedPromptId === prompt.id ? styles.promptButtonActive : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <strong>{prompt.label}</strong>
                  <span>{prompt.description}</span>
                </button>
              ))}
              {!prompts.length ? <p className={styles.emptyState}>Prompts will appear once the assistant has data.</p> : null}
            </div>

            <label className={patterns.formLabel}>
              Focus for the coach
              <textarea
                className={patterns.textarea}
                value={customFocus}
                onChange={(event) => setCustomFocus(event.target.value)}
                placeholder="Share the trade-offs you want the assistant to consider."
                rows={3}
              />
            </label>

            <label className={patterns.formLabel}>
              Specific question (optional)
              <input
                className={patterns.input}
                value={customQuestion}
                onChange={(event) => setCustomQuestion(event.target.value)}
                placeholder="Can we stay on track without pausing investments?"
              />
            </label>

            <div className={patterns.actionRow}>
              <button
                type="button"
                className={[controls.button, controls.buttonPrimary].join(" ")}
                onClick={handleAskAssistant}
                disabled={aiStatus === "loading"}
              >
                {aiStatus === "loading" ? "Requesting..." : "Ask assistant"}
              </button>
            </div>

            {aiError ? (
              <p className={styles.aiError} role="alert">{aiError}</p>
            ) : null}

            {aiResponse ? (
              <div className={styles.aiResponse}>
                <p className={styles.aiSummary}>{aiResponse.summary}</p>
                <ul className={styles.aiActionList}>
                  {aiResponse.actions.map((action) => (
                    <li key={action.id}>
                      <strong>{action.title}</strong>
                      <span>{action.description}</span>
                    </li>
                  ))}
                </ul>
                <span className={styles.aiConfidence}>Confidence {aiResponse.confidence}%</span>
              </div>
            ) : (
              <p className={styles.aiPlaceholder}>
                Select a prompt or describe your focus, then ask the assistant for a recommendation.
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className={styles.insightsCard}>
        <CardHeader title="Coach insights" subtitle="Opportunities surfaced for this goal" />
        <CardBody className={styles.insightsBody}>
          {insights.length ? (
            <ul className={styles.insightList}>
              {insights.map((insight) => (
                <li
                  key={insight.id}
                  className={[styles.insightItem, insightToneClass[insight.tone]].join(" ")}
                >
                  <div>
                    <span className={styles.insightTitle}>{insight.title}</span>
                    <span className={styles.insightMessage}>{insight.body}</span>
                  </div>
                  {insight.ctaLabel ? <span className={styles.insightCta}>{insight.ctaLabel}</span> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.insightEmpty}>The assistant will share ideas here once activity begins.</p>
          )}
        </CardBody>
      </Card>

      <GameModal
        isOpen={showGameModal}
        onClose={handleCloseGame}
        recommendedDifficulty={gameRecommendation?.difficulty as 'easy' | 'normal' | 'hard' | undefined}
        recommendationReason={gameRecommendation?.reason}
        autoStart={true}
      />
    </div>
  );
}

export default GoalsSection;





