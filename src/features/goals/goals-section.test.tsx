import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@test/render-with-providers';
import { GoalsSection } from '../goals'; // Adjust import if GoalsSection is exported differently

// Basic smoke tests recreated after accidental deletion.
// Expand with real goal creation flows as needed.

describe('GoalsSection', () => {
  it('renders goals heading', () => {
    renderWithProviders(<GoalsSection />);
    expect(screen.getByRole('heading', { name: /Goals/i })).toBeInTheDocument();
  });

  it('shows create goal intent (button or link)', async () => {
    renderWithProviders(<GoalsSection />);
    // Try common button text; adjust if component differs.
    const createButton = screen.queryByRole('button', { name: /Add goal|Create goal/i });
    expect(createButton).toBeTruthy();
  });
});
