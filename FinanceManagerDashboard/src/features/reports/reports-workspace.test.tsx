import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { __resetReportsFixture } from '@lib/api/reports';
import { renderWithProviders } from '@test/render-with-providers';

import { ReportsWorkspace } from './reports-workspace';

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(
  navigator as Navigator & { clipboard?: unknown },
  'clipboard',
);

describe('ReportsWorkspace', () => {
  beforeEach(() => {
    __resetReportsFixture();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalClipboardDescriptor) {
      Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor);
    } else {
      delete (navigator as Navigator & { clipboard?: unknown }).clipboard;
    }
  });

  it('renders existing export jobs and share summaries', async () => {
    renderWithProviders(<ReportsWorkspace />);

    expect((await screen.findAllByText(/Transactions - /i)).length).toBeGreaterThan(0);
    expect(screen.getByText(/Budgets - /i)).toBeInTheDocument();
    expect(screen.getByText(/Cash flow - /i)).toBeInTheDocument();

    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText(/Downloads enabled/i)).toBeInTheDocument();
  });

  it('queues a new export from the modal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportsWorkspace />);

    expect((await screen.findAllByText(/Transactions - /i)).length).toBeGreaterThan(0);

    await user.click(screen.getAllByRole('button', { name: /queue export/i })[0]);

    const modal = await screen.findByRole('dialog', { name: /queue new export/i });

    await user.selectOptions(within(modal).getByLabelText(/report type/i), 'tax_summary');
    await user.selectOptions(within(modal).getByLabelText(/format/i), 'pdf');

    fireEvent.change(within(modal).getByLabelText(/from date/i), {
      target: { value: '2025-09-01' },
    });
    fireEvent.change(within(modal).getByLabelText(/to date/i), {
      target: { value: '2025-09-30' },
    });

    const categoriesInput = within(modal).getByLabelText(/filter categories/i);
    await user.clear(categoriesInput);
    await user.type(categoriesInput, 'taxes');

    await user.click(within(modal).getByLabelText(/email/i, { selector: "input[type='radio']" }));

    const emailInput = within(modal).getByLabelText(/email address/i);
    await user.type(emailInput, 'reports@example.com');

    await user.click(within(modal).getByRole('button', { name: /queue export/i }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /queue new export/i })).not.toBeInTheDocument();
    });

    expect(await screen.findByText(/Tax summary - /i)).toBeInTheDocument();
    expect(screen.getAllByText('Queued')[0]).toBeInTheDocument();
  });

  it('creates a share link for a ready report', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
      writable: true,
    });

    renderWithProviders(<ReportsWorkspace />);

    const readyRowTitle = (await screen.findAllByText(/Transactions - /i))[0];
    const readyRow = readyRowTitle.closest('tr');
    expect(readyRow).toBeTruthy();

    await user.click(within(readyRow!).getByRole('button', { name: /share/i }));

    const modal = await screen.findByRole('dialog', { name: /share transactions/i });

    await user.selectOptions(within(modal).getByLabelText(/expiry/i), '60');

    const passwordInput = within(modal).getByLabelText(/optional password/i);
    await user.type(passwordInput, 'Meeting2025');

    await user.click(within(modal).getByRole('button', { name: /create link/i }));

    expect(await within(modal).findByText(/share link ready/i)).toBeInTheDocument();

    await user.click(within(modal).getByRole('button', { name: /copy link/i }));
    expect(writeText).toHaveBeenCalled();

    expect(within(modal).getByText(/downloads enabled/i)).toBeInTheDocument();
    expect(screen.getAllByText(/password required/i).length).toBeGreaterThanOrEqual(1);
  });
});
