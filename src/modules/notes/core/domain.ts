export type NoteKind = "idea" | "task";
export interface Note {
  id: string;
  title: string;
  body: string;
  kind: NoteKind;
  completed: boolean;
  updatedAt: string;
}
export interface Snapshot {
  schemaVersion: 1;
  profile: { displayName: string };
  notes: Note[];
}
export const MAX_BACKUP_BYTES = 1_000_000;
export function emptySnapshot(): Snapshot {
  return { schemaVersion: 1, profile: { displayName: "" }, notes: [] };
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export function validateSnapshot(value: unknown): Snapshot {
  if (
    !record(value) ||
    value.schemaVersion !== 1 ||
    !record(value.profile) ||
    typeof value.profile.displayName !== "string" ||
    value.profile.displayName.length > 60 ||
    !Array.isArray(value.notes) ||
    value.notes.length > 500
  ) {
    throw new Error("Bản sao lưu không đúng định dạng phiên bản 1 hoặc vượt giới hạn 500 ghi chú.");
  }
  const ids = new Set<string>();
  const notes = value.notes.map((note): Note => {
    if (
      !record(note) ||
      typeof note.id !== "string" ||
      !/^[a-zA-Z0-9-]{1,80}$/.test(note.id) ||
      ids.has(note.id) ||
      typeof note.title !== "string" ||
      !note.title.trim() ||
      note.title.length > 120 ||
      typeof note.body !== "string" ||
      note.body.length > 5000 ||
      (note.kind !== "idea" && note.kind !== "task") ||
      typeof note.completed !== "boolean" ||
      typeof note.updatedAt !== "string" ||
      !Number.isFinite(Date.parse(note.updatedAt))
    ) {
      throw new Error("Ghi chú trong bản sao lưu không hợp lệ hoặc bị trùng mã.");
    }
    ids.add(note.id);
    return {
      id: note.id,
      title: note.title.trim(),
      body: note.body,
      kind: note.kind,
      completed: note.completed,
      updatedAt: new Date(note.updatedAt).toISOString(),
    };
  });
  const clean: Snapshot = {
    schemaVersion: 1,
    profile: { displayName: value.profile.displayName.trim() },
    notes,
  };
  if (new TextEncoder().encode(JSON.stringify(clean)).length > MAX_BACKUP_BYTES) {
    throw new Error("Dữ liệu quá lớn. Vui lòng giữ bản sao lưu dưới 1 MB.");
  }
  return clean;
}
export function parseBackup(text: string): Snapshot {
  if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES)
    throw new Error("Tệp sao lưu phải nhỏ hơn 1 MB.");
  try {
    return validateSnapshot(JSON.parse(text));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("Tệp này không phải JSON hợp lệ.");
    throw error;
  }
}
