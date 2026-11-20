import { dataProvider } from "@/config/services";
import { firebaseConfigured } from "@/lib/firebase/config";
import { supabaseConfigured } from "@/lib/supabase/config";

export interface AccountUser {
  uid: string;
  displayName: string | null;
  email: string | null;
}

export interface AuthProvider {
  subscribe(onUser: (user: AccountUser | null) => void, onError: () => void): () => void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
}

export const authConfigured =
  dataProvider === "firebase"
    ? firebaseConfigured
    : dataProvider === "supabase" && supabaseConfigured;

export async function loadAuthProvider(): Promise<AuthProvider> {
  if (dataProvider === "firebase") return (await import("./firebase-auth")).firebaseAuth;
  if (dataProvider === "supabase") return (await import("./supabase-auth")).supabaseAuth;
  throw new Error("Chế độ lưu trên thiết bị không có tài khoản đám mây.");
}
