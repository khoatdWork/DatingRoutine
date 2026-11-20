import { appRoot } from "@/config/app";
import { supabaseClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { AccountUser, AuthProvider } from "./provider";

function accountUser(user: User | undefined): AccountUser | null {
  if (!user || user.is_anonymous) return null;
  const name: unknown = user.user_metadata.full_name ?? user.user_metadata.name;
  return {
    uid: user.id,
    displayName: typeof name === "string" ? name : null,
    email: user.email ?? null,
  };
}

export const supabaseAuth: AuthProvider = {
  subscribe(onUser, onError) {
    const { auth } = supabaseClient();
    let unsubscribe: (() => void) | undefined;
    let disposed = false;
    void auth
      .initialize()
      .then(({ error }) => {
        if (disposed) return;
        const { data } = auth.onAuthStateChange((event, session) => {
          onUser(accountUser(session?.user));
          if (event === "INITIAL_SESSION" && error) onError();
        });
        unsubscribe = () => data.subscription.unsubscribe();
      })
      .catch(() => {
        if (!disposed) onError();
      });
    return () => {
      disposed = true;
      unsubscribe?.();
    };
  },
  async signIn() {
    const { error } = await supabaseClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: new URL(appRoot, window.location.origin).href },
    });
    if (error) throw error;
  },
  async signOut() {
    const { error } = await supabaseClient().auth.signOut({ scope: "local" });
    if (error) throw error;
  },
};
