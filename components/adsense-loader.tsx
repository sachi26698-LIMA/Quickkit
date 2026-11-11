"use client";

import { usePathname } from "next/navigation";
import { isAdEligible } from "@/lib/ads";

/**
 * Conditionally mounts the single site-wide AdSense script from `app/layout.tsx`.
 *
 * - Never renders when `enabled` is false (`ADS_ENABLED=false`).
 * - Never renders on routes listed in `AD_EXCLUDED_ROUTES` (`/contact`,
 *   `/sitemap`, `/saved`, `/qr`, `/category/ai-tools`) or internal `/api/`,
 *   `/_next/` and `/_not-found` shells.
 */
export default function AdSenseLoader({
  enabled,
  scriptSrc,
}: {
  enabled: boolean;
  scriptSrc: string;
}) {
  const pathname = usePathname();
  if (!enabled || !pathname || !isAdEligible(pathname)) {
    return null;
  }
  return <script async src={scriptSrc} crossOrigin="anonymous" />;
}
