import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

let env;
const RULE_PROJECT = 'demo-riskbrief-rules';

before(async () => {
  env = await initializeTestEnvironment({
    projectId: RULE_PROJECT,
    firestore: { rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'reviewers/trusted-reviewer'), { active: true });
    await setDoc(doc(context.firestore(), 'reviewers/revoked-reviewer'), { active: false });
    await setDoc(doc(context.firestore(), 'briefs/brief-a'), {
      createdByUid: 'analyst-a', createdAt: new Date(), datasetLabel: 'SYNTHETIC_TEST_DATA',
      inputHash: 'a'.repeat(64), deterministic: { evidence: [] }, ai: { model: 'gemini-3.5-flash-lite' },
      review: { status: 'PENDING', decisionByUid: null, decidedAt: null },
    });
  });
});

after(async () => { await env?.cleanup(); });

test('analyst can read own record but cannot read another user record', async () => {
  const own = env.authenticatedContext('analyst-a').firestore();
  const other = env.authenticatedContext('analyst-b').firestore();
  await assertSucceeds(getDoc(doc(own, 'briefs/brief-a')));
  await assertFails(getDoc(doc(other, 'briefs/brief-a')));
});

test('brief creation requires authenticated ownership and synthetic label', async () => {
  const analyst = env.authenticatedContext('analyst-a').firestore();
  const other = env.authenticatedContext('analyst-b').firestore();
  const record = {
    createdByUid: 'analyst-a', createdAt: serverTimestamp(), datasetLabel: 'SYNTHETIC_TEST_DATA',
    inputHash: 'b'.repeat(64), deterministic: { evidence: [] }, ai: { model: 'gemini-3.5-flash-lite' },
    review: { status: 'PENDING', decisionByUid: null, decidedAt: null },
  };
  await assertSucceeds(setDoc(doc(analyst, 'briefs/brief-b'), record));
  await assertFails(setDoc(doc(other, 'briefs/spoofed'), record));
  await assertFails(setDoc(doc(analyst, 'briefs/real-data'), { ...record, datasetLabel: 'REAL' }));
});

test('reviewer can decide once; analyst and client-side reviewer grants are denied', async () => {
  const analyst = env.authenticatedContext('analyst-a').firestore();
  const reviewer = env.authenticatedContext('trusted-reviewer').firestore();
  const decision = { status: 'APPROVED', decisionByUid: 'trusted-reviewer', decidedAt: serverTimestamp() };
  await assertFails(updateDoc(doc(analyst, 'briefs/brief-a'), { review: decision }));
  await assertFails(setDoc(doc(analyst, 'reviewers/analyst-a'), { active: true }));
  await assertSucceeds(updateDoc(doc(reviewer, 'briefs/brief-a'), { review: decision }));
  await assertFails(updateDoc(doc(reviewer, 'briefs/brief-a'), { review: { status: 'REJECTED', decisionByUid: 'trusted-reviewer', decidedAt: serverTimestamp() } }));
});

test('audit events cannot be updated or deleted by clients', async () => {
  const actor = env.authenticatedContext('analyst-a').firestore();
  const event = doc(actor, 'audit/event-a');
  await assertSucceeds(setDoc(event, { actorUid: 'analyst-a', action: 'BRIEF_SAVED', briefId: 'brief-a', createdAt: serverTimestamp() }));
  await assertFails(updateDoc(event, { action: 'REVIEW_DECIDED' }));
  await assertFails(deleteDoc(event));
});

test('revoked reviewer membership does not grant cross-user reads or decisions', async () => {
  const revoked = env.authenticatedContext('revoked-reviewer').firestore();
  await assertFails(getDoc(doc(revoked, 'briefs/brief-b')));
  await assertFails(updateDoc(doc(revoked, 'briefs/brief-b'), { review: { status: 'APPROVED', decisionByUid: 'revoked-reviewer', decidedAt: serverTimestamp() } }));
});

test('anonymous access and forged initial review metadata are rejected', async () => {
  const anonymous = env.unauthenticatedContext().firestore();
  const analyst = env.authenticatedContext('analyst-a').firestore();
  await assertFails(getDoc(doc(anonymous, 'briefs/brief-a')));
  const record = {
    createdByUid: 'analyst-a', createdAt: serverTimestamp(), datasetLabel: 'SYNTHETIC_TEST_DATA',
    inputHash: 'c'.repeat(64), deterministic: { evidence: [] }, ai: { model: 'gemini-3.5-flash-lite' },
    review: { status: 'PENDING', decisionByUid: 'trusted-reviewer', decidedAt: null },
  };
  await assertFails(setDoc(doc(anonymous, 'briefs/anonymous'), record));
  await assertFails(setDoc(doc(analyst, 'briefs/forged-review'), record));
});

test('concurrent reviewer decisions finalize a brief exactly once', async () => {
  await env.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'briefs/concurrent-review'), {
      createdByUid: 'analyst-a', review: { status: 'PENDING', decisionByUid: null, decidedAt: null },
    });
  });
  const reviewer = env.authenticatedContext('trusted-reviewer').firestore();
  const outcomes = await Promise.allSettled(['APPROVED', 'REJECTED'].map(status =>
    updateDoc(doc(reviewer, 'briefs/concurrent-review'), { review: { status, decisionByUid: 'trusted-reviewer', decidedAt: serverTimestamp() } })
  ));
  assert.equal(outcomes.filter(x => x.status === 'fulfilled').length, 1);
  assert.equal(outcomes.filter(x => x.status === 'rejected').length, 1);
});
