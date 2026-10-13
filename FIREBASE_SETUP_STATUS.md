# Firebase Authentication and Firestore setup

Checked on October 13, 2026 UTC, against the independent RiskBrief competition
demo. This does not create a new MVP version or change the frozen Python v0.4.

## Existing target supplied by the owner

- Project: `project-e6ad1e02-5987-460a-990`.
- Web app: `1:1010925225176:web:36cb756f6c0926c5d303ad`.
- Existing source Hosting site: `project-e6ad1e02-5987-460a-990`.

The latest explicit project ID supersedes earlier instructions using
`proyek-e6ad1e02-5987-460a-990`. No new project, app or site was created. The
local ignored `.firebaserc` selects the new explicit project; deployment commands
must still pass `--project project-e6ad1e02-5987-460a-990`. These supplied
identifiers have not yet been matched to live resources through authenticated
Google access.

## Implemented and locally verified

- Official Firebase Auth SDK Email/password sign-in and Google popup sign-in,
  with account selection and no additional OAuth scopes. No credentials are
  extracted, printed or manually stored. Official SDK tab-session persistence;
  sign-out and account changes clear the private workspace and old results.
- Workspace access requires trusted `members/{uid}` with `active: true`.
  Review permission additionally requires trusted `reviewers/{uid}` with
  `active: true`. Missing, inactive, malformed or inaccessible ACLs fail closed.
  Clients may get only their own ACLs and cannot list, create, update or delete
  them. An authenticated Google identity is not automatically an analyst.
- ACLs are read from the server before sensitive operations, not accepted from
  offline cached roles or browser flags. Revocation denies subsequent Firestore
  operations, including when a reviewer marker remains active.
- Brief reads are scoped to the author or approved reviewer. Queries are
  bounded to 20 results. Rules enforce the synthetic label, outer schema and
  list bounds, immutable evidence/ownership, and one pending-to-final review.
- Audit events are append-only to clients, bounded and linked to a matching
  same-time save/review. Save/review and audit are written in batches/transactions.
  This is not an independently immutable or hash-linked server audit ledger.
- Both login controls remain disabled with missing/failed Firebase configuration.
  Popup cancellation/domain/provider errors are generic and do not show secrets.
  Hosting CSP allows only the two target Firebase Auth helper origins plus the
  existing reCAPTCHA frame origins.

## Actual final verification

| Command/check | Result | Boundary |
|---|---|---|
| `npx --yes skills add firebase/agent-skills --agent=codex --yes` | 13 skills installed | Instructions, not Google OAuth credentials |
| `npx --yes skills list --agent codex` | 13 project skills found | Installation verified |
| `npx -y firebase-tools@latest --version` | `15.33.0` | CLI available |
| `npm ci` | Passed | Existing lockfile retained |
| `npm test` | 10 passed, 0 failed, 0 skipped | Domain/release controls |
| `npm run test:browser` | 14 passed, 0 failed, 0 skipped | Real Chromium with clearly identified Firebase SDK fixtures; no Google or Gemini call |
| `npx -y firebase-tools@latest emulators:exec --only auth,firestore --project demo-riskbrief-rules 'npm run test:rules && npm run test:auth'` | 19 rules + 4 Auth tests passed, 0 failed, 0 skipped | Actual loopback Standard-edition Firestore and Auth emulators |
| `npm run build` | Passed | Production assets built |
| Built-assets HTTP/Chromium smoke | Passed at 1280 and 390 px | HTTP 200, disabled unconfigured Auth, zero external requests, no overflow or page errors; not physical-device testing |
| Production fixture marker scan | No matches | Fixtures excluded from production assets |
| `npm audit --json` | 0 vulnerabilities | Application dependencies only; not a security certification |

Final total: **47 passing tests, 0 failing, 0 skipped**. An initial structural
source assertion needed updating to reflect the new ACL rule syntax. Initial
overly detailed nested rule validators exceeded Firestore's 1000-expression
limit and rejected valid writes. The final outer-shape/bounds validators were
tested with both successful operations and attacks. The limitation is explicit:
rules do not validate nested facts or authenticate a model response; a dedicated
test demonstrates this boundary, while the application's evidence validator
rejects unknown evidence and unsupported findings.

Auth emulator Google credentials are explicitly unsigned test fixtures accepted
by the emulator. They do not establish real Google OAuth/signature verification,
live authorized domains or a genuine Google login. Email/password emulator tests
use random ephemeral synthetic credentials and do not provision real accounts.
Sign-out clears the client session; it does not revoke every issued ID token.

Frozen v0.4 archive SHA-256 remains:
`4d6f45a97498106da7f8ce8670abfc3a3e653910fda379ce68674f40259029cf`.

## Current live status: blocked by Google authentication

- `npx -y firebase-tools@latest login:list --json`: **0 authorized accounts**.
- `npx -y firebase-tools@latest projects:list --json`: **authentication required**.
- Official Firebase plugin discovery: available, **not installed/connected**.
- Project ownership, app/site association, Spark/billing, remote Firestore
  edition, Auth providers and authorized domains remain **NOT VERIFIED**.
- No live rules, users, membership documents, providers or Hosting releases were
  created or modified in this pass. No genuine Gemini calls, paid services,
  billing activation or financial operations occurred.

The minimum owner action is to connect Firebase through the official secure
Google authorization interface. Never send OAuth codes, passwords, access tokens,
private keys or service-account files through chat. Installed agent skills alone
cannot authenticate an account.

## Execute after authenticated access is available

1. Inspect this exact project, existing app/site and access rights. Verify Spark,
   no linked billing and sufficient no-cost quota before mutations.
2. Retrieve the Web app's public configuration:

   ```sh
   npx -y firebase-tools@latest apps:sdkconfig WEB 1:1010925225176:web:36cb756f6c0926c5d303ad --project project-e6ad1e02-5987-460a-990
   ```

   Use it only in ignored `.env.local`, with the existing `.env.example` names.
   Do not invent an API key, auth domain or OAuth support email. The example IDs
   are filled; the remaining public SDK values still have placeholders.

3. Inspect `firestore:databases:list` and the existing database details. Use the
   existing supported Standard database within Spark; do not create Enterprise
   resources, replace data or activate billing. Check existing collections before
   deploying this app's scoped rules so unrelated applications are unaffected.
4. Enable Email/password and Google via trusted project administration. Google
   branding/support email must come from the authorized account. Add the actual
   deployment hostname to authorized domains without protocol or port. Do not
   enable anonymous sign-in or add a public registration UI.
5. Provision demo users securely, then `members/{uid}` for approved accounts and
   `reviewers/{uid}` only for trusted reviewers. First Google sign-in can create
   an Auth identity but remains denied until its UID is explicitly approved.
6. Deploy reviewed rules and static Hosting only after resource/cost checks:

   ```sh
   npx -y firebase-tools@latest deploy --only hosting,firestore:rules --project project-e6ad1e02-5987-460a-990
   ```

7. Verify real login for both providers, denial for unapproved accounts,
   persistence, review isolation, sign-out/account switching and actual mobile
   popup behavior on the returned HTTPS URL. No live-service success is claimed
   before these checks.

Firebase AI Logic stays disabled. Firestore membership does not itself implement
server authorization for AI Logic or a trusted spending governor. App Check,
free-tier model quota and provider-side abuse/access controls must be verified
before enabling even the previously authorized bounded real-model test. No Blaze,
paid Gemini, Functions, Cloud Run, App Hosting or other paid fallback is permitted.
