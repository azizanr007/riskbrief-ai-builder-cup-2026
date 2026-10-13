import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { analyze, sampleDataset } from '../src/domain.mjs';
import { initializeApp, deleteApp } from 'firebase/app';
import {
  connectAuthEmulator, createUserWithEmailAndPassword, getAuth,
  GoogleAuthProvider, inMemoryPersistence, setPersistence,
  signInWithCredential, signInWithEmailAndPassword, signOut,
} from 'firebase/auth';
import {
  connectFirestoreEmulator, doc, getDocFromServer, getFirestore,
  serverTimestamp, setDoc, terminate,
} from 'firebase/firestore';

// These tests use a real LOCAL Firebase emulator, never a live Firebase project.
// A Google JSON token below is an emulator fixture, not verified Google identity.
const PROJECT_ID = 'demo-riskbrief-rules';
function loopbackEndpoint(variable) {
  const value = process.env[variable];
  if (!value || !/^(127\.0\.0\.1|localhost):\d+$/.test(value)) {
    throw new Error(`${variable} must explicitly name a loopback emulator`);
  }
  const [host, port] = value.split(':');
  return { host, port: Number(port) };
}
const authEndpoint = loopbackEndpoint('FIREBASE_AUTH_EMULATOR_HOST');
const firestoreEndpoint = loopbackEndpoint('FIRESTORE_EMULATOR_HOST');
let rulesEnvironment;
before(async () => {
  rulesEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host: firestoreEndpoint.host, port: firestoreEndpoint.port,
      rules: await readFile(new URL('../firestore.rules', import.meta.url), 'utf8') },
  });
});
after(async () => { await rulesEnvironment?.cleanup(); });

async function approveTestMember(uid) {
  await rulesEnvironment.withSecurityRulesDisabled(async context => {
    await setDoc(doc(context.firestore(), 'members', uid), { active: true });
  });
}

async function withEmulatorClient(body, { firestore = false } = {}) {
  const app = initializeApp({ projectId: PROJECT_ID, apiKey: 'emulator-only-not-a-secret' }, `auth-test-${randomUUID()}`);
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${authEndpoint.host}:${authEndpoint.port}`, { disableWarnings: true });
  await setPersistence(auth, inMemoryPersistence);
  let db;
  if (firestore) {
    db = getFirestore(app);
    connectFirestoreEmulator(db, firestoreEndpoint.host, firestoreEndpoint.port);
  }
  try {
    await body({ auth, db });
  } finally {
    await signOut(auth);
    if (db) await terminate(db);
    await deleteApp(app);
  }
}

function syntheticAccount() {
  return {
    email: `synthetic-${randomUUID()}@example.test`,
    // Ephemeral, never logged or persisted in the repository.
    password: randomBytes(24).toString('base64url'),
  };
}

test('Auth emulator: provisioned email/password account logs in with a stable UID', async () => {
  await withEmulatorClient(async ({ auth }) => {
    const account = syntheticAccount();
    const created = await createUserWithEmailAndPassword(auth, account.email, account.password);
    const uid = created.user.uid;
    assert.equal(created.user.providerData[0].providerId, 'password');
    assert.equal(auth.currentUser.uid, uid);
    await signOut(auth);
    assert.equal(auth.currentUser, null);
    const signedIn = await signInWithEmailAndPassword(auth, account.email, account.password);
    assert.equal(signedIn.user.uid, uid);
    assert.equal(auth.currentUser.uid, uid);
    assert.ok((await signedIn.user.getIdToken()).length > 0, 'emulator issues a token');
  });
});

test('Auth emulator: incorrect and unknown credentials do not create a session', async () => {
  await withEmulatorClient(async ({ auth }) => {
    const account = syntheticAccount();
    await createUserWithEmailAndPassword(auth, account.email, account.password);
    await signOut(auth);
    const isAuthDenial = error => [
      'auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found',
    ].includes(error.code);
    await assert.rejects(
      signInWithEmailAndPassword(auth, account.email, randomBytes(24).toString('base64url')),
      isAuthDenial,
    );
    assert.equal(auth.currentUser, null);
    await assert.rejects(
      signInWithEmailAndPassword(auth, `unknown-${randomUUID()}@example.test`, randomBytes(24).toString('base64url')),
      isAuthDenial,
    );
    assert.equal(auth.currentUser, null);
    // Enumeration-resistant UI error text is covered by browser tests. Emulator
    // error codes are not a claim about production email-enumeration settings.
  });
});

test('Auth emulator: Google federated fixture signs in and returns the same test identity', async () => {
  await withEmulatorClient(async ({ auth }) => {
    const fixture = JSON.stringify({
      sub: `EMULATOR_ONLY_${randomUUID()}`,
      email: `emulator-google-${randomUUID()}@example.test`,
      email_verified: true,
      name: 'SYNTHETIC AUTH EMULATOR IDENTITY',
    });
    const credential = GoogleAuthProvider.credential(fixture);
    const first = await signInWithCredential(auth, credential);
    const uid = first.user.uid;
    assert.equal(first.user.providerData[0].providerId, 'google.com');
    assert.equal(first.user.emailVerified, true);
    await signOut(auth);
    assert.equal(auth.currentUser, null);
    const second = await signInWithCredential(auth, credential);
    assert.equal(second.user.uid, uid);
    assert.equal(auth.currentUser.uid, uid);
    // The emulator intentionally accepts unsigned fixture tokens. This proves
    // SDK wiring only: it does NOT prove Google OAuth, signature verification,
    // popup/redirect behavior, authorized domains, or production deployment.
  });
});

test('Auth/Firestore emulators: logout and account switching enforce persisted ownership', async () => {
  await withEmulatorClient(async ({ auth, db }) => {
    const owner = syntheticAccount();
    const ownerCredential = await createUserWithEmailAndPassword(auth, owner.email, owner.password);
    const ownerUid = ownerCredential.user.uid;
    const ref = doc(db, 'briefs', `auth-isolation-${randomUUID()}`);
    const analysis = await analyze(sampleDataset());
    const record = {
      createdByUid: ownerUid,
      createdAt: serverTimestamp(),
      datasetLabel: 'SYNTHETIC_TEST_DATA',
      inputHash: analysis.inputHash,
      deterministic: { totalExposure: analysis.totalExposure, thresholdVersion: analysis.thresholdVersion, evidence: analysis.evidence },
      ai: { provider: 'Firebase AI Logic / Gemini Developer API', model: 'AUTH_EMULATOR_TEST_ONLY',
        selection: { findings: [{ evidenceId: 'E001', findingCode: 'CONCENTRATION' }],
          uncertaintyCodes: ['SYNTHETIC_ONLY', 'UNCALIBRATED', 'ANALYST_REVIEW_REQUIRED'] }, usage: null },
      review: { status: 'PENDING', decisionByUid: null, decidedAt: null },
    };
    await assert.rejects(setDoc(ref, record), error => error.code === 'permission-denied');
    await approveTestMember(ownerUid);
    await setDoc(ref, record);
    assert.equal((await getDocFromServer(ref)).data().createdByUid, ownerUid);
    await signOut(auth);
    assert.equal(auth.currentUser, null);
    await assert.rejects(getDocFromServer(ref), error => error.code === 'permission-denied');
    const other = syntheticAccount();
    const otherCredential = await createUserWithEmailAndPassword(auth, other.email, other.password);
    assert.notEqual(otherCredential.user.uid, ownerUid);
    await approveTestMember(otherCredential.user.uid);
    await assert.rejects(getDocFromServer(ref), error => error.code === 'permission-denied');
    await signOut(auth);
    await signInWithEmailAndPassword(auth, owner.email, owner.password);
    assert.equal((await getDocFromServer(ref)).data().createdByUid, ownerUid);
    // signOut clears this client session; it does not revoke a previously issued
    // ID token. Server-side token revocation requires a trusted admin path.
  }, { firestore: true });
});
