import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  CSRF_COOKIE_MAX_AGE_SECONDS,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
  constantTimeCompare,
  generateCsrfToken,
  isSafeMethod,
} from "@lib/security";
import { SESSION_COOKIE_NAME, parseSessionCookie } from "@features/auth/session/cookie";

const HSTS_HEADER_VALUE = "max-age=63072000; includeSubDomains; preload";
const SECURE_COOKIE_PATH = "/";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

const PROTECTED_PATH_PREFIXES = [
  "/dashboard",
  "/transactions",
  "/budgets",
  "/goals",
  "/bills",
  "/savings",
  "/insights",
  "/reports",
  "/settings",
  "/admin",
];

const AUTH_PAGES = new Set(["/login", "/signup", "/forgot-password", "/two-factor"]);

function normalizeProtocol(value: string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.split(",")[0]?.trim().toLowerCase();
}

function enforceHttps(request: NextRequest) {
  if (!IS_PRODUCTION) {
    return undefined;
  }

  const forwardedProto = normalizeProtocol(request.headers.get("x-forwarded-proto"));
  const currentProtocol = normalizeProtocol(request.nextUrl.protocol.replace(":", ""));

  if ((forwardedProto ?? currentProtocol) === "https") {
    return undefined;
  }

  const url = request.nextUrl.clone();
  url.protocol = "https";

  return NextResponse.redirect(url, 308);
}

function buildCsrfForbiddenResponse() {
  return new NextResponse("CSRF token validation failed", {
    status: 403,
    statusText: "Forbidden",
  });
}

function isProtectedPath(pathname: string): boolean {
  if (!pathname) {
    return false;
  }

  return PROTECTED_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function buildRedirectTarget(request: NextRequest): string {
  const pathname = request.nextUrl.pathname || "/";
  const search = request.nextUrl.search;
  return search ? `${pathname}${search}` : pathname;
}

export function middleware(request: NextRequest) {
  const httpsRedirect = enforceHttps(request);

  if (httpsRedirect) {
    return httpsRedirect;
  }

  const pathname = request.nextUrl.pathname ?? "/";
  const sessionCookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = parseSessionCookie(sessionCookieValue ?? null);

  if (isProtectedPath(pathname) && !session) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", buildRedirectTarget(request));
    return NextResponse.redirect(loginUrl);
  }

  if (session && AUTH_PAGES.has(pathname)) {
    const redirectParam = request.nextUrl.searchParams.get("redirect");
    const destination = redirectParam && redirectParam.startsWith("/") ? redirectParam : "/dashboard";
    const target = request.nextUrl.clone();
    target.pathname = destination;
    target.search = "";
    return NextResponse.redirect(target);
  }

  const response = NextResponse.next();

  if (IS_PRODUCTION) {
    response.headers.set("Strict-Transport-Security", HSTS_HEADER_VALUE);
  }

  const method = request.method ?? "GET";
  const csrfCookieValue = request.cookies.get(CSRF_COOKIE_NAME)?.value;
  const csrfHeaderValue = request.headers.get(CSRF_HEADER_NAME) ?? undefined;

  if (!isSafeMethod(method)) {
    if (!csrfCookieValue || !csrfHeaderValue || !constantTimeCompare(csrfCookieValue, csrfHeaderValue)) {
      return buildCsrfForbiddenResponse();
    }
  }

  const shouldIssueToken = !csrfCookieValue;
  const token = shouldIssueToken ? generateCsrfToken() : csrfCookieValue;

  response.cookies.set({
    name: CSRF_COOKIE_NAME,
    value: token,
    secure: IS_PRODUCTION,
    httpOnly: false,
    sameSite: "strict",
    path: SECURE_COOKIE_PATH,
    maxAge: CSRF_COOKIE_MAX_AGE_SECONDS,
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
