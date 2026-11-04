/**
 * Inline marker for a detail only the owner can supply.
 *
 * Rendered as real text (not an `aria-hidden` decoration) so assistive
 * technology announces the gap too. It is the single visual language for
 * "this is a placeholder, not a claim" across every legal page.
 */
export default function OwnerPlaceholder({ what }: { what: string }) {
  return (
    <span className="owner-placeholder">
      <span className="owner-placeholder-label">Owner to supply</span>
      <span className="owner-placeholder-what">{what}</span>
    </span>
  );
}
