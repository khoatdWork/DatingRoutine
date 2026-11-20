"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, House, Layers, LayoutGrid, Settings2, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { appConfig, appRoot } from "@/config/app";
import { useAuth, type AuthState } from "@/modules/auth/use-auth";
import { usePwa } from "@/modules/pwa/use-pwa";
import { useWorkspace } from "@/modules/notes/data/use-workspace";
import { storageKey } from "@/modules/notes/data/repository";
import {
  emptySnapshot,
  MAX_BACKUP_BYTES,
  parseBackup,
  type Note,
  type Snapshot,
} from "@/modules/notes/core/domain";
import { NoteEditor, NotesView } from "@/modules/notes/notes-view";
import {
  AboutPanel,
  AccountPanel,
  AppearancePanel,
  BackupPanel,
  ProfilePanel,
  PwaPanel,
  SettingsMenu,
  settingsTitles,
  type SettingsSection,
} from "@/modules/settings/settings";
import { Home } from "./home";
import { ComponentGallery } from "./component-gallery";
type Tab = "home" | "notes" | "components" | "settings";
type Confirm = {
  title: string;
  description: string;
  label: string;
  action: () => void;
  danger?: boolean;
};
const navigation = [
  { key: "home", label: "Trang chủ", icon: House },
  { key: "notes", label: "Ghi chú", icon: StickyNote },
  { key: "components", label: "Thành phần", icon: LayoutGrid },
  { key: "settings", label: "Cài đặt", icon: Settings2 },
] as const;
function download(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function StarterApp() {
  const auth = useAuth();
  if (!auth.ready)
    return (
      <div className="app-frame loading-screen" role="status">
        <Layers size={32} />
        <p>Đang mở không gian của bạn…</p>
      </div>
    );
  return (
    <WorkspaceApp key={auth.user?.uid || "guest"} owner={auth.user?.uid || "guest"} auth={auth} />
  );
}
function WorkspaceApp({ owner, auth }: { owner: string; auth: AuthState }) {
  const workspace = useWorkspace(owner);
  const pwa = usePwa();
  const [tab, setTab] = useState<Tab>("home");
  const [section, setSection] = useState<SettingsSection | null>(null);
  const [editor, setEditor] = useState<{ note: Note; version: number } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const main = useRef<HTMLElement>(null);
  useEffect(() => {
    const heading = main.current?.querySelector<HTMLElement>("h1");
    heading?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [tab, section, editor?.note.id]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    if (dirty) window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  function guard(action: () => void) {
    if (workspace.busy) return;
    if (dirty)
      setConfirm({
        title: "Bỏ thay đổi chưa lưu?",
        description: "Bạn đang có nội dung chưa lưu. Quay lại để lưu hoặc bỏ thay đổi để tiếp tục.",
        label: "Bỏ thay đổi",
        action: () => {
          setDirty(false);
          action();
        },
      });
    else action();
  }
  function move(next: Tab, nextSection: SettingsSection | null = null) {
    guard(() => {
      setTab(next);
      setSection(nextSection);
      setEditor(null);
    });
  }
  function open(note?: Note) {
    guard(() => {
      setTab("notes");
      setEditor({
        note: note ?? {
          id: crypto.randomUUID(),
          title: "",
          body: "",
          kind: "idea",
          completed: false,
          updatedAt: new Date().toISOString(),
        },
        version: workspace.state?.localVersion ?? 0,
      });
    });
  }
  function saveSnapshot(snapshot: Snapshot, expected?: number, success = "Đã lưu trên thiết bị.") {
    if (!workspace.commit(snapshot, expected)) return false;
    toast.success(success);
    return true;
  }
  function toggle(note: Note) {
    if (!workspace.state) return;
    saveSnapshot(
      {
        ...workspace.state.snapshot,
        notes: workspace.state.snapshot.notes.map((n) =>
          n.id === note.id
            ? { ...n, completed: !n.completed, updatedAt: new Date().toISOString() }
            : n,
        ),
      },
      undefined,
      note.completed ? "Đã đánh dấu chưa xong." : "Đã đánh dấu hoàn tất.",
    );
  }
  function exportData() {
    if (!workspace.state) return;
    download(
      JSON.stringify(workspace.state.snapshot, null, 2),
      `${appConfig.storageKey}-backup-${new Date().toISOString().slice(0, 10)}.json`,
    );
    toast.success("Đã xuất bản sao lưu.");
  }
  async function importData(file: File) {
    const expected = workspace.state?.localVersion;
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error("Tệp sao lưu phải nhỏ hơn 1 MB.");
      const snapshot = parseBackup(await file.text());
      setConfirm({
        title: "Thay dữ liệu bằng bản sao lưu?",
        description: `Bản sao lưu có ${snapshot.notes.length} ghi chú. Hồ sơ và ghi chú hiện tại trong không gian này sẽ được thay thế. Hãy xuất bản hiện tại trước nếu cần giữ lại.`,
        label: "Nhập bản sao lưu",
        action: () => {
          saveSnapshot(snapshot, expected, "Đã nhập bản sao lưu trên thiết bị.");
        },
      });
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Không đọc được tệp sao lưu.");
    }
  }
  const snapshot = workspace.state?.snapshot;
  return (
    <div className="app-frame">
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      <header className="app-header">
        <a
          className="brand"
          href={appRoot}
          onClick={(event) => {
            event.preventDefault();
            move("home");
          }}
        >
          <span className="brand-mark">
            <Layers size={22} />
          </span>
          {appConfig.name}
          <span className="brand-dot">.</span>
        </a>
        <span className="header-caption">Web & Mobile</span>
      </header>
      {pwa.waiting && (
        <div className="update-notice" role="status">
          <p>Đã có phiên bản mới.</p>
          <Button variant="ghost" onClick={() => move("settings", "app")}>
            Xem cập nhật
          </Button>
        </div>
      )}
      <main id="main" ref={main} className="main-content" tabIndex={-1} aria-busy={workspace.busy}>
        {workspace.error && (
          <div className="error-notice" role="alert">
            <p>{workspace.error}</p>
            {!workspace.state && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    const raw = localStorage.getItem(storageKey(owner));
                    if (raw) download(raw, "workspace-original.json");
                  }}
                >
                  Xuất dữ liệu gốc
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Thử mở lại
                </Button>
              </>
            )}
          </div>
        )}
        {!snapshot ? (
          !workspace.error && (
            <p role="status" className="loading-screen">
              Đang đọc dữ liệu trên thiết bị…
            </p>
          )
        ) : editor ? (
          <>
            <Button
              variant="ghost"
              className="back-button"
              onClick={() => guard(() => setEditor(null))}
            >
              <ArrowLeft />
              Quay lại Ghi chú
            </Button>
            <NoteEditor
              key={editor.note.id}
              note={editor.note}
              dirty={setDirty}
              cancel={() => guard(() => setEditor(null))}
              save={(note) => {
                const exists = snapshot.notes.some((n) => n.id === note.id);
                if (
                  !saveSnapshot(
                    {
                      ...snapshot,
                      notes: exists
                        ? snapshot.notes.map((n) => (n.id === note.id ? note : n))
                        : [note, ...snapshot.notes],
                    },
                    editor.version,
                    "Đã lưu ghi chú trên thiết bị.",
                  )
                )
                  return false;
                setDirty(false);
                setEditor(null);
                return true;
              }}
              remove={() =>
                setConfirm({
                  title: "Xóa ghi chú này?",
                  description: `“${editor.note.title}” sẽ bị xóa khỏi không gian này.`,
                  label: "Xóa ghi chú",
                  danger: true,
                  action: () => {
                    if (
                      saveSnapshot(
                        {
                          ...snapshot,
                          notes: snapshot.notes.filter((n) => n.id !== editor.note.id),
                        },
                        editor.version,
                        "Đã xóa ghi chú trên thiết bị.",
                      )
                    ) {
                      setDirty(false);
                      setEditor(null);
                    }
                  },
                })
              }
            />
          </>
        ) : (
          <>
            {tab === "home" && (
              <Home
                snapshot={snapshot}
                create={() => open()}
                edit={open}
                toggle={toggle}
                showNotes={() => move("notes")}
                showComponents={() => move("components")}
              />
            )}
            {tab === "notes" && (
              <NotesView notes={snapshot.notes} create={() => open()} edit={open} toggle={toggle} />
            )}
            {tab === "components" && (
              <ComponentGallery
                confirm={() =>
                  setConfirm({
                    title: "Thử hộp thoại xác nhận?",
                    description:
                      "Đây là thao tác minh họa. Khi xác nhận, app chỉ hiện thông báo; ghi chú của bạn được giữ nguyên.",
                    label: "Thử xác nhận",
                    action: () => toast.success("Đã xác nhận thao tác mẫu."),
                  })
                }
              />
            )}
            {tab === "settings" &&
              (!section ? (
                <SettingsMenu
                  open={(s) => move("settings", s)}
                  name={snapshot.profile.displayName}
                  account={auth.user?.email || null}
                  offlineReady={pwa.ready}
                  update={pwa.waiting}
                />
              ) : (
                <>
                  <Button variant="ghost" className="back-button" onClick={() => move("settings")}>
                    <ArrowLeft />
                    Quay lại Cài đặt
                  </Button>
                  <div className="page-heading">
                    <h1 tabIndex={-1}>{settingsTitles[section]}</h1>
                  </div>
                  {section === "profile" && (
                    <ProfilePanel
                      name={snapshot.profile.displayName}
                      version={workspace.state!.localVersion}
                      dirty={setDirty}
                      save={(name, expected) => {
                        const saved = saveSnapshot(
                          { ...snapshot, profile: { displayName: name } },
                          expected,
                        );
                        if (saved) setDirty(false);
                        return saved;
                      }}
                    />
                  )}
                  {section === "appearance" && <AppearancePanel />}
                  {section === "account" && (
                    <AccountPanel
                      auth={auth}
                      workspace={workspace}
                      online={pwa.online}
                      confirmPull={() => {
                        const expected = workspace.state?.localVersion;
                        setConfirm({
                          title: "Tải bản đám mây về thiết bị?",
                          description:
                            "Bản Firebase sẽ thay thế hồ sơ và ghi chú trên thiết bị, kể cả thay đổi chưa đồng bộ. Hãy xuất bản sao lưu hiện tại trước khi tiếp tục.",
                          label: "Tải bản đám mây",
                          action: () => {
                            void workspace.sync(true, expected);
                          },
                        });
                      }}
                    />
                  )}
                  {section === "app" && (
                    <PwaPanel
                      pwa={pwa}
                      confirmUpdate={() =>
                        setConfirm({
                          title: "Cập nhật ứng dụng?",
                          description:
                            "Ứng dụng sẽ tải lại để dùng phiên bản mới. Dữ liệu đã lưu trên thiết bị vẫn được giữ.",
                          label: "Cập nhật và tải lại",
                          action: pwa.update,
                        })
                      }
                    />
                  )}
                  {section === "backup" && (
                    <BackupPanel
                      exportData={exportData}
                      importData={(file) => void importData(file)}
                      reset={() => {
                        const expected = workspace.state?.localVersion;
                        setConfirm({
                          title: "Xóa dữ liệu không gian này?",
                          description:
                            "Hồ sơ và toàn bộ ghi chú trên thiết bị trong không gian này sẽ bị xóa. Hãy xuất bản sao lưu trước nếu cần giữ lại.",
                          label: "Xóa dữ liệu",
                          danger: true,
                          action: () => {
                            saveSnapshot(
                              emptySnapshot(),
                              expected,
                              "Đã xóa dữ liệu trên thiết bị.",
                            );
                          },
                        });
                      }}
                    />
                  )}
                  {section === "about" && <AboutPanel />}
                </>
              ))}
          </>
        )}
      </main>
      <nav className="bottom-nav" aria-label="Điều hướng chính">
        {navigation.map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant="ghost"
            disabled={workspace.busy}
            aria-current={tab === key ? "page" : undefined}
            onClick={() => move(key)}
          >
            <Icon size={21} />
            <span>{label}</span>
          </Button>
        ))}
      </nav>
      <AlertDialog
        open={!!confirm}
        onOpenChange={(value) => {
          if (!value) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Quay lại</AlertDialogCancel>
            <AlertDialogAction
              variant={confirm?.danger ? "destructive" : "default"}
              onClick={() => {
                const action = confirm?.action;
                setConfirm(null);
                action?.();
              }}
            >
              {confirm?.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
