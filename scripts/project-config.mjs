import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export const choices = {
  data: {
    local: "Trên thiết bị (không tài khoản/cloud)",
    firebase: "Firebase (Google Auth + Firestore)",
    supabase: "Supabase (Google Auth + PostgreSQL)",
  },
  hosting: {
    cloudflare: "Cloudflare Pages",
    "github-pages": "GitHub Pages",
    firebase: "Firebase Hosting",
    static: "Host tĩnh khác (triển khai thư mục out/)",
  },
};

export function validateProjectConfig(config) {
  if (
    !config ||
    config.schemaVersion !== 1 ||
    typeof config.appName !== "string" ||
    !config.appName.trim() ||
    config.appName.length > 60 ||
    typeof config.storageKey !== "string" ||
    !/^[a-z0-9][a-z0-9-]{2,79}$/.test(config.storageKey) ||
    config.storageKey === "starter-pwa-v1" ||
    typeof config.dataProvider !== "string" ||
    typeof config.hostingProvider !== "string" ||
    !Object.hasOwn(choices.data, config.dataProvider) ||
    !Object.hasOwn(choices.hosting, config.hostingProvider)
  ) {
    throw new Error(
      "Chưa thiết lập dự án hợp lệ. Chạy npm run setup để chọn dịch vụ dữ liệu, hosting, tên app và namespace riêng trước khi chạy/build.",
    );
  }
  return config;
}

export function readProjectConfig(root = process.cwd()) {
  let config;
  try {
    config = JSON.parse(readFileSync(resolve(root, "project.config.json"), "utf8"));
  } catch {
    throw new Error("Không đọc được project.config.json. Chạy npm run setup.");
  }
  return validateProjectConfig(config);
}
