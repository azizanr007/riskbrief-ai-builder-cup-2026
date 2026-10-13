# Demonstrated controls and non-equivalences

| Control | Demo implementation | Boundary |
|---|---|---|
| Synthetic-only input | Exact keys, enumerated segment names, bounded values, no free-text fields, input length limit | A malicious user can modify browser code; do not accept real data |
| Deterministic evidence | Local fixed thresholds and SHA-256 of normalized input | Illustrative/un-calibrated; not financial adjudication |
| Gemini safety | Firebase AI Logic SDK, constrained JSON, input is compact synthetic evidence, output is validated against deterministic evidence | Client-side checks can be bypassed; no trusted backend validator |
| Credentials | No Gemini key in browser; Firebase AI Logic proxy; public Firebase identifiers only | Firebase configuration still requires project-specific API-key restrictions and App Check |
| Authentication | Firebase Auth email/password login, no signup UI | Not equivalent to v0.4 Argon2id/session/CSRF server controls |
| Reviewer authorization | Reviewer UID marker must have `active: true`; no client writes; rules gate one pending-to-final decision and reject forged initial review metadata | Trusted admin must provision UIDs; rules must be published; revocation affects subsequent requests, not data already read |
| Tenant/document isolation | Firestore document owner check and reviewer reads | No full multi-tenant or organization model |
| Persistence | Firestore stores the submitted synthetic analysis and review state | Not the Python SQLite schema; quota limits and service availability apply |
| Audit | Append-only audit documents from the client | Not hash-linked, not independently immutable, and client can lie about actions |
| Cost | Gemini disabled until project flag + public reCAPTCHA key; 400 output tokens, 20-second SDK timeout, one in-flight UI request; usage recorded only if returned | UI limits can be bypassed. No trusted cost governor; project quotas/App Check must be verified before enabling AI |
| Human review | Separate review status; only reviewer-marked UID can transition a pending record | Review is synthetic demo governance, not a real decision process |

## Release gate

The public source repository does not activate any cloud service. Do not deploy an enabled AI feature until Firebase App Check is enforced for AI Logic, the project is confirmed on Spark without Cloud Billing, API key restrictions are set, and Gemini Developer API free-tier entitlement/quotas are verified. The owner has already authorized one bounded no-cost real-model check after these gates pass; missing authentication is not missing permission. Never enable Blaze or paid model tiers in response to quota denial. Use only the bundled synthetic example.

Release fixes on October 13: correct the missing AI-status DOM ID; require active reviewer membership in both UI and rules; clear workspace/analysis across account changes; discard superseded provider/record responses; fail closed when role verification fails; require all three uncertainty labels. Browser tests use clearly identified service fixtures and are excluded from the production build. They do not establish cloud identity, service health, or real model activity.
