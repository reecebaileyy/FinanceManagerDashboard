import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { SessionProvider, type AuthSession } from "@features/auth";
import { useDashboardLayout, type DashboardLayout } from "./use-dashboard-layout";

const mockSession: AuthSession = {
  version: 1,
  kind: "authenticated",
  user: {
    id: "user-test",
    email: "test@example.com",
    displayName: "Test User",
    roles: ["member"],
  },
  issuedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
};

function Wrapper({ children }: { children: React.ReactNode }) {
  return <SessionProvider initialSession={mockSession}>{children}</SessionProvider>;
}

describe("useDashboardLayout", () => {
  const storageKey = `fm.dashboard.layout.v1:${mockSession.user.id}`;

  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns the default layout when nothing is stored", async () => {
    const { result } = renderHook(() => useDashboardLayout(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
    });

    expect(result.current.layout.primary).toEqual([
      "spending-summary",
      "financial-goals",
      "recent-transactions",
    ]);
    expect(result.current.layout.secondary).toEqual(["alerts-reminders", "quick-actions"]);
  });

  it("hydrates the layout from local storage for the current user", async () => {
    const stored: DashboardLayout = {
      primary: ["recent-transactions", "financial-goals", "spending-summary"],
      secondary: ["quick-actions", "alerts-reminders"],
    };
    window.localStorage.setItem(storageKey, JSON.stringify(stored));

    const { result } = renderHook(() => useDashboardLayout(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.layout.primary).toEqual(stored.primary);
    });
    expect(result.current.layout.secondary).toEqual(stored.secondary);
  });

  it("persists updates and can reset back to defaults", async () => {
    const { result } = renderHook(() => useDashboardLayout(), { wrapper: Wrapper });

    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
    });

    act(() => {
      result.current.setLayout((previous) => ({
        primary: [...previous.primary.slice(1), previous.primary[0]],
        secondary: previous.secondary,
      }));
    });

    const persisted = JSON.parse(window.localStorage.getItem(storageKey) ?? "null");
    expect(persisted.primary[0]).toBe("financial-goals");

    act(() => {
      result.current.resetLayout();
    });

    expect(result.current.layout.primary).toEqual([
      "spending-summary",
      "financial-goals",
      "recent-transactions",
    ]);
    const reset = JSON.parse(window.localStorage.getItem(storageKey) ?? "null");
    expect(reset.primary[0]).toBe("spending-summary");
  });
});
