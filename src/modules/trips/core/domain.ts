import { appConfig } from "@/config/app";

export const moodLabels = {
  happy: "Vui vẻ",
  love: "Lãng mạn",
  peaceful: "Bình yên",
  adventure: "Khám phá",
} as const;

export const categoryLabels = {
  transport: "Di chuyển",
  food: "Ăn uống",
  stay: "Lưu trú",
  tickets: "Vé",
  shopping: "Mua sắm",
  other: "Khác",
} as const;

export const paidByLabels = { me: "Mình", partner: "Bạn ấy", shared: "Cả hai" } as const;

export type Mood = keyof typeof moodLabels;
export type ExpenseCategory = keyof typeof categoryLabels;
export type PaidBy = keyof typeof paidByLabels;

export interface TripPhoto {
  id: string;
  publicId: string;
  url: string;
  width: number;
  height: number;
  caption: string;
}

export interface Expense {
  id: string;
  label: string;
  amount: number;
  category: ExpenseCategory;
  paidBy: PaidBy;
}

export interface Trip {
  id: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  note: string;
  mood: Mood;
  photos: TripPhoto[];
  expenses: Expense[];
  createdAt: string;
  updatedAt: string;
}

export interface Snapshot {
  schemaVersion: 1;
  profile: { displayName: string };
  trips: Trip[];
}

export const MAX_BACKUP_BYTES = 2_000_000;
export const MAX_TRIPS = 300;
export const MAX_PHOTOS = 30;
export const MAX_EXPENSES = 200;

export function emptySnapshot(): Snapshot {
  return { schemaVersion: 1, profile: { displayName: "" }, trips: [] };
}

const money = new Intl.NumberFormat(appConfig.locale, { style: "currency", currency: "VND" });
export function formatMoney(amount: number | bigint) {
  return money.format(amount);
}

export function tripTotal(trip: Trip) {
  return trip.expenses.reduce((total, expense) => total + expense.amount, 0);
}

function fail(field: string): never {
  throw new Error("Dữ liệu không hợp lệ ở mục " + field + ".");
}

function record(value: unknown, keys: string[], field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return fail(field);
  const actual = Object.keys(value);
  if (actual.length !== keys.length || !actual.every((key) => keys.includes(key)))
    return fail(field);
  return value as Record<string, unknown>;
}

function string(value: unknown, limit: number, field: string, required = false): string {
  if (
    typeof value !== "string" ||
    /[\x00\uD800-\uDFFF]/u.test(value) ||
    [...value].length > limit ||
    (required && !value.trim())
  )
    return fail(field);
  return value;
}

function choice<T extends Record<string, string>>(
  value: unknown,
  choices: T,
  field: string,
): keyof T {
  if (typeof value !== "string" || !Object.hasOwn(choices, value)) return fail(field);
  return value;
}

function integer(value: unknown, min: number, field: string): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min) return fail(field);
  return value;
}

function uniqueArray<T extends { id: string }>(
  value: unknown,
  limit: number,
  field: string,
  validate: (entry: unknown) => T,
): T[] {
  if (!Array.isArray(value) || value.length > limit) return fail(field);
  const entries = Array.from(value, validate);
  if (new Set(entries.map(({ id }) => id)).size !== entries.length) return fail(field);
  return entries;
}

function identifier(value: unknown, field: string) {
  if (typeof value !== "string" || !/^[a-zA-Z0-9-]{1,80}$/.test(value)) return fail(field);
  return value;
}

function date(value: unknown, field: string) {
  if (typeof value !== "string" || !/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) return fail(field);
  const timestamp = new Date(value);
  if (!Number.isFinite(timestamp.getTime()) || timestamp.toISOString().slice(0, 10) !== value)
    return fail(field);
  return value;
}

function instant(value: unknown, field: string) {
  if (
    typeof value !== "string" ||
    !/^(?!0000)\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  )
    return fail(field);
  const timestamp = new Date(value);
  if (!Number.isFinite(timestamp.getTime()) || timestamp.toISOString() !== value)
    return fail(field);
  return value;
}

function validatePhoto(value: unknown): TripPhoto {
  const photo = record(value, ["id", "publicId", "url", "width", "height", "caption"], "ảnh");
  const publicId = string(photo.publicId, 255, "mã Cloudinary", true);
  const url = string(photo.url, 2048, "đường dẫn ảnh", true);
  if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(publicId)) return fail("mã Cloudinary");
  const delivery =
    /^https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9_-]+\/image\/authenticated\/s--[a-zA-Z0-9_-]{32}--\/v[0-9]+\/([a-zA-Z0-9_/-]+)\.(?:jpg|png|webp)$/.exec(
      url,
    );
  if (!delivery || delivery[0] !== url || delivery[1] !== publicId) return fail("đường dẫn ảnh");
  return {
    id: identifier(photo.id, "mã ảnh"),
    publicId,
    url,
    width: integer(photo.width, 1, "chiều rộng ảnh"),
    height: integer(photo.height, 1, "chiều cao ảnh"),
    caption: string(photo.caption, 300, "chú thích ảnh"),
  };
}

function validateExpense(value: unknown): Expense {
  const expense = record(value, ["id", "label", "amount", "category", "paidBy"], "chi phí");
  return {
    id: identifier(expense.id, "mã chi phí"),
    label: string(expense.label, 120, "tên khoản chi", true),
    amount: integer(expense.amount, 0, "số tiền"),
    category: choice(expense.category, categoryLabels, "nhóm chi phí"),
    paidBy: choice(expense.paidBy, paidByLabels, "người thanh toán"),
  };
}

function validateTrip(value: unknown): Trip {
  const trip = record(
    value,
    [
      "id",
      "title",
      "location",
      "startDate",
      "endDate",
      "note",
      "mood",
      "photos",
      "expenses",
      "createdAt",
      "updatedAt",
    ],
    "chuyến đi",
  );
  const startDate = date(trip.startDate, "ngày đi");
  const endDate = date(trip.endDate, "ngày về");
  if (startDate > endDate) return fail("khoảng ngày");
  const createdAt = instant(trip.createdAt, "thời điểm tạo");
  const updatedAt = instant(trip.updatedAt, "thời điểm cập nhật");
  if (createdAt > updatedAt) return fail("thời điểm cập nhật");
  const result: Trip = {
    id: identifier(trip.id, "mã chuyến đi"),
    title: string(trip.title, 120, "tên chuyến đi", true),
    location: string(trip.location, 120, "địa điểm"),
    startDate,
    endDate,
    note: string(trip.note, 10000, "ghi chú"),
    mood: choice(trip.mood, moodLabels, "cảm xúc"),
    photos: uniqueArray(trip.photos, MAX_PHOTOS, "danh sách ảnh", validatePhoto),
    expenses: uniqueArray(trip.expenses, MAX_EXPENSES, "danh sách chi phí", validateExpense),
    createdAt,
    updatedAt,
  };
  if (!Number.isSafeInteger(tripTotal(result))) return fail("tổng chi phí");
  return result;
}

export function validateSnapshot(value: unknown): Snapshot {
  const snapshot = record(value, ["schemaVersion", "profile", "trips"], "bản sao lưu");
  if (snapshot.schemaVersion !== 1) return fail("phiên bản bản sao lưu");
  const profile = record(snapshot.profile, ["displayName"], "hồ sơ");
  const result: Snapshot = {
    schemaVersion: 1,
    profile: { displayName: string(profile.displayName, 60, "tên hiển thị") },
    trips: uniqueArray(snapshot.trips, MAX_TRIPS, "danh sách chuyến đi", validateTrip),
  };
  checkSize(JSON.stringify(result));
  return result;
}

function checkSize(text: string) {
  if (text.length > MAX_BACKUP_BYTES || new TextEncoder().encode(text).length > MAX_BACKUP_BYTES)
    throw new Error("Bản sao lưu vượt quá 2 MB.");
}

export function parseBackup(text: string): Snapshot {
  checkSize(text);
  try {
    return validateSnapshot(JSON.parse(text));
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error("Tệp này không phải JSON hợp lệ.");
    throw error;
  }
}
