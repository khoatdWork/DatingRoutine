import { beforeEach, describe, expect, it } from "vitest";
import { emptySnapshot } from "@/modules/notes/core/domain";
import { readWorkspace, writeWorkspace, storageKey } from "@/modules/notes/data/repository";
import { syncAction } from "@/modules/notes/data/sync-policy";
let memory: Map<string, string>;
const storage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memory.set(key, value);
  },
};
beforeEach(() => {
  memory = new Map();
});
describe("local persistence and concurrency", () => {
  it("separates guest and account workspaces", () => {
    writeWorkspace(
      storage,
      "guest",
      0,
      { ...emptySnapshot(), profile: { displayName: "Khách" } },
      null,
      true,
    );
    expect(readWorkspace(storage, "uid-a").snapshot.profile.displayName).toBe("");
    expect(readWorkspace(storage, "guest").snapshot.profile.displayName).toBe("Khách");
  });
  it("refuses stale tab writes", () => {
    writeWorkspace(storage, "guest", 0, emptySnapshot(), null, true);
    expect(() => writeWorkspace(storage, "guest", 0, emptySnapshot(), null, true)).toThrow(
      "cửa sổ khác",
    );
    expect(readWorkspace(storage, "guest").localVersion).toBe(1);
  });
  it("does not silently reset corrupted local data", () => {
    storage.setItem(storageKey("guest"), "broken-original");
    expect(() => readWorkspace(storage, "guest")).toThrow();
    expect(storage.getItem(storageKey("guest"))).toBe("broken-original");
  });
  it("propagates storage quota errors before claiming a save", () => {
    expect(() =>
      writeWorkspace(
        {
          ...storage,
          setItem: () => {
            throw new Error("QuotaExceededError");
          },
        },
        "guest",
        0,
        emptySnapshot(),
        null,
        true,
      ),
    ).toThrow("Quota");
    expect(readWorkspace(storage, "guest").localVersion).toBe(0);
  });
});
describe("explicit sync policy", () => {
  const clean = { localVersion: 1, cloudVersion: null, dirty: false, snapshot: emptySnapshot() };
  it("pulls remote data when local is clean", () => expect(syncAction(clean, 7)).toBe("pull"));
  it("pushes a new local workspace only into an empty cloud", () => {
    expect(syncAction({ ...clean, dirty: true }, null)).toBe("push");
    expect(syncAction({ ...clean, dirty: true }, 2)).toBe("conflict");
  });
  it("requires matching remote version for edited workspaces", () => {
    expect(syncAction({ ...clean, dirty: true, cloudVersion: 4 }, 4)).toBe("push");
    expect(syncAction({ ...clean, dirty: true, cloudVersion: 4 }, 5)).toBe("conflict");
    expect(syncAction({ ...clean, dirty: true, cloudVersion: 4 }, null)).toBe("conflict");
  });
});
