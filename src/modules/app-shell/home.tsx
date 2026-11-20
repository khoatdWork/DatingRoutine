import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Lightbulb,
  ListTodo,
  Plus,
  StickyNote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { appConfig } from "@/config/app";
import { NoteRow } from "@/modules/notes/notes-view";
import type { Note, Snapshot } from "@/modules/notes/core/domain";
export function Home({
  snapshot,
  create,
  edit,
  toggle,
  showNotes,
  showComponents,
}: {
  snapshot: Snapshot;
  create: () => void;
  edit: (note: Note) => void;
  toggle: (note: Note) => void;
  showNotes: () => void;
  showComponents: () => void;
}) {
  const done = snapshot.notes.filter((n) => n.completed).length;
  const recent = [...snapshot.notes]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 3);
  return (
    <>
      <div className="page-heading">
        <p className="date-label" suppressHydrationWarning>
          {new Intl.DateTimeFormat(appConfig.locale, {
            weekday: "long",
            day: "2-digit",
            month: "long",
            timeZone: appConfig.timeZone,
          }).format(new Date())}
        </p>
        <h1 tabIndex={-1}>
          {snapshot.profile.displayName
            ? `Chào ${snapshot.profile.displayName}`
            : "Không gian của bạn"}
          <span className="heading-dot">.</span>
        </h1>
        <p className="subtitle">Dành chỗ cho những điều tiếp theo.</p>
      </div>
      <section className="welcome-panel" aria-labelledby="welcome-title">
        <div className="welcome-art" aria-hidden="true">
          <div className="paper paper-back" />
          <div className="paper paper-front">
            <Lightbulb size={28} />
            <i />
            <i />
            <i />
          </div>
          <span className="art-check">
            <Check size={16} />
          </span>
        </div>
        <h2 id="welcome-title">
          Ý tưởng hôm nay,
          <br />
          bước tiến ngày mai.
        </h2>
        <p>Ghi nhanh một ý tưởng hoặc một việc cần làm. Bắt đầu từ điều nhỏ nhất.</p>
        <Button onClick={create}>
          <Plus />
          {snapshot.notes.length ? "Tạo ghi chú mới" : "Tạo ghi chú đầu tiên"}
        </Button>
      </section>
      <section className="overview" aria-labelledby="overview-title">
        <div className="section-heading">
          <h2 id="overview-title">Tổng quan</h2>
          <span>Không gian hiện tại</span>
        </div>
        <dl className="summary-ledger">
          <div>
            <dt>
              <StickyNote size={16} />
              Ghi chú
            </dt>
            <dd>
              {snapshot.notes.length}
              <small>tổng cộng</small>
            </dd>
          </div>
          <div>
            <dt>
              <ListTodo size={16} />
              Đã hoàn tất
            </dt>
            <dd>
              {done}
              <small>/{snapshot.notes.length} ghi chú</small>
            </dd>
          </div>
        </dl>
      </section>
      <section className="recent-section" aria-labelledby="recent-title">
        <div className="section-heading">
          <h2 id="recent-title">Gần đây</h2>
          <Button variant="ghost" className="text-button" onClick={showNotes}>
            Xem tất cả
            <ChevronRight />
          </Button>
        </div>
        {recent.length ? (
          <ul className="note-list">
            {recent.map((note) => (
              <NoteRow
                key={note.id}
                note={note}
                open={() => edit(note)}
                toggle={() => toggle(note)}
              />
            ))}
          </ul>
        ) : (
          <div className="empty-inline">
            <span className="empty-icon">
              <StickyNote size={22} />
            </span>
            <div>
              <strong>Trang giấy đang chờ bạn</strong>
              <p>Ghi chú mới sẽ xuất hiện ở đây.</p>
            </div>
          </div>
        )}
      </section>
      <button className="discovery-row" onClick={showComponents}>
        <span className="discovery-icon">
          <ArrowUpRight size={19} />
        </span>
        <span>
          <strong>Một bộ khung, nhiều khả năng</strong>
          <small>Khám phá các thành phần giao diện</small>
        </span>
        <ChevronRight size={18} />
      </button>
    </>
  );
}
