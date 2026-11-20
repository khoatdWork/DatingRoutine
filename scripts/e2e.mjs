import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { readProjectConfig } from "./project-config.mjs";
const supabaseTest = process.argv[2] === "--supabase";
if (process.argv.length > (supabaseTest ? 3 : 2))
  throw new Error("Unsupported browser test option");
const project = readProjectConfig();
if (supabaseTest && (project.dataProvider !== "supabase" || !process.env.NEXT_PUBLIC_SUPABASE_URL))
  throw new Error(
    "Supabase browser test needs a Supabase build and NEXT_PUBLIC_SUPABASE_URL matching that build.",
  );
const manifest = JSON.parse(await readFile("out/manifest.webmanifest", "utf8"));
const port = process.env.E2E_PORT || "4173";
const env = {
  ...process.env,
  E2E_DATA_PROVIDER: process.env.E2E_DATA_PROVIDER || project.dataProvider,
  PORT: port,
  NEXT_PUBLIC_BASE_PATH: manifest.scope.replace(/\/$/, ""),
};
const url = `http://127.0.0.1:${port}${manifest.scope}`;
const server = spawn(process.execPath, ["scripts/serve-static.mjs"], { env, stdio: "inherit" });
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error("Static server exited unexpectedly");
    try {
      if ((await fetch(url)).ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  if (!ready) throw new Error("Static server did not become ready");
  const test = spawn(
    process.env.PYTHON || "python",
    [supabaseTest ? "tests/e2e/supabase.py" : "tests/e2e/app.py"],
    {
      env: { ...env, E2E_URL: url },
      stdio: "inherit",
    },
  );
  const result = await new Promise((resolve, reject) => {
    test.on("error", reject);
    test.on("exit", resolve);
  });
  if (result !== 0) process.exitCode = 1;
} finally {
  server.kill();
}
