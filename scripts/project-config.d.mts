export interface ProjectConfig {
  schemaVersion: 1;
  appName: string;
  storageKey: string;
  dataProvider: "local" | "firebase" | "supabase";
  hostingProvider: "cloudflare" | "github-pages" | "firebase" | "static";
}
export const choices: {
  data: Record<ProjectConfig["dataProvider"], string>;
  hosting: Record<ProjectConfig["hostingProvider"], string>;
};
export function validateProjectConfig(config: unknown): ProjectConfig;
export function readProjectConfig(root?: string): ProjectConfig;
