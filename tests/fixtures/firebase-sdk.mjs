// TEST FIXTURE ONLY. Vite aliases select this file in browser-flow.test.mjs.
// It is never imported by production source and makes no network/model calls.
const state = window.__riskbriefFixture = {
  records: new Map(), callbacks: [], uid: null, calls: 0, counter: 0,
  aiScenario: 'valid', roleLookupFails: false, delayed: false, appInitializations: 0,
  googleUid: 'analyst-one', googleError: null, googleCalls: 0, emailError: false,
};
const reviewers = { 'trusted-reviewer': { active: true }, 'revoked-reviewer': { active: false } };
const members = state.members = Object.fromEntries(
  ['analyst-one', 'analyst-two', 'trusted-reviewer', 'revoked-reviewer'].map(uid => [uid, { active: true }]),
);
members['revoked-member'] = { active: false };
const timestamp = () => ({ toDate: () => new Date(0), toMillis: () => 0 });
const snapshot = path => ({ id: path.split('/').at(-1), exists: () => state.records.has(path), data: () => state.records.get(path) });

export const initializeApp = config => { state.appInitializations++; return { config }; };
export const initializeAppCheck = () => {};
export class ReCaptchaEnterpriseProvider { constructor(siteKey) { this.siteKey = siteKey; } }
export class GoogleAIBackend {}
export const getAI = () => ({});
export const Schema = Object.fromEntries(['object', 'array', 'string', 'enumString'].map(key => [key, options => ({ key, ...options })]));
export function getGenerativeModel(_ai, params, options) {
  state.modelOptions = { params, options };
  return { async generateContent() {
    state.calls++;
    if (state.delayed) await new Promise(resolve => { state.resolveModel = resolve; });
    if (state.aiScenario === 'outage') throw new Error('Fixture provider outage');
    const selection = {
      findings: [{ evidenceId: state.aiScenario === 'fabricated' ? 'E999' : 'E001', findingCode: 'CONCENTRATION' }],
      uncertaintyCodes: ['SYNTHETIC_ONLY', 'UNCALIBRATED', 'ANALYST_REVIEW_REQUIRED'],
    };
    const output = state.aiScenario === 'oversized' ? 'x'.repeat(12001) : state.aiScenario === 'malformed' ? '{invalid' : JSON.stringify(selection);
    return { response: { text: () => output, usageMetadata: { promptTokenCount: 20, candidatesTokenCount: 40, totalTokenCount: 60 } } };
  } };
}
export const getAuth = () => state;
export const browserSessionPersistence = { type: 'SESSION' };
export const setPersistence = async (_auth, persistence) => { state.persistence = persistence.type; };
export class GoogleAuthProvider {
  setCustomParameters(params) { this.parameters = params; }
}
export const signInWithPopup = async (_auth, provider) => {
  state.googleCalls++;
  state.googleParameters = provider.parameters;
  if (state.googleError) throw new Error(state.googleError);
  await notify(state.googleUid);
};
export function onAuthStateChanged(_auth, callback) {
  state.callbacks.push(callback);
  queueMicrotask(() => callback(null));
  return () => {};
}
async function notify(uid) {
  state.uid = uid;
  await Promise.all(state.callbacks.map(callback => callback(uid ? { uid } : null)));
}
export const signInWithEmailAndPassword = async (_auth, email) => {
  if (state.emailError) throw new Error('Fixture credential failure');
  await notify(email.split('@')[0]);
};
export const signOut = async () => { await notify(null); };

export const getFirestore = () => ({});
export const collection = (_db, name) => ({ name });
export function doc(base, name, id) {
  if (base.name && name === undefined) {
    const fresh = 'fixture-' + (++state.counter);
    return { path: base.name + '/' + fresh, id: fresh };
  }
  return { path: name + '/' + id, id };
}
export async function getDoc(ref) {
  if (ref.path.startsWith('members/')) {
    if (state.roleLookupFails) throw new Error('Fixture membership permission failure');
    const data = members[ref.id];
    return { exists: () => Boolean(data), data: () => data };
  }
  if (ref.path.startsWith('reviewers/')) {
    if (state.roleLookupFails) throw new Error('Fixture permission failure');
    const data = reviewers[ref.id];
    return { exists: () => Boolean(data), data: () => data };
  }
  return snapshot(ref.path);
}
export const getDocFromServer = getDoc;
export const where = (key, op, value) => ({ key, op, value });
export const orderBy = () => ({});
export const limit = count => ({ count });
export const query = (base, ...constraints) => ({ base, constraints });
export async function getDocs(q) {
  const docs = [...state.records.keys()].filter(path => path.startsWith(q.base.name + '/'))
    .filter(path => q.constraints.every(c => !c.key || state.records.get(path)[c.key] === c.value))
    .map(snapshot);
  return { docs };
}
export const serverTimestamp = timestamp;
function batch() {
  const writes = [];
  return {
    set: (ref, data) => writes.push([ref.path, data]),
    update: (ref, data) => writes.push([ref.path, { ...state.records.get(ref.path), ...data }]),
    commit: async () => { for (const [path, data] of writes) state.records.set(path, data); },
  };
}
export const writeBatch = batch;
export async function runTransaction(_db, callback) {
  const transaction = batch();
  await callback({ ...transaction, get: getDoc });
  await transaction.commit();
}
