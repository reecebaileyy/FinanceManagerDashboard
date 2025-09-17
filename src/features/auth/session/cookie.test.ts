import { afterAll, describe, expect, it, vi } from "vitest";

import {
  SESSION_COOKIE_NAME,
  createSessionPayload,
  getCookieMaxAgeSeconds,
  parseSessionCookie,
  serializeSessionCookie,
} from "./cookie";

vi.useFakeTimers().setSystemTime(new Date("2025-09-17T08:00:00Z"));

afterAll(() => {
  vi.useRealTimers();
});

describe("session cookie", () => {
  it("creates a payload with defaults when ttl is omitted", () => {
    const payload = createSessionPayload({
      kind: "authenticated",
      user: {
        id: "user-123",
        email: "casey@example.com",
        displayName: "Casey",
        roles: ["member"],
      },
    });

    expect(payload.version).toBe(1);
    expect(payload.kind).toBe("authenticated");
    expect(payload.user.email).toBe("casey@example.com");
    expect(Date.parse(payload.issuedAt)).toBeLessThanOrEqual(Date.now());
    expect(Date.parse(payload.expiresAt)).toBeGreaterThan(Date.now());
  });

  it("round-trips through serialization and parsing", () => {
    const payload = createSessionPayload({
      kind: "demo",
      user: {
        id: "demo",
        email: "demo@financemanager.app",
        displayName: "Demo",
        roles: ["demo"],
      },
      ttlSeconds: 600,
    });

    const serialized = serializeSessionCookie(payload);
    const parsed = parseSessionCookie(serialized);

    expect(parsed).toBeTruthy();
    expect(parsed?.user.displayName).toBe("Demo");
    expect(parsed?.kind).toBe("demo");
  });

  it("returns null for expired payloads", () => {
    const payload = createSessionPayload({
      kind: "authenticated",
      user: {
        id: "user-abc",
        email: "abc@example.com",
        displayName: "Abc",
        roles: ["member"],
      },
      issuedAt: "2025-09-17T06:00:00Z",
      expiresAt: "2025-09-17T06:05:00Z",
    });

    const serialized = serializeSessionCookie(payload);
    expect(parseSessionCookie(serialized)).toBeNull();
  });

  it("returns null for malformed payloads", () => {
    const malformed = encodeURIComponent(JSON.stringify({ foo: "bar" }));
    expect(parseSessionCookie(malformed)).toBeNull();
    expect(parseSessionCookie(undefined)).toBeNull();
  });

  it("computes remaining lifetime in seconds", () => {
    const payload = createSessionPayload({
      kind: "authenticated",
      user: {
        id: "user-xyz",
        email: "xyz@example.com",
        displayName: "Xyz",
        roles: ["member"],
      },
      ttlSeconds: 90,
    });

    const remaining = getCookieMaxAgeSeconds(payload);
    expect(remaining).toBeGreaterThan(0);
    expect(SESSION_COOKIE_NAME).toBe("fm_session");
  });
});
