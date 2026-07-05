import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { env } from "../../shared/configs/app.config.js";

let firebaseApp: App | null | undefined;

export function getFirebaseAdminApp() {
  if (firebaseApp !== undefined) return firebaseApp;
  if (getApps().length) {
    firebaseApp = getApps()[0] ?? null;
    return firebaseApp;
  }

  const serviceAccount = readServiceAccount();
  if (!serviceAccount) {
    firebaseApp = null;
    return firebaseApp;
  }

  firebaseApp = initializeApp({
    credential: cert(serviceAccount)
  });
  return firebaseApp;
}

function readServiceAccount() {
  if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    const parsed = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON) as {
      project_id?: string;
      client_email?: string;
      private_key?: string;
    };
    if (parsed.project_id && parsed.client_email && parsed.private_key) {
      return {
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKey: normalizePrivateKey(parsed.private_key)
      };
    }
  }

  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    return null;
  }

  return {
    projectId: env.FIREBASE_PROJECT_ID,
    clientEmail: env.FIREBASE_CLIENT_EMAIL,
    privateKey: normalizePrivateKey(env.FIREBASE_PRIVATE_KEY)
  };
}

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n");
}
