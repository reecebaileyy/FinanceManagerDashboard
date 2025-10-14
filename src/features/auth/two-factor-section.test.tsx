import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@test/render-with-providers';

import { TwoFactorSection } from './two-factor-section';

import type { ComponentProps } from 'react';

describe('TwoFactorSection', () => {
  const renderSection = (overrides?: Partial<ComponentProps<typeof TwoFactorSection>>) => {
    const props = {
      onVerify: vi.fn<[], Promise<void>>().mockResolvedValue(),
      onResendCode: vi.fn<[], Promise<void>>().mockResolvedValue(),
      onCancel: vi.fn(),
      username: 'Alex',
      method: 'email' as const,
      destination: 'alex@example.com',
      backupCodesRemaining: 3,
      ...overrides,
    } satisfies ComponentProps<typeof TwoFactorSection>;

    renderWithProviders(<TwoFactorSection {...props} />);

    return props;
  };

  it('submits a six digit code', async () => {
    const onVerify = vi.fn<[], Promise<void>>().mockResolvedValue();
    renderSection({ onVerify });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Authentication code/i), '123456');
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() => expect(onVerify).toHaveBeenCalledWith({ method: 'code', code: '123456' }));
  });

  it('supports backup codes', async () => {
    const onVerify = vi.fn<[], Promise<void>>().mockResolvedValue();
    renderSection({ onVerify });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Use a backup code instead' }));
    await user.type(screen.getByLabelText(/Backup code/i), 'ABCD-1234');
    await user.click(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() =>
      expect(onVerify).toHaveBeenCalledWith({ method: 'backup', backupCode: 'ABCD-1234' }),
    );
  });

  it('lets users resend a code', async () => {
    const onResendCode = vi.fn<[], Promise<void>>().mockResolvedValue();
    renderSection({ onResendCode });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Resend code' }));

    expect(onResendCode).toHaveBeenCalledTimes(1);
  });
});
