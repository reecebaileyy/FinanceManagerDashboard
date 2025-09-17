import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DashboardSection } from "./dashboard-section";
import { renderWithProviders } from "@test/render-with-providers";

describe("DashboardSection", () => {
  it("renders KPI summary cards and overview sections", async () => {
    renderWithProviders(<DashboardSection />);

    expect(await screen.findByText("Net worth")).toBeInTheDocument();
    expect(screen.getByText("Spending summary")).toBeInTheDocument();
    expect(screen.getByText("Financial goals")).toBeInTheDocument();
    expect(screen.getByText("Alerts & reminders")).toBeInTheDocument();
    expect(screen.getByText("Quick actions")).toBeInTheDocument();
  });

  it("surfaces alerts and quick actions that users can follow", async () => {
    renderWithProviders(<DashboardSection />);

    expect(await screen.findByText("Dining budget at 84%"));
    expect(
      screen.getByText("Reduce discretionary spend by $120 to stay on track"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Connect account" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open budgets" })).toBeInTheDocument();
  });

  it("summarises recent transactions in a table snapshot", async () => {
    renderWithProviders(<DashboardSection />);

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Trader Joe's")).toBeInTheDocument();
    expect(within(table).getByText("SoFi Savings")).toBeInTheDocument();
  });

  it("allows toggling layout customization controls", async () => {
    const user = userEvent.setup();

    renderWithProviders(<DashboardSection />);

    expect(await screen.findByText("Spending summary")).toBeInTheDocument();

    const customizeButton = screen.getByRole("button", { name: "Customize layout" });
    expect(customizeButton).toBeEnabled();

    await user.click(customizeButton);

    expect(screen.getByRole("button", { name: "Done customizing" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset to default" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reposition Spending summary" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Done customizing" }));
    expect(screen.getByRole("button", { name: "Customize layout" })).toBeInTheDocument();
  });
});

  it("renders helpful messages when overview data is empty", async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(dashboardQueryKeys.overview(), {
      kpis: [],
      monthlySummary: {
        month: "",
        budgeted: "$0",
        spent: "$0",
        remaining: "$0",
        variance: { label: "", tone: "positive" },
      },
      categorySpending: [],
      goals: [],
      alerts: [],
      quickActions: [],
      recentTransactions: [],
    });

    const view = render(
      <QueryClientProvider client={queryClient}>
        <DashboardSection />
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/KPI data will appear/i)).toBeInTheDocument();
    expect(screen.getByText(/Category insights will populate/i)).toBeInTheDocument();
    expect(screen.getByText(/Recent transactions will surface/i)).toBeInTheDocument();

    view.unmount();
    queryClient.clear();
  });
});
