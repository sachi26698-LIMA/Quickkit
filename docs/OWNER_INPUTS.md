# Owner inputs required before public launch

No details in this document are presumed from your location, account or brand name. Do not provide passwords, private keys or personal access tokens in chat.

| Required decision/detail | Where it is used | What to supply/verify |
|---|---|---|
| Operator identity and business form | Privacy, Terms, any legally required site notices | Confirm whether the operator is an individual/sole proprietor/company and the actual public legal name. QUICKKIT is a brand, not an invented registered entity. |
| Operating jurisdiction and intended audience/markets | Governing terms, privacy obligations, consumer rights | Confirm where the operator is established and which markets/age groups the service targets. Obtain appropriate legal review; do not infer jurisdiction from a browser location. |
| Public contact method | Privacy rights requests, legal/support contact | A real monitored email address or supported contact method. Do not invent an address or publish an unmonitored mailbox. Decide response process/responsibility. |
| Address and registration disclosures, if required | Public legal/operator notice | Ask your adviser which business/registration/address details must be public. Do not send unnecessary personal documents in chat. |
| Hosting and operational data practices | Privacy hosting/log section | Confirm chosen Vercel plan/features, request/security logs, retention, access, region/subprocessors, provider terms and any optional analytics. Do not assert a made-up retention period. |
| Domain ownership | Canonicals, metadata, domain verification, DNS | The exact domain/HTTPS origin you own or are authorized to use. Verify provider DNS instructions, certificate and redirects; no credentials needed in chat. |
| Security review decision | Release approval record | Review `docs/security/DEPENDENCY_REVIEW.md`: 15 raw moderate dev-only findings remain, assessed as absent vulnerable optimizer in v3. Explicit review/acceptance or upstream remediation is needed. No acceptance is assumed. |
| GitHub owner, repository and visibility | Source publication and Vercel import | Choose your user/organization, repository name and private/public visibility. Private is the cautious initial default. Check branch protection and collaborators. |
| Source licensing | Any public source distribution | The old npm-initializer ISC label was not an owner-approved licence. Package is now private/UNLICENSED, with no new open-source grant. Choose and review a licence before publishing source publicly; preserve third-party licence obligations. |
| Vercel account/team/project selection | Hosting ownership, access and billing | Select the authorized account/team and intended project. Check plan limits and billing directly with the provider; no purchases or paid upgrades performed here. |
| Reference/third-party distribution rights | Public source/assets | Confirm rights to publish the supplied design reference and comply with third-party font/library licences. Keep the initial repository private; do not assume ownership from an upload. |
| Final release approval | `LAUNCH_APPROVED=true` for production only | Confirm completed legal pages, verified origin, security review, preview/device acceptance and rollback plan before enabling. Never use this to bypass unresolved gates. |

## Actual page edits pending

- `app/privacy/page.tsx`: replace the owner-action draft notice with verified operator/contact details; finalize hosting/retention and rights-request process.
- `app/terms/page.tsx`: replace draft notice; finalize operator/contact, applicable jurisdiction/consumer terms and any legally reviewed liability/dispute wording.
- If a real contact method is configured, add it consistently to legal pages/footer; until then, do not show a fake Contact link.
- Update the policy effective date when the final policies are approved. Current dates identify the draft implementation, not legal approval.
- Do not remove draft notices or claim compliance until actual details are supplied and reviewed.
