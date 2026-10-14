# Gemini Developer API integration check — October 14, 2026

Target: existing RiskBrief project `project-e6ad1e02-5987-460a-990`, Web app
`1:1010925225176:web:36cb756f6c0926c5d303ad`. The owner reports that the Firebase
Console now shows Gemini Developer API as **VALID**. That is recorded as an
owner-reported provisioning status, not an independently verified inference.

## Verified code and official model documentation

- Official Firebase Web SDK `13.0.0`, `firebase/ai`, `GoogleAIBackend` only.
  No Agent Platform/Vertex backend is initialized and no Gemini secret is in
  client source. AI remains disabled in the example/build configuration.
- Official Firebase model documentation retrieved with HTTP 200 in this check
  lists `gemini-3.5-flash-lite` as a stable model with billing **not required**.
  The existing model is therefore retained. Documentation eligibility does not
  establish this project's quota or current billing state.
- Official Firebase pricing says the Developer API free tier requires no linked
  Cloud Billing account and corresponds to Spark. Linking billing makes usage
  pay-as-you-go. This task does not link billing or upgrade the project.
- Official App Check documentation requires the SDK option
  `useLimitedUseAppCheckTokens: true` to use replay protection. SDK `13.0.0`
  supports it and selects `getLimitedUseToken()` when enabled. The option is now
  configured in RiskBrief. This does not itself enforce replay protection in
  the Console; live configuration must be checked separately.
- Existing constrained JSON response schema, 400 output-token cap, 20-second
  SDK timeout, one in-flight UI request, evidence-ID/finding validation and
  mandatory uncertainty labels remain. Requests contain only compact synthetic
  evidence IDs/categories/flags, not private datasets or customer information.

## Compatibility fixes and verification

The prior integration omitted limited-use App Check tokens. That could fail
against a project requiring replay protection; no real HTTP 403 is claimed to
have been observed. The compatible SDK option is now tested.

App Check or AI/model initialization failures previously reached the broad
Firebase setup catch, disabling login. They now block AI with explicit safe
status, while approved Authentication/Firestore/deterministic functionality may
continue if those services independently permit access. There is no alternate
paid backend, mock production fallback or bypass of failed verification.

Final commands actually run:

| Check | Result | Scope |
|---|---|---|
| `npm test` | 10 passed, 0 failed, 0 skipped | Domain/evidence and source release controls |
| `npm run test:browser` | 15 passed, 0 failed, 0 skipped | Actual Chromium with explicit Firebase fixtures, including initialization isolation and limited-use-token SDK options |
| `npx -y firebase-tools@latest emulators:exec --only auth,firestore --project demo-riskbrief-rules 'npm run test:rules && npm run test:auth'` | 19 Firestore + 4 Auth passed, 0 failed, 0 skipped | Actual local emulators; Google identity fixture is not real Google OAuth |
| `npm run build` | Passed | Official SDK production bundle |
| `npm audit --json` | 0 vulnerabilities | App dependency advisories |
| Built production HTTP/Chromium smoke | Passed at 1280 and 390 px | AI disabled with missing config, HTTP 200, no external requests, page errors or horizontal overflow |
| Production fixture scan | Passed | No test SDK marker in built JavaScript |

Total automated regression tests: **48 passed, 0 failed, 0 skipped**.
None of these local results establishes genuine Gemini inference or live App
Check enforcement. No model request was sent to Google in this check.

## Live verification blocked

- `npx -y firebase-tools@latest login:list --json`: **0 authorized accounts**.
- `npx -y firebase-tools@latest projects:list --json`: **authentication required**.
- Official Firebase plugin remains available but not connected in this session;
  no ready Google outbound identity or credential binding is configured.
- `.env.local` is absent. Public SDK API-key/Auth-domain values and the public
  reCAPTCHA Enterprise App Check site key are still placeholders in the example.
- Existing target `https://project-e6ad1e02-5987-460a-990.web.app/` and its
  `/__/firebase/init.json` both returned **HTTP 404** in this check. This is not a
  verified deployed RiskBrief URL.
- Ownership, Spark/no-linked-billing, model quota, Firebase AI Logic proxy
  provisioning, App Check app registration/enforcement/replay settings and
  authorized application login remain **NOT VERIFIED** by this workspace.

**Real Gemini inference: NOT VERIFIED; 0 live invocations performed.** No paid
service, Blaze plan, billing account, credit card or Agent Platform Gemini API
was activated. The frozen Python v0.4 archive checksum remains unchanged:
`4d6f45a97498106da7f8ce8670abfc3a3e653910fda379ce68674f40259029cf`.

## Minimum external dependency and subsequent bounded check

The owner must grant Google/Firebase access through the official secure
authorization interface. Agent skill installation and a Console **VALID** label
do not authenticate Codex. Never send passwords, OAuth codes, tokens, private
keys or service-account credentials through chat.

Once that access is available, inspect this exact existing project and verify
Spark/no linked billing and free-tier quota. Retrieve the existing Web app's
public SDK configuration through the CLI/MCP; inspect Firebase AI Logic and App
Check configuration. If the AI Logic proxy is not provisioned, the official skill
uses `npx -y firebase-tools@latest init ailogic --project project-e6ad1e02-5987-460a-990`;
do not initialize another project or select the paid backend. Console enforcement
is distinct from requesting limited-use tokens in source. Verify that attestation
is within the allowed no-cost quota before a real request.

Use a legitimately authenticated, approved RiskBrief member to run **one**
bounded inference with the bundled synthetic input. Record actual model/version,
returned usage or UNKNOWN, response/evidence validation and persisted review
state. On quota/auth/attestation denial, stop the real-call attempt and report the
actual failure; do not upgrade billing, retry without bounds or present fixtures
as a live result.

## Official references retrieved in this check

- https://firebase.google.com/docs/ai-logic/models.md.txt
- https://firebase.google.com/docs/ai-logic/pricing.md.txt
- https://firebase.google.com/docs/ai-logic/app-check.md.txt
- Installed official skill: `.agents/skills/firebase-ai-logic-basics/SKILL.md`
  and `references/usage_patterns_web.md`.
