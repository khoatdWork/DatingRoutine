import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { appConfig } from "@/config/app";
import { supabaseKey, supabaseUrl } from "./config";

let client: SupabaseClient | undefined;

export function supabaseClient() {
  if (!supabaseUrl || !supabaseKey)
    throw new Error("Supabase chưa được cấu hình. Bạn vẫn có thể dùng trên thiết bị.");

  client ??= createClient(supabaseUrl, supabaseKey, {
    auth: {
      flowType: "pkce",
      storageKey: `${appConfig.storageKey}:supabase-auth:${new URL(supabaseUrl).host}`,
    },
  });
  return client;
}
