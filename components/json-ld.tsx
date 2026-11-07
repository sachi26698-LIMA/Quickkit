/**
 * Renders one JSON-LD block.
 *
 * Server-rendered only: the object is built from static site data at render
 * time, never from user input, so serialising it inline is safe. Everything is
 * `JSON.stringify`-escaped, and `undefined`/`null` data renders nothing at all
 * (a preview build without `SITE_URL` emits no absolute-URL markup).
 */
export default function JsonLd({ data }: { data: unknown }) {
  if (!data) return null;
  return (
    <script
      type="application/ld+json"
      // Static, server-rendered structured data; no user input is interpolated.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
