import { appConfig } from "@/config/app";
import { emptySnapshot, validateSnapshot, type Snapshot } from "../core/domain";
export interface Envelope {
  localVersion: number;
  cloudVersion: number | null;
  dirty: boolean;
  snapshot: Snapshot;
}
export type StorageDriver = Pick<Storage, "getItem" | "setItem">;
export function storageKey(owner: string) {
  return `${appConfig.storageKey}:workspace:${owner}`;
}
export function readWorkspace(storage: StorageDriver, owner: string): Envelope {
  const raw = storage.getItem(storageKey(owner));
  if (raw === null)
    return { localVersion: 0, cloudVersion: null, dirty: false, snapshot: emptySnapshot() };
  try {
    const value = JSON.parse(raw) as Envelope;
    if (
      !Number.isSafeInteger(value.localVersion) ||
      value.localVersion < 1 ||
      typeof value.dirty !== "boolean" ||
      !(
        value.cloudVersion === null ||
        (Number.isSafeInteger(value.cloudVersion) && value.cloudVersion >= 0)
      )
    )
      throw new Error();
    return {
      localVersion: value.localVersion,
      cloudVersion: value.cloudVersion,
      dirty: value.dirty,
      snapshot: validateSnapshot(value.snapshot),
    };
  } catch {
    throw new Error(
      "Không đọc được dữ liệu trên thiết bị. Hãy xuất bản gốc trước khi sửa dữ liệu.",
    );
  }
}
export function writeWorkspace(
  storage: StorageDriver,
  owner: string,
  expected: number,
  snapshot: Snapshot,
  cloudVersion: number | null,
  dirty: boolean,
): Envelope {
  const current = readWorkspace(storage, owner);
  if (current.localVersion !== expected)
    throw new Error("Dữ liệu đã thay đổi ở cửa sổ khác. Hãy mở lại mục đang sửa.");
  const next: Envelope = {
    localVersion: current.localVersion + 1,
    cloudVersion,
    dirty,
    snapshot: validateSnapshot(snapshot),
  };
  // Persist before returning success. Quota/security errors reach the caller.
  storage.setItem(storageKey(owner), JSON.stringify(next));
  return next;
}
