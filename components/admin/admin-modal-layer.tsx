"use client";

import { createContext, useContext, useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * The Admin layout root. Dialogs are portalled here so that they:
 *  - inherit the Admin design tokens and the active light/dark theme, and
 *  - escape the page-content stacking context, so the sticky top bar and the
 *    sidebar can never paint over (or clip) an open dialog.
 */
export const AdminLayerHostContext = createContext<HTMLElement | null>(null);

let scrollLocks = 0;
let restoreOverflow = "";
let restorePaddingRight = "";

function lockPageScroll() {
  if (scrollLocks === 0) {
    const { body, documentElement } = document;
    restoreOverflow = body.style.overflow;
    restorePaddingRight = body.style.paddingRight;
    // Keep the layout from shifting when a classic desktop scrollbar hides.
    const scrollbar = window.innerWidth - documentElement.clientWidth;
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    body.style.overflow = "hidden";
  }
  scrollLocks += 1;
}

function unlockPageScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) {
    document.body.style.overflow = restoreOverflow;
    document.body.style.paddingRight = restorePaddingRight;
  }
}

/** Renders a dialog above the whole Admin shell and freezes page scroll. */
export function AdminModalLayer({ children }: { children: React.ReactNode }) {
  const host = useContext(AdminLayerHostContext);

  useEffect(() => {
    lockPageScroll();
    return unlockPageScroll;
  }, []);

  return host ? createPortal(children, host) : <>{children}</>;
}
