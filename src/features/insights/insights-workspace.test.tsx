import { fireEvent, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { renderWithProviders } from "@test/render-with-providers";
import * as insightsApi from "@lib/api/insights";

import { InsightsWorkspace } from "./insights-workspace";

describe("InsightsWorkspace", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the initial assistant message and recommendations", async () => {
    renderWithProviders(<InsightsWorkspace />);

    expect(await screen.findByText(/Hi Jordan!/i)).toBeInTheDocument();
    expect(screen.getByText("Lower dining spend by 00")).toBeInTheDocument();
  });

  it("sends a message and displays the assistant response", async () => {
    const originalSend = insightsApi.sendInsightMessage;
    const sendSpy = vi
      .spyOn(insightsApi, "sendInsightMessage")
      .mockImplementation((input) => originalSend(input));

    renderWithProviders(<InsightsWorkspace />);

    const input = await screen.findByLabelText(/Message the insights assistant/i);

    fireEvent.change(input, { target: { value: "How much did I spend on dining?" } });
    fireEvent.click(screen.getByRole("button", { name: /send/i }));

    await waitFor(() => {
      expect(sendSpy).toHaveBeenCalled();
    });

    expect(await screen.findByText(/You spent $285\.40 on dining last month/i)).toBeInTheDocument();
  });

  it("captures feedback on an assistant message", async () => {
    const feedbackSpy = vi.spyOn(insightsApi, "submitInsightFeedback");

    renderWithProviders(<InsightsWorkspace />);

    const helpfulButton = await screen.findByLabelText(/Mark response helpful/i);

    fireEvent.click(helpfulButton);

    await waitFor(() => {
      expect(feedbackSpy).toHaveBeenCalled();
    });
  });

  it("updates a recommendation status when marked done", async () => {
    renderWithProviders(<InsightsWorkspace />);

    const markDone = await screen.findByRole("button", { name: /mark as done/i });
    fireEvent.click(markDone);

    expect(await screen.findByText(/Acknowledged/i)).toBeInTheDocument();
  });
});
