# Security incident record — SMTP credential returned by read-only Auth connector

**Incident ID:** QK-SEC-2026-11-10-01
**Status:** MITIGATION REPORTED BY OWNER — independent revocation/config verification pending.
**Severity:** High (provisional; owner/provider investigation may revise it).
**Observed:** 10 November 2026 UTC.
**Affected integration:** the SMTP credential configured for the existing Supabase Auth project.
**Production changes by this audit:** none.

## Summary

A read-only Supabase Auth configuration request returned a response containing the configured SMTP credential, despite the request being for configuration metadata. The credential value is deliberately not recorded in this incident, the repository, chat, or follow-up connector calls. The owner has now reported updating the SMTP credentials. This is owner attestation; the previous credential's revocation and the current email/SMTP configuration have not been independently verified because the available Auth configuration connector returns credential material. No evidence of misuse was collected; provider/Auth mail logs were not inspected, and no delivery test was performed.

## Containment and evidence handling

- Do not retrieve, repeat, test, or use the old credential.
- The credential value was not copied into a file or completion report.
- Do not use the Auth-configuration connector again for this check because its response included credential material.
- No production secrets, environment variables, database rows, or deployment settings were modified by this audit.

## Required owner response

1. The owner reports that the SMTP credentials have been updated. Confirm the exposed credential is no longer valid and the replacement is configured through the owner-controlled provider/Supabase dashboards. Do not send either credential value in chat, source, logs, or this repository.
2. Confirm the old credential is no longer valid using the provider dashboard (not by testing it from this workspace).
3. Review provider outbound-mail logs and Supabase Auth mail events for unexpected sending, recipients, or changes during the exposure window; preserve evidence and follow the owner's incident-response process if anything is suspicious.
4. Perform a controlled delivery check using the replacement credential and a test mailbox, while keeping email confirmation enabled.
5. Record the rotation timestamp and outcome here using status only—never record the replacement value.

**Current disposition:** owner reports rotation; independent confirmation that the old credential is revoked, review of provider/Auth mail logs, and a controlled delivery check remain pending. Do not retrieve or test either credential. The Auth connector response is not a safe verification channel.

## Continuation status

The owner-reported credential update remains the only available mitigation evidence. Independent old-credential revocation, provider/Auth mail-log review, and controlled delivery verification remain outstanding. No secret was retrieved, tested, or added to repository files. The unsafe Auth configuration connector was not queried again.

## Owner-readiness status update — 10 November 2026 UTC

No new credential access or SMTP test was performed in this pass. The incident remains **OPEN — owner-reported mitigation; independent verification pending**. The safe verification checklist remains: confirm old credential revocation in the provider dashboard; review provider outbound-mail and Supabase Auth mail events for the exposure window; configure the approved sender privately; send a controlled message to an owner-controlled mailbox while keeping email confirmation enabled; record only timestamp and outcome/status. Do not query the unsafe Auth configuration connector or disclose old/replacement values. No revocation, log review, or successful delivery is claimed.
