"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Camera, LoaderCircle, Plus, Save, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  cloudinaryConfigured,
  MAX_PHOTO_BYTES,
  PHOTO_ACCEPT,
  uploadTripPhoto,
} from "@/modules/media/cloudinary";
import {
  categoryLabels,
  MAX_EXPENSES,
  MAX_PHOTOS,
  moodLabels,
  paidByLabels,
  validateSnapshot,
  type Expense,
  type Trip,
  type TripPhoto,
} from "@/modules/trips/core/domain";

type TripEditorProps = {
  trip: Trip;
  isNew: boolean;
  canUpload: boolean;
  onDirty: (dirty: boolean) => void;
  onSave: (trip: Trip) => boolean;
  onCancel: () => void;
};

type DraftExpense = Omit<Expense, "amount"> & { amount: string };
type Removal = { kind: "photo" | "expense"; id: string };

const selectClass =
  "min-h-11 w-full min-w-0 rounded-lg border bg-card px-2.5 text-base focus-visible:outline-2 focus-visible:outline-ring";
const fieldClass = "journey-field grid min-w-0 gap-1.5";

function readAmount(amount: string) {
  const value = Number(amount);
  if (!/^\d+$/.test(amount) || !Number.isSafeInteger(value)) {
    throw new Error("Nhập số tiền nguyên từ 0 đồng cho mỗi khoản chi.");
  }
  return value;
}

export function TripEditor({ trip, isNew, canUpload, onDirty, onSave, onCancel }: TripEditorProps) {
  const [draft, setDraft] = useState(trip);
  const initialExpenses = trip.expenses.map((expense) => ({
    ...expense,
    amount: String(expense.amount),
  }));
  const [expenses, setExpenses] = useState<DraftExpense[]>(initialExpenses);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [pendingRemoval, setPendingRemoval] = useState<Removal | null>(null);
  const [uploading, setUploading] = useState(false);
  const uploadController = useRef<AbortController | null>(null);
  const formError = useRef<HTMLParagraphElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const errorsShown = useRef(false);
  const dirty =
    uploading || draft !== trip || JSON.stringify(expenses) !== JSON.stringify(initialExpenses);

  useEffect(() => {
    onDirty(dirty);
  }, [dirty, onDirty]);

  useEffect(() => () => uploadController.current?.abort(), []);

  useEffect(() => {
    if (error && errorsShown.current) formError.current?.focus();
  }, [error]);

  function changeDraft<K extends keyof Trip>(key: K, value: Trip[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function changeExpense(id: string, change: Partial<DraftExpense>) {
    setExpenses((current) =>
      current.map((expense) => (expense.id === id ? { ...expense, ...change } : expense)),
    );
    setError("");
  }

  function addExpense() {
    setExpenses((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        label: "",
        amount: "",
        category: "other",
        paidBy: "shared",
      },
    ]);
    setError("");
  }

  function confirmRemoval() {
    if (!pendingRemoval) return;
    if (pendingRemoval.kind === "photo") {
      setDraft((current) => ({
        ...current,
        photos: current.photos.filter(({ id }) => id !== pendingRemoval.id),
      }));
    } else {
      setExpenses((current) => current.filter(({ id }) => id !== pendingRemoval.id));
    }
    setPendingRemoval(null);
    setError("");
  }

  async function addPhotos(files: File[]) {
    if (!files.length || uploadController.current || !canUpload || !cloudinaryConfigured) return;
    setUploadError("");
    if (files.length > MAX_PHOTOS - draft.photos.length) {
      setUploadError(`Mỗi chuyến đi có tối đa ${MAX_PHOTOS} ảnh.`);
      return;
    }
    if (files.some((file) => !file.size || file.size > MAX_PHOTO_BYTES)) {
      setUploadError(
        `Mỗi ảnh phải có dung lượng từ 1 byte đến ${MAX_PHOTO_BYTES / (1024 * 1024)} MB.`,
      );
      return;
    }
    const controller = new AbortController();
    uploadController.current = controller;
    setUploading(true);
    let failed = 0;
    let latestError = "";
    try {
      for (const file of files) {
        try {
          const photo = await uploadTripPhoto(file, controller.signal);
          if (controller.signal.aborted) return;
          setDraft((current) => ({ ...current, photos: [...current.photos, photo] }));
        } catch (failure) {
          if (controller.signal.aborted) return;
          failed += 1;
          latestError = failure instanceof Error ? failure.message : "Hãy thử tải ảnh lại.";
        }
      }
      if (failed > 0) setUploadError(`Có ${failed} ảnh chưa tải lên. ${latestError}`);
    } finally {
      uploadController.current = null;
      if (!controller.signal.aborted) setUploading(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploadController.current) return;
    errorsShown.current = true;
    try {
      if (draft.endDate < draft.startDate) throw new Error("Ngày về phải từ ngày đi trở đi.");
      const next = {
        ...draft,
        title: draft.title.trim(),
        location: draft.location.trim(),
        note: draft.note.trim(),
        expenses: expenses.map((expense) => ({
          ...expense,
          label: expense.label.trim(),
          amount: readAmount(expense.amount),
        })),
        updatedAt: new Date(Math.max(Date.now(), Date.parse(draft.updatedAt) + 1)).toISOString(),
      };
      const validTrip = validateSnapshot({
        schemaVersion: 1,
        profile: { displayName: "" },
        trips: [next],
      }).trips[0];
      if (!onSave(validTrip)) {
        setError("Chưa lưu được chuyến đi. Bản nháp vẫn còn trên màn hình này.");
      }
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Hãy kiểm tra thông tin chuyến đi.");
    }
  }

  function changeCaption(photo: TripPhoto, caption: string) {
    setDraft((current) => ({
      ...current,
      photos: current.photos.map((entry) =>
        entry.id === photo.id ? { ...entry, caption } : entry,
      ),
    }));
    setError("");
  }

  return (
    <form className="journey-view journey-form grid gap-4" onSubmit={submit}>
      <h1 tabIndex={-1} className="text-2xl font-bold tracking-tight">
        {isNew ? "Chuyến đi mới" : "Chỉnh sửa chuyến đi"}
      </h1>
      <section
        className="journey-panel grid gap-3 rounded-2xl border bg-card p-4"
        aria-labelledby="trip-info-heading"
      >
        <h2 id="trip-info-heading" className="font-bold">
          Thông tin chuyến đi
        </h2>
        <div className={fieldClass}>
          <Label htmlFor="trip-title">Tên chuyến đi</Label>
          <Input
            id="trip-title"
            className="min-h-11"
            placeholder="Ví dụ Đà Lạt cuối tuần"
            maxLength={120}
            required
            value={draft.title}
            onChange={(event) => changeDraft("title", event.target.value)}
          />
        </div>
        <div className={fieldClass}>
          <Label htmlFor="trip-location">Địa điểm</Label>
          <Input
            id="trip-location"
            className="min-h-11"
            maxLength={120}
            value={draft.location}
            onChange={(event) => changeDraft("location", event.target.value)}
          />
        </div>
        <div className="journey-grid-two grid grid-cols-2 gap-2">
          <div className={fieldClass}>
            <Label htmlFor="trip-start-date">Ngày đi</Label>
            <Input
              id="trip-start-date"
              type="date"
              className="min-h-11 min-w-0 px-2"
              required
              value={draft.startDate}
              onChange={(event) => changeDraft("startDate", event.target.value)}
            />
          </div>
          <div className={fieldClass}>
            <Label htmlFor="trip-end-date">Ngày về</Label>
            <Input
              id="trip-end-date"
              type="date"
              className="min-h-11 min-w-0 px-2"
              required
              value={draft.endDate}
              onChange={(event) => changeDraft("endDate", event.target.value)}
            />
          </div>
        </div>
        <div className={fieldClass}>
          <Label htmlFor="trip-mood">Cảm xúc</Label>
          <select
            id="trip-mood"
            value={draft.mood}
            className={selectClass}
            onChange={(event) => changeDraft("mood", event.target.value as Trip["mood"])}
          >
            {Object.entries(moodLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className={fieldClass}>
          <Label htmlFor="trip-note">Ghi chú</Label>
          <Textarea
            id="trip-note"
            className="min-h-24"
            placeholder="Điều gì đáng nhớ nhất?"
            maxLength={10000}
            value={draft.note}
            onChange={(event) => changeDraft("note", event.target.value)}
          />
        </div>
      </section>

      <section
        className="journey-panel grid gap-3 rounded-2xl border bg-card p-4"
        aria-labelledby="trip-photos-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="trip-photos-heading" className="font-bold">
            Ảnh kỷ niệm
          </h2>
          {canUpload && cloudinaryConfigured && draft.photos.length < MAX_PHOTOS && (
            <Button
              variant="outline"
              type="button"
              className="min-h-11"
              disabled={uploading}
              onClick={() => photoInput.current?.click()}
            >
              {uploading ? (
                <>
                  <LoaderCircle className="motion-safe:animate-spin" /> Đang tải
                </>
              ) : (
                <>
                  <Camera /> Thêm ảnh
                </>
              )}
            </Button>
          )}
        </div>
        <input
          ref={photoInput}
          type="file"
          hidden
          multiple
          accept={PHOTO_ACCEPT}
          aria-label="Chọn ảnh kỷ niệm"
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []);
            event.currentTarget.value = "";
            void addPhotos(files);
          }}
        />
        {uploading && (
          <p role="status" className="text-sm text-muted-foreground">
            Đang tải ảnh lên Cloudinary…
          </p>
        )}
        {uploadError && (
          <p role="alert" className="text-sm text-destructive">
            {uploadError}
          </p>
        )}
        {!cloudinaryConfigured ? (
          <p className="text-sm text-muted-foreground">Chưa cấu hình dịch vụ tải ảnh.</p>
        ) : (
          !canUpload && (
            <p className="text-sm text-muted-foreground">
              Đăng nhập tài khoản trong Cài đặt để tải ảnh.
            </p>
          )
        )}
        {draft.photos.length >= MAX_PHOTOS && (
          <p className="text-sm text-muted-foreground">Đã đạt giới hạn {MAX_PHOTOS} ảnh.</p>
        )}
        {draft.photos.length > 0 && (
          <ul className="journey-photo-grid grid grid-cols-2 gap-2.5">
            {draft.photos.map((photo, index) => (
              <li key={photo.id} className="journey-photo grid min-w-0 gap-2">
                <div className="relative overflow-hidden rounded-xl bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    loading="lazy"
                    src={photo.url}
                    alt={photo.caption || `Ảnh ${index + 1}`}
                    className="aspect-square w-full object-cover"
                  />
                  <Button
                    variant="secondary"
                    type="button"
                    size="icon"
                    className="absolute top-1 right-1 size-11"
                    aria-label={`Bỏ ảnh ${index + 1}`}
                    onClick={() => setPendingRemoval({ kind: "photo", id: photo.id })}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <Label htmlFor={`caption-${photo.id}`} className="sr-only">
                  Chú thích ảnh {index + 1}
                </Label>
                <Input
                  id={`caption-${photo.id}`}
                  placeholder="Chú thích ảnh"
                  value={photo.caption}
                  maxLength={300}
                  className="min-h-11 min-w-0 px-2"
                  onChange={(event) => changeCaption(photo, event.target.value)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className="journey-panel grid gap-3 rounded-2xl border bg-card p-4"
        aria-labelledby="trip-expenses-heading"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="trip-expenses-heading" className="font-bold">
            Chi phí
          </h2>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={expenses.length >= MAX_EXPENSES}
            onClick={addExpense}
          >
            <Plus /> Thêm khoản chi
          </Button>
        </div>
        {expenses.length === 0 && (
          <p className="text-sm text-muted-foreground">Chưa có khoản chi nào.</p>
        )}
        {expenses.map((expense, index) => (
          <fieldset
            className="journey-expense grid min-w-0 gap-2 rounded-xl border p-2.5"
            key={expense.id}
          >
            <legend className="px-1 text-sm font-semibold">Khoản chi {index + 1}</legend>
            <div className="flex items-end gap-2">
              <div className={`${fieldClass} flex-1`}>
                <Label htmlFor={`expense-label-${expense.id}`}>Tên khoản chi</Label>
                <Input
                  id={`expense-label-${expense.id}`}
                  className="min-h-11"
                  value={expense.label}
                  required
                  maxLength={120}
                  onChange={(event) => changeExpense(expense.id, { label: event.target.value })}
                />
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-11 shrink-0 text-destructive"
                aria-label={`Bỏ khoản chi ${index + 1}`}
                onClick={() => setPendingRemoval({ kind: "expense", id: expense.id })}
              >
                <Trash2 />
              </Button>
            </div>
            <div className={fieldClass}>
              <Label htmlFor={`expense-amount-${expense.id}`}>Số tiền (VND)</Label>
              <Input
                id={`expense-amount-${expense.id}`}
                className="min-h-11"
                inputMode="numeric"
                pattern="[0-9]+"
                required
                value={expense.amount}
                onChange={(event) => changeExpense(expense.id, { amount: event.target.value })}
              />
            </div>
            <div className="journey-grid-two grid grid-cols-2 gap-2">
              <div className={fieldClass}>
                <Label htmlFor={`expense-category-${expense.id}`}>Hạng mục</Label>
                <select
                  id={`expense-category-${expense.id}`}
                  className={selectClass}
                  value={expense.category}
                  onChange={(event) =>
                    changeExpense(expense.id, {
                      category: event.target.value as Expense["category"],
                    })
                  }
                >
                  {Object.entries(categoryLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={fieldClass}>
                <Label htmlFor={`expense-payer-${expense.id}`}>Người trả</Label>
                <select
                  id={`expense-payer-${expense.id}`}
                  className={selectClass}
                  value={expense.paidBy}
                  onChange={(event) =>
                    changeExpense(expense.id, { paidBy: event.target.value as Expense["paidBy"] })
                  }
                >
                  {Object.entries(paidByLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>
        ))}
      </section>
      {error && (
        <p
          ref={formError}
          tabIndex={-1}
          role="alert"
          className="rounded-xl border border-destructive/25 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      <div className="journey-actions flex justify-end gap-2">
        <Button type="button" variant="outline" className="min-h-11" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit" className="min-h-11" disabled={uploading}>
          <Save /> Lưu chuyến đi
        </Button>
      </div>
      <AlertDialog
        open={pendingRemoval !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRemoval(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingRemoval?.kind === "photo" ? "Bỏ ảnh khỏi chuyến đi?" : "Bỏ khoản chi?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Thay đổi sẽ được áp dụng khi bạn lưu chuyến đi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Giữ lại</AlertDialogCancel>
            <AlertDialogAction className="min-h-11" variant="destructive" onClick={confirmRemoval}>
              Bỏ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  );
}
