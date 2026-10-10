# RiskBrief BFSI — AI Builder Cup demonstration

This is a small, independent static web demonstration prepared from the frozen RiskBrief v0.4 behavior. It does not replace, edit, or package v0.4. Its domain module is freshly implemented in JavaScript to demonstrate the same evidence-first idea: deterministic thresholds, constrained Gemini evidence selection, post-response validation, and separate human review. It is a prototype, not a financial decision system.

## What the browser demo demonstrates

- Strict synthetic-only input schema, enum-limited segments, size/range bounds, reproducible SHA-256 and deterministic illustrative evidence.
- Firebase AI Logic's official Web SDK through the Gemini Developer API, configured for `gemini-3.5-flash-lite` and JSON output. The model receives only evidence identifiers, category labels, and computed flag codes. The client rejects unknown evidence, unsupported or duplicate flags, extra prose fields, and invalid uncertainty labels. It renders checked statements from fixed text, rather than presenting free-form generated prose as verified fact.
- Firebase Authentication sign-in only. Accounts are manually provisioned; there is no public signup.
- Firestore per-user brief reads, reviewer membership records that clients cannot write, reviewer-only one-time decision transition, and append-only browser audit events.
- Explicit UI separation of deterministic findings, validated model selection, and human review.

## Important limits versus the Python v0.4 service

This static app has no trusted server. Input and model-output validation runs in the browser and can be bypassed by a modified client. Firestore rules enforce sign-in, document ownership, and reviewer decision restrictions, but they cannot recompute the Python risk analysis or independently verify a Gemini response. Reviewer records must be provisioned through a trusted Firebase Console workflow. The audit collection is append-only to the client by Firestore rules, but it is not hash-linked or tamper-proof against privileged project administrators. There is no Argon2id local auth, server session store, CSRF middleware, SQLite migration, idempotent server-side workflow, backup/restore service, or trusted cost governor. No real customer, live financial, or production portfolio data is accepted or appropriate.

The Gemini Developer API key is never included in the app. Firebase AI Logic proxies requests, and this project uses the official SDK. The Firebase Web API key/project configuration and reCAPTCHA Enterprise site key are public identifiers; restrict their use to the project's Firebase APIs and actual Hosting origins. AI calls are disabled unless Firebase configuration, a reCAPTCHA Enterprise site key, App Check enforcement, and an explicit local build flag are present. The app does not enable App Check debug mode or print tokens.

## Run deterministic tests and local build

Requires Node.js 20.19+ or 22.12+ (Node 24 is suitable).

```sh
npm ci
npm test
npm run build
npm run dev
```

Firestore Rules integration test (local emulator, demo project only):

```sh
npx --yes firebase-tools@15.33.0 emulators:exec --only firestore --project demo-riskbrief-rules "npm run test:rules"
```

Without `.env.local`, Firebase, Gemini, auth, and Firestore remain not configured. The deterministic analyzer still has automated unit coverage; production authentication/persistence cannot be tested without an actual project. No credentials or Firebase project identifiers are included in source.

## Spark/Firebase setup (owner action required)

1. In Firebase Console, create or select a dedicated project and confirm its current plan is Spark with no linked Cloud Billing account. Do not use a project containing unrelated applications/data.
2. Register a Web app. Enable email/password Authentication and provision the analyst/reviewer accounts manually. Do not enable account creation in this client.
3. Create the Firestore database in a supported region and publish `firestore.rules`. Manually add `reviewers/{uid}` documents for only trusted reviewer UIDs; the web client cannot write these records.
4. Enable Firebase AI Logic using the Gemini Developer API free tier. Choose a currently supported free-tier model and verify the project's usage-level/quota before any call. Firebase AI Logic does not guarantee quota availability for every project, and free-tier model/request limits can change. Do not link Cloud Billing.
5. Register the web app with reCAPTCHA Enterprise in Firebase App Check. Enforce App Check for Firebase AI Logic. The public demo must not use the debug provider. App Check/reCAPTCHA configuration and quota must be verified in the actual project before exposure.
6. Copy `.env.example` to `.env.local`, fill only the Firebase public web-app configuration and public reCAPTCHA site key, and set `VITE_FIREBASE_AI_LOGIC_ENABLED=true` only after App Check is enforced. Never add `GEMINI_API_KEY` or a service-account credential.
7. Run tests and build. Deploy only static content and rules with an authenticated Firebase CLI session, after confirming Spark and the no-charge quota. Do not use App Hosting, Cloud Functions, Cloud Run, Vertex AI, or an action that links Billing.

```sh
npm ci && npm test && npm run test:rules && npm run build
npx --yes firebase-tools@15.33.0 deploy --only hosting,firestore:rules --project YOUR_DEDICATED_PROJECT_ID
```

The Hosting static files are covered by Spark's current no-cost quotas (10 GB stored content and 10 GB/month CDN transfer; excess usage on Spark disables the relevant service rather than converting to billed usage). Firestore Spark quotas include 1 GiB stored data, 20,000 writes/day, 50,000 reads/day, and 20,000 deletes/day. Exceeding a Spark quota can make the feature unavailable until quota resets. The Gemini Developer API free tier is limited and is not equivalent to unlimited/free AI operations. Verify current per-model rate limits/availability in the project before testing. [Firebase Spark plan](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans) · [Hosting quotas](https://firebase.google.com/docs/hosting/usage-quotas-pricing) · [Firestore quotas](https://firebase.google.com/docs/firestore/quotas) · [Firebase AI Logic pricing](https://firebase.google.com/docs/ai-logic/pricing) · [AI Logic App Check](https://firebase.google.com/docs/ai-logic/app-check)

## AI Builder Cup submission readiness

The official AI Builder Cup 2026 site lists BFSI: Intelligent Risk, Fraud & Financial Experiences. It requires a working Google Cloud prototype integrated with Google AI/Gemini and deployed on Cloud Run/GCP/Firebase, an English proposal PDF, and a public <=3-minute video. Official timeline: registration/team formation through October 11, prototype submission through October 18, 2026. Eligibility is for working professionals; students are ineligible; the official page lists age 21+ and 2–4 members. Team registration/eligibility cannot be asserted from this repository; participants must check their own registered team account. The project must not be represented as deployed or as having invoked Gemini until those actions are actually verified.

## Local verification status

This package can be unit-tested and built locally without cloud credentials. The Firestore Rules integration tests use the local Firebase Emulator Suite and demo-only project ID; they do not contact a Firebase production project. At the time of creation, Firebase project access, Firebase CLI authentication, App Check registration, a verified Gemini free-tier quota, public Hosting URL, contest portal session/team registration, GitHub competition repository, and public video upload are not configured in this workspace. Therefore no cloud call or deployment is claimed by this source package.
