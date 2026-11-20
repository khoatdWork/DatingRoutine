import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { firebaseClients } from "@/lib/firebase/client";
import type { AuthProvider } from "./provider";

export const firebaseAuth: AuthProvider = {
  subscribe(onUser, onError) {
    return onAuthStateChanged(
      firebaseClients().auth,
      (user) => onUser(user && { uid: user.uid, displayName: user.displayName, email: user.email }),
      onError,
    );
  },
  async signIn() {
    await signInWithPopup(firebaseClients().auth, new GoogleAuthProvider());
  },
  async signOut() {
    await signOut(firebaseClients().auth);
  },
};
