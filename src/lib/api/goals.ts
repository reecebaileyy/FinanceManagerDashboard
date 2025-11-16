export type GoalType = 'savings' | 'debt' | 'investment';
export type GoalPriority = 'low' | 'medium' | 'high';
export type GoalHealth = 'ahead' | 'onTrack' | 'attention' | 'behind' | 'completed';
export type ContributionFrequency = 'weekly' | 'biweekly' | 'monthly';
export type InsightTone = 'positive' | 'attention' | 'warning';

export interface GoalMilestone {
  id: string;
  label: string;
  targetAmountCents: number;
  targetDate: string;
  achieved: boolean;
  achievedAt?: string;
}

export interface GoalContribution {
  id: string;
  goalId: string;
  amountCents: number;
  contributedAt: string;
  source: 'manual' | 'rule' | 'roundUp' | 'bonus';
  note?: string;
}

export interface GoalProjectionPoint {
  month: string;
  projectedAmountCents: number;
  targetAmountCents: number;
}

export interface Goal {
  id: string;
  name: string;
  type: GoalType;
  category: string;
  priority: GoalPriority;
  health: GoalHealth;
  targetAmountCents: number;
  currentAmountCents: number;
  startDate: string;
  targetDate: string;
  planContributionCents: number;
  contributionFrequency: ContributionFrequency;
  autopilot: boolean;
  autopilotSourceAccount: string;
  autopilotNote?: string;
  nextContributionDate: string;
  lastContributionDate?: string;
  successProbabilityPercent: number;
  planSummary: string;
  tags: string[];
  milestones: GoalMilestone[];
  contributions: GoalContribution[];
  projection: GoalProjectionPoint[];
  aiSummary: string;
}

export interface GoalInsight {
  id: string;
  goalId?: string;
  title: string;
  body: string;
  tone: InsightTone;
  ctaLabel?: string;
}

export interface GoalPrompt {
  id: string;
  label: string;
  description: string;
}

export interface GoalsWorkspaceOverview {
  totalGoals: number;
  totalTargetCents: number;
  totalCurrentCents: number;
  averageCompletionPercent: number;
  monthlyCommitmentCents: number;
  flaggedGoals: number;
  highlight: string;
  focusGoalId?: string;
}

export interface GoalsWorkspacePayload {
  referenceDate: string;
  overview: GoalsWorkspaceOverview;
  goals: Goal[];
  insights: GoalInsight[];
  prompts: GoalPrompt[];
}

export interface GoalPlanDraft {
  contributionCents: number;
  frequency: ContributionFrequency;
  autopilot: boolean;
  sourceAccount: string;
  startDate?: string;
}

export interface GoalDraft {
  name: string;
  type: GoalType;
  category: string;
  priority: GoalPriority;
  targetAmountCents: number;
  startingAmountCents: number;
  targetDate: string;
  tags?: string[];
  motivation?: string;
  plan: GoalPlanDraft;
}

export interface GoalRecommendationRequest {
  focus?: string;
  questions?: string[];
  weeksToAdjust?: number;
}

export interface GoalRecommendationAction {
  id: string;
  title: string;
  description: string;
}

export interface GoalRecommendationResponse {
  goalId: string;
  summary: string;
  actions: GoalRecommendationAction[];
  confidence: number;
  createdAt: string;
}

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
});

function formatMonthLabel(date: Date): string {
  return monthFormatter.format(date);
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addMonths(date: Date, months: number): Date {
  const copy = new Date(date);
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function monthsBetween(start: Date, end: Date): number {
  const years = end.getFullYear() - start.getFullYear();
  const months = end.getMonth() - start.getMonth();
  const totalMonths = years * 12 + months;
  return totalMonths <= 0 ? 0 : totalMonths;
}

const dollarsFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function centsToDollars(cents: number): string {
  return dollarsFormatter.format(cents / 100);
}

export const goalsWorkspaceFixture: GoalsWorkspacePayload = {
  referenceDate: '2025-09-15',
  overview: {
    totalGoals: 3,
    totalTargetCents: 2_550_000,
    totalCurrentCents: 1_040_000,
    averageCompletionPercent: 41,
    monthlyCommitmentCents: 176_500,
    flaggedGoals: 1,
    highlight: 'Student loan payoff is tracking three weeks ahead of plan.',
    focusGoalId: 'goal-emergency-fund',
  },
  prompts: [
    {
      id: 'prompt-close-gap',
      label: 'Catch up on emergency savings',
      description:
        'Ask how to close the $6,800 gap over the next 6 months without cutting essentials.',
    },
    {
      id: 'prompt-celebrate',
      label: 'Accelerate debt freedom',
      description:
        'Explore how applying credit card rewards could retire the student loan two months early.',
    },
    {
      id: 'prompt-family-plan',
      label: 'Optimize vacation savings',
      description:
        'Get ideas to boost the family trip fund while keeping monthly transfers comfortable.',
    },
  ],
  insights: [
    {
      id: 'insight-emergency-gap',
      goalId: 'goal-emergency-fund',
      title: 'Emergency fund is one contribution behind',
      body: 'Increase the September transfer by $150 or move the date to align with the 1st paycheck to stay on track.',
      tone: 'attention',
      ctaLabel: 'Adjust plan',
    },
    {
      id: 'insight-loan-ahead',
      goalId: 'goal-student-loan',
      title: 'Loan payoff pacing ahead',
      body: 'Applying the pending $400 expense reimbursement keeps you on pace to finish by March 2026.',
      tone: 'positive',
      ctaLabel: 'Log reimbursement',
    },
    {
      id: 'insight-family-upsell',
      title: 'Leverage round-ups for experiences',
      body: 'Activating round-ups on the Freedom Unlimited card could add roughly $55/mo toward the family trip.',
      tone: 'positive',
      ctaLabel: 'Enable round-ups',
    },
  ],
  goals: [
    {
      id: 'goal-emergency-fund',
      name: 'Emergency Cushion',
      type: 'savings',
      category: 'Emergency',
      priority: 'high',
      health: 'attention',
      targetAmountCents: 1_000_000,
      currentAmountCents: 320_000,
      startDate: '2025-01-10',
      targetDate: '2026-03-01',
      planContributionCents: 60_000,
      contributionFrequency: 'monthly',
      autopilot: true,
      autopilotSourceAccount: 'High-Yield Savings',
      autopilotNote: 'Transfers occur on the 15th with overdraft protection enabled.',
      nextContributionDate: '2025-09-15',
      lastContributionDate: '2025-08-15',
      successProbabilityPercent: 72,
      planSummary: 'Auto-transfer $600.00 each month from High-Yield Savings.',
      tags: ['Emergency', 'Household'],
      milestones: [
        {
          id: 'ms-ef-1',
          label: 'Starter cushion ($3k)',
          targetAmountCents: 300_000,
          targetDate: '2025-03-01',
          achieved: true,
          achievedAt: '2025-03-20',
        },
        {
          id: 'ms-ef-2',
          label: 'Halfway point',
          targetAmountCents: 500_000,
          targetDate: '2025-07-01',
          achieved: false,
        },
        {
          id: 'ms-ef-3',
          label: 'Six-month reserve',
          targetAmountCents: 1_000_000,
          targetDate: '2026-03-01',
          achieved: false,
        },
      ],
      contributions: [
        {
          id: 'contrib-ef-01',
          goalId: 'goal-emergency-fund',
          amountCents: 60_000,
          contributedAt: '2025-08-15',
          source: 'rule',
          note: 'Scheduled transfer',
        },
        {
          id: 'contrib-ef-02',
          goalId: 'goal-emergency-fund',
          amountCents: 60_000,
          contributedAt: '2025-07-15',
          source: 'rule',
        },
        {
          id: 'contrib-ef-03',
          goalId: 'goal-emergency-fund',
          amountCents: 40_000,
          contributedAt: '2025-06-21',
          source: 'bonus',
          note: 'Tax refund boost',
        },
        {
          id: 'contrib-ef-04',
          goalId: 'goal-emergency-fund',
          amountCents: 50_000,
          contributedAt: '2025-05-15',
          source: 'rule',
        },
      ],
      projection: [
        {
          month: 'Sep 2025',
          projectedAmountCents: 380_000,
          targetAmountCents: 375_000,
        },
        {
          month: 'Oct 2025',
          projectedAmountCents: 440_000,
          targetAmountCents: 450_000,
        },
        {
          month: 'Nov 2025',
          projectedAmountCents: 500_000,
          targetAmountCents: 525_000,
        },
        {
          month: 'Dec 2025',
          projectedAmountCents: 560_000,
          targetAmountCents: 600_000,
        },
        {
          month: 'Jan 2026',
          projectedAmountCents: 620_000,
          targetAmountCents: 675_000,
        },
        {
          month: 'Feb 2026',
          projectedAmountCents: 680_000,
          targetAmountCents: 850_000,
        },
        {
          month: 'Mar 2026',
          projectedAmountCents: 740_000,
          targetAmountCents: 1_000_000,
        },
      ],
      aiSummary:
        'You are one month behind schedule; a $150 boost for the next four transfers closes the gap.',
    },
    {
      id: 'goal-student-loan',
      name: 'Student Loan Snowball',
      type: 'debt',
      category: 'Debt payoff',
      priority: 'medium',
      health: 'onTrack',
      targetAmountCents: 1_200_000,
      currentAmountCents: 540_000,
      startDate: '2024-11-01',
      targetDate: '2026-04-01',
      planContributionCents: 75_000,
      contributionFrequency: 'monthly',
      autopilot: true,
      autopilotSourceAccount: 'Cash Rewards Checking',
      autopilotNote: 'Extra payments flow automatically after minimum is met.',
      nextContributionDate: '2025-09-28',
      lastContributionDate: '2025-08-28',
      successProbabilityPercent: 88,
      planSummary: 'Apply $750.00 per month plus snowball any windfalls toward the balance.',
      tags: ['Debt', 'Education'],
      milestones: [
        {
          id: 'ms-loan-1',
          label: 'Balance under $8k',
          targetAmountCents: 800_000,
          targetDate: '2025-12-01',
          achieved: true,
          achievedAt: '2025-08-28',
        },
        {
          id: 'ms-loan-2',
          label: 'Balance under $4k',
          targetAmountCents: 400_000,
          targetDate: '2026-02-01',
          achieved: false,
        },
        {
          id: 'ms-loan-3',
          label: 'Paid in full',
          targetAmountCents: 0,
          targetDate: '2026-04-01',
          achieved: false,
        },
      ],
      contributions: [
        {
          id: 'contrib-loan-01',
          goalId: 'goal-student-loan',
          amountCents: 75_000,
          contributedAt: '2025-08-28',
          source: 'rule',
        },
        {
          id: 'contrib-loan-02',
          goalId: 'goal-student-loan',
          amountCents: 75_000,
          contributedAt: '2025-07-28',
          source: 'rule',
        },
        {
          id: 'contrib-loan-03',
          goalId: 'goal-student-loan',
          amountCents: 120_000,
          contributedAt: '2025-06-30',
          source: 'bonus',
          note: 'Performance bonus applied',
        },
      ],
      projection: [
        {
          month: 'Sep 2025',
          projectedAmountCents: 615_000,
          targetAmountCents: 600_000,
        },
        {
          month: 'Oct 2025',
          projectedAmountCents: 690_000,
          targetAmountCents: 675_000,
        },
        {
          month: 'Nov 2025',
          projectedAmountCents: 765_000,
          targetAmountCents: 750_000,
        },
        {
          month: 'Dec 2025',
          projectedAmountCents: 840_000,
          targetAmountCents: 825_000,
        },
        {
          month: 'Jan 2026',
          projectedAmountCents: 915_000,
          targetAmountCents: 900_000,
        },
        {
          month: 'Feb 2026',
          projectedAmountCents: 990_000,
          targetAmountCents: 975_000,
        },
        {
          month: 'Mar 2026',
          projectedAmountCents: 1_065_000,
          targetAmountCents: 1_050_000,
        },
      ],
      aiSummary:
        'Momentum looks great?stay the course and redirect reimbursements to finish early.',
    },
    {
      id: 'goal-family-vacation',
      name: 'Family Summer Adventure',
      type: 'savings',
      category: 'Travel',
      priority: 'medium',
      health: 'onTrack',
      targetAmountCents: 350_000,
      currentAmountCents: 180_000,
      startDate: '2025-02-14',
      targetDate: '2025-07-01',
      planContributionCents: 41_500,
      contributionFrequency: 'biweekly',
      autopilot: false,
      autopilotSourceAccount: 'Freedom Unlimited',
      autopilotNote: 'Reminder nudges go out the day after each paycheck.',
      nextContributionDate: '2025-09-20',
      lastContributionDate: '2025-09-06',
      successProbabilityPercent: 81,
      planSummary: 'Manually transfer $415.00 every other Friday and sweep card rewards monthly.',
      tags: ['Experiences', 'Family'],
      milestones: [
        {
          id: 'ms-trip-1',
          label: 'Flights booked',
          targetAmountCents: 150_000,
          targetDate: '2025-05-01',
          achieved: true,
          achievedAt: '2025-06-12',
        },
        {
          id: 'ms-trip-2',
          label: 'Lodging reserved',
          targetAmountCents: 260_000,
          targetDate: '2025-06-01',
          achieved: false,
        },
        {
          id: 'ms-trip-3',
          label: 'Spending cash ready',
          targetAmountCents: 350_000,
          targetDate: '2025-07-01',
          achieved: false,
        },
      ],
      contributions: [
        {
          id: 'contrib-trip-01',
          goalId: 'goal-family-vacation',
          amountCents: 41_500,
          contributedAt: '2025-09-06',
          source: 'manual',
        },
        {
          id: 'contrib-trip-02',
          goalId: 'goal-family-vacation',
          amountCents: 41_500,
          contributedAt: '2025-08-23',
          source: 'manual',
        },
        {
          id: 'contrib-trip-03',
          goalId: 'goal-family-vacation',
          amountCents: 20_000,
          contributedAt: '2025-08-08',
          source: 'bonus',
          note: 'Credit card rewards sweep',
        },
      ],
      projection: [
        {
          month: 'Sep 2025',
          projectedAmountCents: 221_500,
          targetAmountCents: 215_000,
        },
        {
          month: 'Oct 2025',
          projectedAmountCents: 263_000,
          targetAmountCents: 258_000,
        },
        {
          month: 'Nov 2025',
          projectedAmountCents: 304_500,
          targetAmountCents: 301_000,
        },
        {
          month: 'Dec 2025',
          projectedAmountCents: 346_000,
          targetAmountCents: 320_000,
        },
      ],
      aiSummary: 'Round-ups alone can cover excursions?keep transfers steady through spring.',
    },
  ],
};
function frequencyToDays(frequency: ContributionFrequency): number {
  switch (frequency) {
    case 'weekly':
      return 7;
    case 'biweekly':
      return 14;
    default:
      return 30;
  }
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function inclusiveMonthsBetween(start: Date, end: Date): number {
  const value = monthsBetween(start, end);
  return value <= 0 ? 1 : value + 1;
}

export const goalsQueryKeys = {
  all: () => ['goals'] as const,
  workspace: () => [...goalsQueryKeys.all(), 'workspace'] as const,
};

export async function fetchGoalsWorkspace(): Promise<GoalsWorkspacePayload> {
  try {
    const response = await fetch('/api/goals', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json() as GoalsWorkspacePayload;
  } catch (error) {
    console.error('Failed to fetch goals workspace:', error);
    // Return fixture data as fallback
    return goalsWorkspaceFixture;
  }
}

export function buildGoalFromDraft(draft: GoalDraft, options?: { referenceDate?: string }): Goal {
  const referenceDate = options?.referenceDate
    ? new Date(options.referenceDate)
    : new Date(goalsWorkspaceFixture.referenceDate);
  const startDate = draft.plan.startDate ? new Date(draft.plan.startDate) : referenceDate;
  const targetDate = new Date(draft.targetDate);
  const id = `goal-${Math.random().toString(36).slice(2, 11)}`;

  const currentAmountCents = clamp(
    Math.round(draft.startingAmountCents),
    0,
    draft.targetAmountCents,
  );
  const planContributionCents = Math.max(0, Math.round(draft.plan.contributionCents));
  const totalMonths = inclusiveMonthsBetween(startDate, targetDate);
  const elapsedMonths = clamp(monthsBetween(startDate, referenceDate), 0, totalMonths);
  const expectedProgress = Math.round(draft.targetAmountCents * (elapsedMonths / totalMonths));

  let health: GoalHealth = 'onTrack';

  if (currentAmountCents >= draft.targetAmountCents) {
    health = 'completed';
  } else {
    const delta = currentAmountCents - expectedProgress;
    const tolerance = Math.max(5_000, draft.targetAmountCents * 0.04);

    if (delta > tolerance * 2) {
      health = 'ahead';
    } else if (delta < -tolerance * 3) {
      health = 'behind';
    } else if (delta < -tolerance) {
      health = 'attention';
    }
  }

  const successProbabilityPercent =
    health === 'behind'
      ? 55
      : health === 'attention'
        ? 66
        : health === 'ahead'
          ? 92
          : health === 'completed'
            ? 100
            : 78;

  const monthsToProject = Math.min(totalMonths, 12);
  const projection: GoalProjectionPoint[] = [];

  for (let index = 0; index < monthsToProject; index += 1) {
    const monthDate = addMonths(referenceDate, index);
    const projectedRaw = currentAmountCents + planContributionCents * (index + 1);
    const targetRatio = clamp((elapsedMonths + index + 1) / totalMonths, 0, 1);
    const targetTrack = Math.round(draft.targetAmountCents * targetRatio);

    projection.push({
      month: formatMonthLabel(monthDate),
      projectedAmountCents: clamp(Math.round(projectedRaw), 0, draft.targetAmountCents),
      targetAmountCents: clamp(targetTrack, 0, draft.targetAmountCents),
    });
  }

  const milestoneRatios = draft.targetAmountCents === 0 ? [] : [0.25, 0.5, 1];
  const milestones: GoalMilestone[] = milestoneRatios.map((ratio, index) => {
    const amount = Math.round(draft.targetAmountCents * ratio);
    const target = addMonths(startDate, Math.max(0, Math.round(totalMonths * ratio) - 1));
    const achieved = currentAmountCents >= amount;
    const label = index === milestoneRatios.length - 1 ? 'Fully funded' : `Milestone ${index + 1}`;

    return {
      id: `${id}-milestone-${index + 1}`,
      label,
      targetAmountCents: amount,
      targetDate: toISODate(target),
      achieved,
      achievedAt: achieved ? toISODate(referenceDate) : undefined,
    };
  });

  if (milestones.length === 0) {
    milestones.push({
      id: `${id}-milestone-1`,
      label: 'Goal reached',
      targetAmountCents: draft.targetAmountCents,
      targetDate: toISODate(targetDate),
      achieved: currentAmountCents >= draft.targetAmountCents,
      achievedAt:
        currentAmountCents >= draft.targetAmountCents ? toISODate(referenceDate) : undefined,
    });
  }

  const tags = Array.from(
    new Set([
      draft.type === 'debt' ? 'Debt' : 'Savings',
      ...(draft.tags ?? []).filter((tag) => tag.trim().length > 0),
    ]),
  );

  const contributions: GoalContribution[] = planContributionCents
    ? [
        {
          id: `${id}-seed`,
          goalId: id,
          amountCents: planContributionCents,
          contributedAt: toISODate(referenceDate),
          source: draft.plan.autopilot ? 'rule' : 'manual',
          note: draft.motivation,
        },
      ]
    : [];

  const nextContributionDate = toISODate(
    addDays(referenceDate, frequencyToDays(draft.plan.frequency)),
  );
  const aiSummary =
    draft.motivation ?? `Stay consistent with contributions to reach ${draft.name}.`;
  const frequencyLabel =
    draft.plan.frequency === 'monthly'
      ? 'month'
      : draft.plan.frequency === 'biweekly'
        ? '2 weeks'
        : 'week';
  const planSummaryPrefix = draft.plan.autopilot ? 'Auto-transfer' : 'Plan to set aside';
  const planSummary = `${planSummaryPrefix} $${centsToDollars(planContributionCents)} every ${frequencyLabel} from ${draft.plan.sourceAccount}.`;

  return {
    id,
    name: draft.name,
    type: draft.type,
    category: draft.category,
    priority: draft.priority,
    health,
    targetAmountCents: draft.targetAmountCents,
    currentAmountCents,
    startDate: toISODate(startDate),
    targetDate: draft.targetDate,
    planContributionCents,
    contributionFrequency: draft.plan.frequency,
    autopilot: draft.plan.autopilot,
    autopilotSourceAccount: draft.plan.sourceAccount,
    autopilotNote: draft.plan.autopilot
      ? 'Automated contributions scheduled after approval.'
      : 'Manual reminders will trigger after each paycheck.',
    nextContributionDate,
    lastContributionDate: contributions.length ? contributions[0]?.contributedAt : undefined,
    successProbabilityPercent,
    planSummary,
    tags,
    milestones,
    contributions,
    projection,
    aiSummary,
  };
}

export async function saveGoal(goalDraft: GoalDraft): Promise<Goal> {
  try {
    const response = await fetch('/api/goals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(goalDraft),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json() as Goal;
  } catch (error) {
    console.error('Failed to save goal:', error);
    throw error;
  }
}

export async function requestGoalRecommendation(
  goal: Goal,
  request: GoalRecommendationRequest = {},
): Promise<GoalRecommendationResponse> {
  const reference = new Date(goalsWorkspaceFixture.referenceDate);
  const targetDate = new Date(goal.targetDate);
  const monthsRemaining = clamp(inclusiveMonthsBetween(reference, targetDate), 1, 24);
  const remainingCents = Math.max(0, goal.targetAmountCents - goal.currentAmountCents);
  const requiredMonthly = monthsRemaining === 0 ? 0 : Math.ceil(remainingCents / monthsRemaining);
  const monthlyGap = requiredMonthly - goal.planContributionCents;

  const summaryParts: string[] = [];

  if (remainingCents === 0) {
    summaryParts.push(`${goal.name} is fully funded?keep contributions to build a buffer.`);
  } else {
    summaryParts.push(
      `${goal.name} has $${centsToDollars(remainingCents)} remaining across ${monthsRemaining} month${
        monthsRemaining === 1 ? '' : 's'
      }.`,
    );

    if (monthlyGap > 0) {
      summaryParts.push(
        `You need roughly $${centsToDollars(monthlyGap)} more per month to stay on target.`,
      );
    } else if (monthlyGap < 0) {
      summaryParts.push(
        `You are ahead by about $${centsToDollars(Math.abs(monthlyGap))} each month.`,
      );
    } else {
      summaryParts.push('Current plan is right on track with the goal timeline.');
    }
  }

  if (request.focus) {
    summaryParts.push(`Focus: ${request.focus.trim()}.`);
  }

  const actions: GoalRecommendationAction[] = [];

  if (monthlyGap > 0) {
    actions.push({
      id: `${goal.id}-action-boost`,
      title: `Boost transfers by $${centsToDollars(monthlyGap)}`,
      description:
        'Increase the next three contributions or redirect cash-back to close the shortfall.',
    });
  } else {
    actions.push({
      id: `${goal.id}-action-maintain`,
      title: 'Maintain current contribution cadence',
      description: 'Stay consistent and review progress after the next statement cycle.',
    });
  }

  if (!goal.autopilot) {
    actions.push({
      id: `${goal.id}-action-autopilot`,
      title: 'Enable automated transfers',
      description:
        'Switch to automated moves so every paycheck nudges the goal forward without manual effort.',
    });
  }

  if (request.questions && request.questions.length > 0) {
    const firstQuestion = request.questions[0];
    actions.push({
      id: `${goal.id}-action-question`,
      title: 'Address your question',
      description: firstQuestion ?? 'Review outstanding questions with the coach.',
    });
  }

  const confidenceAdjustment = monthlyGap > 0 ? -6 : monthlyGap < 0 ? 4 : 0;
  const confidence = clamp(goal.successProbabilityPercent + confidenceAdjustment, 40, 98);

  const response: GoalRecommendationResponse = {
    goalId: goal.id,
    summary: summaryParts.join(' '),
    actions,
    confidence,
    createdAt: new Date().toISOString(),
  };

  return new Promise((resolve) => {
    setTimeout(() => resolve(response), 220);
  });
}
