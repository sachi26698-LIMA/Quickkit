# QUICKKIT Supabase Auth email pack

Prepared locally only. These files have **not** been pasted into Supabase and no live project setting has been changed. The project remains configured with public signup disabled. No test email was sent.

## Install map (manual owner action after approval)

Paste the HTML body from each file into **Supabase Dashboard → Authentication → Email Templates** and set the matching subject from `subjects.json`:

| Supabase email type | HTML file | Subject key | Required template variables |
| --- | --- | --- | --- |
| Confirm signup | `templates/confirmation.html` | `confirmation` | `{{ .ConfirmationURL }}` |
| Invite user | `templates/invitation.html` | `invite` | `{{ .ConfirmationURL }}` |
| Magic link | `templates/magic-link.html` | `magic_link` | `{{ .ConfirmationURL }}`, `{{ .Token }}` |
| Change email address | `templates/email-change.html` | `email_change` | `{{ .ConfirmationURL }}`, `{{ .NewEmail }}` |
| Reset password | `templates/password-reset.html` | `recovery` | `{{ .ConfirmationURL }}` |
| Reauthentication | `templates/reauthentication.html` | `reauthentication` | `{{ .Token }}` |

`template-map.json` is the machine-readable mapping. The six bodies keep Supabase-issued confirmation URLs intact as CTA and visible fallback (never replace them with a hand-built URL), and use Supabase's one-time `.Token` in OTP-only contexts. No external assets, social URLs, or speculative contact details are embedded. The brand palette is QUICKKIT plum/rose/coral with the verified repo tagline “Handy tools. Zero hassle.” All CSS is inline with a narrow-screen responsive table layout and semantic headings/links.

The copy deliberately says “expires soon” without asserting a TTL. Live Auth reports an email OTP lifetime of 120 seconds and 8-digit length today; Supabase generates/enforces expiry and one-time use. Keep those product rules in control of Supabase, and adjust wording if the owner changes the live TTL.

## Read-only live inspection (2026-11-10)

Project `Quick_kit` (`oevjmxcoyibkonousdoh`, `eu-west-1`) and Auth/DB/REST health were reported healthy. The Auth config read returned:

- `disable_signup=true`; email auth on; phone auth off; email auto-confirm off; anonymous accounts off. Do not enable public signup.
- Site URL is `https://quickkit-rosy.vercel.app`; redirect allowlist is only that site's `/auth/callback` and `http://localhost:3000/auth/callback`. Keep the callback in the list. Add a preview callback only if the owner expressly chooses a specific controlled preview origin; never allow broad wildcard/external redirects.
- Access-token/JWT expiry is 3,600 seconds. The app's Supabase cookie `maxAge` is 30 days; that cookie setting is not the JWT/session lifetime. Refresh-token rotation reports enabled at the Auth level; the legacy `security_refresh_token_rotation_enabled` field was null, so do not interpret null as disabled. Reuse interval is 10 seconds.
- Password minimum is 12 characters with lowercase, uppercase, and numeric character-class requirements. HIBP/breached-password check is off. Keep strong minimums; owner may consider enabling breached-password checks if available on the current plan. Current-password and reauthentication requirements for password updates are enabled. CAPTCHA is off; with public signup disabled this is not currently an open enrollment path, but evaluate abuse protection before any separately approved public-auth launch.
- TOTP MFA enrollment and verification are enabled; phone MFA and WebAuthn/passkeys are off. `mfa_allow_low_aal=false`. Maintain MFA for the owner and verify a recovery path before changing factors. Single-session and inactivity limits are not configured (reported zero); this is a policy decision, not a reason to force a change that could sign out/lock out the owner.
- Password-change, email-change, and MFA factor enroll/unenroll security notifications are enabled. Phone-change and identity-linked notifications are off; identity-unlinked is on. Review notification template text and enable only the alerts that fit the provider/product behavior. Existing notification bodies are default Supabase text, not part of the six requested templates.
- All six corresponding custom subject/content flags were false: live project is using stock templates and subjects. SMTP fields indicate a configured sender and non-empty credential, but the credential is **compromised** and is not reproduced here. This indicates configuration presence only, not successful SMTP delivery. Do not read, copy, or reuse that credential.
- Supabase currently reports OTP length 8 and lifetime 120 seconds. Vercel project is `quickkit`; its custom project domain list showed `quickkit-rosy.vercel.app` verified. No Vercel/Supabase values were changed.

These observations are a point-in-time snapshot from the read-only Auth config operation. The connector response included sensitive SMTP material; it has been intentionally omitted from repository files and this report. Treat the former credential as exposed. No claim is made that it has been rotated or that delivery works.

## Owner / dashboard checklist — not applied

### Before any configuration change

1. Owner signs into the existing Supabase project and verifies the account can still sign in to QUICKKIT Admin. Keep the existing owner account and server-side `QUICKKIT_ADMIN_EMAILS` exactly as-is. Never create an extra admin or change RLS for email work.
2. Rotate/revoke the exposed SMTP credential at its issuing account/provider, using the provider's own dashboard. Do not reuse it. Then replace only the intended Supabase SMTP credential with a newly generated secret and store it in an approved password manager. If rotation risks current delivery, coordinate a maintenance window; do not change owner login credentials.
3. Prefer a production transactional email provider for auth mail rather than a personal Gmail mailbox: verified sending domain, SPF and DKIM, DMARC alignment, TLS, bounce/complaint handling, delivery events, and appropriate rate limits. Set a stable sender name/address controlled by the operator; verify deliverability with a specifically approved test mailbox. No address is prescribed by this pack.
4. Confirm the Supabase Site URL exactly matches the production canonical origin above and keep only necessary callback redirects. Keep callback URLs HTTPS in production. Do not add arbitrary domains, `*`, open redirect routes, or all Vercel preview domains.

### Templates and notifications

5. Paste each body/subject from this directory into its corresponding dashboard email type, carefully retaining curly-brace variables exactly. Save, then inspect each saved template for variable names and link target. Do not customize security notifications with unverified support/contact details.
6. Preserve the six relevant security notification controls. Review password changed, email changed, MFA factor enrolled/unenrolled, phone changed, and identity link/unlink alerts according to enabled sign-in methods. For any alert text that advises contacting support, use a contact channel only after the owner has verified it is monitored. Never disclose passwords, full tokens, or links in support requests or logs.
7. Re-check public signup is disabled and email auto-confirm is off. This app removed public account flows and retains an owner-only Admin login; do not enable signup or add public authentication merely to test these emails.

### Password, session, redirect, MFA

8. Keep the 12-character minimum and current upper/lower/digit requirements; consider compromised-password checks if available. Keep password changes requiring the current password and reauthentication.
9. Keep the current one-hour JWT policy unless the owner has a documented need to change it. Do not assume the app's 30-day cookie is JWT expiry. Avoid session-wide policy changes without testing a spare approved test account and confirming the owner recovery route.
10. Keep TOTP MFA available and low-AAL access disabled. Owner should confirm their enrolled factor and recovery codes before any factor changes. WebAuthn/passkeys can be separately evaluated, not enabled as part of this template task.
11. Recheck redirect allowlist and application callback: code exchange must succeed, identity must pass the server-side allowlist, unauthorized identities must be signed out locally, and only constrained local `/admin` destinations may be followed.

## SMTP rotation and verification checklist

- [ ] Record provider/account owner and current sending domain without exposing the old secret in notes.
- [ ] Revoke the exposed credential; create a distinct replacement secret in the mail provider.
- [ ] Update the SMTP secret through the Supabase Dashboard (never this repo, chat, issue, or log); verify host, port, TLS mode, sender identity and username against the provider's documented settings.
- [ ] Confirm SPF/DKIM/DMARC and domain verification at DNS/provider; no DNS or provider settings were changed here.
- [ ] Send one test only after the owner specifies the exact recipient and explicitly authorizes sending. Record provider acceptance and inbox/spam outcome without logging tokenized URLs or OTPs.
- [ ] Test deliverability, rate limits, bounce/complaint handling, and alert/monitoring path.

## Isolated checks and limits

Run `npx vitest run tests/supabase-email-templates.test.ts tests/supabase-auth-callback.test.ts tests/supabase-auth-ui.test.tsx` for local render/template safety assertions plus existing mocked auth callback and legacy public-route checks. No live Auth user, token, email, database row, or SMTP transaction is used. Invalid/expired tokens are a Supabase service behavior; a local unit test cannot prove the live one-time-token verifier. Dashboard staging should use only an owner-approved, isolated test account and recipient. Invalid/expired links should fail safely at Supabase and never redirect off-site.

For a dashboard template smoke test, owner should inspect rendered mail at phone width and desktop width, click only a test-account link, verify the unexpired token is single-use, then verify a second use and an expired token do not authenticate. Check all six message subjects/bodies and the configured security notification variants without sending to an unapproved recipient. Keep template checks and tests separate from production configuration until explicit authorization.
