# Page weight — measured, not estimated

Everything here was measured on a production build (`next build` + `next start`)
with gzip, which is what the CDN serves. Nothing is extrapolated.

## Before and after

| Page                  | HTML before         | HTML after          | Change                          |
| --------------------- | ------------------- | ------------------- | ------------------------------- |
| `/privacy`            | 164 KB (42 KB gzip) | 109 KB (29 KB gzip) | **−55 KB**                      |
| `/about`              | —                   | 93 KB (20 KB gzip)  | —                               |
| `/tools/word-counter` | 158 KB              | 103 KB (19 KB gzip) | **−55 KB**                      |
| `/`                   | 289 KB (47 KB gzip) | 289 KB (47 KB gzip) | unchanged (needs the catalogue) |

| Route                       | JS before             | JS after            | Change                     |
| --------------------------- | --------------------- | ------------------- | -------------------------- |
| `/tools/json-validator`     | 1222 KB (335 KB gzip) | 226 KB (73 KB gzip) | **−997 KB (−262 KB gzip)** |
| `/tools/css-minifier`       | 1135 KB               | 1135 KB             | unchanged (it minifies)    |
| `/tools/resume-ats-checker` | 215 KB                | 215 KB              | unchanged                  |
| `/tools/word-counter`       | 219 KB                | 219 KB              | unchanged                  |

Totals for `/tools/json-validator`, as served: **257 KB gzipped** including HTML.

## What was wrong

### 1. The command palette shipped the catalogue to every page

`CommandPalette` is mounted in the public layout, so its `tools` prop was
serialised into the RSC payload of every response: 131 tool records, 54.6 KB,
on pages that have no search box at all.

The palette now fetches `/api/palette-index` on first open. The endpoint serves
only what the palette renders — `slug`, `name`, `category`, `icon`, `color` —
plus one lowercase `haystack` string built on the server from
`name + description + keywords + category`. Search is exactly as broad as
before because those fields are folded into the haystack rather than dropped,
and `rankByHaystack` keeps the original rule that a name hit outranks a keyword
hit.

The index is 16.2 KB gzipped, fetched once per tab on intent, and cached
publicly for 300 seconds.

### 2. `json-validator` downloaded a JavaScript minifier it never called

`components/tools/devtools/json-validator.tsx` imported one constant from
`lib/tools/developer-code.ts`. That module statically imports `terser`, `csso`,
`@xmldom/xmldom` and `minify-html-wasm`, so importing it for a number pulled the
whole toolchain into the route — 805 KB (226 KB gzipped) — on five routes, only
three of which minify anything.

The constants and two small helpers moved to `lib/tools/developer-code-shared.ts`,
which imports nothing. `developer-code.ts` re-exports them, so call sites did
not change.

## What was deliberately not changed

- **Heavy libraries are already route-split.** The barcode chunk (906 KB) is on
  exactly one route (`batch-studio`). pdfjs, docx and `@cantoo/pdf-lib` are
  present only on the tool pages that use them. No action needed.
- **Fonts.** The homepage preloads none. No `@font-face` is fetched on a page
  that does not render text in that face.
- **Middleware.** `proxy.ts` is matched only on `/admin/:path*` and
  `/auth/callback`; public pages do not run it.
- **Caching.** HTML is prerendered and served with `s-maxage=300,
stale-while-revalidate`; `/_next/static` is `immutable` for a year.
- **AdSense.** One async script is loaded site-wide. It is a real cost and it is
  revenue, so it is not something to remove silently.
- **`/tools` inline icons.** 368 KB of inline SVG, but gzip reduces the repeated
  copies to ~2 bytes each — the whole thing costs about 14.5 KB gzipped. Not
  worth the code churn.

## Where the remaining weight is

For `/tools` (the heaviest page at 66 KB gzipped HTML), the markup is 542 KB
raw and consists of 131 cards, each with a 3D icon of about 3.5 KB of SVG, plus
262 inline style attributes (49 KB) that carry per-tool gradient custom
properties. These collapse well under gzip. Reducing them further would mean
redesigning the card visuals, which is a design decision, not a bug fix.

## How to re-measure

```bash
SITE_URL=https://quickkit.live LAUNCH_APPROVED=true npx next build
npx next start --hostname 0.0.0.0 --port 3200

# HTML, as a browser receives it
curl -s -H "Accept-Encoding: gzip" -o /dev/null -w "%{size_download}\n" \
  http://127.0.0.1:3200/privacy

# The JS a route loads
curl -s http://127.0.0.1:3200/tools/json-validator \
  | grep -oE 'chunks/[a-z0-9_-]{6,}\.js' | sort -u \
  | while read c; do
      curl -s -H "Accept-Encoding: gzip" -o /dev/null -w "%{size_download}\n" \
        "http://127.0.0.1:3200/_next/static/$c"
    done | awk '{s+=$1} END {print s}'
```
