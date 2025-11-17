import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/render-with-providers';
import { BudgetsSection } from './budgets-section';

// Basic smoke tests recreated after accidental deletion.

describe('BudgetsSection', () => {
  it('renders budgets header', () => {
    renderWithProviders(<BudgetsSection />);
    expect(screen.getByRole('heading', { name: /Budgets/i })).toBeInTheDocument();
  });

  it('opens create budget modal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BudgetsSection />);
    const addButton = screen.getByRole('button', { name: /Add budget/i });
    await user.click(addButton);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
