import type { ComponentProps } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LoginSection, type LoginFormValues } from "./login-section";

function renderLoginSection(overrides?: Partial<ComponentProps<typeof LoginSection>>) {
  const props = {
    onLogin: vi.fn<[], Promise<void>>().mockResolvedValue(),
    onCreateAccount: vi.fn(),
    onForgotPassword: vi.fn(),
    ...overrides,
  } satisfies ComponentProps<typeof LoginSection>;

  render(<LoginSection {...props} />);

  return props;
}

describe("LoginSection", () => {
  it("submits valid credentials and surfaces a success message", async () => {
    const onLogin = vi.fn<(values: LoginFormValues) => Promise<void>>().mockResolvedValue();
    renderLoginSection({ onLogin });
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Email/i), "admin@financemanager.app");
    await user.type(screen.getByLabelText(/Password/i), "SecurePass123!");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(onLogin).toHaveBeenCalledWith({
        email: "admin@financemanager.app",
        password: "SecurePass123!",
      }),
    );

    expect(screen.getByText(/Welcome back/)).toBeInTheDocument();
  });

  it("shows validation feedback when fields are missing", async () => {
    renderLoginSection();

    fireEvent.submit(screen.getByRole("button", { name: "Sign in" }).closest("form")!);

    expect(await screen.findByText(/Review the highlighted fields/)).toBeInTheDocument();
    expect(screen.getByText(/Email is required/)).toBeInTheDocument();
    expect(screen.getByText(/Password is required/)).toBeInTheDocument();
  });

  it("provides access to forgot password and create account shortcuts", async () => {
    const onCreateAccount = vi.fn();
    const onForgotPassword = vi.fn();
    renderLoginSection({ onCreateAccount, onForgotPassword });
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Create account" }));
    await user.click(screen.getByRole("button", { name: "Forgot password?" }));

    expect(onCreateAccount).toHaveBeenCalledTimes(1);
    expect(onForgotPassword).toHaveBeenCalledTimes(1);
  });
});
