"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookHeart, Camera, Heart, MapPinned, Settings2, Wallet } from "lucide-react";
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
import { supabaseUrl } from "@/lib/supabase/config";
import { useAuth, type AuthState } from "@/modules/auth/use-auth";
import { usePwa } from "@/modules/pwa/use-pwa";
import {
  emptySnapshot,
  MAX_BACKUP_BYTES,
  parseBackup,
  type Trip,
  type Snapshot,
} from "@/modules/trips/core/domain";
import { useTripsWorkspace } from "@/modules/trips/data/use-workspace";
import { storageKey, type WorkspaceOwner } from "@/modules/trips/data/repository";
import { TripEditor } from "@/modules/trips/trip-editor";
import { TripDetail } from "@/modules/trips/trip-detail";
import { JourneyHome, JourneysView, ExpensesView } from "@/modules/trips/trip-views";
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

type Tab = "home" | "trips" | "expenses" | "settings";
type Confirmation = {
  title: string;
  description: string;
  label: string;
  action: () => void;
  danger?: boolean;
};
const navigation = [
  { key: "home", label: "Nhật ký", icon: BookHeart },
  { key: "trips", label: "Chuyến đi", icon: MapPinned },
  { key: "expenses", label: "Chi phí", icon: Wallet },
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
function workspaceOwner(uid?: string): WorkspaceOwner {
  if (!uid || !supabaseUrl) return "guest";
  const url = new URL(supabaseUrl);
  return { provider: "supabase", project: `${url.origin}${url.pathname.replace(/\/+$/, "")}`, uid };
}
export function StarterApp() {
  const auth = useAuth();
  const uid = auth.user?.uid;
  const owner = useMemo(() => workspaceOwner(uid), [uid]);
  const [draftOwner, setDraftOwner] = useState<{
    owner: WorkspaceOwner;
    key: string;
    dirty: boolean;
  } | null>(null);
  const desiredKey = storageKey(owner);
  const activeOwner = draftOwner?.dirty && draftOwner.key !== desiredKey ? draftOwner.owner : owner;
  const activeKey = storageKey(activeOwner);
  const trackDirty = useCallback(
    (dirty: boolean) => {
      setDraftOwner({ owner: activeOwner, key: activeKey, dirty });
    },
    [activeOwner, activeKey],
  );
  if (!auth.ready)
    return (
      <div className="app-frame loading-screen" role="status">
        <Heart size={32} />
        <p>Đang mở cuốn nhật ký…</p>
      </div>
    );
  return (
    <JourneyWorkspace
      key={activeKey}
      owner={activeOwner}
      auth={auth}
      sessionChanged={activeKey !== desiredKey}
      onDraftChange={trackDirty}
    />
  );
}
function JourneyWorkspace({
  owner,
  auth,
  sessionChanged,
  onDraftChange,
}: {
  owner: WorkspaceOwner;
  auth: AuthState;
  sessionChanged: boolean;
  onDraftChange: (dirty: boolean) => void;
}) {
  const workspace = useTripsWorkspace(owner);
  const pwa = usePwa();
  const [tab, setTab] = useState<Tab>("home");
  const [section, setSection] = useState<SettingsSection | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ trip: Trip; version: number; isNew: boolean } | null>(
    null,
  );
  const [dirty, setDirtyState] = useState(false);
  const setDirty = useCallback(
    (value: boolean) => {
      setDirtyState(value);
      onDraftChange(value);
    },
    [onDraftChange],
  );
  const [confirm, setConfirm] = useState<Confirmation | null>(null);
  const main = useRef<HTMLElement>(null);
  const snapshot = workspace.state?.snapshot;
  const selected = snapshot?.trips.find((trip) => trip.id === selectedId);
  useEffect(() => {
    main.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [tab, section, editor?.trip.id, selectedId]);
  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);
  function guard(action: () => void) {
    if (workspace.busy) return;
    if (dirty)
      setConfirm({
        title: "Bỏ thay đổi chưa lưu?",
        description:
          "Nội dung đang sửa chưa được lưu vào nhật ký. Ảnh đã tải vẫn được giữ trên Cloudinary.",
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
      setSelectedId(null);
    });
  }
  function open(trip: Trip) {
    guard(() => {
      setTab("trips");
      setSelectedId(trip.id);
      setEditor(null);
    });
  }
  function edit(trip?: Trip) {
    guard(() => {
      const now = new Date().toISOString();
      const today = new Date().toLocaleDateString("sv-SE", { timeZone: appConfig.timeZone });
      setTab("trips");
      setEditor({
        isNew: !trip,
        version: workspace.state!.localVersion,
        trip: trip ?? {
          id: crypto.randomUUID(),
          title: "",
          location: "",
          startDate: today,
          endDate: today,
          note: "",
          mood: "love",
          photos: [],
          expenses: [],
          createdAt: now,
          updatedAt: now,
        },
      });
    });
  }
  function saveSnapshot(
    next: Snapshot,
    expected = workspace.state?.localVersion,
    message = "Đã lưu trên thiết bị.",
  ) {
    if (expected === undefined || !workspace.save(next, expected)) return false;
    toast.success(message);
    return true;
  }
  function exportData() {
    if (!snapshot) return;
    download(
      JSON.stringify(snapshot),
      `di-cung-nhau-${new Date().toISOString().slice(0, 10)}.json`,
    );
    toast.success("Đã xuất bản sao lưu.");
  }
  async function importData(file: File) {
    const expected = workspace.state?.localVersion;
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error("Tệp sao lưu phải nhỏ hơn 2 MB.");
      const imported = parseBackup(await file.text());
      setConfirm({
        title: "Thay nhật ký bằng bản sao lưu?",
        description: `Bản sao lưu có ${imported.trips.length} chuyến đi. Hồ sơ, chuyến đi và chi phí hiện tại sẽ được thay thế. Hãy xuất bản hiện tại nếu cần giữ lại.`,
        label: "Nhập bản sao lưu",
        action: () => {
          saveSnapshot(imported, expected, "Đã nhập bản sao lưu trên thiết bị.");
        },
      });
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Không đọc được bản sao lưu.");
    }
  }
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
            <Heart size={20} />
          </span>
          <span>
            {appConfig.name}
            <small>Cuốn nhật ký của hai đứa</small>
          </span>
        </a>
        <Button
          variant="ghost"
          size="icon"
          className="header-add"
          aria-label="Thêm chuyến đi"
          disabled={!snapshot || workspace.busy}
          onClick={() => edit()}
        >
          <Camera size={20} />
        </Button>
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
        {sessionChanged && (
          <div className="notice" role="status">
            Phiên tài khoản đã thay đổi. Lưu hoặc bỏ nháp này để mở không gian mới. Nháp vẫn thuộc
            không gian đang sửa.
          </div>
        )}
        {workspace.error && (
          <div className="error-notice" role="alert">
            <p>{workspace.error}</p>
            {!workspace.state && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    const raw = localStorage.getItem(storageKey(owner));
                    if (raw) download(raw, "nhat-ky-original.json");
                  }}
                >
                  Xuất dữ liệu gốc
                </Button>
                <Button variant="outline" onClick={() => guard(() => window.location.reload())}>
                  Thử mở lại
                </Button>
              </>
            )}
          </div>
        )}
        {!snapshot ? (
          !workspace.error && (
            <p className="loading-screen" role="status">
              Đang đọc nhật ký trên thiết bị…
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
              Quay lại
            </Button>
            <TripEditor
              key={editor.trip.id}
              trip={editor.trip}
              isNew={editor.isNew}
              canUpload={
                owner !== "guest" &&
                auth.user?.uid === owner.uid &&
                auth.configured &&
                !sessionChanged
              }
              onDirty={setDirty}
              onCancel={() => guard(() => setEditor(null))}
              onSave={(trip) => {
                const exists = snapshot.trips.some((entry) => entry.id === trip.id);
                if (
                  !saveSnapshot(
                    {
                      ...snapshot,
                      trips: exists
                        ? snapshot.trips.map((entry) => (entry.id === trip.id ? trip : entry))
                        : [trip, ...snapshot.trips],
                    },
                    editor.version,
                    "Đã lưu chuyến đi trên thiết bị.",
                  )
                )
                  return false;
                setDirty(false);
                setEditor(null);
                setSelectedId(trip.id);
                return true;
              }}
            />
          </>
        ) : selected ? (
          <>
            <Button variant="ghost" className="back-button" onClick={() => setSelectedId(null)}>
              <ArrowLeft />
              Tất cả chuyến đi
            </Button>
            <TripDetail
              trip={selected}
              onEdit={() => edit(selected)}
              onDelete={() => {
                const expected = workspace.state!.localVersion;
                setConfirm({
                  title: "Xóa chuyến đi này?",
                  description: `“${selected.title}” cùng ghi chú và chi phí sẽ bị xóa khỏi nhật ký. Ảnh gốc vẫn được giữ trên Cloudinary.`,
                  label: "Xóa chuyến đi",
                  danger: true,
                  action: () => {
                    if (
                      saveSnapshot(
                        {
                          ...snapshot,
                          trips: snapshot.trips.filter((trip) => trip.id !== selected.id),
                        },
                        expected,
                        "Đã xóa chuyến đi trên thiết bị.",
                      )
                    )
                      setSelectedId(null);
                  },
                });
              }}
            />
          </>
        ) : (
          <>
            {tab === "home" && (
              <JourneyHome
                trips={snapshot.trips}
                displayName={snapshot.profile.displayName}
                onCreate={() => edit()}
                onOpen={(id) => {
                  const trip = snapshot.trips.find((entry) => entry.id === id);
                  if (trip) open(trip);
                }}
                onShowAll={() => move("trips")}
              />
            )}
            {tab === "trips" && (
              <JourneysView
                trips={snapshot.trips}
                onCreate={() => edit()}
                onOpen={(id) => {
                  const trip = snapshot.trips.find((entry) => entry.id === id);
                  if (trip) open(trip);
                }}
              />
            )}
            {tab === "expenses" && (
              <ExpensesView
                trips={snapshot.trips}
                onOpen={(id) => {
                  const trip = snapshot.trips.find((entry) => entry.id === id);
                  if (trip) open(trip);
                }}
              />
            )}
            {tab === "settings" &&
              (!section ? (
                <SettingsMenu
                  open={(value) => move("settings", value)}
                  name={snapshot.profile.displayName}
                  account={auth.user?.email ?? null}
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
                    <>
                      <AccountPanel
                        auth={auth}
                        workspace={workspace}
                        online={pwa.online}
                        confirmPull={() => {
                          const expected = workspace.state?.localVersion;
                          setConfirm({
                            title: "Tải bản đám mây về thiết bị?",
                            description:
                              "Bản Supabase sẽ thay thế nhật ký trên thiết bị, kể cả thay đổi chưa đồng bộ. Xuất bản sao lưu trước nếu cần giữ lại.",
                            label: "Tải bản đám mây",
                            action: () => {
                              void workspace.sync(true, expected);
                            },
                          });
                        }}
                      />
                      <div className="media-info">
                        <Camera size={19} />
                        <div>
                          <strong>Ảnh chuyến đi</strong>
                          <p>
                            Ảnh lưu trên Cloudinary. Đăng nhập để thêm ảnh sau khi chủ app hoàn tất
                            cấu hình.
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                  {section === "app" && (
                    <PwaPanel
                      pwa={pwa}
                      confirmUpdate={() =>
                        setConfirm({
                          title: "Cập nhật ứng dụng?",
                          description:
                            "Ứng dụng sẽ tải lại. Nhật ký đã lưu trên thiết bị vẫn được giữ.",
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
                            "Hồ sơ và toàn bộ chuyến đi trên thiết bị sẽ bị xóa. Hãy xuất bản sao lưu nếu cần giữ lại. Ảnh gốc vẫn được giữ trên Cloudinary.",
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
