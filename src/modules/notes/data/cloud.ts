import { dataProvider } from "@/config/services";
import type { Snapshot } from "../core/domain";

async function cloudAdapter() {
  if (dataProvider === "firebase") return import("./firebase-cloud");
  if (dataProvider === "supabase") return import("./supabase-cloud");
  throw new Error("Chế độ lưu trên thiết bị không có đồng bộ đám mây.");
}

export async function readCloud(uid: string) {
  return (await cloudAdapter()).readCloud(uid);
}

export async function writeCloud(uid: string, expectedVersion: number, snapshot: Snapshot) {
  return (await cloudAdapter()).writeCloud(uid, expectedVersion, snapshot);
}
