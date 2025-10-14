import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { renderWithProviders } from '@test/render-with-providers';

import { GoalsSection } from './goals-section';

describe('GoalsSection', () => {
  it('renders overview metrics and active goals', async () => {
    renderWithProviders(<GoalsSection />);

    await screen.findByText('Goal commitments');

    expect(screen.getByText('$10,400.00')).toBeInTheDocument();
    expect(screen.getAllByText('Emergency Cushion').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Student Loan Snowball').length).toBeGreaterThan(0);
    expect(screen.getByText(/Monthly plan/)).toBeInTheDocument();
  });

  it('walks through the wizard and creates a new goal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GoalsSection />);

    await screen.findByLabelText('Goal name');

    await user.type(screen.getByLabelText('Goal name'), 'Dream Kitchen');
    await user.type(screen.getByLabelText('Target amount'), '15000');
    await user.type(screen.getByLabelText('Starting amount'), '2000');
    await user.type(screen.getByLabelText('Target date'), '2026-12-01');
    await user.type(screen.getByLabelText('Category'), 'Home');

    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.type(screen.getByLabelText('Contribution amount'), '750');
    const sourceInput = screen.getByLabelText('Source account');
    await user.clear(sourceInput);
    await user.type(sourceInput, 'Everyday Checking');
    await user.type(screen.getByLabelText('Motivation (optional)'), 'Upgrade appliances');

    await user.click(screen.getByRole('button', { name: 'Next' }));

    await user.click(screen.getByRole('button', { name: 'Create goal' }));

    await screen.findByText('Added Dream Kitchen to active goals.');
    expect(screen.getAllByText('Dream Kitchen').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Goal name').value).toBe('');
  });

  it('requests an assistant recommendation', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GoalsSection />);

    await screen.findByText('Assistant');

    await user.click(screen.getByRole('button', { name: /Catch up on emergency savings/i }));
    await user.click(screen.getByRole('button', { name: 'Ask assistant' }));

    await screen.findByText(/Emergency Cushion has \$6,800\.00 remaining/);
    expect(screen.getByText(/Boost transfers by \$/)).toBeInTheDocument();
    expect(screen.getByText(/Confidence/)).toBeInTheDocument();
  });
});
