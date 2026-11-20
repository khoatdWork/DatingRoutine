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
import { firebaseConfig, firebaseConfigured } from "./config";
let auth: Auth | undefined;
export function firebaseClients() {
  if (!firebaseConfigured)
    throw new Error("Firebase chưa được cấu hình. Bạn vẫn có thể dùng trên thiết bị.");
  const existing = getApps()[0];
  const app = existing ?? initializeApp(firebaseConfig);
  auth ??= existing
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: [indexedDBLocalPersistence, browserLocalPersistence],
        popupRedirectResolver: browserPopupRedirectResolver,
      });
  return { auth, db: getFirestore(app) };
}
