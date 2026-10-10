# RiskBrief — Evidence-Led BFSI Risk Intelligence

## Problem statement

BFSI risk teams need a transparent way to review aggregate portfolio changes without treating a generated summary as a decision. Small shifts in concentration, delinquency, or fraud-alert volume can be difficult to scan consistently. A useful triage aid should show which input values drove a flag, expose uncertainty, and leave the decision to a qualified human reviewer.

## Proposed solution

RiskBrief converts a bounded synthetic portfolio snapshot into deterministic evidence. An AI model may select from findings already present in that evidence, but it cannot introduce new measurements, thresholds, predictions, or actions. The application validates the selected evidence identifiers and finding codes, then renders short language from fixed statements. A separately authorized reviewer can approve or reject the saved brief.

The prototype demonstrates a safer workflow for human review. It does not score real borrowers, decide credit eligibility, adjudicate fraud, recommend financial transactions, or claim improved financial outcomes.

## User journey

1. An analyst signs in to a provisioned account.
2. The analyst loads or submits a small dataset labeled SYNTHETIC_TEST_DATA.
3. The browser computes illustrative concentration, delinquency, and alert-volume evidence and a content hash.
4. Firebase AI Logic can ask a supported Gemini Developer API model to select existing evidence identifiers and allowed finding codes using structured JSON.
5. The client rejects unknown evidence and unsupported codes before rendering fixed, evidence-linked language.
6. The analyst saves the result; Firestore rules scope records to the creator and preserve the review boundary.
7. A separately provisioned reviewer makes a one-time pending-to-approved/rejected transition.

## AI and technical design

The Firebase version is a small static web demonstration. Firebase Hosting serves the UI; Firebase Authentication gates access; Cloud Firestore stores synthetic-only briefs and reviewer decisions; Firebase AI Logic's official JavaScript SDK is the planned Gemini route. The candidate model is gemini-3.5-flash-lite, which Firebase's current supported-model table lists as usable through Gemini Developer API without Blaze. Firebase App Check must be enforced with a production reCAPTCHA Enterprise provider before any deployed AI call. The app contains no Gemini API key, service-account key, or privileged server credential.

The model receives only evidence IDs, fixed segment labels, and already-computed flag codes. Its structured response is allowlisted against the deterministic evidence. It does not get tools, upload files, or trigger actions. Model-selected findings are rendered from local fixed text rather than unverified model prose.

## Feasibility and scalability

The demo uses a small and bounded input schema, no raw uploads, no free-text user prompt, and no unbounded model call. Static hosting and Firestore are available on Firebase Spark subject to product quotas. Authentication and Firestore are adequate for a controlled prototype with manually provisioned users. A production design would need server-side validation, stronger audit storage, privacy and data-governance review, managed cost controls, and independent security assessment before accepting real BFSI data.

## Security and governance

- Only synthetic records are permitted in the demonstration.
- Authentication is sign-in-only; there is no account creation in the app.
- Reviewer membership is provisioned outside the client and is not writable by app users.
- Firestore rules check record ownership and allow only a reviewer to make one decision on a pending brief.
- Firebase AI Logic calls require explicit local build configuration, reCAPTCHA Enterprise, and enforced App Check.
- No AI response is described as verified until parsing and evidence validation succeed.
- Human review is a separate stage; output is informational, uncertain, and not an adjudication.
- Provider, usage, and deployment states remain visibly not configured until checks succeed.

## Impact hypothesis and evaluation

The hypothesis is that making source evidence and uncertainty visible can help a reviewer understand why an aggregate segment was flagged and distinguish a deterministic indicator from AI-generated selection. The prototype does not yet establish time savings, accuracy, fraud reduction, fairness, or financial benefit. A later controlled evaluation could measure evidence traceability, reviewer disagreement, decision time, unsupported-output rejection, and usability on synthetic or appropriately governed data, without using the demo for customer adjudication.

## Current implementation status — 10 October 2026

The frozen Python v0.4 baseline was rechecked: 77 automated tests pass. A separate, independent JavaScript Firebase demo has been implemented with deterministic analysis, strict schema checks, constrained Firebase AI Logic integration, Firebase Authentication sign-in, Firestore rules, and reviewer flow. Its nine local domain/release-control tests, four Firestore Emulator rules tests, and static build pass. No Firebase project configuration, Firebase CLI login, App Check registration, hosted URL, or Gemini invocation was available in the working session. Therefore the cloud AI path is code-prepared but not yet exercised or deployed. No live Gemini result, public deployment, or production data is claimed.

## Competition category

AI Builder Cup 2026 — BFSI: Intelligent Risk, Fraud & Financial Experiences.

## References

- Firebase AI Logic: https://firebase.google.com/docs/ai-logic
- Firebase AI Logic supported models: https://firebase.google.com/docs/ai-logic/models?api=dev
- Firebase AI Logic pricing: https://firebase.google.com/docs/ai-logic/pricing
- Firebase AI Logic App Check: https://firebase.google.com/docs/ai-logic/app-check
- Firebase Spark plan and product limits: https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- AI Builder Cup 2026 themes and requirements: https://aibuildercup.com/themes.html
- AI Builder Cup 2026 timeline and eligibility: https://aibuildercup.com/
