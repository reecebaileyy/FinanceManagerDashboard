import { cookies, type ReadonlyRequestCookies } from "next/headers";

import { SESSION_COOKIE_NAME, parseSessionCookie } from "../session/cookie";
import type { AuthSession } from "../session/types";

export async function getServerSession(cookieStore?: ReadonlyRequestCookies): Promise<AuthSession | null> {
  const store = cookieStore ?? (await cookies());
  const value = store.get(SESSION_COOKIE_NAME)?.value;
  return parseSessionCookie(value ?? null);
}

export async function isAuthenticated(cookieStore?: ReadonlyRequestCookies): Promise<boolean> {
  const session = await getServerSession(cookieStore);
  return Boolean(session);
}
