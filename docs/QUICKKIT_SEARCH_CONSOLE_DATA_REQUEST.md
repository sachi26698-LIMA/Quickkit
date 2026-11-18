# QUICKKIT — Search Console data request (owner action required)

**Why this document exists:** Phase 3 needs Search Console performance data. It is not
reachable from the environment this work runs in, and no export exists anywhere I can
see. Rather than estimate or infer the numbers — which the project rules forbid — this
document states exactly what is missing, what was checked, and the precise steps that
unblock the analysis.

Everything needed on the code side is already built and tested. See §6.

---

## 1. What was checked, and what it proves

| Check                                         | Result                                                                                   | What it proves                                               |
| --------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Search Console API reachable from the sandbox | `https://www.googleapis.com` → **`000`** (connection failed)                             | No API call can be made from here, with any credential       |
| Search Console API v3 host                    | `https://searchconsole.googleapis.com` → **`000`**                                       | Same                                                         |
| Egress works at all                           | `https://github.com` → **`200`**                                                         | The failure is Google-specific, not a general network outage |
| A Search Console connector exists             | `list_connector_tools("google_search_console")` → **`unsupported`**                      | Arena does not offer one                                     |
| Vercel connector exposes Search Console data  | 47 tools listed; all deployment, project, domain, env-var, team and webhook operations   | Not available there either                                   |
| Google Drive contains a GSC export            | 7 files found matching quickkit/gsc/queries; **all demo assets** (zip, mp4, png, folder) | No export has been saved to Drive                            |
| Repo contains a GSC integration               | No `webmasters`/`searchAnalytics` client, no service account, no verification token      | The app never reads Search Console                           |
| Credentials present in environment            | No Google/GSC env vars, no `gcloud`, no token file                                       | Nothing to authenticate with                                 |

**Conclusion:** the data is unavailable to me. This is a hard block, not a preference.

A note on the GSC token recorded in earlier project context: even if it is valid, the
network path to Google is closed from here, so it cannot be exercised. It is also a
credential that belongs to the owner and was never meant to travel into a sandbox.

---

## 2. Site-side readiness (this part _is_ verified)

So that when the data arrives the analysis is not blocked by an SEO problem:

| Check                                        | Result                                                         | Source                 |
| -------------------------------------------- | -------------------------------------------------------------- | ---------------------- |
| `robots.txt` served                          | **200**, allow-all except `/api/`, `Sitemap:` declared         | live fetch             |
| Googlebot rules                              | explicit `Allow: /`, `Disallow: /api/`                         | live fetch             |
| `sitemap.xml`                                | 80 URLs, exact match to 80 indexable built pages               | local production build |
| Canonical origin                             | `https://quickkit-rosy.vercel.app` everywhere                  | built HTML             |
| Duplicate titles / descriptions / canonicals | 0 / 0 / 0 across 149 pages                                     | built HTML             |
| Indexable crawl depth                        | max 2                                                          | link-graph BFS         |
| `noindex` pages                              | 68, all intentional (auth stubs, brand directory, AI category) | built HTML             |
| Indexing verification meta tag               | **absent** from the served homepage                            | live fetch             |

That last row matters for §3: if the property was verified by **HTML meta tag**, the tag
is not currently in the served HTML, and the property may have lost verification. If it
was verified by **DNS** or **Google Analytics**, this is a non-issue. This cannot be
determined from outside.

---

## 3. What the owner needs to do — exact steps

Pick **one** of the three routes below. Route A is the fastest and needs no code changes.

### Route A — export CSV from the Search Console UI (recommended, ~10 minutes)

1. Open <https://search.google.com/search-console>.
2. Select the property. Confirm it is the **URL-prefix** property whose exact string is
   `https://quickkit-rosy.vercel.app/` (with the trailing slash). If the only property is
   a **domain** property (`quickkit-rosy.vercel.app`, no scheme), that is also usable —
   just say which one it is.
3. **Performance → Search results.** Set **Date → Last 28 days**. Click **Export** (top
   right) → **Download CSV**. Name it `gsc-current-queries.csv`.
4. Change the date range to **the previous 28 days** (use "Compare" → "Previous period",
   or set custom dates). Export again → `gsc-previous-queries.csv`.
5. On the same page choose the **PAGES** tab instead of QUERIES. Export both windows →
   `gsc-current-pages.csv` and `gsc-previous-pages.csv`.
6. **Also capture, as either a screenshot or a short note:**
   - the **Pages → Indexing → Pages** report (how many indexed vs not indexed, and the
     reason breakdown);
   - **Settings → Sitemaps** (status of `sitemap.xml`, last read date);
   - **Settings → Ownership verification** (which method is listed).

   These resolve the open questions in §2 that no export answers.

7. Put the four CSVs plus the screenshots in Google Drive, in a folder named
   `QUICKKIT GSC Export`, and tell me the folder name.

> **Important limitation of Route A:** Search Console's CSV export gives you queries and
> pages **separately**. It does **not** contain the query→page pairing. That means two of
> the five requested findings — cannibalisation and intent mismatch — cannot be computed
> from CSVs alone. Route B fixes this.

### Route B — paginate the API (gives query→page pairs, ~30 minutes)

Only worth doing if you want the cannibalisation and intent-mismatch findings. It needs a
service account with access to the property.

1. In Google Cloud Console, create (or reuse) a project, enable the **Google Search
   Console API**.
2. Create a **service account**, create a **JSON key** for it, and download it.
3. In Search Console → **Settings → Users and permissions**, add the service account's
   email as a user with **Full** or **Restricted** permission.
4. Call `searchanalytics.query` with `dimensions: ["query","page"]` for the same two
   windows.
5. **Do not paste the JSON key into this chat, and do not commit it.** Put the resulting
   _data_ (not the key) in the Drive folder from Route A.

If you would rather not manage a service account, Route A plus a one-off manual check of
a handful of queries is enough to start — the analysis will simply report that
cannibalisation could not be assessed.

### Route C — grant Drive access to an existing export

If an export already exists somewhere, put it in a Drive folder and tell me the folder
name. I will read it from there.

---

## 4. The exact JSON shape the analyser accepts

Once data exists, convert it to this shape (or use the CSVs directly — see §5) and run
`npm run gsc:analyse -- path/to/export.json`.

```json
{
  "siteUrl": "https://quickkit-rosy.vercel.app/",
  "current": {
    "startDate": "2026-10-19",
    "endDate": "2026-11-15",
    "rows": [
      {
        "key": "merge pdf",
        "clicks": 12,
        "impressions": 940,
        "ctr": 0.0128,
        "position": 14.3
      }
    ]
  },
  "previous": {
    "startDate": "2026-09-21",
    "endDate": "2026-10-18",
    "rows": []
  },
  "currentPages": { "startDate": "…", "endDate": "…", "rows": [] },
  "queryPagePairs": [
    {
      "query": "merge pdf",
      "page": "https://quickkit-rosy.vercel.app/tools/merge-pdf",
      "impressions": 820,
      "clicks": 11,
      "position": 12.4
    }
  ]
}
```

`key` is a query for query windows and a URL for page windows. `ctr` is a fraction
(`0.0128` = 1.28%). `previous` and `queryPagePairs` are optional; without them the
corresponding findings are simply absent, never guessed.

---

## 5. What happens the moment the data lands

The analysis code is written, typechecked and covered by 21 tests. It produces exactly
the categories Phase 3 asked for:

| Requested finding               | How it is detected                           | Basis label    |
| ------------------------------- | -------------------------------------------- | -------------- |
| High-impression, low-CTR        | ≥50 impressions **and** CTR <2%              | `measured`     |
| Ranking just outside the top 10 | average position 11–20, ≥50 impressions      | `measured`     |
| Impressions but weak clicks     | 0 clicks with ≥50 impressions                | `measured`     |
| Genuine cannibalisation         | one query, ≥2 URLs, ≥10 combined impressions | `measured`     |
| Query not matching page intent  | researched-intent tool ≠ landing page        | **`inferred`** |

Plus two the brief did not ask for but that guard against misreading the data:

- **`no-impressions`** — a tool with no impressions is a _discovery_ problem, not a copy
  problem, and conflating the two is the most common way this analysis goes wrong.
- **`gained/lost-visibility`** — window-over-window movement, so a change is never
  mistaken for a trend.

Every finding quotes the numbers behind it, so any one can be checked or argued with.

---

## 6. Status of the code delivered this phase

| Item                      | State                                                                  |
| ------------------------- | ---------------------------------------------------------------------- |
| `lib/seo/gsc-analysis.ts` | written, typechecked, 21 tests passing                                 |
| `scripts/gsc-analyse.mts` | written; **refuses to run without a real export**                      |
| `npm run gsc:analyse`     | wired into `package.json`                                              |
| Synthetic-data tests      | 21, in `tests/gsc-analysis.test.ts`, labelled as synthetic in the file |
| Real-data findings        | **none — no data exists**                                              |

The analyser validates the input and exits non-zero rather than running on an empty or
malformed file. There is no sample data file and no default: a report full of invented
impressions would be worse than no report.

---

## 7. What I will not do without the data

- Estimate any click, impression, CTR or position.
- Guess which pages are "underperforming".
- Claim any query currently ranks anywhere.
- Recommend a specific page rewrite on the basis of an assumed ranking.

The prioritized action plan in the accompanying report is therefore built on **verified
site-side evidence and the researched keyword map**, with every item labelled as such.
It is a plan for when data exists, not a substitute for it.
