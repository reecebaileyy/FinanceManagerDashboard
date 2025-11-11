import { describe, expect, it } from 'vitest';

import { getBudgetsFixture } from '@lib/api/budgets';

import { buildBudgetCsv } from './budgets-export';

describe('buildBudgetCsv', () => {
  it('generates a CSV export with budget and category details', () => {
    const fixture = getBudgetsFixture();
    const { fileName, csv } = buildBudgetCsv(fixture.budgets, {
      referenceDate: fixture.referenceDate,
    });

    expect(fileName).toBe('budget-export-20250915-1200-3budgets.csv');

    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(
      1 + fixture.budgets.reduce((total, budget) => total + budget.categories.length, 0),
    );
    expect(lines[0]).toBe(
      'Budget Name,Budget Period,Start Date,End Date,Category,Allocated,Spent,Variance,Variance %,Alert Threshold,Rollover Applied,Notes,Last Updated',
    );

    const firstDataRow = lines[1].split(',');
    expect(firstDataRow).toEqual([
      '"Household Essentials"',
      '"Monthly"',
      '"2025-09-01"',
      '"2025-09-30"',
      '"Groceries"',
      '"$650.00"',
      '"$540.55"',
      '"-$109.45"',
      '"-16.8%"',
      '"85%"',
      '"$120.22"',
      '"Groceries trending higher due to back-to-school restock."',
      '"2025-09-18T14:10:00.000Z"',
    ]);

    const rolloverClearedRow = lines[2].split(',');
    expect(rolloverClearedRow[10]).toBe('""');
  });

  it('handles empty budgets gracefully', () => {
    const { fileName, csv } = buildBudgetCsv([], { referenceDate: '2025-09-01T00:00:00Z' });
    expect(fileName).toBe('budget-export-20250901-0000-0budgets.csv');
    expect(csv).toBe(
      'Budget Name,Budget Period,Start Date,End Date,Category,Allocated,Spent,Variance,Variance %,Alert Threshold,Rollover Applied,Notes,Last Updated\r\n',
    );
  });
});
