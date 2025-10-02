import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SignupSection } from './signup-section';

import type { ComponentProps } from 'react';

describe('SignupSection', () => {
  const renderSignup = (overrides?: Partial<ComponentProps<typeof SignupSection>>) => {
    const props = {
      onCreateAccount: vi.fn<[], Promise<void>>().mockResolvedValue(),
      onCancel: vi.fn(),
      ...overrides,
    } satisfies ComponentProps<typeof SignupSection>;

    render(<SignupSection {...props} />);

    return props;
  };

  it('submits the form with valid data', async () => {
    const onCreateAccount = vi.fn<[], Promise<void>>().mockResolvedValue();
    renderSignup({ onCreateAccount });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Full name/i), 'Taylor Rivera');
    await user.type(screen.getByLabelText(/^Email$/i), 'taylor@example.com');
    await user.type(screen.getByLabelText(/^Password$/i), 'StrongPass123!');
    await user.type(screen.getByLabelText(/Confirm password/i), 'StrongPass123!');
    await user.selectOptions(screen.getByLabelText(/Role/i), 'individual');
    await user.click(screen.getByRole('checkbox', { name: /I agree/i }));
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(onCreateAccount).toHaveBeenCalled());
  });

  it('surfaces helpful errors when passwords do not match', async () => {
    const onCreateAccount = vi.fn();
    renderSignup({ onCreateAccount });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Full name/i), 'Quinn Harper');
    await user.type(screen.getByLabelText(/^Email$/i), 'quinn@example.com');
    await user.type(screen.getByLabelText(/^Password$/i), 'StrongPass123!');
    await user.type(screen.getByLabelText(/Confirm password/i), 'Different456?');
    await user.selectOptions(screen.getByLabelText(/Role/i), 'admin');
    await user.click(screen.getByRole('checkbox', { name: /I agree/i }));
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText(/Passwords do not match/)).toBeInTheDocument();
    expect(onCreateAccount).not.toHaveBeenCalled();
  });
});
