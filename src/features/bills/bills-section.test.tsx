import { renderWithProviders } from "@test/render-with-providers";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { BillsSection } from "./bills-section";

describe("BillsSection", () => {
  it("renders summary metrics and groups upcoming bills", async () => {
    renderWithProviders(<BillsSection />);

    await screen.findByText("Monthly obligations");

    expect(screen.getByText("$1,991.99")).toBeInTheDocument();
    expect(screen.getByText("Paid $2,450.00 so far")).toBeInTheDocument();
    expect(screen.getByText("1 overdue totaling $1,685.00")).toBeInTheDocument();
    expect(screen.getByText("Coming up (48 hrs)")).toBeInTheDocument();
    expect(screen.getByText("Upcoming reminders")).toBeInTheDocument();
    expect(screen.getByText("Internet bill of $89.00 due in 3 days.")).toBeInTheDocument();
  });

  it("allows toggling a bill between due and paid states", async () => {
    const user = userEvent.setup();
    renderWithProviders(<BillsSection />);

    const fiberTitle = await screen.findByText("Fiber Internet");
    const fiberRow = fiberTitle.closest('[class*="billRow"]');

    if (!fiberRow) {
      throw new Error("Unable to locate Fiber Internet row");
    }

    const markPaidButton = within(fiberRow).getByRole("button", { name: "Mark paid" });
    await user.click(markPaidButton);

    expect(within(fiberRow).getByText("Paid")).toBeInTheDocument();

    const undoButton = within(fiberRow).getByRole("button", { name: "Undo payment" });
    await user.click(undoButton);

    expect(within(fiberRow).getByText("Due soon")).toBeInTheDocument();
  });

  it("orders upcoming reminders chronologically", async () => {
    renderWithProviders(<BillsSection />);

    await screen.findByText("Upcoming reminders");

    const reminderItems = Array.from(document.querySelectorAll('[class*="reminderItem"]'));

    expect(reminderItems).toHaveLength(6);
    expect(reminderItems[0]?.textContent).toContain("Internet bill of $89.00 due in 3 days.");
    expect(reminderItems[1]?.textContent).toContain("Gym membership due today. Mark paid once charged.");
    expect(reminderItems.at(-1)?.textContent).toContain("Power bill will auto-draft this afternoon.");
  });
});
