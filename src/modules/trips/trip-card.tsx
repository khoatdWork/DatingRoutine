import { Camera, ChevronRight, MapPin, Mountain, CalendarDays } from "lucide-react";
import { appConfig } from "@/config/app";
import type { Trip } from "@/modules/trips/core/domain";
const dateFormatter = new Intl.DateTimeFormat(appConfig.locale, {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: appConfig.timeZone,
});

export function formatTripDates(trip: Trip) {
  const start = new Date(`${trip.startDate}T12:00:00Z`);
  const end = new Date(`${trip.endDate}T12:00:00Z`);
  return trip.startDate === trip.endDate
    ? dateFormatter.format(start)
    : dateFormatter.formatRange(start, end);
}

export function TripCard({ trip, onOpen }: { trip: Trip; onOpen: () => void }) {
  const cover = trip.photos[0];

  return (
    <button
      type="button"
      onClick={onOpen}
      className="trip-card flex w-full items-center gap-3 rounded-2xl border bg-card p-2.5 text-left transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
    >
      <div className="trip-card-cover grid size-18 shrink-0 place-items-center overflow-hidden rounded-xl bg-primary/10 text-primary">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img loading="lazy" src={cover.url} alt="" className="size-full object-cover" />
        ) : (
          <Mountain aria-hidden="true" className="size-7" />
        )}
      </div>
      <div className="trip-card-content min-w-0 flex-1">
        <h3 className="truncate text-sm font-bold">{trip.title}</h3>
        <div className="trip-card-meta mt-1 grid gap-1 text-xs text-muted-foreground">
          {trip.location && (
            <span className="flex min-w-0 items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{trip.location}</span>
            </span>
          )}
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {formatTripDates(trip)}
            </span>
            {trip.photos.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Camera className="size-3.5" />
                {trip.photos.length} ảnh
              </span>
            )}
          </span>
        </div>
      </div>
      <ChevronRight aria-hidden="true" className="mr-1 size-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
