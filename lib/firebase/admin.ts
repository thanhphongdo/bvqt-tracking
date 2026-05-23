import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

let app: App | undefined;
let adminAuth: Auth | undefined;
let adminDb: Firestore | undefined;

export function getFirebaseAdmin() {
  if (!app) {
    const existing = getApps()[0];
    if (existing) {
      app = existing;
    } else {
      const json = process.env.FIREBASE_ADMIN_SDK_JSON;
      if (!json) throw new Error('FIREBASE_ADMIN_SDK_JSON is not set');
      const credentials = JSON.parse(json);
      app = initializeApp({
        credential: cert({
          projectId: credentials.project_id,
          clientEmail: credentials.client_email,
          privateKey: credentials.private_key,
        }),
      });
    }
    adminAuth = getAuth(app);
    adminDb = getFirestore(app);
  }
  return { app, auth: adminAuth!, db: adminDb! };
}
