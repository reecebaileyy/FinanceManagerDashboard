import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithProviders } from '@test/render-with-providers';

import { LandingSection, type LandingQuickLink } from './landing-section';

const quickLinks: LandingQuickLink[] = [
  {
    href: '/transactions',
    title: 'Track transactions',
    description: 'Filter, tag, and reconcile spending in seconds.',
  },
];

describe('LandingSection', () => {
  it('shows marketing hero and guest CTAs when not authenticated', () => {
    renderWithProviders(
      <LandingSection
        isAuthenticated={false}
        username=""
        onGetStarted={vi.fn()}
        onPreviewDashboard={vi.fn()}
        onLogin={vi.fn()}
        onLogout={vi.fn()}
        quickLinks={quickLinks}
      />,
    );

    expect(screen.getByRole('button', { name: 'Get Started' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preview Dashboard' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Already have an account? Log in' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Track transactions')).toBeInTheDocument();
  });

  it('personalises the hero and actions for authenticated users', () => {
    renderWithProviders(
      <LandingSection
        isAuthenticated
        username="Alex Doe"
        onGetStarted={vi.fn()}
        onPreviewDashboard={vi.fn()}
        onLogin={vi.fn()}
        onLogout={vi.fn()}
        quickLinks={quickLinks}
      />,
    );

    expect(screen.getByText('Welcome back, Alex Doe.')).toBeInTheDocument();
    expect(screen.getByText(/Signed in as Alex Doe/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue to Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Already have an account? Log in' }),
    ).not.toBeInTheDocument();
  });
});
