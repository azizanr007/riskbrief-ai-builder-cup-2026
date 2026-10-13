# Prepared English submission content

This document contains actual project content and verified links. It has not been entered into an authenticated competition dashboard. Mandatory fields and the prescribed template must be checked there before submission. Blank external fields are blockers, not completed deliverables.

**Project title:** RiskBrief BFSI — Evidence-Led Risk Intelligence

**Category:** BFSI — Intelligent Risk, Fraud & Financial Experiences

**Overview:** RiskBrief demonstrates aggregate risk triage using synthetic data, reproducible deterministic evidence, constrained Google AI evidence selection, post-response validation and a separate human reviewer decision. It does not make credit, investment, fraud or customer decisions.

**Problem:** Aggregate concentration, delinquency changes and alert volumes can be hard to scan consistently. Generated language can conceal unsupported claims. Reviewers need direct evidence references, explicit uncertainty and a separate approval boundary.

**Solution and Google AI:** The official Firebase AI Logic Web SDK sends compact synthetic evidence IDs, category labels and computed finding codes to a Gemini Developer API model. Structured output is checked against the deterministic evidence. Unknown citations, unsupported/duplicate findings, malformed/oversized responses and missing mandatory uncertainty are rejected. A real Gemini invocation is still required; current local tests use explicitly identified fixtures.

**Architecture:** Static Firebase Hosting UI; Firebase Authentication sign-in; Cloud Firestore document/reviewer rules; official Firebase AI Logic SDK; production App Check required. The frozen Python v0.4 service is independent and is not executed by Firebase Hosting. The static client has no trusted server-side validation/cost governor and its client audit is not independently immutable.

**Impact:** Evidence traceability and transparent human review are the proposed benefit. Accuracy, time saved, fraud reduction, financial benefit and real-user adoption have not been measured or claimed.

**Verification:** October 13: 10 domain/control tests, 6 real-Chromium UI tests with service fixtures, 7 actual Firestore Emulator tests; build and local production-asset viewport/HTTP checks passed. App dependency audit: 0 vulnerabilities. Frozen Python v0.4: 77 passing tests recorded October 10, unchanged ZIP.

**Public source:** https://github.com/azizanr007/riskbrief-ai-builder-cup-2026

**PDF deck:** `RiskBrief-AI-Builder-Cup-2026-Deck.pdf` (converted from the accompanying PPTX; contains truthful current verification state).

**Functional deployed URL:** UNVERIFIED. Target Hosting endpoint returns HTTP 404; do not submit it as a functional prototype.

**Real Google AI evidence:** UNVERIFIED. Candidate `gemini-3.5-flash-lite` is documented as not requiring billing; project entitlement/quota and actual invocation are unverified.

**Public genuine demo video:** NOT PRODUCED. Record a verified deployed Gemini workflow; target under three minutes unless the authenticated dashboard says otherwise. Acceptable public locations named by the published rules: YouTube, Vimeo or Google Drive.

**Registered team / participants / eligibility:** UNVERIFIED. Use only real existing registered member details. Do not invent participants or add a student. Published criteria: working professionals, age 21+, JAPAC, 2–4 members.

**Consent / official receipt:** NOT SUBMITTED. Any legally binding account-owner agreement requires the owner's direct action.

**Dates:** Official site checked October 13: registration closed October 11, team formation through October 14, prototype submission through October 18. Public theme is BFSI; the requirements page also contains older category boilerplate, so select the actual BFSI field in the authenticated dashboard.

References: https://aibuildercup.com/ · https://aibuildercup.com/themes.html · https://firebase.google.com/docs/ai-logic/models?api=dev
