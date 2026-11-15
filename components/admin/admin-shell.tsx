"use client";

import Link from "next/link";
import {
  Activity,
  ChartNoAxesCombined,
  Inbox,
  Layers3,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings2,
  Shield,
  Sun,
  UserRound,
  Wrench,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useEffect, useMemo, useRef, useState } from "react";
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
  children,
}: {
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const [dark, setDark] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const paletteInput = useRef<HTMLInputElement>(null);
  const profileMenu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCollapsed(
      window.localStorage.getItem("quickkit-admin-sidebar") === "collapsed",
    );
    setDark(window.localStorage.getItem("quickkit-admin-theme") === "dark");
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      } else if (event.key === "Escape") {
        setPaletteOpen(false);
        setMobileOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (paletteOpen) paletteInput.current?.focus();
  }, [paletteOpen]);

  useEffect(() => {
    if (!profileOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !profileMenu.current?.contains(event.target)
      )
        setProfileOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setProfileOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [profileOpen]);

  const filteredItems = useMemo(() => {
    const query = paletteQuery.trim().toLowerCase();
    return items.filter(
      (item) => !query || item.label.toLowerCase().includes(query),
    );
  }, [paletteQuery]);

  function toggleCollapsed() {
    const next = !collapsed;
    window.localStorage.setItem(
      "quickkit-admin-sidebar",
      next ? "collapsed" : "expanded",
    );
    setCollapsed(next);
  }

  function toggleTheme() {
    const next = !dark;
    window.localStorage.setItem(
      "quickkit-admin-theme",
      next ? "dark" : "light",
    );
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
  const nav = (mobile = false) => (
    <nav className={styles["admin-nav"]} aria-label="Admin navigation">
      {groups.map((group) => (
        <div className={styles["admin-nav-group"]} key={group}>
          {!collapsed || mobile || mobileOpen ? (
            <span className={styles["admin-nav-label"]}>{group}</span>
          ) : null}
          {items
            .filter((item) => item.group === group)
            .map((item) => (
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
                aria-current={
                  pathname === item.href ||
                  (item.href !== "/admin" &&
                    pathname.startsWith(`${item.href}/`))
                    ? "page"
                    : undefined
                }
                onClick={() => setMobileOpen(false)}
              >
                <item.icon
                  className={styles["admin-nav-icon"]}
                  size={17}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                {!collapsed || mobile || mobileOpen ? (
                  <span>{item.label}</span>
                ) : null}
              </Link>
            ))}
        </div>
      ))}
    </nav>
  );

  return (
    <AdminIdentityContext.Provider value={email}>
      <div
        className={styles["admin-layout"]}
        data-theme={dark ? "dark" : "light"}
        data-collapsed={collapsed ? "true" : "false"}
      >
        {mobileOpen ? (
          <button
            className={styles["admin-drawer-backdrop"]}
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}
        <aside
          className={`${styles["admin-sidebar"]} ${mobileOpen ? styles["admin-sidebar-open"] : ""}`}
        >
          <Link
            className={styles["admin-sidebar-brand"]}
            href="/admin"
            aria-label="QUICKKIT Admin overview"
          >
            <span className={styles["admin-brand-mark"]} aria-hidden="true">
              Q
            </span>
            {!collapsed || mobileOpen ? (
              <span className={styles["admin-brand-copy"]}>
                <strong>QUICKKIT</strong>
                <small>CONTROL CENTER</small>
              </span>
            ) : null}
          </Link>
          <button
            className={styles["admin-sidebar-search"]}
            onClick={() => setPaletteOpen(true)}
            aria-label="Search admin pages"
          >
            <Search size={17} aria-hidden="true" />
            {!collapsed || mobileOpen ? (
              <>
                <span>Quick search</span>
                <kbd>⌘ K</kbd>
              </>
            ) : null}
          </button>
          {nav()}
          <div className={styles["admin-sidebar-footer"]}>
            <span className={styles["admin-avatar"]} aria-hidden="true">
              {email.slice(0, 1).toUpperCase()}
            </span>
            {!collapsed || mobileOpen ? (
              <span className={styles["admin-sidebar-identity"]}>
                <strong>Administrator</strong>
                <small title={email}>{email}</small>
              </span>
            ) : null}
            <button
              className={styles["admin-icon-button"]}
              onClick={logout}
              disabled={pending}
              aria-label={pending ? "Signing out" : "Secure logout"}
              title="Secure logout"
            >
              <LogOut size={16} aria-hidden="true" />
            </button>
          </div>
        </aside>

        <div className={styles["admin-main"]}>
          <header className={styles["admin-topbar"]}>
            <div className={styles["admin-topbar-start"]}>
              <button
                className={`${styles["admin-icon-button"]} ${styles["admin-desktop-only"]}`}
                onClick={toggleCollapsed}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <PanelLeftOpen size={17} />
                ) : (
                  <PanelLeftClose size={17} />
                )}
              </button>
              <button
                className={`${styles["admin-icon-button"]} ${styles["admin-mobile-menu"]}`}
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation"
              >
                <Menu size={18} aria-hidden="true" />
              </button>
              <div
                className={styles["admin-breadcrumbs"]}
                aria-label="Breadcrumb"
              >
                <span>QUICKKIT</span>
                <span aria-hidden="true">/</span>
                <strong>{activeItem.label}</strong>
              </div>
            </div>
            <div className={styles["admin-topbar-actions"]}>
              <button
                className={styles["admin-top-search"]}
                onClick={() => setPaletteOpen(true)}
                aria-label="Search admin pages"
              >
                <Search size={17} aria-hidden="true" />
                <span>Search pages and actions</span>
                <kbd>⌘ K</kbd>
              </button>
              <Link
                className={styles["admin-icon-button"]}
                href="/admin/activity"
                aria-label="Open activity log"
                title="Activity log"
              >
                <Activity size={17} aria-hidden="true" />
              </Link>
              <button
                className={styles["admin-icon-button"]}
                onClick={toggleTheme}
                aria-label={
                  dark ? "Switch to light theme" : "Switch to dark theme"
                }
                title={dark ? "Switch to light theme" : "Switch to dark theme"}
              >
                {dark ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              <div
                className={styles["admin-profile-control"]}
                ref={profileMenu}
              >
                <button
                  className={styles["admin-session-chip"]}
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  aria-controls="admin-profile-menu"
                  onClick={() => setProfileOpen((open) => !open)}
                >
                  <i aria-hidden="true" />
                  <span className={styles["admin-profile-email"]}>{email}</span>
                  <UserRound size={14} aria-hidden="true" />
                </button>
                {profileOpen ? (
                  <div
                    className={styles["admin-profile-menu"]}
                    id="admin-profile-menu"
                    role="menu"
                    aria-label="Administrator menu"
                  >
                    <div className={styles["admin-profile-menu-heading"]}>
                      <strong>Administrator</strong>
                      <small title={email}>{email}</small>
                    </div>
                    <Link
                      role="menuitem"
                      href="/admin/profile"
                      onClick={() => setProfileOpen(false)}
                    >
                      <UserRound size={15} /> Profile
                    </Link>
                    <Link
                      role="menuitem"
                      href="/admin/security"
                      onClick={() => setProfileOpen(false)}
                    >
                      <Shield size={15} /> Security center
                    </Link>
                    <button
                      role="menuitem"
                      type="button"
                      disabled={pending}
                      onClick={() => void logout()}
                    >
                      <LogOut size={15} />{" "}
                      {pending ? "Signing out…" : "Secure logout"}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </header>
          <main className={styles["admin-content"]}>{children}</main>
        </div>

        {mobileOpen ? (
          <div
            className={styles["admin-mobile-drawer"]}
            aria-label="Mobile admin navigation"
          >
            {nav(true)}
            <button
              className={`${styles["admin-button"]} ${styles["admin-button--soft"]}`}
              onClick={logout}
              disabled={pending}
            >
              {pending ? "Signing out…" : "Secure logout"}
            </button>
          </div>
        ) : null}

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
                    Math.min(value + 1, filteredItems.length - 1),
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
                  placeholder="Search pages…"
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
                      className={styles["admin-palette-result"]}
                      key={item.href}
                      role="option"
                      aria-selected={index === highlighted}
                      onMouseEnter={() => setHighlighted(index)}
                      onClick={() => goTo(item.href)}
                    >
                      <item.icon
                        className={styles["admin-nav-icon"]}
                        size={17}
                        strokeWidth={1.8}
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
      </div>
    </AdminIdentityContext.Provider>
  );
}
