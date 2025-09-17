import type { NavItem } from "@components/dashboard/sidebar";

export type SectionId =
  | "home"
  | "login"
  | "signup"
  | "forgotPassword"
  | "twoFactor"
  | "dashboard"
  | "transactions"
  | "budgets"
  | "goals"
  | "bills"
  | "savings"
  | "insights"
  | "reports"
  | "settings"
  | "admin";

export const SECTION_PATHS: Record<SectionId, string> = {
  home: "/",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  twoFactor: "/two-factor",
  dashboard: "/dashboard",
  transactions: "/transactions",
  budgets: "/budgets",
  goals: "/goals",
  bills: "/bills",
  savings: "/savings",
  insights: "/insights",
  reports: "/reports",
  settings: "/settings",
  admin: "/admin",
};

export const NAV_ITEMS: NavItem<SectionId>[] = [
  { id: "home", label: "Home", icon: "[H]", href: SECTION_PATHS.home },
  { id: "login", label: "Login", icon: "[L]", href: SECTION_PATHS.login },
  { id: "signup", label: "Create Account", icon: "[C]", href: SECTION_PATHS.signup },
  { id: "dashboard", label: "Dashboard", icon: "[D]", href: SECTION_PATHS.dashboard, requiresAuth: true },
  { id: "transactions", label: "Transactions", icon: "[T]", href: SECTION_PATHS.transactions, requiresAuth: true },
  { id: "budgets", label: "Budgets", icon: "[B]", href: SECTION_PATHS.budgets, requiresAuth: true },
  { id: "goals", label: "Goals", icon: "[G]", href: SECTION_PATHS.goals, requiresAuth: true },
  { id: "bills", label: "Bills", icon: "[B$]", href: SECTION_PATHS.bills, requiresAuth: true },
  { id: "savings", label: "Savings", icon: "[S%]", href: SECTION_PATHS.savings, requiresAuth: true },
  { id: "insights", label: "Insights", icon: "[AI]", href: SECTION_PATHS.insights, requiresAuth: true },
  { id: "reports", label: "Reports", icon: "[R]", href: SECTION_PATHS.reports, requiresAuth: true },
  { id: "settings", label: "Settings", icon: "[S]", href: SECTION_PATHS.settings, requiresAuth: true },
  { id: "admin", label: "Admin", icon: "[A]", href: SECTION_PATHS.admin, requiresAuth: true },
];

export const PROTECTED_SECTIONS: ReadonlySet<SectionId> = new Set([
  "dashboard",
  "transactions",
  "budgets",
  "goals",
  "bills",
  "savings",
  "insights",
  "reports",
  "settings",
  "admin",
]);

const sortedNavItems = [...NAV_ITEMS].sort((a, b) => b.href.length - a.href.length);

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

export function resolveSectionIdFromPath(pathname: string): SectionId {
  const normalized = normalizePathname(pathname);

  for (const item of sortedNavItems) {
    if (item.href === "/" && normalized === "/") {
      return item.id;
    }

    if (item.href !== "/" && (normalized === item.href || normalized.startsWith(`${item.href}/`))) {
      return item.id;
    }
  }

  return "home";
}
