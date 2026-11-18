"use client";

import { useEffect } from "react";
import { recordToolVisit } from "@/lib/use-recent-tools";

/**
 * Invisible: remembers that this browser opened a tool page so the homepage
 * can offer "recently used" shortcuts. Local storage only — nothing is sent
 * anywhere — and the row renders only when there is something to show.
 */
export default function RecentToolTracker({ slug }: { slug: string }) {
  useEffect(() => {
    recordToolVisit(slug);
  }, [slug]);
  return null;
}
