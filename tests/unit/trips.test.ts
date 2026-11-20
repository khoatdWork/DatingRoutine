import { describe, expect, it } from "vitest";
import {
  emptySnapshot,
  MAX_BACKUP_BYTES,
  parseBackup,
  tripTotal,
  type Trip,
} from "@/modules/trips/core/domain";
import {
  readRawWorkspace,
  readWorkspace,
  storageKey,
  writeWorkspace,
} from "@/modules/trips/data/repository";

const trip: Trip = {
  id: "trip-1",
  title: "Hà Nội",
  location: "Hồ Tây",
  startDate: "2024-02-29",
  endDate: "2024-03-01",
  note: "Dạo quanh hồ",
  mood: "happy",
  photos: [
    {
      id: "photo-1",
      publicId: "dating-routine/photo-1",
      url: "https://res.cloudinary.com/example/image/authenticated/s--AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA--/v1/dating-routine/photo-1.jpg",
      width: 320,
      height: 480,
      caption: "Một ngày đẹp trời",
    },
  ],
  expenses: [
    { id: "meal-1", label: "Bữa tối", amount: 230000, category: "food", paidBy: "shared" },
  ],
  createdAt: "2024-02-29T10:30:00.000Z",
  updatedAt: "2024-02-29T10:30:00.000Z",
};

const snapshot = { ...emptySnapshot(), trips: [trip] };

function storageDriver() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("trip snapshots", () => {
  it("retains the trip, its photo metadata and VND expenses", () => {
    const backup = parseBackup(JSON.stringify(snapshot));
    expect(backup).toEqual(snapshot);
    expect(tripTotal(backup.trips[0])).toBe(230000);
  });

  it("rejects impossible dates, off-host photos, duplicate IDs, and unsafe amounts", () => {
    for (const badTrip of [
      { ...trip, startDate: "2023-02-29" },
      { ...trip, endDate: "2024-02-28" },
      { ...trip, photos: [trip.photos[0], trip.photos[0]] },
      { ...trip, photos: [{ ...trip.photos[0], url: "https://evil.test/photo.jpg" }] },
      { ...trip, photos: [{ ...trip.photos[0], publicId: "dating-routine/other-photo" }] },
      {
        ...trip,
        photos: [
          {
            ...trip.photos[0],
            url: "https://res.cloudinary.com/example/image/upload/../photo.jpg",
          },
        ],
      },
      { ...trip, expenses: [{ ...trip.expenses[0], amount: 1.25 }] },
      { ...trip, expenses: [{ ...trip.expenses[0], amount: Number.MAX_SAFE_INTEGER + 1 }] },
    ]) {
      expect(() => parseBackup(JSON.stringify({ ...snapshot, trips: [badTrip] }))).toThrow();
    }
    expect(() => parseBackup(JSON.stringify({ ...snapshot, trips: [trip, trip] }))).toThrow();
  });

  it("checks the UTF-8 backup limit before parsing JSON", () => {
    expect(() => parseBackup("đ".repeat(MAX_BACKUP_BYTES / 2 + 1))).toThrow("2 MB");
  });
});

describe("trip storage", () => {
  const alice = { provider: "supabase", project: "project", uid: "alice" } as const;
  it("isolates guest, projects, and accounts and rejects stale writes", () => {
    const storage = storageDriver();
    writeWorkspace(storage, alice, 0, snapshot, null, true);
    expect(readWorkspace(storage, alice)).toMatchObject({ localVersion: 1, dirty: true, snapshot });
    for (const owner of [
      "guest",
      { ...alice, project: "other" },
      { ...alice, uid: "bob" },
    ] as const)
      expect(readWorkspace(storage, owner).snapshot).toEqual(emptySnapshot());
    expect(() => writeWorkspace(storage, alice, 0, emptySnapshot(), null, true)).toThrow(
      "cửa sổ khác",
    );
  });

  it("exposes corrupt bytes for recovery and refuses to overwrite them", () => {
    const storage = storageDriver();
    storage.setItem(storageKey(alice), "corrupt");
    expect(() => writeWorkspace(storage, alice, 0, snapshot, null, true)).toThrow("khôi phục");
    expect(readRawWorkspace(storage, alice)).toBe("corrupt");
  });

  it("propagates storage quota errors before confirming a write", () => {
    const storage = storageDriver();
    expect(() =>
      writeWorkspace(
        {
          ...storage,
          setItem: () => {
            throw new Error("quota");
          },
        },
        alice,
        0,
        snapshot,
        null,
        true,
      ),
    ).toThrow("quota");
    expect(readWorkspace(storage, alice).localVersion).toBe(0);
  });
});
