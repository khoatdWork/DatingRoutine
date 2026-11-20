import project from "../../project.config.json";
// Setup supplies the project name and unique namespace; customize remaining branding here.
export const appConfig = {
  name: project.appName || "Starter",
  fullName: `${project.appName || "Đi cùng nhau"} · Nhật ký những chuyến đi`,
  description:
    "Những nơi đã đến, tấm hình đã chụp và kỷ niệm của hai đứa. Lưu chuyến đi, ghi chú và chi phí trong một cuốn nhật ký nhỏ.",
  version: "1.0.0",
  storageKey: project.storageKey || "starter-pwa-v1",
  themeColor: "#2257c7",
  backgroundColor: "#f4f7fb",
  locale: "vi-VN",
  timeZone: "Asia/Ho_Chi_Minh",
} as const;
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
export const appRoot = `${basePath}/`;
