import project from "../../project.config.json";

export type DataProvider = "local" | "firebase" | "supabase";
export type HostingProvider = "cloudflare" | "github-pages" | "firebase" | "static";

// npm lifecycle hooks and next.config validate the saved choices before starting.
// Local fallback allows pure domain tests to run on the unconfigured template.
export const dataProvider = (project.dataProvider || "local") as DataProvider;
export const hostingProvider = (project.hostingProvider || "static") as HostingProvider;
export const dataProviderLabel = {
  local: "Trên thiết bị",
  firebase: "Firebase",
  supabase: "Supabase",
}[dataProvider];
