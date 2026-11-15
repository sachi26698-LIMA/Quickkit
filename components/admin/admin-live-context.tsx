"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type AdminSyncState = "connected" | "reconnecting" | "stale" | "offline";

export type AdminToastTone = "success" | "error" | "warning" | "info";

export type AdminToast = {
  id: string;
  tone: AdminToastTone;
  title: string;
  description?: string;
};

export type AdminNotificationActivity = {
  id: string | number;
  actor_email: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  created_at: string;
};

export type AdminInboxBadges = {
  submissions: number;
  feedback: number;
  recentActivity?: AdminNotificationActivity[];
};

export const REFRESH_INTERVAL_OPTIONS = [
  { ms: 0, label: "Manual only", shortLabel: "Manual" },
  { ms: 30_000, label: "Every 30 seconds", shortLabel: "Auto (30s)" },
  { ms: 60_000, label: "Every 60 seconds", shortLabel: "Auto (60s)" },
  { ms: 120_000, label: "Every 2 minutes", shortLabel: "Auto (2m)" },
  { ms: 300_000, label: "Every 5 minutes", shortLabel: "Auto (5m)" },
] as const;

const ALLOWED_INTERVALS = new Set<number>(
  REFRESH_INTERVAL_OPTIONS.map((option) => option.ms),
);
export const REFRESH_INTERVAL_STORAGE_KEY = "quickkit-admin-refresh-interval";
export const DEFAULT_REFRESH_INTERVAL_MS = 60_000;

export type AdminLiveContextValue = {
  syncState: AdminSyncState;
  lastSynced: number | null;
  refreshing: boolean;
  refreshIntervalMs: number;
  setRefreshIntervalMs: (ms: number) => void;
  setSyncSnapshot: (update: {
    syncState?: AdminSyncState;
    lastSynced?: number | null;
    refreshing?: boolean;
    badges?: Partial<AdminInboxBadges>;
  }) => void;
  badges: { submissions: number; feedback: number };
  recentActivity: AdminNotificationActivity[];
  triggerRefresh: () => void;
  registerRefreshHandler: (handler: () => Promise<void> | void) => () => void;
  toasts: AdminToast[];
  pushToast: (toast: Omit<AdminToast, "id">) => void;
  dismissToast: (id: string) => void;
};

const noop = () => {};

const defaultContext: AdminLiveContextValue = {
  syncState: "connected",
  lastSynced: null,
  refreshing: false,
  refreshIntervalMs: DEFAULT_REFRESH_INTERVAL_MS,
  setRefreshIntervalMs: noop,
  setSyncSnapshot: noop,
  badges: { submissions: 0, feedback: 0 },
  recentActivity: [],
  triggerRefresh: noop,
  registerRefreshHandler: () => noop,
  toasts: [],
  pushToast: noop,
  dismissToast: noop,
};

const AdminLiveContext = createContext<AdminLiveContextValue>(defaultContext);

export function useAdminLive() {
  return useContext(AdminLiveContext);
}

export function AdminLiveProvider({
  initialBadges,
  children,
}: {
  initialBadges?: AdminInboxBadges;
  children: React.ReactNode;
}) {
  const [syncState, setSyncState] = useState<AdminSyncState>("connected");
  const [lastSynced, setLastSynced] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshIntervalMs, setRefreshIntervalState] = useState<number>(
    DEFAULT_REFRESH_INTERVAL_MS,
  );
  const [badges, setBadges] = useState({
    submissions: initialBadges?.submissions ?? 0,
    feedback: initialBadges?.feedback ?? 0,
  });
  const [recentActivity, setRecentActivity] = useState<
    AdminNotificationActivity[]
  >(initialBadges?.recentActivity ?? []);
  const [toasts, setToasts] = useState<AdminToast[]>([]);

  const handlersRef = useRef(new Set<() => Promise<void> | void>());
  const toastTimersRef = useRef(new Map<string, number>());

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem(
          REFRESH_INTERVAL_STORAGE_KEY,
        );
        if (stored !== null) {
          const parsed = Number(stored);
          if (ALLOWED_INTERVALS.has(parsed)) setRefreshIntervalState(parsed);
        }
      } catch {
        // Storage may be unavailable in restricted environments.
      }
      setLastSynced((prev) => prev ?? Date.now());
    });
    const timers = toastTimersRef.current;
    return () => {
      window.cancelAnimationFrame(frame);
      for (const timer of timers.values()) window.clearTimeout(timer);
      timers.clear();
    };
  }, []);

  const setRefreshIntervalMs = useCallback((ms: number) => {
    if (!ALLOWED_INTERVALS.has(ms)) return;
    setRefreshIntervalState(ms);
    try {
      window.localStorage.setItem(REFRESH_INTERVAL_STORAGE_KEY, String(ms));
    } catch {
      // Preference persistence is optional.
    }
  }, []);

  const setSyncSnapshot = useCallback(
    (update: {
      syncState?: AdminSyncState;
      lastSynced?: number | null;
      refreshing?: boolean;
      badges?: Partial<AdminInboxBadges>;
    }) => {
      if (update.syncState !== undefined) setSyncState(update.syncState);
      if (update.lastSynced !== undefined) setLastSynced(update.lastSynced);
      if (update.refreshing !== undefined) setRefreshing(update.refreshing);
      if (update.badges) {
        if (
          update.badges.submissions !== undefined ||
          update.badges.feedback !== undefined
        ) {
          setBadges((prev) => ({
            submissions: update.badges?.submissions ?? prev.submissions,
            feedback: update.badges?.feedback ?? prev.feedback,
          }));
        }
        if (update.badges.recentActivity !== undefined) {
          setRecentActivity(update.badges.recentActivity);
        }
      }
    },
    [],
  );

  const registerRefreshHandler = useCallback(
    (handler: () => Promise<void> | void) => {
      handlersRef.current.add(handler);
      return () => {
        handlersRef.current.delete(handler);
      };
    },
    [],
  );

  const triggerRefresh = useCallback(() => {
    if (handlersRef.current.size > 0) {
      for (const handler of handlersRef.current) void handler();
    } else {
      window.dispatchEvent(new CustomEvent("quickkit:admin-manual-refresh"));
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    const timer = toastTimersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const pushToast = useCallback((toast: Omit<AdminToast, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev.slice(-3), { ...toast, id }]);
    const timer = window.setTimeout(() => {
      toastTimersRef.current.delete(id);
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
    toastTimersRef.current.set(id, timer);
  }, []);

  const value = useMemo<AdminLiveContextValue>(
    () => ({
      syncState,
      lastSynced,
      refreshing,
      refreshIntervalMs,
      setRefreshIntervalMs,
      setSyncSnapshot,
      badges,
      recentActivity,
      triggerRefresh,
      registerRefreshHandler,
      toasts,
      pushToast,
      dismissToast,
    }),
    [
      syncState,
      lastSynced,
      refreshing,
      refreshIntervalMs,
      setRefreshIntervalMs,
      setSyncSnapshot,
      badges,
      recentActivity,
      triggerRefresh,
      registerRefreshHandler,
      toasts,
      pushToast,
      dismissToast,
    ],
  );

  return (
    <AdminLiveContext.Provider value={value}>
      {children}
    </AdminLiveContext.Provider>
  );
}
