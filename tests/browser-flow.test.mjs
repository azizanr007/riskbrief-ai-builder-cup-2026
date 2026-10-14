// Real Chromium/DOM tests with explicitly mocked Firebase SDK modules.
// Firestore authority is separately tested using the actual local emulator.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright-core';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = fileURLToPath(new URL('./fixtures/firebase-sdk.mjs', import.meta.url));
const publicConfig = {
  VITE_FIREBASE_API_KEY: 'fixture-public-config', VITE_FIREBASE_AUTH_DOMAIN: 'fixture.invalid',
  VITE_FIREBASE_PROJECT_ID: 'demo-riskbrief-browser', VITE_FIREBASE_APP_ID: 'fixture-public-app',
  VITE_RECAPTCHA_ENTERPRISE_SITE_KEY: 'fixture-public-site', VITE_FIREBASE_AI_LOGIC_ENABLED: 'true',
};
let server;
let inertServer;
let browser;
let baseUrl;
const errors = [];

async function serve(env) {
  const s = await createServer({
    root, configFile: false, envDir: false,
    plugins: [{ name: 'test-fixture-environment', configResolved(config) { Object.assign(config.env, env); } }],
    resolve: { alias: [{ find: /^firebase\/(app|auth|app-check|ai|firestore)$/, replacement: fixture }] },
    server: { host: '127.0.0.1', port: 0, strictPort: false },
  });
  await s.listen();
  return s;
}
const urlFor = s => 'http://127.0.0.1:' + s.httpServer.address().port;

before(async () => {
  server = await serve(publicConfig);
  inertServer = await serve({});
  baseUrl = urlFor(server);
  browser = await chromium.launch({ executablePath: process.env.RISKBRIEF_CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
});
after(async () => { await browser?.close(); await server?.close(); await inertServer?.close(); });

async function open(t, url = baseUrl, mobile = false, fixtureSettings = {}) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } });
  context.setDefaultTimeout(8000);
  await context.route('https://**/*', route => route.abort());
  await context.addInitScript(settings => { window.__riskbriefFixtureSettings = settings; }, fixtureSettings);
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  t.after(async () => { await context.close(); });
  await page.goto(url);
  assert.deepEqual(errors, []);
  await page.waitForFunction(() => Boolean(document.querySelector('#auth-message')?.textContent));
  return page;
}
async function login(page, uid) {
  await page.locator('#email').fill(uid + '@fixture.invalid');
  await page.locator('#password').fill('ignored-fixture-value');
  await page.locator('#login-button').click();
}
async function analyze(page) {
  await page.locator('#workspace').waitFor({ state: 'visible' });
  await page.locator('#analyze-button').click();
  await page.waitForFunction(() => document.querySelector('#deterministic-result').textContent.includes('E001'));
}

test('browser fixture completes analyst analysis, Gemini validation, save, retrieval, and reviewer decision', { timeout: 30000 }, async t => {
  const page = await open(t);
  await login(page, 'analyst-one');
  await analyze(page);
  await page.locator('#gemini-button').click();
  await page.waitForFunction(() => document.querySelector('#provider-status').textContent.includes('EVIDENCE VALIDATED'));
  assert.match(await page.locator('#sim-label').textContent(), /response returned/);
  assert.match(await page.locator('#ai-result').textContent(), /Retail.*E001/);
  await page.locator('#save-button').click();
  await page.waitForFunction(() => document.querySelector('#save-state').textContent.includes('Saved as'));
  assert.match(await page.locator('#brief-list').textContent(), /PENDING/);
  const options = await page.evaluate(() => window.__riskbriefFixture.modelOptions);
  assert.equal(options.options.timeout, 20000);
  assert.equal(options.params.generationConfig.maxOutputTokens, 400);
  assert.deepEqual(await page.evaluate(() => window.__riskbriefFixture.aiOptions), {
    useLimitedUseAppCheckTokens: true, backend: 'GoogleAIBackend',
  });
  assert.deepEqual(await page.evaluate(() => window.__riskbriefFixture.initializationOrder), ['app-check', 'ai']);
  await page.locator('#logout-button').click();
  await login(page, 'trusted-reviewer');
  await page.locator('#review-panel').waitFor({ state: 'visible' });
  await page.locator('#review-list button').filter({ hasText: 'Approve' }).click();
  await page.waitForFunction(() => document.querySelector('#brief-list').textContent.includes('APPROVED'));
  assert.match(await page.locator('#audit-list').textContent(), /REVIEW_DECIDED/);
  assert.deepEqual(errors, []);
});

test('App Check or AI initialization failure blocks model calls without breaking approved login and deterministic analysis', { timeout: 30000 }, async t => {
  for (const initializationFailure of ['app-check', 'ai', 'model']) {
    const page = await open(t, baseUrl, false, { initializationFailure });
    await login(page, 'analyst-one');
    await analyze(page);
    assert.equal(await page.locator('#workspace').isVisible(), true);
    assert.equal(await page.locator('#gemini-button').isDisabled(), true);
    assert.equal(await page.locator('#save-button').isDisabled(), true);
    assert.match(await page.locator('#provider-status').textContent(), /FIREBASE CONFIGURED.*AI BLOCKED/);
    assert.match(await page.locator('#ai-result').textContent(), /Gemini is unavailable/);
    assert.equal(await page.evaluate(() => window.__riskbriefFixture.calls), 0);
    assert.equal(await page.evaluate(() => window.__riskbriefFixture.records.size), 0);
    if (initializationFailure === 'app-check') {
      assert.deepEqual(await page.evaluate(() => window.__riskbriefFixture.initializationOrder), ['app-check']);
    }
    await page.locator('#logout-button').click();
    assert.equal(await page.locator('#workspace').isVisible(), false);
  }
});

test('browser rejects fabricated Gemini evidence and invalid synthetic input without saving', { timeout: 30000 }, async t => {
  const page = await open(t);
  await login(page, 'analyst-one');
  await analyze(page);
  await page.evaluate(() => { window.__riskbriefFixture.aiScenario = 'fabricated'; });
  await page.locator('#gemini-button').click();
  await page.waitForFunction(() => document.querySelector('#provider-status').textContent.includes('REJECTED'));
  assert.equal(await page.locator('#save-button').isDisabled(), true);
  assert.equal(await page.evaluate(() => window.__riskbriefFixture.records.size), 0);
  await page.locator('#dataset').fill('{"label":"REAL","segments":[]}');
  await page.locator('#analyze-button').click();
  assert.match(await page.locator('#save-state').textContent(), /Input rejected/);
  assert.equal(await page.evaluate(() => window.__riskbriefFixture.calls), 1);
});

test('revoked reviewer is an analyst and failed role verification clears previous privileged UI', { timeout: 30000 }, async t => {
  const page = await open(t);
  await login(page, 'revoked-reviewer');
  await page.locator('#workspace').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#role-badge').textContent(), 'ANALYST');
  assert.equal(await page.locator('#review-panel').isVisible(), false);
  await page.locator('#logout-button').click();
  await login(page, 'trusted-reviewer');
  await page.locator('#review-panel').waitFor({ state: 'visible' });
  await page.locator('#logout-button').click();
  await page.evaluate(() => { window.__riskbriefFixture.roleLookupFails = true; });
  await login(page, 'analyst-two');
  await page.waitForFunction(() => document.querySelector('#auth-message').textContent.includes('could not be verified'));
  assert.equal(await page.locator('#workspace').isVisible(), false);
  assert.equal(await page.locator('#role-badge').textContent(), 'UNVERIFIED');
  assert.equal(await page.locator('#gemini-button').isDisabled(), true);
});

test('a pending model response cannot cross logout or account boundaries', { timeout: 30000 }, async t => {
  const page = await open(t);
  await login(page, 'analyst-one');
  await analyze(page);
  await page.evaluate(() => { window.__riskbriefFixture.delayed = true; });
  await page.locator('#gemini-button').click();
  await page.waitForFunction(() => typeof window.__riskbriefFixture.resolveModel === 'function');
  await page.locator('#logout-button').click();
  await login(page, 'analyst-two');
  await page.locator('#workspace').waitFor({ state: 'visible' });
  await page.evaluate(() => window.__riskbriefFixture.resolveModel());
  await page.waitForFunction(() => !document.querySelector('#analyze-button').disabled);
  assert.equal(await page.locator('#save-button').isDisabled(), true);
  assert.equal(await page.locator('#ai-result').textContent(), 'No model call has been made.');
  assert.match(await page.locator('#sim-label').textContent(), /No verified model response/);
  assert.equal(await page.evaluate(() => window.__riskbriefFixture.records.size), 0);
});

test('malformed, oversized, and failed fixture provider responses never enable saving', { timeout: 30000 }, async t => {
  const page = await open(t);
  await login(page, 'analyst-one');
  await analyze(page);
  let attempts = 0;
  for (const scenario of ['malformed', 'oversized', 'outage']) {
    await page.evaluate(value => { window.__riskbriefFixture.aiScenario = value; }, scenario);
    await page.locator('#gemini-button').click();
    await page.waitForFunction(count => window.__riskbriefFixture.calls === count && document.querySelector('#provider-status').textContent.includes('REJECTED'), ++attempts);
    assert.equal(await page.locator('#save-button').isDisabled(), true);
    assert.match(await page.locator('#ai-result').textContent(), /No usable Gemini response/);
  }
  assert.equal(await page.evaluate(() => window.__riskbriefFixture.records.size), 0);
});

test('unconfigured app remains inert and the mobile page has no horizontal overflow', { timeout: 30000 }, async t => {
  const page = await open(t, urlFor(inertServer), true);
  await page.waitForFunction(() => document.querySelector('#auth-message').textContent.includes('configuration is missing'));
  assert.equal(await page.locator('#login-button').isDisabled(), true);
  assert.equal(await page.locator('#google-button').isDisabled(), true);
  assert.equal(await page.locator('#workspace').isVisible(), false);
  assert.equal(await page.locator('#provider-status').textContent(), 'FIREBASE NOT CONFIGURED');
  assert.equal(await page.evaluate(() => window.__riskbriefFixture.appInitializations), 0);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  const active = await open(t, baseUrl, true);
  await login(active, 'analyst-one');
  await analyze(active);
  assert.equal(await active.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(await active.locator('#analyze-button').evaluate(button => button.getBoundingClientRect().height >= 40), true);
  assert.deepEqual(errors, []);
});

test('approved Google analyst signs in on mobile without submitting email/password', { timeout: 30000 }, async t => {
  const page = await open(t, baseUrl, true);
  await page.locator('#google-button').click();
  await analyze(page);
  assert.equal(await page.locator('#role-badge').textContent(), 'ANALYST');
  assert.equal(await page.locator('#review-panel').isVisible(), false);
  assert.equal(await page.locator('#password').inputValue(), '');
  assert.equal(await page.evaluate(() => window.__riskbriefFixture.persistence), 'SESSION');
  assert.deepEqual(await page.evaluate(() => window.__riskbriefFixture.googleParameters), { prompt: 'select_account' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.locator('#logout-button').click();
  assert.equal(await page.locator('#workspace').isVisible(), false);
  assert.equal(await page.locator('#google-button').isVisible(), true);
});

test('Google reviewer needs approved membership and active reviewer record', { timeout: 30000 }, async t => {
  const page = await open(t);
  await page.evaluate(() => { window.__riskbriefFixture.googleUid = 'trusted-reviewer'; });
  await page.locator('#google-button').click();
  await page.locator('#review-panel').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#role-badge').textContent(), 'REVIEWER');
  await page.locator('#logout-button').click();
  await page.evaluate(() => { window.__riskbriefFixture.members['trusted-reviewer'].active = false; });
  await page.locator('#google-button').click();
  await page.waitForFunction(() => document.querySelector('#auth-message').textContent.includes('owner-approved'));
  assert.equal(await page.locator('#workspace').isVisible(), false);
  assert.equal(await page.locator('#review-panel').isVisible(), false);
});

test('new Google account and browser role flags never grant workspace access', { timeout: 30000 }, async t => {
  const page = await open(t);
  await page.evaluate(() => {
    window.__riskbriefFixture.googleUid = 'unapproved-google';
    window.role = 'REVIEWER';
    localStorage.setItem('role', 'REVIEWER');
    document.querySelector('#role-badge').textContent = 'REVIEWER';
  });
  await page.locator('#google-button').click();
  await page.waitForFunction(() => document.querySelector('#auth-message').textContent.includes('owner-approved'));
  assert.equal(await page.locator('#role-badge').textContent(), 'UNVERIFIED');
  assert.equal(await page.locator('#workspace').isVisible(), false);
  assert.equal(await page.locator('#gemini-button').isDisabled(), true);
  assert.equal(await page.evaluate(() => window.__riskbriefFixture.calls), 0);
  assert.equal(await page.evaluate(() => window.__riskbriefFixture.records.size), 0);
});

test('inactive email account is authenticated but cannot open private workspace', { timeout: 30000 }, async t => {
  const page = await open(t);
  await login(page, 'revoked-member');
  await page.waitForFunction(() => document.querySelector('#auth-message').textContent.includes('owner-approved'));
  assert.equal(await page.locator('#workspace').isVisible(), false);
  assert.equal(await page.locator('#logout-button').isVisible(), true);
  assert.equal(await page.evaluate(() => window.__riskbriefFixture.calls), 0);
});

test('cancelled, blocked or failed Google popup shows a safe error and permits retry', { timeout: 30000 }, async t => {
  const page = await open(t);
  for (const code of ['auth/popup-closed-by-user', 'auth/popup-blocked', 'auth/unauthorized-domain']) {
    await page.evaluate(value => { window.__riskbriefFixture.googleError = value; }, code);
    await page.locator('#google-button').click();
    await page.waitForFunction(() => document.querySelector('#auth-message').textContent.includes('could not be completed'));
    assert.equal(await page.locator('#workspace').isVisible(), false);
    assert.equal(await page.locator('#google-button').isDisabled(), false);
    assert.doesNotMatch(await page.locator('#auth-message').textContent(), /auth\/|stack|token/);
  }
  await page.evaluate(() => { window.__riskbriefFixture.googleError = null; });
  await page.locator('#google-button').click();
  await page.locator('#workspace').waitFor({ state: 'visible' });
});

test('membership revoked after login blocks the next model request without invoking the provider', { timeout: 30000 }, async t => {
  const page = await open(t);
  await login(page, 'analyst-one');
  await analyze(page);
  await page.evaluate(() => { window.__riskbriefFixture.members['analyst-one'].active = false; });
  await page.locator('#gemini-button').click();
  await page.waitForFunction(() => document.querySelector('#auth-message').textContent.includes('owner-approved'));
  assert.equal(await page.evaluate(() => window.__riskbriefFixture.calls), 0);
  assert.equal(await page.locator('#workspace').isVisible(), false);
  assert.equal(await page.locator('#save-button').isDisabled(), true);
});

test('failed email login clears password and never reports an authenticated workspace', { timeout: 30000 }, async t => {
  const page = await open(t);
  await page.evaluate(() => { window.__riskbriefFixture.emailError = true; });
  await login(page, 'analyst-one');
  await page.waitForFunction(() => document.querySelector('#auth-message').textContent.includes('Sign-in failed'));
  assert.equal(await page.locator('#password').inputValue(), '');
  assert.equal(await page.locator('#workspace').isVisible(), false);
  assert.equal(await page.locator('#login-button').isDisabled(), false);
});

test('pending model response is discarded when email login switches to Google', { timeout: 30000 }, async t => {
  const page = await open(t);
  await login(page, 'analyst-one');
  await analyze(page);
  await page.evaluate(() => { window.__riskbriefFixture.delayed = true; });
  await page.locator('#gemini-button').click();
  await page.waitForFunction(() => typeof window.__riskbriefFixture.resolveModel === 'function');
  await page.locator('#logout-button').click();
  await page.evaluate(() => { window.__riskbriefFixture.googleUid = 'trusted-reviewer'; });
  await page.locator('#google-button').click();
  await page.locator('#review-panel').waitFor({ state: 'visible' });
  await page.evaluate(() => window.__riskbriefFixture.resolveModel());
  await page.waitForFunction(() => !document.querySelector('#analyze-button').disabled);
  assert.equal(await page.locator('#save-button').isDisabled(), true);
  assert.equal(await page.evaluate(() => window.__riskbriefFixture.records.size), 0);
  assert.match(await page.locator('#ai-result').textContent(), /No model call/);
});
