"use client";

import { useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Mountain,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Dialog } from "radix-ui";
import { Button } from "@/components/ui/button";
import {
  categoryLabels,
  formatMoney,
  moodLabels,
  paidByLabels,
  tripTotal,
  type Trip,
} from "@/modules/trips/core/domain";
import { formatTripDates } from "./trip-card";

type TripDetailProps = { trip: Trip; onEdit: () => void; onDelete: () => void };

export function TripDetail({ trip, onEdit, onDelete }: TripDetailProps) {
  const [activePhoto, setActivePhoto] = useState<number | null>(null);
  const focusReturn = useRef<HTMLButtonElement | null>(null);
  const photo = activePhoto === null ? undefined : trip.photos[activePhoto];
  const cover = trip.photos[0];

  function changePhoto(direction: number) {
    setActivePhoto((current) =>
      current === null ? null : (current + direction + trip.photos.length) % trip.photos.length,
    );
  }

  return (
    <div className="journey-view grid gap-4">
      <section
        className="journey-panel overflow-hidden rounded-3xl border bg-card"
        aria-labelledby="trip-detail-title"
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.url}
            alt={cover.caption}
            className="journey-detail-cover aspect-[2/1] w-full object-cover"
          />
        ) : (
          <div className="journey-detail-cover grid h-24 place-items-center bg-primary/10 text-primary">
            <Mountain aria-hidden="true" className="size-10" />
          </div>
        )}
        <div className="grid gap-2.5 p-4">
          <span className="w-fit rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            {moodLabels[trip.mood]}
          </span>
          <h1
            tabIndex={-1}
            className="text-2xl leading-tight font-bold break-words"
            id="trip-detail-title"
          >
            {trip.title}
          </h1>
          <div className="flex flex-wrap gap-x-3 gap-y-2 text-sm text-muted-foreground">
            {trip.location && (
              <span className="flex min-w-0 items-center gap-1.5">
                <MapPin aria-hidden="true" className="size-4 shrink-0" />
                <span className="min-w-0 break-words">{trip.location}</span>
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <CalendarDays aria-hidden="true" className="size-4 shrink-0" />
              {formatTripDates(trip)}
            </span>
          </div>
          <div className="journey-actions mt-1 flex flex-wrap gap-2">
            <Button type="button" variant="outline" className="min-h-11" onClick={onEdit}>
              <Pencil /> Chỉnh sửa
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 text-destructive"
              onClick={onDelete}
            >
              <Trash2 /> Xóa chuyến đi
            </Button>
          </div>
        </div>
      </section>

      {trip.note && (
        <section
          className="journey-panel rounded-2xl border bg-card p-4"
          aria-labelledby="trip-detail-note"
        >
          <h2 id="trip-detail-note" className="font-bold">
            Ghi chú
          </h2>
          <p className="mt-2 text-sm leading-relaxed break-words whitespace-pre-wrap">
            {trip.note}
          </p>
        </section>
      )}

      {trip.photos.length > 0 && (
        <section aria-labelledby="trip-detail-photos" className="grid gap-2.5">
          <h2 id="trip-detail-photos" className="font-bold">
            Ảnh kỷ niệm{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({trip.photos.length})
            </span>
          </h2>
          <ul className="journey-photo-grid grid grid-cols-3 gap-2">
            {trip.photos.map((entry, index) => (
              <li key={entry.id} className="min-w-0">
                <button
                  type="button"
                  className="journey-photo block w-full overflow-hidden rounded-xl bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  aria-label={
                    entry.caption
                      ? `Xem ảnh ${index + 1}, ${entry.caption}`
                      : `Xem ảnh ${index + 1}`
                  }
                  onClick={(event) => {
                    focusReturn.current = event.currentTarget;
                    setActivePhoto(index);
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    loading="lazy"
                    src={entry.url}
                    alt=""
                    className="aspect-square w-full object-cover"
                  />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section
        aria-labelledby="trip-detail-expenses"
        className="journey-panel grid gap-3 rounded-2xl border bg-card p-4"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 id="trip-detail-expenses" className="font-bold">
            Chi phí
          </h2>
          <p className="font-bold text-primary tabular-nums">{formatMoney(tripTotal(trip))}</p>
        </div>
        {trip.expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có khoản chi nào.</p>
        ) : (
          <>
            <ul className="divide-y border-y">
              {trip.expenses.map((expense) => (
                <li
                  key={expense.id}
                  className="journey-expense flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-semibold break-words">{expense.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {categoryLabels[expense.category]} · {paidByLabels[expense.paidBy]}
                    </p>
                  </div>
                  <p className="font-semibold tabular-nums">{formatMoney(expense.amount)}</p>
                </li>
              ))}
            </ul>
            <h3 className="text-sm font-bold">Theo hạng mục</h3>
            <dl className="grid gap-2 text-sm">
              {Object.entries(categoryLabels).map(([key, label]) => {
                const expenses = trip.expenses.filter((expense) => expense.category === key);
                return (
                  expenses.length > 0 && (
                    <div key={key} className="flex justify-between gap-3">
                      <dt>{label}</dt>
                      <dd className="text-right tabular-nums">
                        {formatMoney(expenses.reduce((sum, expense) => sum + expense.amount, 0))}
                      </dd>
                    </div>
                  )
                );
              })}
            </dl>
          </>
        )}
      </section>

      <Dialog.Root
        open={photo !== undefined}
        onOpenChange={(open) => {
          if (!open) setActivePhoto(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70" />
          <Dialog.Content
            aria-describedby={undefined}
            className="journey-lightbox fixed inset-x-3 top-1/2 z-50 mx-auto grid max-h-[calc(100dvh-2rem)] max-w-xl -translate-y-1/2 gap-3 overflow-y-auto rounded-2xl bg-card p-3 outline-none"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              focusReturn.current?.focus();
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                event.preventDefault();
                changePhoto(event.key === "ArrowLeft" ? -1 : 1);
              }
            }}
          >
            {photo && activePhoto !== null && (
              <>
                <div className="flex items-center justify-between gap-2">
                  <Dialog.Title className="font-bold">
                    Ảnh {activePhoto + 1} / {trip.photos.length}
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-11"
                      aria-label="Đóng ảnh"
                    >
                      <X />
                    </Button>
                  </Dialog.Close>
                </div>
                <figure>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="max-h-[60dvh] w-full rounded-xl bg-muted object-contain"
                    src={photo.url}
                    alt={photo.caption || `Ảnh ${activePhoto + 1} của chuyến đi`}
                  />
                  {photo.caption && (
                    <figcaption className="mt-2 text-sm break-words">{photo.caption}</figcaption>
                  )}
                </figure>
                {trip.photos.length > 1 && (
                  <div className="flex justify-between gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => changePhoto(-1)}
                    >
                      <ChevronLeft /> Ảnh trước
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="min-h-11"
                      onClick={() => changePhoto(1)}
                    >
                      Ảnh sau <ChevronRight />
                    </Button>
                  </div>
                )}
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
