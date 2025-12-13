import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@test/render-with-providers';

import { SettingsSection } from './settings-section';

describe('SettingsSection', () => {
  it('renders the primary account management sections', () => {
    renderWithProviders(<SettingsSection onBackToDashboard={vi.fn()} />);

    expect(screen.getByText('Account settings')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Linked institutions')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('Account deletion')).toBeInTheDocument();
  });

  it('stores notification changes and confirms saves', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsSection onBackToDashboard={vi.fn()} />);

    const aiRecommendations = screen.getByLabelText('AI recommendations');
    expect(aiRecommendations).not.toBeChecked();

    await user.click(aiRecommendations);
    expect(aiRecommendations).toBeChecked();

    await user.click(screen.getByRole('button', { name: 'Save notification settings' }));

    expect(
      await screen.findByText(
        "Notification preferences saved. You'll only hear from us when it matters.",
      ),
    ).toBeInTheDocument();
  });

  it('syncs accounts and surfaces completion feedback', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsSection onBackToDashboard={vi.fn()} />);

    const syncButton = screen.getAllByRole('button', { name: 'Sync now' })[0];
    await user.click(syncButton);

    expect(await screen.findByText(/was synced successfully/i)).toBeInTheDocument();
  });

  it('requires DELETE confirmation before enabling account removal', async () => {
    const user = userEvent.setup();
    renderWithProviders(<SettingsSection onBackToDashboard={vi.fn()} />);

    const deleteButton = screen.getByRole('button', { name: 'Delete account' });
    expect(deleteButton).toBeDisabled();

    const confirmationInput = screen.getByLabelText(/type delete to confirm/i);
    await user.type(confirmationInput, 'DELETE');
    expect(deleteButton).toBeEnabled();

    await user.click(deleteButton);

    expect(
      await screen.findByText(
        "Your deletion request is queued. We'll email you within 24 hours to finalize the process.",
      ),
    ).toBeInTheDocument();
  });
});
