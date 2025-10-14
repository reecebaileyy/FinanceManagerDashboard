import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@test/render-with-providers';

import { SavingsAutomationSection } from './savings-automation-section';

describe('SavingsAutomationSection', () => {
  it('renders existing automation rules and summary metrics', () => {
    renderWithProviders(<SavingsAutomationSection />);

    expect(screen.getByText('Automated monthly savings')).toBeInTheDocument();
    expect(screen.getByText('Payday sweep')).toBeInTheDocument();
    expect(screen.getByText('Friday rainy-day boost')).toBeInTheDocument();
    expect(screen.getByText('Everyday round-ups')).toBeInTheDocument();
    expect(screen.getByText(/\$1,980\.00/)).toBeInTheDocument();
    expect(screen.getByText(/Coverage 100% of the target/)).toBeInTheDocument();
  });

  it('validates required fields and allows creating a fixed rule', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SavingsAutomationSection />);

    const nameInput = screen.getByLabelText('Rule name');
    await user.clear(nameInput);
    await user.click(screen.getByRole('button', { name: 'Add rule' }));

    expect(screen.getByText('Enter a rule name.')).toBeInTheDocument();

    await user.type(nameInput, 'Weekend treat sweep');
    const amountInput = screen.getByLabelText('Amount per run');
    await user.clear(amountInput);
    await user.type(amountInput, '75');
    await user.click(screen.getByRole('button', { name: 'Add rule' }));

    await waitFor(() => {
      expect(screen.queryByText('Enter a rule name.')).not.toBeInTheDocument();
    });

    expect(screen.getAllByText('Weekend treat sweep').length).toBeGreaterThan(0);
  });

  it('switches to percentage strategy and requires paycheck inputs', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SavingsAutomationSection />);

    await user.click(screen.getByRole('tab', { name: 'Percentage' }));
    const percentageInput = screen.getByLabelText('Percentage of paycheck');
    const paycheckInput = screen.getByLabelText('Typical paycheck amount');

    await user.clear(percentageInput);
    await user.clear(paycheckInput);
    await user.click(screen.getByRole('button', { name: 'Add rule' }));

    expect(await screen.findByText(/Enter a percentage between 1 and 100/)).toBeInTheDocument();
    expect(await screen.findByText(/Estimate the paycheck amount/)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Rule name'), 'Bonus sweep');
    await user.type(percentageInput, '12');
    await user.type(paycheckInput, '5100');
    await user.click(screen.getByRole('button', { name: 'Add rule' }));

    await waitFor(() => {
      expect(screen.getByText(/Bonus sweep/)).toBeInTheDocument();
    });
  });
});
