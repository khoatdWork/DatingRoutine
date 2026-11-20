import sharp from "sharp";
import { mkdir, readFile } from "node:fs/promises";
const svg = await readFile("public/icon.svg");
await mkdir("public/icons", { recursive: true });
for (const [name, size] of [
  ["icon-192", 192],
  ["icon-512", 512],
  ["apple-touch-icon", 180],
]) {
  await sharp(svg).resize(size, size).png().toFile(`public/icons/${name}.png`);
}
// Opaque background, logo geometry wholly inside the maskable safe circle.
await sharp({ create: { width: 512, height: 512, channels: 4, background: "#2257c7" } })
  .composite([{ input: await sharp(svg).resize(400, 400).png().toBuffer(), left: 56, top: 56 }])
  .png()
  .toFile("public/icons/maskable-512.png");
console.log("Generated PWA and Apple icons from public/icon.svg");
