import { appConfig } from "@/config/app";
import type { StorageDriver, WorkspaceOwner } from "@/modules/notes/data/repository";
import { emptySnapshot, validateSnapshot, type Snapshot } from "../core/domain";

export type { WorkspaceOwner };

export interface Envelope {
  localVersion: number;
  cloudVersion: number | null;
  dirty: boolean;
  snapshot: Snapshot;
}

export function storageKey(owner: WorkspaceOwner) {
  const scope =
    owner === "guest" ? owner : JSON.stringify([owner.provider, owner.project, owner.uid]);
  return `${appConfig.storageKey}:trips-v1:${scope}`;
}

export function readRawWorkspace(storage: StorageDriver, owner: WorkspaceOwner) {
  return storage.getItem(storageKey(owner));
}

export function readWorkspace(storage: StorageDriver, owner: WorkspaceOwner): Envelope {
  const raw = readRawWorkspace(storage, owner);
  if (raw === null)
    return { localVersion: 0, cloudVersion: null, dirty: false, snapshot: emptySnapshot() };

  try {
    const { localVersion, cloudVersion, dirty, snapshot } = JSON.parse(raw) as Envelope;
    if (
      !Number.isSafeInteger(localVersion) ||
      localVersion < 1 ||
      typeof dirty !== "boolean" ||
      !(cloudVersion === null || (Number.isSafeInteger(cloudVersion) && cloudVersion >= 0))
    )
      throw new Error();
    return { localVersion, cloudVersion, dirty, snapshot: validateSnapshot(snapshot) };
  } catch {
    throw new Error("Không đọc được dữ liệu trên thiết bị. Hãy xuất bản gốc để khôi phục.");
  }
}

export function writeWorkspace(
  storage: StorageDriver,
  owner: WorkspaceOwner,
  expected: number,
  snapshot: Snapshot,
  cloudVersion: number | null,
  dirty: boolean,
): Envelope {
  const current = readWorkspace(storage, owner);
  if (current.localVersion !== expected)
    throw new Error("Dữ liệu vừa thay đổi ở cửa sổ khác. Hãy mở lại mục đang sửa.");
  const localVersion = current.localVersion + 1;
  if (!Number.isSafeInteger(localVersion))
    throw new Error("Phiên bản trên thiết bị vượt giới hạn.");
  const next = { localVersion, cloudVersion, dirty, snapshot: validateSnapshot(snapshot) };
  storage.setItem(storageKey(owner), JSON.stringify(next));
  return next;
}
