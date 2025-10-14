import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@test/render-with-providers';

import { BudgetsSection } from './budgets-section';

describe('BudgetsSection', () => {
  it('renders active budgets and variance alerts', () => {
    renderWithProviders(<BudgetsSection />);

    expect(screen.getByRole('heading', { name: 'Household Essentials' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dining & Entertainment' })).toBeInTheDocument();

    expect(screen.getAllByText('$2,250.00')[0]).toBeInTheDocument();
    expect(screen.getAllByText('$1,677.90')[0]).toBeInTheDocument();

    const alertsHeading = screen.getByRole('heading', { name: 'Variance alerts' });
    const alertsPanel = alertsHeading.closest('div')?.parentElement;
    expect(alertsPanel).not.toBeNull();
    if (alertsPanel) {
      expect(within(alertsPanel).getByText(/Dining out is at/i)).toBeInTheDocument();
    }
  });

  it('opens the create budget modal from the CTA', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BudgetsSection />);

    await user.click(screen.getByRole('button', { name: 'Add budget' }));

    expect(screen.getByRole('heading', { name: 'Create budget' })).toBeInTheDocument();
  });

  it('shows validation errors when saving an incomplete budget', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BudgetsSection />);

    await user.click(screen.getByRole('button', { name: 'Add budget' }));
    await user.click(screen.getByRole('button', { name: 'Create budget' }));

    expect(screen.getByText('Budget name is required.')).toBeInTheDocument();
    expect(screen.getByText('Enter a target amount greater than zero.')).toBeInTheDocument();
  });

  it('allows creating a new budget', async () => {
    const user = userEvent.setup();
    renderWithProviders(<BudgetsSection />);

    await user.click(screen.getByRole('button', { name: 'Add budget' }));

    await user.type(screen.getByLabelText('Budget name'), 'Research Budget');
    const targetInput = screen.getByLabelText('Target amount');
    await user.clear(targetInput);
    await user.type(targetInput, '500');

    await user.type(screen.getByLabelText('Category name'), 'Workshops');
    await user.type(screen.getByLabelText('Allocated amount'), '500');
    await user.type(screen.getByLabelText('Spent to date'), '240');

    await user.click(screen.getByRole('button', { name: 'Create budget' }));

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Create budget' })).not.toBeInTheDocument();
    });

    expect(screen.getByRole('heading', { name: 'Research Budget' })).toBeInTheDocument();
  });
});
