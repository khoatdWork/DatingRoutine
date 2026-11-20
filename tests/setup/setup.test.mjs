import { afterEach, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { choices, validateProjectConfig } from "../../scripts/project-config.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const temporary = [];
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "pwa-setup-"));
  temporary.push(directory);
  return directory;
}
function run(directory, script, args = []) {
  return spawnSync(process.execPath, [join(root, "scripts", script), ...args], {
    cwd: directory,
    encoding: "utf8",
    stdio: "pipe",
  });
}
function read(directory) {
  return JSON.parse(readFileSync(join(directory, "project.config.json"), "utf8"));
}
afterEach(() => {
  for (const directory of temporary.splice(0)) {
    assert.ok(resolve(directory).startsWith(join(resolve(tmpdir()), "pwa-setup-")));
    rmSync(directory, { recursive: true, force: true });
  }
});

test("blocks an unconfigured or invalid project before running", () => {
  const directory = fixture();
  assert.notEqual(run(directory, "check-project.mjs").status, 0);
  writeFileSync(join(directory, "project.config.json"), JSON.stringify({ schemaVersion: 1 }));
  assert.notEqual(run(directory, "check-project.mjs").status, 0);
});

test("requires explicit data, hosting and name in noninteractive setup", () => {
  for (const args of [
    [],
    ["--name", "Test", "--data", "local"],
    ["--name", "Test", "--hosting", "static"],
  ]) {
    const result = run(fixture(), "setup-project.mjs", args);
    assert.notEqual(result.status, 0);
  }
});

test("supports all independent data and hosting combinations", () => {
  for (const data of Object.keys(choices.data)) {
    for (const hosting of Object.keys(choices.hosting)) {
      const directory = fixture();
      const result = run(directory, "setup-project.mjs", [
        "--name",
        "Ghi chú mới",
        "--data",
        data,
        "--hosting",
        hosting,
      ]);
      assert.equal(result.status, 0, result.stderr);
      const config = read(directory);
      assert.equal(config.dataProvider, data);
      assert.equal(config.hostingProvider, hosting);
      assert.equal(config.appName, "Ghi chú mới");
      assert.match(config.storageKey, /^ghi-chu-moi-[a-f0-9]{8}-v1$/);
      assert.equal(run(directory, "check-project.mjs", ["--hosting", hosting]).status, 0);
      const other = hosting === "static" ? "firebase" : "static";
      assert.notEqual(run(directory, "check-project.mjs", ["--hosting", other]).status, 0);
    }
  }
});

test("rejects unknown providers and arguments without changing the saved config", () => {
  const directory = fixture();
  for (const args of [
    ["--name", "Test", "--data", "__proto__", "--hosting", "static"],
    ["--name", "Test", "--data", "local", "--hosting", "unknown"],
    ["--unknown"],
    ["--name"],
    ["--name", "Test", "--data", "local", "--hosting", "static", "--storage-key", "starter-pwa-v1"],
  ])
    assert.notEqual(run(directory, "setup-project.mjs", args).status, 0);
});

test("requires confirmation to replace choices and preserves the app namespace", () => {
  const directory = fixture();
  const initial = ["--name", "Test", "--data", "local", "--hosting", "static"];
  assert.equal(run(directory, "setup-project.mjs", initial).status, 0);
  const previous = read(directory);
  const next = ["--name", "Test", "--data", "supabase", "--hosting", "cloudflare"];
  assert.notEqual(run(directory, "setup-project.mjs", next).status, 0);
  assert.deepEqual(read(directory), previous);
  assert.equal(run(directory, "setup-project.mjs", [...next, "--yes"]).status, 0);
  assert.equal(read(directory).dataProvider, "supabase");
  assert.equal(read(directory).storageKey, previous.storageKey);
});

test("creates a new namespace for each newly created app", () => {
  const configs = [fixture(), fixture()].map((directory) => {
    assert.equal(
      run(directory, "setup-project.mjs", [
        "--name",
        "Test",
        "--data",
        "local",
        "--hosting",
        "static",
      ]).status,
      0,
    );
    return read(directory);
  });
  assert.notEqual(configs[0].storageKey, configs[1].storageKey);
});

test("validates schema and preserves existing environment files", () => {
  const directory = fixture();
  writeFileSync(join(directory, ".env.local"), "PRIVATE_TEST_SENTINEL=unchanged\n");
  const config = {
    schemaVersion: 1,
    appName: "Test",
    storageKey: "test-namespace",
    dataProvider: "local",
    hostingProvider: "static",
  };
  assert.equal(validateProjectConfig(config), config);
  for (const change of [
    { schemaVersion: 2 },
    { appName: "" },
    { storageKey: "../unsafe" },
    { dataProvider: null },
    { hostingProvider: "constructor" },
    { dataProvider: ["firebase"] },
    { hostingProvider: ["github-pages"] },
  ])
    assert.throws(() => validateProjectConfig({ ...config, ...change }));
  assert.equal(
    run(directory, "setup-project.mjs", [
      "--name",
      "Test",
      "--data",
      "local",
      "--hosting",
      "static",
    ]).status,
    0,
  );
  assert.equal(
    readFileSync(join(directory, ".env.local"), "utf8"),
    "PRIVATE_TEST_SENTINEL=unchanged\n",
  );
});
