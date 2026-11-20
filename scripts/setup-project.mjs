import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { choices, validateProjectConfig } from "./project-config.mjs";

const usage = `Thiết lập dự án trước khi chạy/build:
  npm run setup
  npm run setup -- --name "Tên app" --data local|firebase|supabase --hosting cloudflare|github-pages|firebase|static
  Tùy chọn: --storage-key namespace-rieng, --yes (xác nhận đổi cấu hình đã có)
Lựa chọn dữ liệu và hosting độc lập. Không tạo tài khoản hoặc tự triển khai.`;

function parseArgs(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (["--yes", "--help"].includes(flag)) result[flag.slice(2)] = true;
    else if (["--name", "--data", "--hosting", "--storage-key"].includes(flag)) {
      if (!args[i + 1] || args[i + 1].startsWith("--"))
        throw new Error(`Thiếu giá trị cho ${flag}.`);
      result[flag.slice(2)] = args[++i];
    } else throw new Error(`Tùy chọn không hợp lệ: ${flag}.\n${usage}`);
  }
  return result;
}

function namespace(name) {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50)
    .replace(/-$/, "");
  return `${slug || "app"}-${randomUUID().slice(0, 8)}-v1`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return console.log(usage);
  let previous;
  try {
    previous = JSON.parse(await readFile("project.config.json", "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT")
      throw new Error(
        "project.config.json không đọc được. Giữ bản gốc và sửa tệp trước khi thiết lập.",
      );
  }
  const interactive = Boolean(stdin.isTTY && stdout.isTTY);
  const prompt = interactive ? createInterface({ input: stdin, output: stdout }) : null;
  try {
    async function choose(key, value) {
      if (value !== undefined) {
        if (!Object.hasOwn(choices[key], value))
          throw new Error(`${key} không hợp lệ. Chọn: ${Object.keys(choices[key]).join(", ")}.`);
        return value;
      }
      if (!prompt) throw new Error(`Cần --${key} khi chạy không tương tác.\n${usage}`);
      const entries = Object.entries(choices[key]);
      console.log(`\n${key === "data" ? "Dịch vụ dữ liệu" : "Nơi hosting"}:`);
      entries.forEach(([id, label], i) => console.log(`  ${i + 1}. ${label} (${id})`));
      for (;;) {
        const answer = (await prompt.question("Chọn số hoặc mã dịch vụ: ")).trim();
        const id = entries[Number(answer) - 1]?.[0] || answer;
        if (Object.hasOwn(choices[key], id)) return id;
        console.log("Hãy chọn một dịch vụ trong danh sách.");
      }
    }
    const name = (options.name ?? (prompt && (await prompt.question("Tên app mới: "))))?.trim();
    if (!name || name.length > 60) throw new Error("Cần tên app từ 1–60 ký tự (--name).");
    const dataProvider = await choose("data", options.data);
    const hostingProvider = await choose("hosting", options.hosting);
    // Keep the namespace when changing services for the same project.
    const config = validateProjectConfig({
      schemaVersion: 1,
      appName: name,
      storageKey: options["storage-key"] || previous?.storageKey || namespace(name),
      dataProvider,
      hostingProvider,
    });
    if (previous?.dataProvider || previous?.hostingProvider || previous?.storageKey) {
      console.log(
        `\nCấu hình mới: ${name} · ${dataProvider} · ${hostingProvider} · ${config.storageKey}`,
      );
      console.log(
        "Đổi dịch vụ hoặc namespace sẽ mở không gian riêng; dữ liệu cũ không tự chuyển. Hãy xuất sao lưu trước khi đổi.",
      );
      if (!options.yes) {
        if (!prompt)
          throw new Error("Cấu hình đã có. Xem lựa chọn trên và dùng --yes để xác nhận thay đổi.");
        if ((await prompt.question('Gõ "doi" để lưu cấu hình này: ')).trim() !== "doi")
          throw new Error("Đã hủy. Cấu hình cũ được giữ nguyên.");
      }
    }
    await writeFile("project.config.json", `${JSON.stringify(config, null, 2)}\n`);
    console.log(
      `\nĐã lưu project.config.json: ${choices.data[dataProvider]} · ${choices.hosting[hostingProvider]}.`,
    );
    console.log(`Namespace riêng: ${config.storageKey}. Commit cấu hình này cho dự án mới.`);
    if (dataProvider !== "local")
      console.log(
        `Điền biến public trong .env.local theo .env.example và đọc docs/${dataProvider}.md để bật tài khoản/cloud. Khi chưa điền, app dùng guest local và hiển thị trạng thái thiếu cấu hình.`,
      );
    console.log("Hướng dẫn triển khai: docs/hosting.md. Tiếp theo: npm run dev.");
  } finally {
    prompt?.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
