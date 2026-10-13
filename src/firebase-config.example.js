// Public reference only. The Vite application consumes .env.local, not this file.
// These are public web-app identifiers, not secrets. Never add a Gemini API key here.
export const firebaseConfig = {
  apiKey: 'REPLACE_WITH_FIREBASE_WEB_API_KEY',
  authDomain: 'REPLACE_WITH_PROJECT.firebaseapp.com',
  projectId: 'project-e6ad1e02-5987-460a-990',
  appId: '1:1010925225176:web:36cb756f6c0926c5d303ad',
};

// reCAPTCHA Enterprise site key is public. App Check must be enforced for AI Logic.
export const appCheckSiteKey = 'REPLACE_WITH_RECAPTCHA_ENTERPRISE_SITE_KEY';
