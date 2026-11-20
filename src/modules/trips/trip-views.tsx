"use client";

import { useState } from "react";
import { BookOpen, Compass, Images, MapPin, Plus, Search, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  categoryLabels,
  formatMoney,
  paidByLabels,
  tripTotal,
  type Trip,
} from "@/modules/trips/core/domain";
import { TripCard } from "./trip-card";

type TripListProps = { trips: Trip[]; onCreate: () => void; onOpen: (id: string) => void };

function sortTrips(trips: Trip[]) {
  return [...trips].sort(
    (first, second) =>
      second.startDate.localeCompare(first.startDate) ||
      second.updatedAt.localeCompare(first.updatedAt),
  );
}

function TravelPostcard() {
  return (
    <svg
      className="journey-hero-art pointer-events-none absolute -right-3 bottom-0 h-full w-[55%]"
      viewBox="0 0 220 210"
      aria-hidden="true"
      preserveAspectRatio="xMaxYMax meet"
      fill="none"
    >
      <path
        d="M20 114C28 49 105 14 174 49c59 30 70 126 17 161H42c-17-30-27-63-22-96Z"
        fill="#C5DDFB"
        fillOpacity=".65"
      />
      <path
        d="M15 171C47 195 107 171 124 139c16-31-26-45-48-29-21 15-1 48 40 25 30-17 49-41 78-77"
        stroke="#31599B"
        strokeOpacity=".68"
        strokeWidth="2"
        strokeDasharray="5 6"
        strokeLinecap="round"
      />
      <g transform="rotate(13 137 121)">
        <rect x="91" y="74" width="98" height="106" rx="9" fill="#759AD5" fillOpacity=".35" />
        <rect x="85" y="67" width="98" height="106" rx="9" fill="#FDFEFF" />
        <rect x="94" y="76" width="80" height="73" rx="5" fill="#B4D5F2" />
        <circle cx="151" cy="95" r="10" fill="#FBE0B5" />
        <path d="M94 126l26-28 32 43H94v-15Z" fill="#568CC3" />
        <path d="m120 98-9 10 11-2 10 7-12-15Z" fill="#EDF7FF" />
        <path d="m119 144 33-28 22 16v17H94l25-5Z" fill="#294C82" />
        <path d="M119 160h31" stroke="#B8CBE4" strokeWidth="3" strokeLinecap="round" />
      </g>
      <path d="m174 42 31-11-11 31-5-14-15-6Z" fill="#244C9A" />
      <path d="m189 48 16-17" stroke="#A6C8FF" strokeWidth="1.25" />
      <path
        d="M60 56v14m-7-7h14m137 59v12m-6-6h12"
        stroke="#507BC1"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EmptyTrips({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="journey-empty flex items-center gap-3 rounded-2xl border border-dashed bg-card/70 p-3">
      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
        <Images className="size-5" />
      </div>
      <p className="flex-1 text-sm text-muted-foreground">Chưa có chuyến đi nào.</p>
      <Button variant="outline" type="button" className="min-h-11 shrink-0" onClick={onCreate}>
        Tạo chuyến đi
      </Button>
    </div>
  );
}

export function JourneyHome({
  trips,
  displayName,
  onCreate,
  onOpen,
  onShowAll,
}: TripListProps & {
  displayName: string;
  onShowAll: () => void;
}) {
  const tripCount = trips.length;
  const locationCount = new Set(
    trips.map((trip) => trip.location.trim().toLocaleLowerCase("vi")).filter(Boolean),
  ).size;
  const totalSpend = trips.reduce((total, trip) => total + BigInt(tripTotal(trip)), 0n);
  const stats = [
    { label: "Chuyến đi", value: tripCount, Icon: BookOpen },
    { label: "Điểm đến", value: locationCount, Icon: MapPin },
    { label: "Chi phí", value: formatMoney(totalSpend), Icon: Wallet },
  ];

  return (
    <div className="journey-home grid gap-5">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          {displayName.trim() ? `Chào ${displayName.trim()}!` : "Nhật ký của hai bạn"}
        </p>
        <h1 tabIndex={-1} className="mt-1 text-2xl font-bold tracking-tight">
          Đi cùng nhau
        </h1>
      </div>
      <section
        aria-labelledby="journey-hero-heading"
        className="journey-hero relative isolate overflow-hidden rounded-3xl bg-[#dceaff] p-5 text-[#152b46]"
      >
        <TravelPostcard />
        <div className="journey-hero-copy relative grid max-w-[70%] gap-3">
          <Compass aria-hidden="true" className="size-6 text-[#244c9a]" />
          <h2 id="journey-hero-heading" className="max-w-48 text-xl font-bold leading-tight">
            Mình đã đi đâu cùng nhau?
          </h2>
          <p className="max-w-46 text-xs leading-relaxed text-[#365478]">
            Gom ảnh, chuyện vui và chi phí vào từng chuyến đi.
          </p>
          <Button
            type="button"
            className="min-h-11 w-fit bg-[#2257c7] text-white hover:bg-[#1c479f]"
            onClick={onCreate}
          >
            <Plus /> Chuyến đi mới
          </Button>
        </div>
      </section>
      <dl className="journey-stats grid grid-cols-[1fr_1fr_minmax(0,1.35fr)] divide-x rounded-2xl border bg-card py-3">
        {stats.map(({ label, value, Icon }) => (
          <div className="journey-stat flex min-w-0 flex-col items-center gap-1 px-1" key={label}>
            <Icon aria-hidden="true" className="size-4 text-primary" />
            <dt className="text-center text-xs text-muted-foreground">{label}</dt>
            <dd className="order-first max-w-full text-center text-lg leading-tight font-bold tabular-nums [overflow-wrap:anywhere]">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      <section className="journey-section grid gap-2.5" aria-labelledby="recent-trip-heading">
        <div className="journey-section-heading flex items-center justify-between gap-2">
          <h2 id="recent-trip-heading" className="text-lg font-bold">
            Chuyến đi gần đây
          </h2>
          {tripCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 text-primary"
              onClick={onShowAll}
            >
              Xem tất cả
            </Button>
          )}
        </div>
        {tripCount ? (
          sortTrips(trips)
            .slice(0, 3)
            .map((trip) => <TripCard key={trip.id} trip={trip} onOpen={() => onOpen(trip.id)} />)
        ) : (
          <EmptyTrips onCreate={onCreate} />
        )}
      </section>
    </div>
  );
}

export function JourneysView({ trips, onCreate, onOpen }: TripListProps) {
  const [query, setQuery] = useState("");
  const [year, setYear] = useState("");
  const years = [...new Set(trips.map((trip) => trip.startDate.slice(0, 4)))].sort().reverse();
  const activeYear = years.includes(year) ? year : "";
  const normalizedQuery = query.trim().toLocaleLowerCase("vi");
  const visibleTrips = sortTrips(trips).filter(
    (trip) =>
      (!activeYear || trip.startDate.startsWith(activeYear)) &&
      [trip.title, trip.location, trip.note].some((value) =>
        value.toLocaleLowerCase("vi").includes(normalizedQuery),
      ),
  );

  return (
    <div className="journey-view grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 tabIndex={-1} className="text-2xl font-bold tracking-tight">
          Chuyến đi
        </h1>
        <Button type="button" className="min-h-11" onClick={onCreate}>
          <Plus /> Chuyến đi mới
        </Button>
      </div>
      {trips.length > 0 && (
        <div className="journey-filters flex flex-wrap gap-2">
          <div className="relative min-w-36 flex-1">
            <Label htmlFor="search-trips" className="sr-only">
              Tìm chuyến đi
            </Label>
            <Search
              aria-hidden="true"
              className="absolute top-3.5 left-3 size-4 text-muted-foreground"
            />
            <Input
              id="search-trips"
              value={query}
              placeholder="Tìm chuyến đi"
              onChange={(event) => setQuery(event.target.value)}
              className="min-h-11 pl-9"
            />
          </div>
          <Label htmlFor="trip-year" className="sr-only">
            Lọc theo năm
          </Label>
          <select
            id="trip-year"
            value={activeYear}
            onChange={(event) => setYear(event.target.value)}
            className="min-h-11 rounded-lg border bg-card px-2 text-base focus-visible:outline-2 focus-visible:outline-ring"
          >
            <option value="">Mọi năm</option>
            {years.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="journey-list grid gap-2.5">
        {trips.length === 0 ? (
          <EmptyTrips onCreate={onCreate} />
        ) : (
          visibleTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} onOpen={() => onOpen(trip.id)} />
          ))
        )}
        {trips.length > 0 && visibleTrips.length === 0 && (
          <p
            role="status"
            className="rounded-xl border border-dashed py-6 text-center text-sm text-muted-foreground"
          >
            Không tìm thấy chuyến đi phù hợp.
          </p>
        )}
      </div>
    </div>
  );
}

export function ExpensesView({ trips, onOpen }: Pick<TripListProps, "trips" | "onOpen">) {
  const entries = sortTrips(trips).flatMap((trip) =>
    trip.expenses.map((expense) => ({ trip, expense })),
  );
  const total = entries.reduce((sum, { expense }) => sum + BigInt(expense.amount), 0n);

  return (
    <div className="journey-view grid gap-4">
      <h1 tabIndex={-1} className="text-2xl font-bold tracking-tight">
        Chi phí
      </h1>
      <section
        className="journey-summary rounded-2xl border bg-card p-4"
        aria-labelledby="total-expense-heading"
      >
        <h2
          id="total-expense-heading"
          className="flex items-center gap-2 text-sm text-muted-foreground"
        >
          <Wallet className="size-4 text-primary" /> Tổng chi phí chuyến đi
        </h2>
        <p className="mt-2 break-words text-2xl font-bold tabular-nums">{formatMoney(total)}</p>
      </section>
      {entries.length === 0 ? (
        <p className="journey-empty rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
          Thêm khoản chi khi tạo hoặc chỉnh sửa chuyến đi.
        </p>
      ) : (
        <>
          <section
            className="journey-panel rounded-2xl border bg-card p-4"
            aria-labelledby="expense-breakdown-heading"
          >
            <h2 id="expense-breakdown-heading" className="font-bold">
              Theo hạng mục
            </h2>
            <dl className="mt-2 divide-y text-sm">
              {Object.entries(categoryLabels).map(([key, label]) => {
                const matching = entries.filter(({ expense }) => expense.category === key);
                const amount = matching.reduce(
                  (sum, { expense }) => sum + BigInt(expense.amount),
                  0n,
                );
                return (
                  matching.length > 0 && (
                    <div key={key} className="flex justify-between gap-3 py-2">
                      <dt>{label}</dt>
                      <dd className="text-right font-semibold tabular-nums">
                        {formatMoney(amount)}
                      </dd>
                    </div>
                  )
                );
              })}
            </dl>
          </section>
          <section
            className="journey-panel rounded-2xl border bg-card p-4"
            aria-labelledby="expense-payer-heading"
          >
            <h2 id="expense-payer-heading" className="font-bold">
              Theo người trả
            </h2>
            <dl className="mt-2 divide-y text-sm">
              {Object.entries(paidByLabels).map(([key, label]) => {
                const amount = entries
                  .filter(({ expense }) => expense.paidBy === key)
                  .reduce((sum, { expense }) => sum + BigInt(expense.amount), 0n);
                return (
                  <div key={key} className="flex justify-between gap-3 py-2">
                    <dt>{label}</dt>
                    <dd className="font-semibold tabular-nums">{formatMoney(amount)}</dd>
                  </div>
                );
              })}
            </dl>
          </section>
          <section aria-labelledby="expense-trips-heading" className="grid gap-2.5">
            <h2 id="expense-trips-heading" className="font-bold">
              Theo chuyến đi
            </h2>
            {sortTrips(trips)
              .filter((trip) => trip.expenses.length > 0)
              .map((trip) => (
                <button
                  type="button"
                  key={trip.id}
                  onClick={() => onOpen(trip.id)}
                  className="journey-expense flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                >
                  <span className="min-w-0 break-words">{trip.title}</span>
                  <span className="text-right font-semibold tabular-nums">
                    {formatMoney(tripTotal(trip))}
                  </span>
                </button>
              ))}
          </section>
        </>
      )}
    </div>
  );
}
