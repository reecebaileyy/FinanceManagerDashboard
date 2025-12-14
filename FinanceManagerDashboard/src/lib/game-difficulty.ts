import type { GameDifficulty, GameType } from '@components/unity-game/types';
import type { Goal } from './api/goals';
import { getCurrentDate } from './date-simulator';

/**
 * Thresholds for budget variance (in percent)
 * Can be adjusted to fine-tune difficulty calculation
 */
export const BUDGET_VARIANCE_THRESHOLDS = {
  HARD: 20,  // >= 20% overspending triggers hard mode
  EASY: -20, // <= -20% under budget triggers easy mode
} as const;

/**
 * Interface for aggregate budget metrics
 * Matches the structure from budgets-section.tsx
 */
export interface AggregateMetrics {
  totalTarget: number;
  totalSpent: number;
  totalRemaining: number;
  projectedEnd: number;
  variance: number;
  variancePercent: number;
  rollover: number;
  daysRemaining: number;
  daysElapsed: number;
  totalDays: number;
  budgetsCount: number;
  chartPoints: unknown[];
  latestUpdate?: Date;
}

/**
 * Calculate game difficulty based on budget variance
 * 
 * @param metrics - Aggregate budget metrics
 * @returns GameDifficulty level
 */
export function calculateBudgetDifficulty(metrics: AggregateMetrics): GameDifficulty {
  const { variancePercent } = metrics;

  // Overspending by 20% or more = hard mode
  if (variancePercent >= BUDGET_VARIANCE_THRESHOLDS.HARD) {
    return 'hard';
  }

  // Saving 20% or more = easy mode
  if (variancePercent <= BUDGET_VARIANCE_THRESHOLDS.EASY) {
    return 'easy';
  }

  // Within range = normal mode
  return 'normal';
}

/**
 * Calculate game difficulty based on goal achievement
 * 
 * @param goals - Array of financial goals
 * @param referenceDate - Reference date for calculations (not currently used but kept for future enhancements)
 * @returns GameDifficulty level
 */
export function calculateGoalDifficulty(goals: Goal[], referenceDate?: string): GameDifficulty {
  if (goals.length === 0) {
    return 'normal';
  }

  // Score each goal: ahead/onTrack = 0, attention = 1, behind = 2, completed = 0
  const scores = goals.map((goal) => {
    switch (goal.health) {
      case 'ahead':
      case 'onTrack':
      case 'completed':
        return 0;
      case 'attention':
        return 1;
      case 'behind':
        return 2;
      default:
        return 0;
    }
  });

  // Calculate average score
  const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

  // Map average score to difficulty
  if (averageScore < 0.5) {
    return 'easy'; // Doing well on goals
  }
  if (averageScore > 1.5) {
    return 'hard'; // Struggling with goals
  }
  return 'normal'; // Mixed performance
}

/**
 * Calculate difficulty for Emergency Cushion game based on whether goal is met by target date
 * For goals: if user meets goal by date = easy, if they miss the date = hard
 * 
 * @param goal - The specific goal to check
 * @param currentDate - Current/reference date for comparison
 * @returns 'easy' if goal met, 'hard' if missed
 */
export function calculateEmergencyCushionDifficulty(goal: Goal, currentDate: Date): GameDifficulty {
  const targetDate = new Date(goal.targetDate);
  const currentAmount = goal.currentAmountCents;
  const targetAmount = goal.targetAmountCents;
  
  // If goal is already completed, it's easy
  if (goal.health === 'completed' || currentAmount >= targetAmount) {
    return 'easy';
  }
  
  // If current date is past target date and goal not met = hard
  if (currentDate > targetDate && currentAmount < targetAmount) {
    return 'hard';
  }
  
  // If still before or on target date
  if (currentDate <= targetDate) {
    // Only 'behind' status before deadline should be hard
    // 'attention', 'onTrack', and 'ahead' are all considered easy if there's still time
    if (goal.health === 'behind') {
      return 'hard';
    }
    return 'easy';
  }
  
  // Fallback to easy
  return 'easy';
}

/**
 * Combine budget and goal difficulties into a single recommendation
 * 
 * @param budgetDifficulty - Difficulty from budget variance
 * @param goalDifficulty - Difficulty from goal achievement
 * @returns Combined GameDifficulty level
 */
export function calculateCombinedDifficulty(
  budgetDifficulty: GameDifficulty | null,
  goalDifficulty: GameDifficulty | null,
): GameDifficulty {
  // Map difficulties to numeric values
  const difficultyToNumber = (difficulty: GameDifficulty): number => {
    switch (difficulty) {
      case 'easy':
        return 1;
      case 'normal':
        return 2;
      case 'hard':
        return 3;
    }
  };

  // Map numeric values back to difficulty
  const numberToDifficulty = (value: number): GameDifficulty => {
    if (value <= 1.5) return 'easy';
    if (value >= 2.5) return 'hard';
    return 'normal';
  };

  // If neither is available, default to normal
  if (!budgetDifficulty && !goalDifficulty) {
    return 'normal';
  }

  // If only one is available, use it
  if (!budgetDifficulty) return goalDifficulty!;
  if (!goalDifficulty) return budgetDifficulty;

  // Both available: average them
  const budgetScore = difficultyToNumber(budgetDifficulty);
  const goalScore = difficultyToNumber(goalDifficulty);
  const averageScore = (budgetScore + goalScore) / 2;

  return numberToDifficulty(averageScore);
}

/**
 * Result of difficulty recommendation including explanation
 */
export interface DifficultyRecommendation {
  difficulty: GameDifficulty;
  reason: string;
}

/**
 * Map a goal to its appropriate game type based on category/name
 * 
 * @param goal - The goal to map
 * @returns The game type to use for this goal
 */
export function getGameTypeForGoal(goal: Goal): GameType {
  const goalNameLower = goal.name.toLowerCase();
  const goalCategoryLower = goal.category.toLowerCase();
  
  // Emergency/Emergency Cushion goals
  if (goalCategoryLower.includes('emergency') || goalNameLower.includes('emergency') || goalNameLower.includes('cushion')) {
    return 'emergency-cushion';
  }
  
  // Travel/Vacation goals
  if (goalCategoryLower.includes('travel') || goalNameLower.includes('vacation') || goalNameLower.includes('trip') || goalNameLower.includes('adventure')) {
    return 'family-vacation';
  }
  
  // Default to emergency cushion for other savings goals
  // You can add more mappings here as you create more games
  return 'emergency-cushion';
}

/**
 * Get a friendly game title based on game type and goal
 * 
 * @param gameType - The type of game
 * @param goal - The goal being played
 * @returns Formatted game title
 */
export function getGameTitle(gameType: GameType, goal: Goal): string {
  switch (gameType) {
    case 'emergency-cushion':
      return `${goal.name} Challenge`;
    case 'family-vacation':
      return `${goal.name} Challenge`;
    case 'budgeting':
      return 'Budgeting Game';
    default:
      return goal.name;
  }
}

/**
 * Get recommended game difficulty based on available financial data
 * 
 * @param budgetMetrics - Optional aggregate budget metrics
 * @param goals - Optional array of financial goals
 * @param referenceDate - Optional reference date for calculations
 * @param specificGoal - Optional specific goal for Emergency Cushion game
 * @returns Difficulty recommendation with explanation
 */
export function getDifficultyRecommendation(
  budgetMetrics?: AggregateMetrics,
  goals?: Goal[],
  referenceDate?: string,
  specificGoal?: Goal,
): DifficultyRecommendation {
  let budgetDifficulty: GameDifficulty | null = null;
  let goalDifficulty: GameDifficulty | null = null;
  const reasons: string[] = [];

  // If specific goal provided, use Emergency Cushion logic
  if (specificGoal) {
    const currentDate = getCurrentDate();
    goalDifficulty = calculateEmergencyCushionDifficulty(specificGoal, currentDate);
    
    const targetDate = new Date(specificGoal.targetDate);
    const isAfterDeadline = currentDate > targetDate;
    const progressPercent = Math.round((specificGoal.currentAmountCents / specificGoal.targetAmountCents) * 100);
    
    if (goalDifficulty === 'hard') {
      if (isAfterDeadline) {
        reasons.push(`Goal deadline passed and only ${progressPercent}% complete`);
      } else {
        reasons.push(`Goal is ${progressPercent}% complete and significantly behind schedule`);
      }
    } else {
      if (specificGoal.health === 'completed') {
        reasons.push(`Goal completed successfully!`);
      } else if (specificGoal.health === 'ahead') {
        reasons.push(`Goal is ${progressPercent}% complete and ahead of schedule`);
      } else {
        reasons.push(`Goal is ${progressPercent}% complete with time remaining`);
      }
    }
    
    return {
      difficulty: goalDifficulty,
      reason: reasons[0],
    };
  }

  // Calculate budget-based difficulty
  if (budgetMetrics) {
    budgetDifficulty = calculateBudgetDifficulty(budgetMetrics);
    
    if (budgetDifficulty === 'hard') {
      reasons.push(`You're overspending by ${Math.abs(budgetMetrics.variancePercent).toFixed(1)}%`);
    } else if (budgetDifficulty === 'easy') {
      reasons.push(`You're saving ${Math.abs(budgetMetrics.variancePercent).toFixed(1)}% under budget`);
    } else {
      reasons.push('Your budget spending is on track');
    }
  }

  // Calculate goal-based difficulty
  if (goals && goals.length > 0) {
    goalDifficulty = calculateGoalDifficulty(goals, referenceDate);
    
    const behindCount = goals.filter(g => g.health === 'behind' || g.health === 'attention').length;
    const aheadCount = goals.filter(g => g.health === 'ahead').length;
    const completedCount = goals.filter(g => g.health === 'completed').length;
    
    if (goalDifficulty === 'hard') {
      reasons.push(`${behindCount} goal${behindCount === 1 ? '' : 's'} need attention`);
    } else if (goalDifficulty === 'easy') {
      if (completedCount > 0) {
        reasons.push(`${completedCount + aheadCount} goal${completedCount + aheadCount === 1 ? '' : 's'} ahead or completed`);
      } else {
        reasons.push(`${aheadCount} goal${aheadCount === 1 ? '' : 's'} ahead of schedule`);
      }
    } else {
      reasons.push('Your goals are progressing steadily');
    }
  }

  // Combine difficulties
  const finalDifficulty = calculateCombinedDifficulty(budgetDifficulty, goalDifficulty);

  // Build reason message
  let reason: string;
  if (reasons.length === 0) {
    reason = 'Based on your current financial performance';
  } else if (reasons.length === 1) {
    reason = reasons[0];
  } else {
    reason = reasons.join(' and ');
  }

  return {
    difficulty: finalDifficulty,
    reason,
  };
}
