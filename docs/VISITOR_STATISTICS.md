# Live laptop visitor graph

The homepage graph now reads `/api/visitor-stats`. It never uses seeded, random or
browser-local numbers as website-wide totals. No historical analytics are imported.

## Production setup

Provision a persistent libSQL-compatible database (for example Turso) and supply
`ANALYTICS_DATABASE_URL` and its server-only `ANALYTICS_DATABASE_TOKEN` through your
hosting secret settings. Never expose the token using NEXT_PUBLIC_. The tables are
created automatically. All instances MUST use the same database. Without this
configuration, or on database failure, the panel says **Live stats unavailable**.

A self-hosted server can instead use `file:/absolute/persistent-volume/stats.db`.
Back up the volume; never commit the database. File URLs are rejected on Vercel.
The development/preview database is not production traffic and must not be copied
into production. Removing the database resets totals and the tracking start date.

## Definitions and limitations

- Online: distinct opted-in browser IDs with a visible-page heartbeat within 45s.
- Visitors: cumulative distinct opted-in random browser IDs since database creation.
  This is NOT a verified person count. Devices/storage clearing and bots affect it.
- Average stay: credited visible-tab seconds / visits, including ongoing visits.
  A visit is per tab and survives navigation/reload; it rotates after 24h on a new
  page load. Multiple tabs share the browser ID but each contributes a visit.
- Heartbeats every 20s while visible; graph polls every 15s while visible.
- Server caps duration per heartbeat by elapsed wall time and 30s; duplicate
  payloads cannot double-credit duration. Offline/suspended time is not guaranteed
  to be recovered. No claim of exact attention, bot-proof or audit-grade analytics.
- Bars use a logarithmic scale. Online and visitors are counts; average is seconds.
  Bars are not a time-series or comparable percentages. Hover is not the trigger:
  hold pointer/Space/Enter for 10s, then labels and values remain visible for 10s. Labels and values are hidden otherwise. Release,
  scroll, moving >12px, lost capture, blur, Escape or hiding the tab cancels a hold.
- Network failures hide the current snapshot rather than showing stale live counts.

## Privacy and operation

Tracking is OFF until the visitor opts in with the footer button. Do Not Track is
respected. Opt-out stops future heartbeats and removes local IDs. The API never
receives files, URLs or feedback, and does not store IPs/user agents. Ordinary
hosting request logs remain the operator's responsibility. Random IDs are hashed
server-side; hashed browser IDs remain for cumulative deduplication. Session rows
are pruned after 24h inactivity on the next write; aggregate totals remain.
Clearing browser data/opt-out does not subtract prior aggregate contributions.

The public endpoint returns aggregates only. It rejects cross-origin writes and
invalid/oversized input, but cannot authenticate a human visitor: configure hosting
WAF/rate limits (especially POST `/api/visitor-stats`) and database spending limits
before exposing to production. Legal review of opt-in text, identifiers, retention
and hosting location is required; no regulatory compliance is claimed.

For local verification use a database outside the repository, e.g.
`ANALYTICS_DATABASE_URL=file:/home/user/.cache/quickkit-visitors.db npm run dev`.
Tests use temporary databases or explicit API fixtures, never production totals.
