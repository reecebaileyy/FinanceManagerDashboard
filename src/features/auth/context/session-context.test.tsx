import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";

import { SessionProvider, useSession } from "./session-context";
import { createSessionPayload } from "../session/cookie";

import type { ReactNode } from "react";

function Wrapper({ children }: { children: ReactNode }) {
  return <SessionProvider initialSession={null}>{children}</SessionProvider>;
}

describe("SessionProvider", () => {
  beforeEach(() => {
    document.cookie = "fm_session=; Max-Age=0; path=/";
  });

  it("starts unauthenticated by default", () => {
    const { result } = renderHook(() => useSession(), { wrapper: Wrapper });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.session).toBeNull();
  });

  it("supports entering demo mode", async () => {
    const { result } = renderHook(() => useSession(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.startDemoSession({ displayName: "Demo User" });
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.session?.kind).toBe("demo");
    expect(result.current.session?.user.displayName).toBe("Demo User");
  });

  it("requires two factor for admin emails", async () => {
    const { result } = renderHook(() => useSession(), { wrapper: Wrapper });

    await act(async () => {
      const response = await result.current.signIn(
        { email: "admin@financemanager.app", password: "Secret123!" },
        { redirectTo: "/dashboard" },
      );

      expect(response.status).toBe("needs_two_factor");
    });

    expect(result.current.pendingChallenge).not.toBeNull();
  });

  it("accepts an initial session", () => {
    const initialSession = createSessionPayload({
      kind: "authenticated",
      user: {
        id: "user-123",
        email: "demo@example.com",
        displayName: "Demo Example",
        roles: ["member"],
      },
    });

    const { result } = renderHook(() => useSession(), {
      wrapper: ({ children }) => <SessionProvider initialSession={initialSession}>{children}</SessionProvider>,
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.session?.user.email).toBe("demo@example.com");
  });
});
