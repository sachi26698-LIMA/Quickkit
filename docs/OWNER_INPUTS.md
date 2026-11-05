# Owner inputs required before public launch

No details in this document are presumed from your location, account or brand name. Do not provide passwords, private keys or personal access tokens in chat.

| Required decision/detail | Where it is used | What to supply/verify |
|---|---|---|
| Operator identity and business form | Privacy, Terms, any legally required site notices | Confirm whether the operator is an individual/sole proprietor/company and the actual public legal name. QUICKKIT is a brand, not an invented registered entity. |
| Operating jurisdiction and intended audience/markets | Governing terms, privacy obligations, consumer rights | Confirm where the operator is established and which markets/age groups the service targets. Obtain appropriate legal review; do not infer jurisdiction from a browser location. |
| Public contact method | Privacy rights requests, legal/support contact | A real monitored email address or supported contact method. Do not invent an address or publish an unmonitored mailbox. Decide response process/responsibility. **Status: still outstanding.** The development placeholder `hello@quickkit.in` was never confirmed as monitored and has been withdrawn from every page; `ownerDetails.publicEmail` is empty, so nothing is published and the contact form renders a disabled notice. |
| Address and registration disclosures, if required | Public legal/operator notice | Ask your adviser which business/registration/address details must be public. Do not send unnecessary personal documents in chat. |
| Hosting and operational data practices | Privacy hosting/log section | Confirm chosen Vercel plan/features, request/security logs, retention, access, region/subprocessors, provider terms and any optional analytics. Do not assert a made-up retention period. |
| Domain ownership | Canonicals, metadata, domain verification, DNS | The exact domain/HTTPS origin you own or are authorized to use. Verify provider DNS instructions, certificate and redirects; no credentials needed in chat. |
| Security review decision | Release approval record | Review `docs/security/DEPENDENCY_REVIEW.md`: 15 raw moderate dev-only findings remain, assessed as absent vulnerable optimizer in v3. Explicit review/acceptance or upstream remediation is needed. No acceptance is assumed. |
| GitHub owner, repository and visibility | Source publication and Vercel import | Choose your user/organization, repository name and private/public visibility. Private is the cautious initial default. Check branch protection and collaborators. |
| Source licensing | Any public source distribution | The old npm-initializer ISC label was not an owner-approved licence. Package is now private/UNLICENSED, with no new open-source grant. Choose and review a licence before publishing source publicly; preserve third-party licence obligations. |
| Vercel account/team/project selection | Hosting ownership, access and billing | Select the authorized account/team and intended project. Check plan limits and billing directly with the provider; no purchases or paid upgrades performed here. |
| Reference/third-party distribution rights | Public source/assets | Confirm rights to publish the supplied design reference and comply with third-party font/library licences. Keep the initial repository private; do not assume ownership from an upload. |
| Final release approval | `LAUNCH_APPROVED=true` for production only | Confirm completed legal pages, verified origin, security review, preview/device acceptance and rollback plan before enabling. Never use this to bypass unresolved gates. |

## Legal pages: where these values live (added 4 November 2026)

All twelve legal/information pages now read their owner-specific details from **`lib/site.ts` → `ownerDetails`**. Fill a field there and the "Owner to supply" marker disappears from every page at once — no page edits required. See `docs/LEGAL_PAGES.md` for the full implementation record.

| `ownerDetails` field | Used by | Notes |
|---|---|---|
| `publicEmail` | Every policy page (via `ContactLink`), Contact, Privacy §13/§14 | **The single field that un-publishes or restores a contact address.** Leave empty to keep the owner-input placeholder and the disabled contact form. |
| `legalName` | Terms §15, Privacy §14, About, IP | Operating entity. QUICKKIT is a brand, not a registered entity claim. |
| `jurisdiction` | Terms §14, Privacy, About, review notes | Governing law and forum. |
| `postalAddress` | Copyright (agent), Terms | Only if local law requires publication. |
| `registrationNumber` | Terms, Privacy | Only if publication is required. |
| `privacyEmail` | Privacy §13/§14, Contact | Falls back to the general address. |
| `securityEmail` | Security §7/§10, Contact | Falls back to the general address. |
| `copyrightEmail` | Copyright §4/§9, Contact | Falls back to the general address. |
| `businessEmail` | IP §8, Contact | Falls back to the general address. |
| `dataProtectionContact` | Reserved | Only if a representative/DPO must be appointed. |
| `minimumAge` | Privacy §12 | Intended minimum age for independent use. |

## Actual page edits pending

- `lib/site.ts`: set `ownerDetails.publicEmail` to a verified, monitored address (the old placeholder was withdrawn, not renamed) and replace the six demo social URLs; fill `ownerDetails` above. The owner-input notice on every legal page is derived from these fields, so it clears itself once they are supplied and `legalPagesRequiringOwnerInput` in `lib/legal.ts` is emptied.
- `lib/legal.ts`: bump `LEGAL_LAST_UPDATED` / `LEGAL_LAST_UPDATED_ISO` when the approved text replaces the draft, and remove the "Draft — pending owner details and legal review" note in `components/legal-page-shell.tsx`.
- Privacy §9 (hosting/log retention/subprocessors): complete once the production deployment is configured.
- Terms §12 (liability) and §14 (governing law): flagged in place; require legal review before publication.
- Copyright §5: requires the operator to decide whether an agent registration and safe-harbour position are needed; this page claims neither.
- Security §11 and Accessibility §12: no certification or conformance claim is made; keep it that way until a real audit exists.
- Do not remove draft notices or claim compliance until actual details are supplied and reviewed.
