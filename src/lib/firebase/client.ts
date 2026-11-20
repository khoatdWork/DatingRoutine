import { initializeApp, getApps } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  type Auth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};
export const firebaseConfigured = Boolean(
  config.apiKey && config.authDomain && config.projectId && config.appId,
);
let auth: Auth | undefined;
export function firebaseClients() {
  if (!firebaseConfigured)
    throw new Error("Firebase chưa được cấu hình. Bạn vẫn có thể dùng trên thiết bị.");
  const existing = getApps()[0];
  const app = existing ?? initializeApp(config);
  auth ??= existing
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
        popupRedirectResolver: browserPopupRedirectResolver,
      });
  return { auth, db: getFirestore(app) };
}
