import { NextRequest, NextResponse } from 'next/server';
import { 
  Budget, 
  BudgetsWorkspacePayload, 
  getBudgetsFixture 
} from '@/lib/api/budgets';

// In-memory storage for demonstration - replace with database in production
let storedBudgetsWorkspace: BudgetsWorkspacePayload = getBudgetsFixture();

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json(storedBudgetsWorkspace);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const workspace = body as BudgetsWorkspacePayload;

    // Basic validation
    if (!workspace.budgets || !Array.isArray(workspace.budgets)) {
      return NextResponse.json({ error: 'Invalid budgets workspace format' }, { status: 400 });
    }

    if (!workspace.referenceDate) {
      return NextResponse.json({ error: 'Reference date is required' }, { status: 400 });
    }

    // Validate each budget
    for (const budget of workspace.budgets) {
      if (!budget.id || !budget.name?.trim()) {
        return NextResponse.json({ error: 'Each budget must have an ID and name' }, { status: 400 });
      }

      if (!budget.categories || !Array.isArray(budget.categories) || budget.categories.length === 0) {
        return NextResponse.json({ error: 'Each budget must have at least one category' }, { status: 400 });
      }

      if (budget.targetAmount <= 0) {
        return NextResponse.json({ error: 'Budget target amount must be greater than zero' }, { status: 400 });
      }

      // Validate categories
      for (const category of budget.categories) {
        if (!category.id || !category.name?.trim()) {
          return NextResponse.json({ error: 'Each category must have an ID and name' }, { status: 400 });
        }

        if (category.allocated < 0 || category.spent < 0) {
          return NextResponse.json({ error: 'Category amounts cannot be negative' }, { status: 400 });
        }
      }

      // Validate dates
      const startDate = new Date(budget.startDate);
      const endDate = new Date(budget.endDate);
      
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return NextResponse.json({ error: 'Invalid start or end date format' }, { status: 400 });
      }

      if (endDate < startDate) {
        return NextResponse.json({ error: 'End date cannot be before start date' }, { status: 400 });
      }
    }

    // Store the workspace
    storedBudgetsWorkspace = workspace;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving budgets:', error);
    return NextResponse.json({ error: 'Failed to save budgets' }, { status: 500 });
  }
}