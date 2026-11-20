import { afterEach, describe, expect, it, vi } from "vitest";
import { emptySnapshot } from "@/modules/notes/core/domain";

const services = vi.hoisted(() => ({
  dataProvider: "local",
  loadFirebaseAuth: vi.fn(),
  loadSupabaseAuth: vi.fn(),
  signInFirebase: vi.fn(),
  signInSupabase: vi.fn(),
  readFirebase: vi.fn(),
  writeFirebase: vi.fn(),
  readSupabase: vi.fn(),
  writeSupabase: vi.fn(),
}));
vi.mock("@/config/services", () => services);
vi.mock("@/modules/auth/firebase-auth", () => {
  services.loadFirebaseAuth();
  return { firebaseAuth: { signIn: services.signInFirebase } };
});
vi.mock("@/modules/auth/supabase-auth", () => {
  services.loadSupabaseAuth();
  return { supabaseAuth: { signIn: services.signInSupabase } };
});
vi.mock("@/modules/notes/data/firebase-cloud", () => ({
  readCloud: services.readFirebase,
  writeCloud: services.writeFirebase,
}));
vi.mock("@/modules/notes/data/supabase-cloud", () => ({
  readCloud: services.readSupabase,
  writeCloud: services.writeSupabase,
}));

afterEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("selected data provider", () => {
  it("keeps local accounts and cloud operations disabled", async () => {
    services.dataProvider = "local";
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key");
    const { authConfigured, loadAuthProvider } = await import("@/modules/auth/provider");
    const { readCloud } = await import("@/modules/notes/data/cloud");
    expect(authConfigured).toBe(false);
    await expect(loadAuthProvider()).rejects.toThrow("trên thiết bị");
    await expect(readCloud("owner")).rejects.toThrow("trên thiết bị");
    expect(services.loadFirebaseAuth).not.toHaveBeenCalled();
    expect(services.loadSupabaseAuth).not.toHaveBeenCalled();
  });

  it("marks missing Supabase credentials as unconfigured", async () => {
    services.dataProvider = "supabase";
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    const { authConfigured } = await import("@/modules/auth/provider");
    expect(authConfigured).toBe(false);
    expect(services.loadSupabaseAuth).not.toHaveBeenCalled();
  });

  it("uses Supabase for sign-in and workspace writes when selected", async () => {
    services.dataProvider = "supabase";
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key");
    services.writeSupabase.mockResolvedValueOnce(5);
    const { authConfigured, loadAuthProvider } = await import("@/modules/auth/provider");
    const { readCloud, writeCloud } = await import("@/modules/notes/data/cloud");
    const snapshot = emptySnapshot();
    expect(authConfigured).toBe(true);
    expect(services.loadSupabaseAuth).not.toHaveBeenCalled();
    const auth = await loadAuthProvider();
    await auth.signIn();
    await readCloud("owner");
    await expect(writeCloud("owner", 4, snapshot)).resolves.toBe(5);
    expect(services.loadSupabaseAuth).toHaveBeenCalledOnce();
    expect(services.loadFirebaseAuth).not.toHaveBeenCalled();
    expect(services.signInSupabase).toHaveBeenCalledOnce();
    expect(services.signInFirebase).not.toHaveBeenCalled();
    expect(services.readSupabase).toHaveBeenCalledWith("owner");
    expect(services.writeSupabase).toHaveBeenCalledWith("owner", 4, snapshot);
    expect(services.readFirebase).not.toHaveBeenCalled();
    expect(services.writeFirebase).not.toHaveBeenCalled();
  });

  it("uses Firebase for sign-in and workspace writes when both providers are configured", async () => {
    services.dataProvider = "firebase";
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_API_KEY", "public-test-key");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", "example.firebaseapp.com");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "example");
    vi.stubEnv("NEXT_PUBLIC_FIREBASE_APP_ID", "test-app");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key");
    services.writeFirebase.mockResolvedValueOnce(5);
    const { authConfigured, loadAuthProvider } = await import("@/modules/auth/provider");
    const { readCloud, writeCloud } = await import("@/modules/notes/data/cloud");
    const snapshot = emptySnapshot();
    expect(authConfigured).toBe(true);
    expect(services.loadFirebaseAuth).not.toHaveBeenCalled();
    const auth = await loadAuthProvider();
    await auth.signIn();
    await readCloud("owner");
    await expect(writeCloud("owner", 4, snapshot)).resolves.toBe(5);
    expect(services.loadFirebaseAuth).toHaveBeenCalledOnce();
    expect(services.loadSupabaseAuth).not.toHaveBeenCalled();
    expect(services.signInFirebase).toHaveBeenCalledOnce();
    expect(services.signInSupabase).not.toHaveBeenCalled();
    expect(services.readFirebase).toHaveBeenCalledWith("owner");
    expect(services.writeFirebase).toHaveBeenCalledWith("owner", 4, snapshot);
    expect(services.readSupabase).not.toHaveBeenCalled();
    expect(services.writeSupabase).not.toHaveBeenCalled();
  });
});
