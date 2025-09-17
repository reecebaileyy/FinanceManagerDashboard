const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS", "TRACE"]);

export const CSRF_COOKIE_NAME = "fm_csrf" as const;
export const CSRF_HEADER_NAME = "x-csrf-token" as const;
export const CSRF_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24;

export function isSafeMethod(method: string | undefined): boolean {
  if (!method) {
    return true;
  }

  return SAFE_METHODS.has(method.toUpperCase());
}

function randomBytesHex(byteLength: number): string {
  const cryptoImpl = globalThis.crypto;

  if (!cryptoImpl?.getRandomValues) {
    throw new Error("Global crypto API is not available to generate CSRF token");
  }

  const bytes = new Uint8Array(byteLength);
  cryptoImpl.getRandomValues(bytes);

  let hex = "";
  for (let index = 0; index < bytes.length; index += 1) {
    hex += bytes[index]!.toString(16).padStart(2, "0");
  }

  return hex;
}

export function generateCsrfToken(): string {
  return randomBytesHex(32);
}

export function constantTimeCompare(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) {
    return false;
  }

  if (a.length !== b.length) {
    return false;
  }

  let result = 0;

  for (let index = 0; index < a.length; index += 1) {
    result |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }

  return result === 0;
}

export function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }

  const pattern = new RegExp(`(?:^|; )${name.replace(/([\\.$?*|{}()\[\]\\\/\+^])/g, "\\$1")}=([^;]*)`);
  const match = pattern.exec(document.cookie);

  if (!match?.[1]) {
    return undefined;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch (error) {
    console.warn("Failed to decode cookie", error);
    return undefined;
  }
}