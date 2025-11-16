import { NextRequest, NextResponse } from 'next/server';
import { 
  Goal, 
  GoalsWorkspacePayload, 
  GoalDraft, 
  buildGoalFromDraft,
  goalsWorkspaceFixture 
} from '@/lib/api/goals';

// In-memory storage for demonstration - replace with database in production
let storedGoals: Goal[] = [...goalsWorkspaceFixture.goals];
let storedWorkspace: GoalsWorkspacePayload = { ...goalsWorkspaceFixture };

function computeOverview(goals: Goal[]) {
  if (goals.length === 0) {
    return {
      totalGoals: 0,
      totalTargetCents: 0,
      totalCurrentCents: 0,
      averageCompletionPercent: 0,
      monthlyCommitmentCents: 0,
      flaggedGoals: 0,
      highlight: "Create your first goal to start tracking progress.",
      focusGoalId: undefined,
    };
  }

  const totals = goals.reduce(
    (acc, goal) => {
      acc.totalTarget += goal.targetAmountCents;
      acc.totalCurrent += goal.currentAmountCents;
      const completion = goal.targetAmountCents === 0 ? 1 : Math.max(0, Math.min(1, goal.currentAmountCents / goal.targetAmountCents));
      acc.totalProgress += completion * 100;
      acc.monthlyCommitment += goal.planContributionCents;
      if (goal.health === "attention" || goal.health === "behind") {
        acc.flagged += 1;
      }
      return acc;
    },
    { totalTarget: 0, totalCurrent: 0, totalProgress: 0, monthlyCommitment: 0, flagged: 0 },
  );

  const averageCompletionPercent = Math.round(totals.totalProgress / goals.length);
  const highlight = totals.flagged > 0
    ? "One or more goals need a quick tune-up to stay on plan."
    : "Every goal is pacing on plan - great work.";
  const focusGoalId = goals.find((goal) => goal.health === "attention" || goal.health === "behind")?.id ?? goals[0]?.id;

  return {
    totalGoals: goals.length,
    totalTargetCents: totals.totalTarget,
    totalCurrentCents: totals.totalCurrent,
    averageCompletionPercent: Math.max(0, Math.min(100, averageCompletionPercent)),
    monthlyCommitmentCents: totals.monthlyCommitment,
    flaggedGoals: totals.flagged,
    highlight,
    focusGoalId,
  };
}

export async function GET(): Promise<NextResponse> {
  try {
    // Update overview based on current goals
    const overview = computeOverview(storedGoals);
    
    const workspace: GoalsWorkspacePayload = {
      ...storedWorkspace,
      goals: storedGoals,
      overview,
    };

    return NextResponse.json(workspace);
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const goalDraft = body as GoalDraft;

    // Validate the draft
    if (!goalDraft.name?.trim()) {
      return NextResponse.json({ error: 'Goal name is required' }, { status: 400 });
    }

    if (!goalDraft.category?.trim()) {
      return NextResponse.json({ error: 'Goal category is required' }, { status: 400 });
    }

    if (goalDraft.targetAmountCents <= 0) {
      return NextResponse.json({ error: 'Target amount must be greater than zero' }, { status: 400 });
    }

    if (!goalDraft.targetDate) {
      return NextResponse.json({ error: 'Target date is required' }, { status: 400 });
    }

    // Check if target date is in the future
    const targetDate = new Date(goalDraft.targetDate);
    const now = new Date();
    if (targetDate <= now) {
      return NextResponse.json({ error: 'Target date must be in the future' }, { status: 400 });
    }

    if (goalDraft.plan.contributionCents <= 0) {
      return NextResponse.json({ error: 'Contribution amount must be greater than zero' }, { status: 400 });
    }

    // Build the goal from the draft
    const referenceDate = new Date().toISOString().slice(0, 10);
    const newGoal = buildGoalFromDraft(goalDraft, { referenceDate });

    // Add to stored goals
    storedGoals.push(newGoal);

    // Update stored workspace
    storedWorkspace = {
      ...storedWorkspace,
      goals: storedGoals,
      overview: computeOverview(storedGoals),
    };

    return NextResponse.json(newGoal, { status: 201 });
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
  }
}