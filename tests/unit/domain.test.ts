import { describe, expect, it } from "vitest";
import {
  emptySnapshot,
  parseBackup,
  validateSnapshot,
  type Note,
} from "@/modules/notes/core/domain";
const note: Note = {
  id: "a-1",
  title: "Ý tưởng",
  body: "Nội dung",
  kind: "idea",
  completed: false,
  updatedAt: "2026-11-20T09:00:00.000Z",
};
describe("backup boundary", () => {
  it("roundtrips Vietnamese text and strips unknown properties", () => {
    const result = parseBackup(
      JSON.stringify({
        ...emptySnapshot(),
        notes: [{ ...note, extra: "discard" }],
        secret: "discard",
      }),
    );
    expect(result.notes).toEqual([note]);
    expect(result).not.toHaveProperty("secret");
  });
  it("rejects duplicate note identifiers", () =>
    expect(() => validateSnapshot({ ...emptySnapshot(), notes: [note, note] })).toThrow(
      "trùng mã",
    ));
  it.each([
    { title: " " },
    { title: "x".repeat(121) },
    { body: "x".repeat(5001) },
    { kind: "other" },
    { completed: "yes" },
    { updatedAt: "no-date" },
    { id: "../a" },
  ])("rejects invalid note %j", (patch) =>
    expect(() =>
      validateSnapshot({ ...emptySnapshot(), notes: [{ ...note, ...patch }] }),
    ).toThrow(),
  );
  it("rejects wrong schema and excessive notes", () => {
    expect(() => validateSnapshot({ ...emptySnapshot(), schemaVersion: 2 })).toThrow();
    expect(() => validateSnapshot({ ...emptySnapshot(), notes: Array(501).fill(note) })).toThrow();
  });
  it("rejects broken JSON and oversized input before parsing", () => {
    expect(() => parseBackup("{")).toThrow("JSON hợp lệ");
    expect(() => parseBackup("x".repeat(1_000_001))).toThrow("1 MB");
  });
});
