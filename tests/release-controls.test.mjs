import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = file => readFile(new URL(file, import.meta.url), 'utf8');

test('official Firebase AI Logic SDK is used without a Gemini credential', async () => {
  const app = await read('../src/main.js');
  assert.match(app, /from 'firebase\/ai'/);
  assert.match(app, /GoogleAIBackend/);
  assert.match(app, /gemini-3\.5-flash-lite/);
  assert.match(app, /ReCaptchaEnterpriseProvider/);
  assert.doesNotMatch(app, /GEMINI_API_KEY|AIza[0-9A-Za-z_-]{30,}/);
});

test('Firebase is inert unless configured; App Check key and explicit flag gate Gemini', async () => {
  const app = await read('../src/main.js');
  assert.match(app, /if \(!firebaseConfigured\)/);
  assert.match(app, /VITE_FIREBASE_AI_LOGIC_ENABLED === 'true'/);
  assert.match(app, /siteKey && !siteKey\.startsWith\('REPLACE_'\)/);
  assert.match(app, /initializeAppCheck/);
});

test('only login is offered and role information comes from an immutable reviewer record', async () => {
  const html = await read('../index.html');
  const app = await read('../src/main.js');
  const rules = await read('../firestore.rules');
  assert.match(html, /There is no public sign-up/);
  assert.doesNotMatch(app, /createUserWithEmailAndPassword/);
  assert.match(app, /getDoc\(doc\(db, 'reviewers', user\.uid\)\)/);
  assert.match(rules, /match \/reviewers\/{uid}/);
  assert.match(rules, /allow write: if false/);
});

test('Firestore rules isolate owner data and constrain reviewer decisions', async () => {
  const rules = await read('../firestore.rules');
  assert.match(rules, /request\.resource\.data\.createdByUid == request\.auth\.uid/);
  assert.match(rules, /resource\.data\.createdByUid == request\.auth\.uid/);
  assert.match(rules, /resource\.data\.review\.status == 'PENDING'/);
  assert.match(rules, /request\.resource\.data\.review\.status in \['APPROVED', 'REJECTED'\]/);
  assert.match(rules, /allow update, delete: if false/);
});

test('Firebase Hosting headers set baseline browser protections', async () => {
  const config = await read('../firebase.json');
  assert.match(config, /X-Content-Type-Options/);
  assert.match(config, /Content-Security-Policy/);
  assert.match(config, /frame-ancestors 'none'/);
  assert.match(config, /firebasevertexai\.googleapis\.com/);
});
