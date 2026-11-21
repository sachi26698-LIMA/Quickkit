"use client";

import Link from "next/link";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bell,
  ChartNoAxesCombined,
  Check,
  CheckCircle2,
  ChevronDown,
  Inbox,
  Info,
  Layers3,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Search,
  Settings2,
  Shield,
  ShieldCheck,
  Sun,
  Type,
  UserRound,
  Wrench,
  X,
} from "lucide-react";
import { BrandSymbol } from "@/components/brand-logo";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useEffect, useMemo, useRef, useState } from "react";
import {
  AdminLiveProvider,
  REFRESH_INTERVAL_OPTIONS,
  useAdminLive,
  type AdminInboxBadges,
} from "./admin-live-context";
import { AdminLayerHostContext } from "./admin-modal-layer";
import styles from "./admin.module.css";

export const AdminIdentityContext = createContext("");

const items = [
  {
    href: "/admin",
    label: "Overview",
    icon: LayoutDashboard,
    group: "Workspace",
  },
  { href: "/admin/tools", label: "Tools", icon: Wrench, group: "Workspace" },
  {
    href: "/admin/categories",
    label: "Categories",
    icon: Layers3,
    group: "Workspace",
  },
  {
    href: "/admin/submissions",
    label: "Submissions",
    icon: Inbox,
    group: "Inbox",
  },
  {
    href: "/admin/feedback",
    label: "Feedback",
    icon: MessageSquare,
    group: "Inbox",
  },
  {
    href: "/admin/analytics",
    label: "Analytics",
    icon: ChartNoAxesCombined,
    group: "Manage",
  },
  { href: "/admin/seo", label: "SEO center", icon: Search, group: "Manage" },
  {
    href: "/admin/fonts",
    label: "Font library",
    icon: Type,
    group: "Manage",
  },
  {
    href: "/admin/site-settings",
    label: "Site settings",
    icon: Settings2,
    group: "Manage",
  },
  { href: "/admin/security", label: "Security", icon: Shield, group: "Manage" },
  {
    href: "/admin/activity",
    label: "Activity log",
    icon: Activity,
    group: "Manage",
  },
  {
    href: "/admin/profile",
    label: "Profile",
    icon: UserRound,
    group: "Account",
  },
] as const;

export function AdminShell({
  email,
  initialBadges,
  children,
}: {
  email: string;
  initialBadges?: AdminInboxBadges;
  children: React.ReactNode;
}) {
  return (
    <AdminIdentityContext.Provider value={email}>
      <AdminLiveProvider initialBadges={initialBadges}>
        <AdminShellFrame email={email}>{children}</AdminShellFrame>
      </AdminLiveProvider>
    </AdminIdentityContext.Provider>
  );
}

function AdminShellFrame({
  email,
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    syncState,
    lastSynced,
    refreshing,
    refreshIntervalMs,
    setRefreshIntervalMs,
    badges,
    recentActivity,
    triggerRefresh,
    toasts,
    dismissToast,
  } = useAdminLive();

  const [pending, setPending] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const [dark, setDark] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [intervalOpen, setIntervalOpen] = useState(false);
  const [layerHost, setLayerHost] = useState<HTMLDivElement | null>(null);

  const paletteInput = useRef<HTMLInputElement>(null);
  const profileMenu = useRef<HTMLDivElement>(null);
  const notificationsMenu = useRef<HTMLDivElement>(null);
  const intervalMenu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setCollapsed(
          window.localStorage.getItem("quickkit-admin-sidebar") === "collapsed",
        );
        setDark(window.localStorage.getItem("quickkit-admin-theme") === "dark");
      } catch {
        // Ignore restricted storage environments.
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      } else if (event.key === "Escape") {
        setPaletteOpen(false);
        setMobileOpen(false);
        setProfileOpen(false);
        setNotificationsOpen(false);
        setIntervalOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (paletteOpen) paletteInput.current?.focus();
  }, [paletteOpen]);

  useEffect(() => {
    if (!profileOpen && !notificationsOpen && !intervalOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;
      if (profileOpen && !profileMenu.current?.contains(event.target))
        setProfileOpen(false);
      if (
        notificationsOpen &&
        !notificationsMenu.current?.contains(event.target)
      )
        setNotificationsOpen(false);
      if (intervalOpen && !intervalMenu.current?.contains(event.target))
        setIntervalOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [profileOpen, notificationsOpen, intervalOpen]);

  const filteredItems = useMemo(() => {
    const query = paletteQuery.trim().toLowerCase();
    return items.filter(
      (item) => !query || item.label.toLowerCase().includes(query),
    );
  }, [paletteQuery]);

  function toggleCollapsed() {
    const next = !collapsed;
    try {
      window.localStorage.setItem(
        "quickkit-admin-sidebar",
        next ? "collapsed" : "expanded",
      );
    } catch {
      // Ignore storage error.
    }
    setCollapsed(next);
  }

  function toggleTheme() {
    const next = !dark;
    try {
      window.localStorage.setItem(
        "quickkit-admin-theme",
        next ? "dark" : "light",
      );
    } catch {
      // Ignore storage error.
    }
    setDark(next);
  }

  async function logout() {
    setPending(true);
    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } finally {
      router.replace("/admin/login?loggedOut=1");
    }
  }

  function goTo(href: string) {
    setPaletteOpen(false);
    setMobileOpen(false);
    setPaletteQuery("");
    router.push(href);
  }

  const activeItem =
    items.find((item) => item.href === pathname) ??
    items.find((item) => pathname.startsWith(`${item.href}/`)) ??
    items[0];
  const groups = [...new Set(items.map((item) => item.group))];
  const unreadTotal = badges.submissions + badges.feedback;

  const syncChipLabel =
    syncState === "offline"
      ? "Offline"
      : syncState === "stale"
        ? "Stale"
        : syncState === "reconnecting"
          ? "Syncing"
          : "Synced";

  const sidebarStatusNote =
    syncState === "offline"
      ? "API connection offline"
      : syncState === "stale"
        ? "Showing cached sync"
        : refreshIntervalMs === 0
          ? "Manual sync mode"
          : `Periodic sync · ${REFRESH_INTERVAL_OPTIONS.find((opt) => opt.ms === refreshIntervalMs)?.shortLabel ?? "Auto"}`;

  const nav = (mobile = false) => (
    <nav className={styles["admin-nav"]} aria-label="Admin navigation">
      {groups.map((group) => (
        <div className={styles["admin-nav-group"]} key={group}>
          {!collapsed || mobile || mobileOpen ? (
            <span className={styles["admin-nav-label"]}>{group}</span>
          ) : null}
          {items
            .filter((item) => item.group === group)
            .map((item) => {
              const badgeCount =
                item.href === "/admin/submissions"
                  ? badges.submissions
                  : item.href === "/admin/feedback"
                    ? badges.feedback
                    : 0;
              const isCurrent =
                pathname === item.href ||
                (item.href !== "/admin" &&
                  pathname.startsWith(`${item.href}/`));
              return (
                <Link
                  className={styles["admin-nav-link"]}
                  key={item.href}
                  href={item.href}
                  title={
                    collapsed && !mobile && !mobileOpen ? item.label : undefined
                  }
                  aria-label={
                    collapsed && !mobile && !mobileOpen ? item.label : undefined
                  }
                  aria-current={isCurrent ? "page" : undefined}
                  onClick={() => setMobileOpen(false)}
                >
                  <item.icon
                    className={styles["admin-nav-icon"]}
                    size={17}
                    strokeWidth={1.85}
                    aria-hidden="true"
                  />
                  {!collapsed || mobile || mobileOpen ? (
                    <>
                      <span className={styles["admin-nav-text"]}>
                        {item.label}
                      </span>
                      {badgeCount > 0 ? (
                        <span
                          className={styles["admin-nav-badge"]}
                          aria-label={`${badgeCount} new`}
                        >
                          {badgeCount > 99 ? "99+" : badgeCount}
                        </span>
                      ) : null}
                    </>
                  ) : null}
                </Link>
              );
            })}
        </div>
      ))}
    </nav>
  );

  return (
    <div
      ref={setLayerHost}
      className={styles["admin-layout"]}
      data-theme={dark ? "dark" : "light"}
      data-collapsed={collapsed ? "true" : "false"}
    >
      {mobileOpen ? (
        <button
          type="button"
          className={styles["admin-drawer-backdrop"]}
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={`${styles["admin-sidebar"]} ${mobileOpen ? styles["admin-sidebar-open"] : ""}`}
        aria-label="Control Center sidebar"
      >
        <div className={styles["admin-sidebar-glow"]} aria-hidden="true" />
        <Link
          className={styles["admin-sidebar-brand"]}
          href="/admin"
          aria-label="QUICKKIT Admin overview"
        >
          <span className={styles["admin-brand-mark"]} aria-hidden="true">
            <BrandSymbol width={38} height={38} />
          </span>
          {!collapsed || mobileOpen ? (
            <span className={styles["admin-brand-copy"]}>
              <strong>QUICKKIT</strong>
              <small>CONTROL CENTER</small>
            </span>
          ) : null}
        </Link>

        <button
          type="button"
          className={styles["admin-sidebar-search"]}
          onClick={() => setPaletteOpen(true)}
          aria-label="Search admin pages"
        >
          <Search size={15} aria-hidden="true" />
          {!collapsed || mobileOpen ? (
            <>
              <span>Quick search…</span>
              <kbd>Ctrl + K</kbd>
            </>
          ) : null}
        </button>

        {nav()}

        <div className={styles["admin-sidebar-footer"]}>
          {!collapsed || mobileOpen ? (
            <div className={styles["admin-sidebar-status-card"]}>
              <span
                className={styles["admin-sidebar-status-badge"]}
                aria-hidden="true"
              >
                <ShieldCheck size={16} />
              </span>
              <div className={styles["admin-sidebar-status-copy"]}>
                <strong>Owner Control</strong>
                <small>{sidebarStatusNote}</small>
              </div>
              <button
                type="button"
                className={styles["admin-sidebar-logout"]}
                onClick={logout}
                disabled={pending}
                aria-label={pending ? "Signing out" : "Secure logout"}
                title="Secure logout"
              >
                <LogOut size={15} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={styles["admin-sidebar-logout"]}
              onClick={logout}
              disabled={pending}
              aria-label={pending ? "Signing out" : "Secure logout"}
              title="Secure logout"
            >
              <LogOut size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </aside>

      <div className={styles["admin-main"]}>
        <div className={styles["admin-ambient-aura"]} aria-hidden="true" />
        <header className={styles["admin-topbar"]}>
          <div className={styles["admin-topbar-start"]}>
            <button
              type="button"
              className={`${styles["admin-icon-button"]} ${styles["admin-desktop-only"]}`}
              onClick={toggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen size={17} aria-hidden="true" />
              ) : (
                <PanelLeftClose size={17} aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className={`${styles["admin-icon-button"]} ${styles["admin-mobile-menu"]}`}
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
            >
              <Menu size={18} aria-hidden="true" />
            </button>
            <nav
              className={styles["admin-breadcrumbs"]}
              aria-label="Breadcrumb"
            >
              <Link href="/admin" className={styles["admin-breadcrumb-root"]}>
                <LayoutDashboard size={13} aria-hidden="true" />
                <span>QUICKKIT</span>
              </Link>
              <span
                className={styles["admin-breadcrumb-sep"]}
                aria-hidden="true"
              >
                /
              </span>
              <strong>{activeItem.label}</strong>
            </nav>
          </div>

          <div className={styles["admin-topbar-actions"]}>
            <span
              className={`${styles["admin-header-sync"]} ${styles[`admin-header-sync--${syncState}`]}`}
              title={
                lastSynced
                  ? `Last successful sync: ${new Date(lastSynced).toLocaleTimeString()}`
                  : "Waiting for sync"
              }
            >
              <i aria-hidden="true" />
              <span>{syncChipLabel}</span>
            </span>

            <div className={styles["admin-popover-control"]} ref={intervalMenu}>
              <button
                type="button"
                className={styles["admin-interval-pill"]}
                aria-haspopup="menu"
                aria-expanded={intervalOpen}
                aria-label="Auto-refresh interval"
                onClick={() => {
                  setProfileOpen(false);
                  setNotificationsOpen(false);
                  setIntervalOpen((open) => !open);
                }}
              >
                <RefreshCw
                  size={13}
                  className={refreshing ? styles["admin-spin"] : ""}
                  aria-hidden="true"
                />
                <span>
                  {REFRESH_INTERVAL_OPTIONS.find(
                    (o) => o.ms === refreshIntervalMs,
                  )?.shortLabel ?? "Auto (60s)"}
                </span>
                <ChevronDown size={12} aria-hidden="true" />
              </button>
              {intervalOpen ? (
                <div
                  className={styles["admin-interval-menu"]}
                  role="menu"
                  aria-label="Auto-refresh schedule"
                >
                  <div className={styles["admin-interval-menu-head"]}>
                    Auto-refresh cadence
                  </div>
                  {REFRESH_INTERVAL_OPTIONS.map((option) => {
                    const active = option.ms === refreshIntervalMs;
                    return (
                      <button
                        key={option.ms}
                        type="button"
                        role="menuitemradio"
                        aria-checked={active}
                        className={`${styles["admin-interval-option"]} ${active ? styles["admin-interval-option--active"] : ""}`}
                        onClick={() => {
                          setRefreshIntervalMs(option.ms);
                          setIntervalOpen(false);
                        }}
                      >
                        <span>{option.label}</span>
                        {active ? <Check size={14} aria-hidden="true" /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className={styles["admin-icon-button"]}
              onClick={triggerRefresh}
              disabled={refreshing}
              aria-label="Refresh active view"
              title={
                lastSynced
                  ? `Refresh now · last synced ${new Date(lastSynced).toLocaleTimeString()}`
                  : "Refresh now"
              }
            >
              <RefreshCw
                size={16}
                className={refreshing ? styles["admin-spin"] : ""}
                aria-hidden="true"
              />
            </button>

            <div
              className={styles["admin-popover-control"]}
              ref={notificationsMenu}
            >
              <button
                type="button"
                className={styles["admin-icon-button"]}
                aria-haspopup="dialog"
                aria-expanded={notificationsOpen}
                aria-controls="admin-notification-popover"
                aria-label="Open notification center"
                title="Notification center"
                onClick={() => {
                  setProfileOpen(false);
                  setIntervalOpen(false);
                  setNotificationsOpen((open) => !open);
                }}
              >
                <Bell size={16} aria-hidden="true" />
                {unreadTotal > 0 ? (
                  <span
                    className={styles["admin-bell-dot"]}
                    aria-hidden="true"
                  />
                ) : null}
              </button>
              {notificationsOpen ? (
                <section
                  id="admin-notification-popover"
                  className={styles["admin-notification-popover"]}
                  role="dialog"
                  aria-label="Notification center"
                >
                  <div className={styles["admin-popover-head"]}>
                    <div>
                      <strong>Notification center</strong>
                      <small>Verified inbox & audit updates</small>
                    </div>
                    <button
                      type="button"
                      className={styles["admin-icon-button"]}
                      onClick={() => setNotificationsOpen(false)}
                      aria-label="Close notifications"
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  </div>
                  <div className={styles["admin-notification-inbox-grid"]}>
                    <Link
                      href="/admin/submissions"
                      className={styles["admin-notification-stat"]}
                      onClick={() => setNotificationsOpen(false)}
                    >
                      <Inbox size={15} aria-hidden="true" />
                      <span>New contacts</span>
                      <strong>{badges.submissions}</strong>
                    </Link>
                    <Link
                      href="/admin/feedback"
                      className={styles["admin-notification-stat"]}
                      onClick={() => setNotificationsOpen(false)}
                    >
                      <MessageSquare size={15} aria-hidden="true" />
                      <span>New feedback</span>
                      <strong>{badges.feedback}</strong>
                    </Link>
                  </div>
                  <div className={styles["admin-notification-list"]}>
                    <p className={styles["admin-popover-caption"]}>
                      RECENT PERSISTED ACTIVITY
                    </p>
                    {recentActivity.length ? (
                      recentActivity.slice(0, 5).map((entry) => (
                        <div
                          key={entry.id}
                          className={styles["admin-notification-item"]}
                        >
                          <span
                            className={styles["admin-notification-dot"]}
                            aria-hidden="true"
                          />
                          <div>
                            <strong>{entry.action.replaceAll("_", " ")}</strong>
                            <small>
                              {entry.entity_type}
                              {entry.entity_id ? ` · ${entry.entity_id}` : ""}
                            </small>
                          </div>
                          <time dateTime={entry.created_at}>
                            {new Date(entry.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </time>
                        </div>
                      ))
                    ) : (
                      <p className={styles["admin-popover-empty"]}>
                        No recorded administrative events yet.
                      </p>
                    )}
                  </div>
                  <div className={styles["admin-popover-footer"]}>
                    <Link
                      href="/admin/activity"
                      className={styles["admin-link"]}
                      onClick={() => setNotificationsOpen(false)}
                    >
                      View full activity log
                    </Link>
                  </div>
                </section>
              ) : null}
            </div>

            <button
              type="button"
              className={styles["admin-icon-button"]}
              onClick={toggleTheme}
              aria-label={
                dark ? "Switch to light theme" : "Switch to dark theme"
              }
              title={dark ? "Switch to light theme" : "Switch to dark theme"}
            >
              {dark ? (
                <Sun size={16} aria-hidden="true" />
              ) : (
                <Moon size={16} aria-hidden="true" />
              )}
            </button>

            <div className={styles["admin-profile-control"]} ref={profileMenu}>
              <button
                className={styles["admin-session-chip"]}
                type="button"
                aria-haspopup="menu"
                aria-expanded={profileOpen}
                aria-controls="admin-profile-menu"
                onClick={() => {
                  setNotificationsOpen(false);
                  setIntervalOpen(false);
                  setProfileOpen((open) => !open);
                }}
              >
                <span className={styles["admin-avatar-sm"]} aria-hidden="true">
                  {email.slice(0, 1).toUpperCase() || "A"}
                </span>
                <span className={styles["admin-profile-email"]}>{email}</span>
                <ChevronDown size={14} aria-hidden="true" />
              </button>
              {profileOpen ? (
                <div
                  className={styles["admin-profile-menu"]}
                  id="admin-profile-menu"
                  role="menu"
                  aria-label="Administrator menu"
                >
                  <div className={styles["admin-profile-menu-heading"]}>
                    <strong>Allowlisted Owner</strong>
                    <small title={email}>{email}</small>
                  </div>
                  <Link
                    role="menuitem"
                    href="/admin/profile"
                    onClick={() => setProfileOpen(false)}
                  >
                    <UserRound size={15} aria-hidden="true" /> Profile
                  </Link>
                  <Link
                    role="menuitem"
                    href="/admin/security"
                    onClick={() => setProfileOpen(false)}
                  >
                    <Shield size={15} aria-hidden="true" /> Security center
                  </Link>
                  <Link
                    role="menuitem"
                    href="/admin/activity"
                    onClick={() => setProfileOpen(false)}
                  >
                    <Activity size={15} aria-hidden="true" /> Activity log
                  </Link>
                  <button
                    role="menuitem"
                    type="button"
                    className={styles["admin-profile-menu-danger"]}
                    disabled={pending}
                    onClick={() => void logout()}
                  >
                    <LogOut size={15} aria-hidden="true" />{" "}
                    {pending ? "Signing out…" : "Secure logout"}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className={styles["admin-content"]}>
          <AdminLayerHostContext.Provider value={layerHost}>
            {children}
          </AdminLayerHostContext.Provider>
        </main>
      </div>

      {paletteOpen ? (
        <div
          className={styles["admin-palette-backdrop"]}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPaletteOpen(false);
          }}
        >
          <section
            className={styles["admin-palette"]}
            role="dialog"
            aria-modal="true"
            aria-label="Admin command search"
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setHighlighted((value) =>
                  Math.min(value + 1, Math.max(0, filteredItems.length - 1)),
                );
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setHighlighted((value) => Math.max(0, value - 1));
              }
              if (event.key === "Enter" && filteredItems[highlighted])
                goTo(filteredItems[highlighted].href);
            }}
          >
            <label className={styles["admin-palette-input-wrap"]}>
              <Search size={17} aria-hidden="true" />
              <input
                ref={paletteInput}
                value={paletteQuery}
                onChange={(event) => {
                  setPaletteQuery(event.target.value);
                  setHighlighted(0);
                }}
                placeholder="Jump to any admin module…"
                aria-label="Search pages"
              />
              <kbd>ESC</kbd>
            </label>
            <p className={styles["admin-palette-caption"]}>NAVIGATION</p>
            <div
              className={styles["admin-palette-results"]}
              role="listbox"
              aria-label="Admin pages"
            >
              {filteredItems.length ? (
                filteredItems.map((item, index) => (
                  <button
                    type="button"
                    className={styles["admin-palette-result"]}
                    key={item.href}
                    role="option"
                    aria-selected={index === highlighted}
                    onMouseEnter={() => setHighlighted(index)}
                    onClick={() => goTo(item.href)}
                  >
                    <item.icon
                      className={styles["admin-nav-icon"]}
                      size={16}
                      strokeWidth={1.85}
                      aria-hidden="true"
                    />
                    <span>{item.label}</span>
                    <small>{item.group}</small>
                    <span aria-hidden="true">↵</span>
                  </button>
                ))
              ) : (
                <p className={styles["admin-empty"]}>
                  No matching admin pages.
                </p>
              )}
            </div>
            <footer>
              <span>↑ ↓ to navigate</span>
              <span>Enter to open</span>
              <span>Esc to close</span>
            </footer>
          </section>
        </div>
      ) : null}

      {toasts.length ? (
        <div
          className={styles["admin-toast-stack"]}
          aria-live="polite"
          aria-label="Admin notifications"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`${styles["admin-toast"]} ${styles[`admin-toast--${toast.tone}`]}`}
            >
              <span className={styles["admin-toast-icon"]} aria-hidden="true">
                {toast.tone === "success" ? (
                  <CheckCircle2 size={16} />
                ) : toast.tone === "error" ? (
                  <AlertCircle size={16} />
                ) : toast.tone === "warning" ? (
                  <AlertTriangle size={16} />
                ) : (
                  <Info size={16} />
                )}
              </span>
              <div className={styles["admin-toast-copy"]}>
                <strong>{toast.title}</strong>
                {toast.description ? <small>{toast.description}</small> : null}
              </div>
              <button
                type="button"
                className={styles["admin-toast-close"]}
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
