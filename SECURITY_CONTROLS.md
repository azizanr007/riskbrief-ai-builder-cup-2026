# Demonstrated controls and non-equivalences

| Control | Demo implementation | Boundary |
|---|---|---|
| Synthetic-only input | Exact keys, enumerated segment names, bounded values, no free-text fields, input length limit | A malicious user can modify browser code; do not accept real data |
| Deterministic evidence | Local fixed thresholds and SHA-256 of normalized input | Illustrative/un-calibrated; not financial adjudication |
| Gemini safety | Firebase AI Logic SDK, constrained JSON, input is compact synthetic evidence, output is validated against deterministic evidence | Client-side checks can be bypassed; no trusted backend validator |
| Credentials | No Gemini key in browser; Firebase AI Logic proxy; public Firebase identifiers only | Firebase configuration still requires project-specific API-key restrictions and App Check |
| Authentication | Firebase Auth email/password login, no signup UI | Not equivalent to v0.4 Argon2id/session/CSRF server controls |
| Reviewer authorization | Reviewer UID marker in Firestore, no client write access; rules gate one pending-to-final decision | Trusted admin must provision UIDs; rules must be published; no server-side reviewer service |
| Tenant/document isolation | Firestore document owner check and reviewer reads | No full multi-tenant or organization model |
| Persistence | Firestore stores the submitted synthetic analysis and review state | Not the Python SQLite schema; quota limits and service availability apply |
| Audit | Append-only audit documents from the client | Not hash-linked, not independently immutable, and client can lie about actions |
| Cost | Gemini disabled until project flag + public reCAPTCHA key; response token metadata recorded if returned | No backend cost governor; free-tier quota is not guaranteed and is not unlimited |
| Human review | Separate review status; only reviewer-marked UID can transition a pending record | Review is synthetic demo governance, not a real decision process |

## Release gate

Do not publish or enable the AI feature until Firebase App Check is enforced for Firebase AI Logic, the project is confirmed on Spark without Cloud Billing, API key restrictions are set, the Gemini Developer API free-tier entitlement/quotas are visible, and a one-request smoke check is explicitly approved. Never enable Blaze or paid model tiers in response to quota denial. Use only the bundled synthetic example.
