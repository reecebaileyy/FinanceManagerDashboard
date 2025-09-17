import type { ComponentProps } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ForgotPasswordSection } from "./forgot-password-section";

describe("ForgotPasswordSection", () => {
  const renderSection = (overrides?: Partial<ComponentProps<typeof ForgotPasswordSection>>) => {
    const props = {
      onSubmit: vi.fn<[], Promise<void>>().mockResolvedValue(),
      onBackToLogin: vi.fn(),
      ...overrides,
    } satisfies ComponentProps<typeof ForgotPasswordSection>;

    render(<ForgotPasswordSection {...props} />);

    return props;
  };

  it("validates the email before submitting", async () => {
    renderSection();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    expect(await screen.findByText(/Please confirm the email address/)).toBeInTheDocument();
  });

  it("shows a confirmation message when submit succeeds", async () => {
    const onSubmit = vi.fn<[], Promise<void>>().mockResolvedValue();
    renderSection({ onSubmit });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Email address/i), "casey@example.com");
    await user.click(screen.getByRole("button", { name: "Send reset link" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(await screen.findByText(/reset link is on its way/)).toBeInTheDocument();
  });

  it("supports returning to login", async () => {
    const onBackToLogin = vi.fn();
    renderSection({ onBackToLogin });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Back to login" }));
    expect(onBackToLogin).toHaveBeenCalledTimes(1);
  });
});
