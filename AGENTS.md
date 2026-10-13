# RiskBrief execution instructions

This repository is the independent RiskBrief competition demo. NEBRYTHALIS is
out of scope. Preserve the frozen Python v0.4 source and archive.

For Firebase tasks, discover and read the relevant official Firebase agent
skills before implementation. Install the project skills with
`npx skills add firebase/agent-skills --agent=codex --yes` if missing; their
non-secret source hashes are recorded in `skills-lock.json`.

Use `firebase-basics` for CLI access, `firebase-auth-basics` for Authentication,
`firebase-firestore` plus `firestore-rules-creation` and
`firebase-security-rules-auditor` for Firestore, and
`firebase-hosting-basics` for classic static Hosting. Read applicable references.
Skills guide implementation; the user's zero-cost and privacy constraints apply.

The user-specified target is `project-e6ad1e02-5987-460a-990`, Web app
`1:1010925225176:web:36cb756f6c0926c5d303ad`. This supersedes the earlier
`proyek-...` spelling. Verify live ownership, app/site association, Spark and no
linked billing before changes to cloud services. Always pass the explicit
project ID. Never create another project or enable billing/Blaze.

Use synthetic data only. Do not expose credentials, OAuth codes or tokens.
There is no public workspace registration: Firebase identity authentication
must be followed by a trusted active `members/{uid}` record. Reviewer access
also requires active `reviewers/{uid}`. Clients cannot grant either membership.
Keep AI disabled until project quota and App Check enforcement are verified.
Distinguish fixture/emulator results from genuine live-service verification.

See `README.md`, `SECURITY_CONTROLS.md`, `FIREBASE_SETUP_STATUS.md` and
`RELEASE_VERIFICATION.md` for the current setup, evidence and remaining blockers.
