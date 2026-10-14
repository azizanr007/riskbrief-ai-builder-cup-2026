# RiskBrief BFSI — AI Builder Cup demonstration

This is a small, independent static web demonstration prepared from the frozen RiskBrief v0.4 behavior. It does not replace, edit, or package v0.4. Its domain module is freshly implemented in JavaScript to demonstrate the same evidence-first idea: deterministic thresholds, constrained Gemini evidence selection, post-response validation, and separate human review. It is a prototype, not a financial decision system.

## What the browser demo demonstrates

- Strict synthetic-only input schema, enum-limited segments, size/range bounds, reproducible SHA-256 and deterministic illustrative evidence.
- Firebase AI Logic's official Web SDK through the Gemini Developer API, configured for `gemini-3.5-flash-lite`, JSON output, a 400-token output cap and a 20-second SDK timeout. The model receives only evidence identifiers, category labels, and computed flag codes. The client rejects unknown evidence, unsupported or duplicate flags, extra prose fields, and missing mandatory uncertainty labels. It renders checked statements from fixed text, rather than presenting free-form generated prose as verified fact.
- Firebase Authentication Email/password and Google popup sign-in. Email/password accounts are manually provisioned; Google can create an Auth identity but never grants workspace access. Only trusted active `members/{uid}` records enable the private workspace; clients cannot write membership.
- Firestore per-user brief reads restricted to active workspace members, active reviewer membership records that clients cannot write, reviewer-only one-time decision transition, and append-only browser audit events. Disabled reviewer markers do not grant review permission. Account changes clear displayed analysis and invalidate pending responses.
- Explicit UI separation of deterministic findings, validated model selection, and human review.

## Important limits versus the Python v0.4 service

This static app has no trusted server. Input and model-output validation runs in the browser and can be bypassed by a modified client. Firestore rules enforce sign-in, document ownership, and reviewer decision restrictions, but they cannot recompute the Python risk analysis or independently verify a Gemini response. Reviewer records must be provisioned through a trusted Firebase Console workflow. The audit collection is append-only to the client by Firestore rules, but it is not hash-linked or tamper-proof against privileged project administrators. There is no Argon2id local auth, server session store, CSRF middleware, SQLite migration, idempotent server-side workflow, backup/restore service, or trusted cost governor. No real customer, live financial, or production portfolio data is accepted or appropriate.

The Gemini Developer API key is never included in the app. Firebase AI Logic proxies requests, and this project uses the official SDK. The Firebase Web API key/project configuration and reCAPTCHA Enterprise site key are public identifiers; restrict their use to the project's Firebase APIs and actual Hosting origins. AI calls are disabled unless Firebase configuration, a reCAPTCHA Enterprise site key, App Check enforcement, and an explicit local build flag are present. The app does not enable App Check debug mode or print tokens.

## Run deterministic tests and local build

Requires Node.js 20.19+ or 22.12+ (Node 24 is suitable).

```sh
npm ci
npm test
npm run test:browser
npm run build
npm run dev
```

Firestore Rules integration test (local emulator, demo project only):

```sh
npx -y firebase-tools@latest emulators:exec --only auth,firestore --project demo-riskbrief-rules "npm run test:rules && npm run test:auth"
```

Without `.env.local`, Firebase, Gemini, auth, and Firestore remain not configured. The deterministic analyzer still has automated unit coverage; production authentication/persistence cannot be tested without an actual project. No credentials are included in source. The owner-provided project and app IDs are public configuration; the API-key and Auth-domain placeholders remain unconfigured.

The browser suite uses real Chromium with explicitly mocked Firebase SDK modules. It never invokes Google services and does not prove a real Gemini response. Set `RISKBRIEF_CHROMIUM_PATH` if Chromium is installed at a different path. The actual Firestore Emulator independently verifies access rules.

## Spark/Firebase setup (authenticated Google access required)

The latest owner-supplied project ID is `project-e6ad1e02-5987-460a-990`, Web app `1:1010925225176:web:36cb756f6c0926c5d303ad`. This explicitly supersedes the earlier `proyek-...` spelling. The existing Hosting site in `firebase.json` remains `project-e6ad1e02-5987-460a-990`. Verify their actual ownership/association through authenticated Firebase access; supplied IDs are not proof of access. Always pass the explicit project ID to CLI commands. See [Firebase setup status](FIREBASE_SETUP_STATUS.md).

1. Select the existing project above; do not create another project or app. Confirm Spark and no linked Cloud Billing account before any cloud mutation. Use the official connected Firebase integration or trusted CLI OAuth; never send credentials or authorization codes through chat.
2. Retrieve the existing Web app configuration with `npx -y firebase-tools@latest apps:sdkconfig WEB 1:1010925225176:web:36cb756f6c0926c5d303ad --project project-e6ad1e02-5987-460a-990`. Enable Email/password and Google in Authentication. Use the authenticated owner-approved support email for Google branding; do not invent it. Add only the actual deployment hostname to Authorized domains, without a protocol or port. Google uses the official popup flow, with account selection; blocked/cancelled popups fail safely. No extra OAuth scopes are requested. Browser sessions use the official SDK's tab-session persistence. Email/password users are provisioned securely in Console; no password is stored in source.
3. Inspect the existing Firestore database edition/region before changes. Use Standard edition within the verified Spark quota; do not provision paid Enterprise resources. Publish `firestore.rules`. Through trusted Console administration, provision `members/{uid}` with `{ active: true }` for each approved analyst/reviewer. Also provision `reviewers/{uid}` with `{ active: true }` only for approved reviewers. Neither ACL can be written or listed by clients. Removing membership or setting `active: false` denies subsequent Firestore requests even with an active reviewer marker. The UI rechecks both ACLs from the server before sensitive operations and fails closed while offline. Initial Google authentication does not approve membership.
4. Enable Firebase AI Logic using the Gemini Developer API free tier. Choose a currently supported free-tier model and verify the project's usage-level/quota before any call. Firebase AI Logic does not guarantee quota availability for every project, and free-tier model/request limits can change. Do not link Cloud Billing.
5. Register the web app with reCAPTCHA Enterprise in Firebase App Check. Enforce App Check for Firebase AI Logic. The public demo must not use the debug provider. App Check/reCAPTCHA configuration and quota must be verified in the actual project before exposure.
6. Copy `.env.example` to `.env.local`, fill only the Firebase public web-app configuration and public reCAPTCHA site key, and set `VITE_FIREBASE_AI_LOGIC_ENABLED=true` only after App Check is enforced. Never add `GEMINI_API_KEY` or a service-account credential.
7. Run tests and build. Deploy only static content and rules with an authenticated Firebase CLI session, after confirming Spark and the no-charge quota. Do not use App Hosting, Cloud Functions, Cloud Run, Vertex AI, or an action that links Billing.

```sh
npm ci && npm test && npm run test:browser
npx -y firebase-tools@latest emulators:exec --only auth,firestore --project demo-riskbrief-rules "npm run test:rules && npm run test:auth"
npm run build
# Only after authentication, ownership, billing, quotas and App Check checks pass:
npx -y firebase-tools@latest deploy --only hosting,firestore:rules --project project-e6ad1e02-5987-460a-990
```

The Hosting static files are covered by Spark's current no-cost quotas (10 GB stored content and 10 GB/month CDN transfer; excess usage on Spark disables the relevant service rather than converting to billed usage). Firestore Spark quotas include 1 GiB stored data, 20,000 writes/day, 50,000 reads/day, and 20,000 deletes/day. Exceeding a Spark quota can make the feature unavailable until quota resets. The Gemini Developer API free tier is limited and is not equivalent to unlimited/free AI operations. Verify current per-model rate limits/availability in the project before testing. [Firebase Spark plan](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans) · [Hosting quotas](https://firebase.google.com/docs/hosting/usage-quotas-pricing) · [Firestore quotas](https://firebase.google.com/docs/firestore/quotas) · [Firebase AI Logic pricing](https://firebase.google.com/docs/ai-logic/pricing) · [AI Logic App Check](https://firebase.google.com/docs/ai-logic/app-check)

## AI Builder Cup submission readiness

The official AI Builder Cup 2026 site lists BFSI: Intelligent Risk, Fraud & Financial Experiences. It requires a functional Google AI prototype deployed on Google Cloud/Firebase, an English deck/PPT converted to PDF, and a public video. Until an authenticated dashboard confirms a different length, the video target is under three minutes. As checked on October 13, registration is closed (October 11); team formation runs through October 14; prototype submission runs through October 18, 2026. Eligibility is for working professionals; students are ineligible; the official page lists age 21+, JAPAC, and 2–4 members. Team registration/eligibility cannot be asserted from this repository. A dashboard-confirmed submission template and registered roster are still required. The project must not be represented as deployed or as having invoked Gemini until verified.

## Local verification status

English materials: [PDF deck](RiskBrief-AI-Builder-Cup-2026-Deck.pdf), [PowerPoint source](RiskBrief-AI-Builder-Cup-2026-Deck.pptx), [proposal](RiskBrief-AI-Builder-Cup-2026-Proposal.pdf), [prepared submission fields](SUBMISSION_FIELDS.md), and [genuine recording script](DEMO_RECORDING_SCRIPT.md). The deck records actual current status; it does not claim a hosted/model demonstration or accepted submission. Its PDF is converted from the accompanying PPTX. Rebuild the PPTX with `python3 scripts/build_submission_deck.py` (requires `python-pptx`) and convert with LibreOffice.

October 13 verification: 10 domain/release-control tests, 6 real-Chromium tests using explicitly mocked Firebase modules, and 7 actual Firestore Emulator rule tests passed. The production build passed desktop (1280 px) and mobile (390 px) Chromium/HTTP checks with zero external requests and no test fixtures in the bundle. This is viewport testing, not physical-device verification. `npm audit` reported zero vulnerabilities in the application dependencies.

The independent competition repository is public at https://github.com/azizanr007/riskbrief-ai-builder-cup-2026. Two subsequent remote commits correcting Hosting configuration were preserved before release fixes. Firebase CLI authentication is still absent; the target Hosting URL returned HTTP 404. Spark/billing state, actual web-app configuration, App Check enforcement, Gemini quota, real model invocation, deployment, video, team eligibility and official submission are unverified. See [RELEASE_VERIFICATION.md](RELEASE_VERIFICATION.md) for exact evidence and limits.

## Firebase agent skills

For Firebase work, read the relevant official skills installed with `npx skills add firebase/agent-skills --agent=codex --yes`. Installation of 13 skills was verified with `npx skills list --agent codex`; these instructions do not authenticate Google or activate any Firebase service. `AGENTS.md` records this working convention; `skills-lock.json` records upstream non-secret source hashes.

## October 14 Gemini integration check

The existing `gemini-3.5-flash-lite` remains listed as stable/billing-not-required in current official Firebase documentation. AI Logic now requests limited-use App Check tokens for replay-protection compatibility. App Check or AI initialization failure blocks AI without disabling otherwise authorized login and deterministic analysis. Actual project enforcement, Spark/quota and a genuine invocation are still unverified: the workspace has zero authenticated Google accounts and no populated SDK/App Check configuration. Final regressions: 48 passed, 0 failed, 0 skipped; build/audit and production mobile/desktop smoke passed. See [the exact Gemini check](GEMINI_INTEGRATION_CHECK.md) for results and the live-access blocker. No production mock fallback or paid backend was added.
