import { beforeEach, describe, expect, it } from "vitest";
import { emptySnapshot } from "@/modules/notes/core/domain";
import {
  readWorkspace,
  writeWorkspace,
  storageKey,
  type WorkspaceOwner,
} from "@/modules/notes/data/repository";
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
  it("separates guest, providers, projects, and account IDs", () => {
    const owners: WorkspaceOwner[] = [
      "guest",
      { provider: "firebase", project: "project-a", uid: "guest" },
      { provider: "firebase", project: "project-b", uid: "guest" },
      { provider: "firebase", project: "project-a", uid: "uid-b" },
      { provider: "supabase", project: "project-a", uid: "guest" },
    ];
    owners.forEach((owner, index) => {
      expect(readWorkspace(storage, owner).localVersion).toBe(0);
      writeWorkspace(
        storage,
        owner,
        0,
        { ...emptySnapshot(), profile: { displayName: `Hồ sơ ${index}` } },
        null,
        true,
      );
    });
    owners.forEach((owner, index) => {
      expect(readWorkspace(storage, owner).snapshot.profile.displayName).toBe(`Hồ sơ ${index}`);
    });
  });
  it("does not read an old UID-only workspace into a provider project", () => {
    const legacyKey = storageKey("guest").replace(/guest$/, "uid-a");
    const legacyValue = JSON.stringify({
      localVersion: 1,
      cloudVersion: 20,
      dirty: true,
      snapshot: emptySnapshot(),
    });
    storage.setItem(legacyKey, legacyValue);
    const owner = { provider: "firebase", project: "project-a", uid: "uid-a" } as const;
    expect(readWorkspace(storage, owner).localVersion).toBe(0);
    writeWorkspace(storage, owner, 0, emptySnapshot(), null, true);
    expect(storage.getItem(legacyKey)).toBe(legacyValue);
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
