# RiskBrief competition release verification

Verification date: 2026-10-13 UTC. This is a release checkpoint of the existing independent prototype, not a new MVP version.

## Preserved checkpoints

- Frozen Python v0.4 ZIP SHA-256: `4d6f45a97498106da7f8ce8670abfc3a3e653910fda379ce68674f40259029cf`; matched again on October 13. Its source and archive were not edited.
- Python v0.4: 77 passed on October 10. This is a previously executed result, not a claim of a new October 13 Python test run.
- Initial independent demo commit: `db69eaf2509dd09efe41fc8bb8254acd5cbcf38e`.
- Remote Hosting fixes `464769a` and `0b29820e3356bb87105b3f841b7a64e17a7129d5` were fast-forwarded and preserved.
- Public source: https://github.com/azizanr007/riskbrief-ai-builder-cup-2026 . No unrelated repository was accessed or changed.

## Actual local checks

| Command/check | Actual result | What it proves |
|---|---|---|
| `npm test` | 10 passed, 0 failed, 0 skipped | Deterministic domain validation and source/configuration controls |
| `npm run test:browser` | 6 passed, 0 failed, 0 skipped | Real Chromium DOM flows with explicitly mocked Firebase services; success, rejected evidence, provider failures, role denial, account transitions and 390 px layout |
| `firebase emulators:exec --only firestore --project demo-riskbrief-rules 'npm run test:rules'` | 7 passed, 0 failed, 0 skipped | Actual local Firestore authorization rules, anonymous/cross-user denial, reviewer revocation, forged initial state, concurrent finalization and append-only client audit |
| `npm run build` | Passed | Production static assets build with official Firebase SDK |
| Built-assets HTTP/Chromium smoke | Passed at 1280 px and 390 px | Actual built app loads, reports missing config, makes no external requests; no page errors or horizontal overflow |
| Production-bundle fixture scan | No fixture marker found | Mock SDK fixture is absent from production JavaScript |
| `npm audit --json` | 0 vulnerabilities | Current application dependency advisory check, not a security certification |

The first browser harness run exposed incorrect test-environment injection and was interrupted/failed. That test harness was corrected; the six-test final browser run above passed. No failed or cancelled run is represented as a passing result.

## Release defects fixed

1. Missing `sim-label` DOM ID caused even valid Gemini responses to throw and disable saving.
2. Reviewer membership used document existence, allowing `active: false` markers to retain authority; active membership is now required.
3. Old analysis/role/record state could survive account changes; it is cleared and pending responses are tied to their original session/input.
4. Role lookup failure could retain privileged UI and then overwrite the error with a success message; access now remains unverified.
5. Mandatory synthetic/calibration/human-review uncertainty could be omitted; all three labels are now required.

## External state and outstanding gates

- Owner-supplied Firebase project: `proyek-e6ad1e02-5987-460a-990`.
- Existing source Hosting site: `project-e6ad1e02-5987-460a-990`. Authenticated project/site association has not been verified; their spelling difference is preserved, not guessed away.
- Firebase CLI `login:list` reports no authorized account. `projects:list` returns `Failed to authenticate, have you run firebase login?`.
- Official Firebase plugin is available but not installed/connected in this session. Secure Google OAuth through that connection is required; no authorization codes/tokens should be sent in chat.
- Target `https://project-e6ad1e02-5987-460a-990.web.app/` and reserved SDK-config endpoint both returned HTTP 404. This is not a verified deployment URL.
- Spark status, absence of enabled billing, project ownership, registered web app, key restrictions, App Check, services and remaining model quota cannot be verified until authenticated access is available.
- `gemini-3.5-flash-lite` is listed by official Firebase model documentation as not requiring billing. Actual project entitlement/quota and a real invocation remain unverified. Real Gemini calls performed in this pass: 0. Fixture token values are not real usage or cost.
- GitHub push/read access exists. GitHub Actions secret metadata access was denied with HTTP 403; no secret or automated deployment credentials were retrieved. No Actions deployment was triggered.
- No billing account, plan upgrade, payment method, paid provider or financial action was activated.

## Competition account gates

Official pages checked October 13: registration closed October 11; team formation through October 14; prototype submission through October 18. Requirements include working professionals, age 21+, JAPAC and 2–4 registered members. The registered account/roster is unavailable, so eligibility and submission are unverified. Use BFSI — Intelligent Risk, Fraud & Financial Experiences. Public requirements mention an English deck/PPT converted to PDF and a public three-minute video; the authenticated dashboard must settle the final template/length. No genuine deployed Gemini recording, video upload or submission receipt exists yet.

## References

- https://firebase.google.com/docs/ai-logic/models?api=dev
- https://firebase.google.com/docs/ai-logic/app-check
- https://firebase.google.com/docs/projects/billing/firebase-pricing-plans
- https://aibuildercup.com/
- https://aibuildercup.com/themes.html
