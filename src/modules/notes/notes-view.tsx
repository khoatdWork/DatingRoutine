"use client";
import { useState } from "react";
import { Check, Circle, Lightbulb, ListTodo, Plus, Search, StickyNote, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Note, NoteKind } from "./core/domain";
import { appConfig } from "@/config/app";
export function NoteRow({
  note,
  open,
  toggle,
}: {
  note: Note;
  open: () => void;
  toggle: () => void;
}) {
  return (
    <li className="note-row">
      <Button
        variant="ghost"
        size="icon"
        className={`note-toggle ${note.completed ? "is-complete" : ""}`}
        aria-label={`${note.completed ? "Đánh dấu chưa xong" : "Đánh dấu hoàn tất"}: ${note.title}`}
        onClick={toggle}
      >
        {note.completed ? <Check /> : note.kind === "idea" ? <Lightbulb /> : <Circle />}
      </Button>
      <button className="note-copy" onClick={open}>
        <strong className={note.completed ? "completed-title" : ""}>{note.title}</strong>
        <small>
          {note.kind === "idea" ? "Ý tưởng" : "Công việc"}
          {note.body ? ` · ${note.body.split("\n")[0]}` : ""}
        </small>
      </button>
      <span className="note-date">
        {new Intl.DateTimeFormat(appConfig.locale, {
          day: "2-digit",
          month: "2-digit",
          timeZone: appConfig.timeZone,
        }).format(new Date(note.updatedAt))}
      </span>
    </li>
  );
}
export function NotesView({
  notes,
  create,
  edit,
  toggle,
}: {
  notes: Note[];
  create: () => void;
  edit: (note: Note) => void;
  toggle: (note: Note) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const filtered = notes.filter(
    (note) =>
      (filter === "all" || (filter === "completed" ? note.completed : !note.completed)) &&
      `${note.title} ${note.body}`.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")),
  );
  return (
    <>
      <div className="page-heading heading-action">
        <div>
          <h1 tabIndex={-1}>Ghi chú</h1>
          <p className="subtitle">Giữ lại ý tưởng. Hoàn thành từng việc.</p>
        </div>
        <Button size="icon" aria-label="Tạo ghi chú" onClick={create}>
          <Plus />
        </Button>
      </div>
      <div className="search-field">
        <Search size={18} aria-hidden="true" />
        <Input
          aria-label="Tìm ghi chú"
          placeholder="Tìm ghi chú…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="segmented filter-tabs" role="group" aria-label="Lọc ghi chú">
        {(
          [
            ["all", "Tất cả"],
            ["pending", "Chưa xong"],
            ["completed", "Đã xong"],
          ] as const
        ).map(([value, label]) => (
          <Button
            key={value}
            variant="ghost"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>
      <p className="result-count" role="status">
        {filtered.length} ghi chú
      </p>
      {filtered.length ? (
        <ul className="note-list">
          {filtered.map((note) => (
            <NoteRow
              key={note.id}
              note={note}
              open={() => edit(note)}
              toggle={() => toggle(note)}
            />
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <StickyNote size={32} />
          <h2>{query ? "Chưa tìm thấy ghi chú" : "Chưa có ghi chú ở đây"}</h2>
          <p>
            {query ? "Thử một từ khóa khác để tìm lại." : "Một ý tưởng nhỏ cũng đáng được giữ lại."}
          </p>
          {!query && (
            <Button variant="outline" onClick={create}>
              <Plus /> Tạo ghi chú
            </Button>
          )}
        </div>
      )}
    </>
  );
}
export function NoteEditor({
  note,
  save,
  cancel,
  remove,
  dirty,
}: {
  note: Note;
  save: (note: Note) => boolean;
  cancel: () => void;
  remove: () => void;
  dirty: (value: boolean) => void;
}) {
  const [draft, setDraft] = useState(note);
  const [error, setError] = useState("");
  function change(patch: Partial<Note>) {
    const next = { ...draft, ...patch };
    setDraft(next);
    dirty(
      next.title !== note.title ||
        next.body !== note.body ||
        next.kind !== note.kind ||
        next.completed !== note.completed,
    );
  }
  return (
    <>
      <div className="page-heading">
        <h1 tabIndex={-1}>{note.title ? "Sửa ghi chú" : "Tạo ghi chú"}</h1>
        <p className="subtitle">Lưu một điều bạn muốn quay lại.</p>
      </div>
      <form
        className="panel form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.title.trim()) {
            setError("Nhập tiêu đề để lưu ghi chú.");
            return;
          }
          if (save({ ...draft, title: draft.title.trim(), updatedAt: new Date().toISOString() }))
            dirty(false);
        }}
      >
        <div>
          <Label htmlFor="note-title">Tiêu đề</Label>
          <Input
            id="note-title"
            autoFocus
            required
            maxLength={120}
            placeholder="Điều bạn đang nghĩ đến…"
            value={draft.title}
            onChange={(e) => change({ title: e.target.value })}
          />
        </div>
        <fieldset>
          <legend>Loại ghi chú</legend>
          <div className="segmented">
            {(
              [
                ["idea", "Ý tưởng", Lightbulb],
                ["task", "Công việc", ListTodo],
              ] as const
            ).map(([value, label, Icon]) => (
              <Button
                type="button"
                variant="ghost"
                key={value}
                aria-pressed={draft.kind === value}
                onClick={() => change({ kind: value as NoteKind })}
              >
                <Icon />
                {label}
              </Button>
            ))}
          </div>
        </fieldset>
        <div>
          <Label htmlFor="note-body">
            Nội dung <span className="muted">(tùy chọn)</span>
          </Label>
          <Textarea
            id="note-body"
            rows={6}
            maxLength={5000}
            placeholder="Thêm một vài chi tiết…"
            value={draft.body}
            onChange={(e) => change({ body: e.target.value })}
          />
          <p className="help">{draft.body.length}/5.000 ký tự</p>
        </div>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="two-buttons">
          <Button type="button" variant="outline" onClick={cancel}>
            Hủy
          </Button>
          <Button type="submit">Lưu ghi chú</Button>
        </div>
        {note.title && (
          <Button type="button" variant="destructive" onClick={remove}>
            <Trash2 /> Xóa ghi chú
          </Button>
        )}
      </form>
    </>
  );
}
