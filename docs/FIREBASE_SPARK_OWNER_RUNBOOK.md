# RiskBrief: Spark-only owner handoff and verification runbook

Updated 2026-10-13. This document is an **execution checklist**, not a record that cloud services were activated. See [RELEASE_VERIFICATION.md](../RELEASE_VERIFICATION.md) for the last evidence-based checkpoint.

## 0. Hard stop / cost policy

- Remain on **Firebase Spark (No cost)**; do **not** connect Google Cloud Billing, use a payment card, start a Cloud Free Trial, upgrade to Blaze, or enable paid features. Do not accept a service activation that requires billing.
- Do not activate Cloud Functions, Cloud Run, App Hosting, Cloud Storage or Vertex AI for this demo. Use regular **Firebase Hosting** static content, Email/Password Authentication, Cloud Firestore and (only if confirmed free for the project) Firebase AI Logic with the Gemini **Developer API**.
- Spark has quota and availability limits; `Rp0` is a target only **while** these verified no-cost services/quotas are used. Quota exhaustion can block operations.
- Never post passwords, OAuth codes, tokens, service-account JSON, secret API keys or payment details. Never commit `.env.local` or production credentials. Firebase web-app config and public reCAPTCHA site key can be public identifiers, but should only be populated from the actual authenticated project.

## 1. Owner-authenticated Firebase Console (manual until access works)

1. Sign in at https://console.firebase.google.com/ with the account that owns **RiskBrief AI Builder Cup 2026**. Confirm the exact **project ID** is `proyek-e6ad1e02-5987-460a-990`, and the plan is **Spark**. The user previously supplied a screenshot showing Spark on the sidebar; **an independent authenticated CLI/API check is still pending**. Stop if the ID or package differs.
2. Verify that no Cloud Billing account is linked. Do not submit billing info or Cloud Free Trial enrollment.
3. Under **Authentication → Sign-in method**, enable **Email/Password** (not Phone). Under Users, create the analyst and reviewer accounts through the console; the app intentionally offers no public signup. Do not include real credentials in issues, logs or reports.
4. Under **Firestore Database**, create a database *only if the console explicitly permits Spark with no billing*. Choose a supported region suitable for the project and record it. Prefer locked-down/production mode; do not leave permissive test rules publicly accessible.
5. Review local [firestore.rules](../firestore.rules); after emulator tests pass, publish these rules to **the verified project**, using authenticated Console/CLI. For each authorized reviewer, create `reviewers/{uid}` with `{ active: true }` through the trusted console, never through the browser app. No reviewer marker for an ordinary analyst. Test anonymous, cross-user, revoked-reviewer, and audit denial before public launch.
6. Under Project Settings, register a **Web app** and get only its Firebase public client config. Confirm which **Hosting site** belongs to the project: current [firebase.json](../firebase.json) names `project-e6ad1e02-5987-460a-990` while the owner-supplied project ID starts `proyek-`. **Never silently change either string** or deploy until association is verified.
7. Under **App Check**, configure the appropriate Web reCAPTCHA provider and check its **independent no-cost quota/activation requirements**. Enforce App Check for **Firebase AI Logic** before allowing public Gemini calls. If the setup requests billing, stop and report that gate. Debug App Check bypass must not be used on the public demo.
8. Under **Firebase AI Logic**, select **Gemini Developer API**, not Agent Platform / Vertex AI. Confirm the chosen `gemini-3.5-flash-lite` model is currently available **without billing for this project**, and verify its actual quota. Only after App Check is enforced, set `VITE_FIREBASE_AI_LOGIC_ENABLED=true` in a **local, uncommitted** deployment config. Use only synthetic sample data and one bounded genuine model call as the first smoke test.

**Never** interpret an HTTP 502 during Google sign-in as proof of Firebase service failure. It blocks verification; retry securely through the official sign-in workflow or attach the official Firebase plugin in a supported Codex/Work environment. Plugin connection needs owner consent.

## 2. Automatic CI (no project access required)

The GitHub Actions workflow `.github/workflows/verify.yml` uses the standard free Ubuntu hosted runner for this **public** repo. It runs:

```sh
npm ci
npm test
npm run test:browser
npx --yes firebase-tools@15.33.0 emulators:exec --only firestore --project demo-riskbrief-rules "npm run test:rules"
npm run build
npm audit --audit-level=high
```

Browser checks run Chromium with **mocked Firebase SDK**; Firestore tests exercise **local rules emulator**, not the deployed project. Build explicitly disables AI Logic. No secrets, Firebase login, Cloud Billing or paid deployment is used. **Only report green tests after a workflow actually completes successfully.** Workflows cannot establish that Authentication, Firestore, App Check or Gemini are active in the owner's Firebase project.

## 3. Deploy / rollback gates

**Before deployment:** verified project ownership and Spark/no-billing, linked correct Hosting site, Email/Password accounts, production security rules, safe Firebase Web configuration, App Check enforcement for AI Logic, model free-tier/quota and no real customer data. If any gate is missing, **do not deploy**.

After all gates and the owner's authenticated login:

```sh
npm ci && npm test && npm run test:browser && npm run build
npx --yes firebase-tools@15.33.0 deploy --only hosting,firestore:rules --project proyek-e6ad1e02-5987-460a-990
```

To rollback a bad web release, use Hosting release history / rollback in Firebase Console after confirming target site. If security rules are wrong, restore a previously reviewed, more restrictive ruleset through an authenticated deployment. Never revert to public/open rules as a quick fix. Stop access / disable the app's AI feature if the App Check enforcement or free model entitlements cannot be confirmed.

Record the real authenticated checks, actual costs/quota, deployment URL, model request result, and run links in the release documentation. Do not claim live Gemini or public demo footage based on test fixtures.

Official references: [Firebase billing / Spark](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), [AI Logic pricing](https://firebase.google.com/docs/ai-logic/pricing), [AI Logic App Check](https://firebase.google.com/docs/ai-logic/app-check), [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions).
