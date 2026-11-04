import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { legalPages } from "@/lib/legal";

/**
 * Cross-linking block shared by every legal/information page.
 *
 * Extracted so the pages that do not use `LegalPageShell` (FAQ, About, Contact)
 * get the same navigation and the same accessibility contract as the policy
 * documents — one component, no drift, no page that dead-ends.
 */
export default function LegalRelated({
  current,
  limit,
}: {
  /** Route of the page rendering the block; it is excluded from its own list. */
  current: string;
  /** Optional cap. Omit to list every other page. */
  limit?: number;
}) {
  const related = legalPages.filter((page) => page.href !== current);
  const shown = limit ? related.slice(0, limit) : related;

  return (
    <nav className="legal-related" aria-labelledby={`related-${slug(current)}`}>
      <h2 id={`related-${slug(current)}`}>Related pages</h2>
      <ul>
        {shown.map((item) => (
          <li key={item.href}>
            <Link href={item.href}>
              <span>{item.title}</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function slug(value: string) {
  return value.replace(/^\//, "").replace(/[^a-z0-9-]/g, "") || "home";
}
