# AdSense under the Content-Security-Policy

Referenced from `next.config.ts`. This records *why* the policy allows the hosts
it allows, so a future edit can tell a deliberate exception from an accident.

The policy itself is assembled in `next.config.ts`; this file does not define it.

## The problem

Allowing only the AdSense loader (`adsbygoogle.js`) leaves every ad slot blank.
After the loader runs, Google pulls additional scripts, renders ad creatives in
iframes, loads images, and beacons measurements back to a fixed set of Google
hosts. A policy that lists only `pagead2.googlesyndication.com` produces a page
where the slot space is reserved and nothing fills it — a silent revenue and
layout bug, not a security failure. The hosts are therefore listed per resource
type, host by host.

## The hosts, and the directive each one belongs to

| Directive | Hosts | Why |
|---|---|---|
| `script-src` | `pagead2.googlesyndication.com`, `tpc.googlesyndication.com`, `googleads.g.doubleclick.net`, `www.googletagservices.com`, `adservice.google.com`, `partner.googleadservices.com`, `fundingchoicesmessages.google.com` | the loader plus the scripts it spawns, including the consent (CMP) message |
| `frame-src` | `googleads.g.doubleclick.net`, `pagead2.googlesyndication.com`, `tpc.googlesyndication.com`, `www.google.com`, `ep1/ep2.adtrafficquality.google`, `fundingchoicesmessages.google.com` | the ad iframe, Google-managed formats (anchor, vignette), traffic-quality frames, and the consent message and its dismiss control |
| `img-src` | `pagead2.googlesyndication.com`, `tpc.googlesyndication.com`, `googleads.g.doubleclick.net`, `www.google.com`, `www.gstatic.com` | creatives and pixels |
| `connect-src` | `pagead2.googlesyndication.com`, `googleads.g.doubleclick.net`, `tpc.googlesyndication.com`, `www.google.com`, `ep1/ep2.adtrafficquality.google`, `fundingchoicesmessages.google.com`, `csi.gstatic.com` | measurement beacons |

## Rules this file is here to protect

1. **No wildcards and no scheme-wide sources.** Nothing is allowed as `*` or as
   a bare `https:`. Every entry is a full `https://host` origin.
2. **Only AdSense directives are widened.** `default-src`, `base-uri`,
   `object-src`, `form-action`, `frame-ancestors` and `font-src` are unaffected
   by advertising. `object-src` stays `'none'`.
3. **`'unsafe-eval'` is never granted,** with or without ads. This is not
   negotiable to make a Google script work; if a future ad format demands it,
   the correct answer is to drop that format.
4. **The allowlist is static, the loader is conditional.** The hosts are in the
   policy unconditionally because the header is assembled at build time, while
   the loader and every ad slot are gated at runtime by `isAdsEnabled()` in
   `lib/ads.ts`, which requires both `ADS_ENABLED` and
   `NEXT_PUBLIC_ADS_ENABLED` to be `"true"` (`app/(public)/layout.tsx`).
   With advertising switched off, the hosts are permitted but nothing requests
   them.

## Known residual

Because the four origin arrays are unconditional, a deployment with advertising
switched off still permits those hosts in the header. Tightening this means
making the arrays depend on the same switch as the loader; that was reviewed and
deferred, because a build-time switch that disagrees with the runtime switch
would blank every slot in production. The conditional loader — not the static
header — is the control that keeps Google from being contacted when ads are off.

## Verifying a change

`tests/next-headers.test.ts` pins every host listed above, directive by
directive, in both enforcing and report-only modes. A change that adds, removes
or widens an origin fails that test before it can reach a deployment.
