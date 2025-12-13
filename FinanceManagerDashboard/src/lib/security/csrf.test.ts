import { constantTimeCompare, generateCsrfToken, isSafeMethod } from "./csrf";

describe("security csrf helpers", () => {
  it("generates a hex token with sufficient entropy", () => {
    const token = generateCsrfToken();

    expect(token).toMatch(/^[a-f0-9]+$/u);
    expect(token).toHaveLength(64);
    expect(generateCsrfToken()).not.toEqual(token);
  });

  it("treats standard safe HTTP methods as safe", () => {
    expect(isSafeMethod("GET")).toBe(true);
    expect(isSafeMethod("head")).toBe(true);
    expect(isSafeMethod("OPTIONS")).toBe(true);
    expect(isSafeMethod("TRACE")).toBe(true);
  });

  it("rejects unsafe methods", () => {
    expect(isSafeMethod("POST")).toBe(false);
    expect(isSafeMethod("PATCH")).toBe(false);
    expect(isSafeMethod("DELETE")).toBe(false);
  });

  it("compares tokens in constant time", () => {
    const token = generateCsrfToken();

    expect(constantTimeCompare(token, token)).toBe(true);
    expect(constantTimeCompare(token, `${token}different`)).toBe(false);
    expect(constantTimeCompare(token, generateCsrfToken())).toBe(false);
  });
});