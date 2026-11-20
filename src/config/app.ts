// Change branding here when starting a new project.
export const appConfig = {
  name: "Starter",
  fullName: "Starter · Web & Mobile",
  description: "Không gian nhỏ cho những ý tưởng và công việc mỗi ngày.",
  version: "1.0.0",
  storageKey: "starter-pwa-v1",
  themeColor: "#2257c7",
  backgroundColor: "#f4f7fb",
  locale: "vi-VN",
  timeZone: "Asia/Ho_Chi_Minh",
} as const;
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const appRoot = `${basePath}/`;
