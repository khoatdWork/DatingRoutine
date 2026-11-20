import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
const output = "out";
const manifest = JSON.parse(await readFile(join(output, "manifest.webmanifest"), "utf8"));
const root = manifest.scope;
const files = ["index.html", "manifest.webmanifest", "icon.svg"];
for (const directory of ["_next/static", "icons"]) {
  for (const entry of await readdir(join(output, directory), {
    recursive: true,
    withFileTypes: true,
  })) {
    if (entry.isFile())
      files.push(
        join(entry.parentPath, entry.name)
          .slice(output.length + 1)
          .replaceAll("\\", "/"),
      );
  }
}
files.sort();
const template = await readFile("src/modules/pwa/worker.js", "utf8");
const hash = createHash("sha256").update(template).update(root).update(manifest.name);
for (const file of files) hash.update(file).update(await readFile(join(output, file)));
const prefix = `pwa-${encodeURIComponent(manifest.short_name)}-${encodeURIComponent(root)}-`;
const cache = prefix + hash.digest("hex").slice(0, 16);
const assets = files.map((file) => root + (file === "index.html" ? "" : file));
await writeFile(
  join(output, "sw.js"),
  template
    .replace('"__PWA_CACHE__"', JSON.stringify(cache))
    .replace('"__PWA_PREFIX__"', JSON.stringify(prefix))
    .replace('"__PWA_ROOT__"', JSON.stringify(root))
    .replace('["__PWA_ASSETS__"]', JSON.stringify(assets)),
);
console.log(`PWA: ${assets.length} public files; scope ${root}; cache ${cache}`);
