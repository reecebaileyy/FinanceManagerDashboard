import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as insightsApi from '@lib/api/insights';
import { createTestQueryClient } from '@lib/react-query';
import { renderWithProviders } from '@test/render-with-providers';

import { InsightsWorkspace } from './insights-workspace';

const mockSendInsightMessage = vi.spyOn(insightsApi, 'sendInsightMessage');

describe('InsightsWorkspace persistence', () => {
  afterEach(() => {
    mockSendInsightMessage.mockReset();
  });

  it('retains follow-up prompts after remount with cached overview data', async () => {
    const queryClient = createTestQueryClient();
    const view = renderWithProviders(<InsightsWorkspace />, { queryClient });

    expect(
      await screen.findByRole('button', {
        name: /Show my cash flow forecast for the next 3 months/i,
      }),
    ).toBeInTheDocument();

    view.unmount();

    renderWithProviders(<InsightsWorkspace />, { queryClient });

    expect(
      await screen.findByRole('button', {
        name: /Show my cash flow forecast for the next 3 months/i,
      }),
    ).toBeInTheDocument();
  });

  it('persists updated follow-up prompts produced during the session', async () => {
    const queryClient = createTestQueryClient();
    const user = userEvent.setup();
    const view = renderWithProviders(<InsightsWorkspace />, { queryClient });

    const overview = await insightsApi.fetchInsightsOverview();

    mockSendInsightMessage.mockResolvedValueOnce({
      sessionId: overview.session.sessionId,
      reply: {
        id: 'assistant-dining-followup',
        role: 'assistant',
        content: 'You spent $285.40 on dining last month, about $32 higher than your plan.',
        createdAt: new Date().toISOString(),
      },
      recommendations: overview.recommendations,
      followUps: [
        'How is my dining budget trending?',
        'Can you suggest lower-cost meal ideas?',
        overview.followUps[2],
      ],
    });

    const input = await screen.findByLabelText(/Message the insights assistant/i);
    await user.type(input, 'How much did I spend on dining?');
    expect(input).toHaveValue('How much did I spend on dining?');

    const sendButton = screen.getByRole('button', { name: /send/i });
    expect(sendButton).toBeEnabled();
    await user.click(sendButton);

    await waitFor(() => expect(mockSendInsightMessage).toHaveBeenCalledTimes(1));

    expect(await screen.findByText(/You spent .* on dining last month/i)).toBeInTheDocument();

    expect(
      await screen.findByRole('button', { name: /How is my dining budget trending/i }),
    ).toBeInTheDocument();

    view.unmount();

    renderWithProviders(<InsightsWorkspace />, { queryClient });

    expect(
      await screen.findByRole('button', { name: /How is my dining budget trending/i }),
    ).toBeInTheDocument();
  });
});
