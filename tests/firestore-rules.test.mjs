// Explicit synthetic fixtures. All access is against a demo-project emulator.
import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, limit, orderBy, query, setDoc, updateDoc, deleteDoc, serverTimestamp, where, writeBatch } from 'firebase/firestore';
import { analyze, sampleDataset } from '../src/domain.mjs';

let env;
let analysis;
const RULE_PROJECT = 'demo-riskbrief-rules';
const authenticated = uid => env.authenticatedContext(uid).firestore();
const decision = (uid = 'trusted-reviewer', status = 'APPROVED') => ({ status, decisionByUid: uid, decidedAt: serverTimestamp() });
const brief = (uid = 'analyst-a') => ({
  createdByUid: uid, createdAt: serverTimestamp(), datasetLabel: 'SYNTHETIC_TEST_DATA',
  inputHash: analysis.inputHash,
  deterministic: { totalExposure: analysis.totalExposure, thresholdVersion: analysis.thresholdVersion, evidence: structuredClone(analysis.evidence) },
  ai: { provider: 'Firebase AI Logic / Gemini Developer API', model: 'gemini-3.5-flash-lite',
    selection: { findings: [{ evidenceId: 'E001', findingCode: 'CONCENTRATION' }], uncertaintyCodes: ['SYNTHETIC_ONLY', 'UNCALIBRATED', 'ANALYST_REVIEW_REQUIRED'] }, usage: null },
  review: { status: 'PENDING', decisionByUid: null, decidedAt: null },
});

before(async () => {
  analysis = await analyze(sampleDataset());
  env = await initializeTestEnvironment({
    projectId: RULE_PROJECT,
    firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    const batch = writeBatch(db);
    for (const uid of ['analyst-a', 'analyst-b', 'trusted-reviewer', 'revoked-reviewer']) {
      batch.set(doc(db, 'members', uid), { active: true });
    }
    batch.set(doc(db, 'members/revoked-member'), { active: false });
    batch.set(doc(db, 'reviewers/trusted-reviewer'), { active: true });
    batch.set(doc(db, 'reviewers/revoked-reviewer'), { active: false });
    batch.set(doc(db, 'reviewers/revoked-member'), { active: true });
    batch.set(doc(db, 'reviewers/unapproved-google'), { active: true });
    for (const id of ['brief-a', 'brief-b']) batch.set(doc(db, 'briefs', id), { ...brief(), createdAt: new Date() });
    batch.set(doc(db, 'audit/seed-event'), { actorUid: 'analyst-a', action: 'BRIEF_SAVED', briefId: 'brief-a', createdAt: new Date() });
    await batch.commit();
  });
});

after(async () => { await env?.cleanup(); });

test('analyst can read own record but cannot read another user record', async () => {
  await assertSucceeds(getDoc(doc(authenticated('analyst-a'), 'briefs/brief-a')));
  await assertFails(getDoc(doc(authenticated('analyst-b'), 'briefs/brief-a')));
});

test('brief creation requires authenticated ownership and synthetic label', async () => {
  const analyst = authenticated('analyst-a');
  await assertSucceeds(setDoc(doc(analyst, 'briefs/created'), brief()));
  await assertFails(setDoc(doc(authenticated('analyst-b'), 'briefs/spoofed'), brief()));
  await assertFails(setDoc(doc(analyst, 'briefs/real-data'), { ...brief(), datasetLabel: 'REAL' }));
  await assertFails(setDoc(doc(analyst, 'briefs/old-timestamp'), { ...brief(), createdAt: new Date(0) }));
});

test('reviewer can decide once; analyst and client-side role grants are denied', async () => {
  const analyst = authenticated('analyst-a');
  const reviewer = authenticated('trusted-reviewer');
  await assertFails(updateDoc(doc(analyst, 'briefs/brief-a'), { review: decision() }));
  await assertFails(setDoc(doc(analyst, 'reviewers/analyst-a'), { active: true }));
  await assertFails(updateDoc(doc(analyst, 'members/analyst-a'), { active: true, role: 'SYSTEM_OWNER' }));
  await assertSucceeds(updateDoc(doc(reviewer, 'briefs/brief-a'), { review: decision() }));
  await assertFails(updateDoc(doc(reviewer, 'briefs/brief-a'), { review: decision('trusted-reviewer', 'REJECTED') }));
  await assertFails(deleteDoc(doc(reviewer, 'briefs/brief-a')));
});

test('audit events cannot be updated or deleted by clients', async () => {
  const actor = authenticated('analyst-a');
  const batch = writeBatch(actor);
  batch.set(doc(actor, 'briefs/saved'), brief());
  batch.set(doc(actor, 'audit/event-a'), { actorUid: 'analyst-a', action: 'BRIEF_SAVED', briefId: 'saved', createdAt: serverTimestamp() });
  await assertSucceeds(batch.commit());
  await assertFails(updateDoc(doc(actor, 'audit/event-a'), { action: 'REVIEW_DECIDED' }));
  await assertFails(deleteDoc(doc(actor, 'audit/event-a')));
});

test('revoked reviewer role does not grant cross-user reads or decisions', async () => {
  const revoked = authenticated('revoked-reviewer');
  await assertFails(getDoc(doc(revoked, 'briefs/brief-b')));
  await assertFails(updateDoc(doc(revoked, 'briefs/brief-b'), { review: decision('revoked-reviewer') }));
});

test('anonymous access and forged initial review metadata are rejected', async () => {
  const anonymous = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(anonymous, 'briefs/brief-a')));
  await assertFails(getDocs(query(collection(anonymous, 'briefs'), limit(20))));
  await assertFails(setDoc(doc(anonymous, 'briefs/anonymous'), brief()));
  await assertFails(setDoc(doc(authenticated('analyst-a'), 'briefs/forged-review'), { ...brief(), review: { status: 'PENDING', decisionByUid: 'trusted-reviewer', decidedAt: null } }));
});

test('concurrent reviewer decisions finalize a brief exactly once', async () => {
  const reviewer = authenticated('trusted-reviewer');
  const outcomes = await Promise.allSettled(['APPROVED', 'REJECTED'].map(status =>
    updateDoc(doc(reviewer, 'briefs/brief-a'), { review: decision('trusted-reviewer', status) })
  ));
  assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 1);
  assert.equal(outcomes.filter(x => x.status === 'rejected').length, 1);
});

test('new Google identity cannot access the private workspace or self-enroll', async () => {
  const google = env.authenticatedContext('unapproved-google', { firebase: { sign_in_provider: 'google.com' }, role: 'REVIEWER' }).firestore();
  await assertSucceeds(getDoc(doc(google, 'members/unapproved-google')));
  await assertFails(getDoc(doc(google, 'briefs/brief-a')));
  await assertFails(getDocs(query(collection(google, 'briefs'), limit(20))));
  await assertFails(setDoc(doc(google, 'briefs/google-created'), brief('unapproved-google')));
  await assertFails(setDoc(doc(google, 'members/unapproved-google'), { active: true }));
  await assertFails(updateDoc(doc(google, 'briefs/brief-a'), { review: decision('unapproved-google') }));
  await assertFails(setDoc(doc(google, 'audit/google-event'), { actorUid: 'unapproved-google', action: 'REVIEW_DECIDED', briefId: 'brief-a', createdAt: serverTimestamp() }));
});

test('revoked member cannot access data even with an active reviewer marker', async () => {
  const revoked = authenticated('revoked-member');
  await assertSucceeds(getDoc(doc(revoked, 'reviewers/revoked-member')));
  await assertFails(getDoc(doc(revoked, 'briefs/brief-a')));
  await assertFails(getDoc(doc(revoked, 'audit/seed-event')));
  await assertFails(setDoc(doc(revoked, 'briefs/revoked'), brief('revoked-member')));
  await assertFails(updateDoc(doc(revoked, 'briefs/brief-a'), { review: decision('revoked-member') }));
});

test('membership and reviewer records permit own get only and deny all client writes', async () => {
  const user = authenticated('analyst-a');
  for (const name of ['members', 'reviewers']) {
    await assertSucceeds(getDoc(doc(user, name, 'analyst-a')));
    await assertFails(getDoc(doc(user, name, 'trusted-reviewer')));
    await assertFails(getDocs(collection(user, name)));
    await assertFails(setDoc(doc(user, name, 'new-identity'), { active: true }));
    await assertFails(setDoc(doc(user, name, 'analyst-a'), { active: true }));
    await assertFails(deleteDoc(doc(user, name, 'analyst-a')));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), name, 'analyst-a')));
  }
});

test('actual bounded application queries work and unscoped or unbounded analyst queries fail', async () => {
  const analyst = authenticated('analyst-a');
  const reviewer = authenticated('trusted-reviewer');
  await assertSucceeds(getDocs(query(collection(analyst, 'briefs'), where('createdByUid', '==', 'analyst-a'), limit(20))));
  await assertSucceeds(getDocs(query(collection(analyst, 'audit'), where('actorUid', '==', 'analyst-a'), limit(20))));
  await assertSucceeds(getDocs(query(collection(reviewer, 'briefs'), orderBy('createdAt', 'desc'), limit(20))));
  await assertSucceeds(getDocs(query(collection(reviewer, 'audit'), limit(20))));
  await assertFails(getDocs(query(collection(analyst, 'briefs'), limit(20))));
  await assertFails(getDocs(query(collection(analyst, 'briefs'), where('createdByUid', '==', 'analyst-b'), limit(20))));
  await assertFails(getDocs(query(collection(analyst, 'briefs'), where('createdByUid', '==', 'analyst-a'))));
  await assertFails(getDocs(query(collection(reviewer, 'briefs'), limit(21))));
});

test('brief validators reject outer schema pollution, malformed map types and oversized lists', async () => {
  const db = authenticated('analyst-a');
  const mutations = [
    record => { delete record.inputHash; },
    record => { record.role = 'REVIEWER'; },
    record => { record.deterministic = 'not-a-map'; },
    record => { record.deterministic.totalExposure = -1; },
    record => { record.deterministic.evidence = Array(9).fill(record.deterministic.evidence[0]); },
    record => { record.ai.model = 'm'.repeat(101); },
    record => { record.ai.selection.findings = Array(16).fill(record.ai.selection.findings[0]); },
    record => { record.ai.selection.uncertaintyCodes = ['SYNTHETIC_ONLY']; },
    record => { record.ai.usage = { promptTokenCount: -1, candidatesTokenCount: null, totalTokenCount: null }; },
    record => { record.review.extra = 'pollution'; },
  ];
  for (let index = 0; index < mutations.length; index += 1) {
    const record = brief();
    mutations[index](record);
    await assertFails(setDoc(doc(db, 'briefs', 'bad-schema-' + index), record));
  }
  const usage = { promptTokenCount: 80, candidatesTokenCount: 40, totalTokenCount: 120 };
  await assertSucceeds(setDoc(doc(db, 'briefs/valid-known-usage'), { ...brief(), ai: { ...brief().ai, usage } }));
});

test('review updates cannot hijack ownership, alter evidence, spoof reviewer or corrupt the resulting schema', async () => {
  const reviewer = authenticated('trusted-reviewer');
  const ref = doc(reviewer, 'briefs/brief-a');
  await assertFails(updateDoc(ref, { createdByUid: 'trusted-reviewer', review: decision() }));
  await assertFails(updateDoc(ref, { createdAt: serverTimestamp(), review: decision() }));
  await assertFails(updateDoc(ref, { deterministic: { totalExposure: 1 }, review: decision() }));
  await assertFails(updateDoc(ref, { review: decision('analyst-a') }));
  await assertFails(updateDoc(ref, { review: { ...decision(), decidedAt: new Date(0) } }));
  await assertFails(updateDoc(ref, { review: { ...decision(), extra: 'unauthorized' } }));
  await assertFails(updateDoc(ref, { review: { status: 'PENDING', decisionByUid: null, decidedAt: null } }));
});

test('audit creation rejects missing references, unrelated actors, fake actions and stale or polluted events', async () => {
  const analyst = authenticated('analyst-a');
  const base = { actorUid: 'analyst-a', action: 'BRIEF_SAVED', briefId: 'brief-a', createdAt: serverTimestamp() };
  const invalid = [
    { ...base, briefId: 'missing' },
    { ...base, actorUid: 'analyst-b' },
    { ...base, action: 'REVIEW_DECIDED' },
    { ...base, action: 'SYSTEM_OWNER_GRANTED' },
    { ...base, briefId: 'brief-a', createdAt: new Date(0) },
    { ...base, extra: 'payload' },
    { ...base, briefId: 'x'.repeat(129) },
    { ...base, briefId: 'brief-a' }, // Cannot replay an earlier save as a new action.
  ];
  for (let index = 0; index < invalid.length; index += 1) await assertFails(setDoc(doc(analyst, 'audit', 'invalid-' + index), invalid[index]));
});

test('review and its matching audit can be committed atomically by active reviewer', async () => {
  const reviewer = authenticated('trusted-reviewer');
  const batch = writeBatch(reviewer);
  batch.update(doc(reviewer, 'briefs/brief-a'), { review: decision() });
  batch.set(doc(reviewer, 'audit/decision-a'), { actorUid: 'trusted-reviewer', action: 'REVIEW_DECIDED', briefId: 'brief-a', createdAt: serverTimestamp() });
  await assertSucceeds(batch.commit());
  await assertFails(setDoc(doc(reviewer, 'audit/replay-decision'), { actorUid: 'trusted-reviewer', action: 'REVIEW_DECIDED', briefId: 'brief-a', createdAt: serverTimestamp() }));
});

test('trusted membership revocation denies subsequent reads and writes without relying on UI state', async () => {
  const analyst = authenticated('analyst-a');
  await assertSucceeds(getDoc(doc(analyst, 'briefs/brief-a')));
  await env.withSecurityRulesDisabled(async context => {
    await updateDoc(doc(context.firestore(), 'members/analyst-a'), { active: false });
  });
  await assertFails(getDoc(doc(analyst, 'briefs/brief-a')));
  await assertFails(getDoc(doc(analyst, 'audit/seed-event')));
  await assertFails(setDoc(doc(analyst, 'briefs/after-revocation'), brief()));
  await assertSucceeds(getDoc(doc(analyst, 'members/analyst-a')));
});

test('audit reads are isolated by actor except for active trusted reviewers', async () => {
  await assertSucceeds(getDoc(doc(authenticated('analyst-a'), 'audit/seed-event')));
  await assertSucceeds(getDoc(doc(authenticated('trusted-reviewer'), 'audit/seed-event')));
  await assertFails(getDoc(doc(authenticated('analyst-b'), 'audit/seed-event')));
  await assertFails(getDocs(query(collection(authenticated('analyst-b'), 'audit'), limit(20))));
});

test('malformed allowlist records fail closed and unknown paths remain denied', async () => {
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'members/malformed-member'), { active: 'true' });
  });
  await assertFails(setDoc(doc(authenticated('malformed-member'), 'briefs/malformed'), brief('malformed-member')));
  await assertFails(setDoc(doc(authenticated('analyst-a'), 'config/private'), { public: true }));
  await assertFails(getDoc(doc(authenticated('trusted-reviewer'), 'config/private')));
  await assertFails(setDoc(doc(authenticated('analyst-a'), 'briefs/brief-a/private/metadata'), { secret: 'SYNTHETIC_FIXTURE' }));
});

// Intentional static-prototype boundary: nested facts require a trusted validator
// before a production risk service can consider them authoritative.
test('rules do not claim to verify nested evidence semantics or genuine model output', async () => {
  const record = brief();
  record.ai.selection.findings[0].evidenceId = 'E999';
  await assertSucceeds(setDoc(doc(authenticated('analyst-a'), 'briefs/client-validation-boundary'), record));
});
