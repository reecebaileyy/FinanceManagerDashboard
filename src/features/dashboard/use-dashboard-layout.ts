import { useCallback, useEffect, useMemo, useState } from "react";

import { useSession } from "@features/auth";

export const DASHBOARD_WIDGET_IDS = [
  "spending-summary",
  "financial-goals",
  "recent-transactions",
  "alerts-reminders",
  "quick-actions",
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];

export type DashboardColumnKey = "primary" | "secondary";

export interface DashboardLayout {
  primary: DashboardWidgetId[];
  secondary: DashboardWidgetId[];
}

const DEFAULT_LAYOUT: DashboardLayout = {
  primary: ["spending-summary", "financial-goals", "recent-transactions"],
  secondary: ["alerts-reminders", "quick-actions"],
};

const STORAGE_PREFIX = "fm.dashboard.layout.v1";

function cloneLayout(layout: DashboardLayout): DashboardLayout {
  return {
    primary: [...layout.primary],
    secondary: [...layout.secondary],
  };
}

function normalizeLayout(layout: Partial<DashboardLayout> | null | undefined): DashboardLayout {
  if (!layout) {
    return cloneLayout(DEFAULT_LAYOUT);
  }

  const seen = new Set<DashboardWidgetId>();

  const pickValid = (items: DashboardWidgetId[] | undefined) =>
    (items ?? []).filter((id): id is DashboardWidgetId => {
      if (!DASHBOARD_WIDGET_IDS.includes(id)) {
        return false;
      }
      if (seen.has(id)) {
        return false;
      }
      seen.add(id);
      return true;
    });

  const primary = pickValid(layout.primary);
  const secondary = pickValid(layout.secondary);

  for (const id of DASHBOARD_WIDGET_IDS) {
    if (seen.has(id)) {
      continue;
    }

    if (primary.length < DEFAULT_LAYOUT.primary.length) {
      primary.push(id);
      seen.add(id);
      continue;
    }

    secondary.push(id);
    seen.add(id);
  }

  return { primary, secondary };
}

function createStorageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

function readStoredLayout(key: string): DashboardLayout | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<DashboardLayout> | null;
    return normalizeLayout(parsed);
  } catch (error) {
    // If parsing fails, fall back to defaults and log once for diagnostics.
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to parse dashboard layout from storage", error);
    }
    return null;
  }
}

function persistLayout(key: string, layout: DashboardLayout) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(layout));
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Failed to persist dashboard layout", error);
    }
  }
}

export function useDashboardLayout() {
  const { session } = useSession();
  const userId = session?.user.id ?? "guest";
  const storageKey = useMemo(() => createStorageKey(userId), [userId]);

  const [layout, setLayout] = useState<DashboardLayout>(() => cloneLayout(DEFAULT_LAYOUT));
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = readStoredLayout(storageKey);
    setLayout(stored ?? cloneLayout(DEFAULT_LAYOUT));
    setIsHydrated(true);
  }, [storageKey]);

  const updateLayout = useCallback(
    (updater: DashboardLayout | ((previous: DashboardLayout) => DashboardLayout)) => {
      setLayout((previous) => {
        const nextLayout = normalizeLayout(
          typeof updater === "function" ? (updater as (prev: DashboardLayout) => DashboardLayout)(previous) : updater,
        );
        persistLayout(storageKey, nextLayout);
        return nextLayout;
      });
    },
    [storageKey],
  );

  const resetLayout = useCallback(() => {
    updateLayout(cloneLayout(DEFAULT_LAYOUT));
  }, [updateLayout]);

  return {
    layout,
    isHydrated,
    setLayout: updateLayout,
    resetLayout,
    defaultLayout: cloneLayout(DEFAULT_LAYOUT),
  };
}

export function getWidgetColumn(layout: DashboardLayout, widgetId: DashboardWidgetId): DashboardColumnKey | null {
  if (layout.primary.includes(widgetId)) {
    return "primary";
  }

  if (layout.secondary.includes(widgetId)) {
    return "secondary";
  }

  return null;
}
