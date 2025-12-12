import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ThemeProvider, ThemeToggle, THEME_COOKIE_NAME, THEME_STORAGE_KEY } from "@features/theme";

describe("ThemeProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.cookie = THEME_COOKIE_NAME + "=; Max-Age=0; Path=/;";
  });

  it("applies the current theme and persists updates", async () => {
    const user = userEvent.setup();

    const { getByRole } = render(
      <ThemeProvider initialTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    );

    const toggleButton = getByRole("button", { name: /switch to dark theme/i });

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(toggleButton).toHaveAttribute("aria-pressed", "false");
    await user.click(toggleButton);

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.cookie).toContain(THEME_COOKIE_NAME + "=dark");
    expect(toggleButton).toHaveAttribute("aria-pressed", "true");
  });

  it("prefers a stored theme over the provided initial value", () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "dark");

    const { getByRole } = render(
      <ThemeProvider initialTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    );

    const toggleButton = getByRole("button", { name: /switch to light theme/i });

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(toggleButton).toHaveAttribute("aria-pressed", "true");
    expect(document.documentElement.style.colorScheme).toBe("dark");
  });
});
