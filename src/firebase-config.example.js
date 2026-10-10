// Copy this file to firebase-config.local.js after creating a Spark-plan Firebase app.
// These are public web-app identifiers, not secrets. Never add a Gemini API key here.
export const firebaseConfig = {
  apiKey: 'REPLACE_WITH_FIREBASE_WEB_API_KEY',
  authDomain: 'REPLACE_WITH_PROJECT.firebaseapp.com',
  projectId: 'REPLACE_WITH_PROJECT_ID',
  appId: 'REPLACE_WITH_FIREBASE_WEB_APP_ID',
};

// reCAPTCHA Enterprise site key is public. App Check must be enforced for AI Logic.
export const appCheckSiteKey = 'REPLACE_WITH_RECAPTCHA_ENTERPRISE_SITE_KEY';
