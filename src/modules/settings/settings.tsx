"use client";
import { useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import {
  ChevronRight,
  Cloud,
  DatabaseBackup,
  Download,
  Info,
  Laptop,
  Layers,
  Moon,
  Palette,
  Smartphone,
  Sun,
  UserRound,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appConfig } from "@/config/app";
import type { AuthState } from "@/modules/auth/use-auth";
import type { Workspace } from "@/modules/notes/data/use-workspace";
import type { usePwa } from "@/modules/pwa/use-pwa";
export const settingsTitles = {
  profile: "Hồ sơ",
  account: "Tài khoản & đồng bộ",
  appearance: "Giao diện",
  app: "Cài ứng dụng",
  backup: "Bản sao lưu",
  about: "Về ứng dụng",
};
export type SettingsSection = keyof typeof settingsTitles;
export function SettingsMenu({
  open,
  name,
  account,
  offlineReady,
  update,
}: {
  open: (section: SettingsSection) => void;
  name: string;
  account: string | null;
  offlineReady: boolean;
  update: boolean;
}) {
  const groups = [
    {
      title: "Cá nhân",
      rows: [
        { key: "profile", icon: UserRound, color: "blue", summary: name || "Thêm tên của bạn" },
        {
          key: "account",
          icon: Cloud,
          color: "blue",
          summary: account || "Trên thiết bị · Firebase tùy chọn",
        },
      ],
    },
    {
      title: "Ứng dụng",
      rows: [
        {
          key: "appearance",
          icon: Palette,
          color: "purple",
          summary: "Sáng, tối hoặc theo thiết bị",
        },
        {
          key: "app",
          icon: Smartphone,
          color: "green",
          summary: update
            ? "Có bản cập nhật mới"
            : offlineReady
              ? "Đã sẵn sàng dùng khi mất mạng"
              : "Thêm vào màn hình chính",
        },
      ],
    },
    {
      title: "Dữ liệu & thông tin",
      rows: [
        {
          key: "backup",
          icon: DatabaseBackup,
          color: "slate",
          summary: "Xuất, nhập và xóa dữ liệu",
        },
        { key: "about", icon: Info, color: "slate", summary: `Phiên bản ${appConfig.version}` },
      ],
    },
  ] as const;
  return (
    <>
      <div className="page-heading">
        <h1 tabIndex={-1}>Cài đặt</h1>
        <p className="subtitle">Một chút điều chỉnh, vừa với bạn hơn.</p>
      </div>
      <div className="settings-menu">
        {groups.map((group) => (
          <section key={group.title}>
            <h2 className="group-label">{group.title}</h2>
            <ul className="settings-group" aria-label={group.title}>
              {group.rows.map((row) => (
                <li key={row.key}>
                  <Button
                    variant="ghost"
                    className="settings-row"
                    onClick={() => open(row.key)}
                    aria-label={settingsTitles[row.key]}
                  >
                    <span className={`settings-icon ${row.color}`}>
                      <row.icon size={19} />
                    </span>
                    <span className="settings-row-copy">
                      <strong>{settingsTitles[row.key]}</strong>
                      <small>{row.summary}</small>
                    </span>
                    <ChevronRight className="settings-chevron" size={18} />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="app-signature">
        <Layers size={14} />
        {appConfig.name}
        <span>{appConfig.version}</span>
      </p>
    </>
  );
}
export function ProfilePanel({
  name,
  version,
  save,
  dirty,
}: {
  name: string;
  version: number;
  save: (value: string, expected: number) => boolean;
  dirty: (value: boolean) => void;
}) {
  const [value, setValue] = useState(name);
  const [baseline, setBaseline] = useState({ name, version });
  return (
    <form
      className="panel form-stack"
      onSubmit={(e) => {
        e.preventDefault();
        if (save(value.trim(), baseline.version)) {
          setValue(value.trim());
          setBaseline({ name: value.trim(), version: baseline.version + 1 });
          dirty(false);
        }
      }}
    >
      <div className="profile-avatar">
        <UserRound size={28} />
      </div>
      <div>
        <Label htmlFor="display-name">Tên hiển thị</Label>
        <Input
          id="display-name"
          maxLength={60}
          placeholder="Bạn muốn được gọi là gì?"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            dirty(e.target.value !== baseline.name);
          }}
        />
        <p className="help">Tên xuất hiện trong lời chào ở Trang chủ.</p>
      </div>
      <Button type="submit">Lưu hồ sơ</Button>
    </form>
  );
}
export function AppearancePanel() {
  const { theme, setTheme } = useTheme();
  return (
    <section className="panel">
      <p className="muted">Chọn cách ứng dụng xuất hiện trên thiết bị.</p>
      <div className="theme-options">
        {(
          [
            ["light", "Sáng", Sun],
            ["dark", "Tối", Moon],
            ["system", "Thiết bị", Laptop],
          ] as const
        ).map(([value, label, Icon]) => (
          <Button
            key={value}
            variant="outline"
            aria-pressed={theme === value}
            onClick={() => setTheme(value)}
          >
            <span className={`theme-preview preview-${value}`}>
              <i />
              <i />
              <i />
            </span>
            <span>
              <Icon size={16} />
              {label}
            </span>
          </Button>
        ))}
      </div>
      <p className="help">Chế độ theo thiết bị sẽ tự đổi theo cài đặt hệ thống.</p>
    </section>
  );
}
export function AccountPanel({
  auth,
  workspace,
  online,
  confirmPull,
}: {
  auth: AuthState;
  workspace: Workspace;
  online: boolean;
  confirmPull: () => void;
}) {
  return (
    <section className="panel form-stack">
      <div className="account-summary">
        <span className="settings-icon blue">
          <Cloud />
        </span>
        <div>
          <h2>{auth.user?.displayName || "Không gian trên thiết bị"}</h2>
          <p className="subtitle">{auth.user?.email || "Chưa đăng nhập"}</p>
        </div>
      </div>
      <div className="info-notice" role="status">
        <Info size={18} />
        <p>
          {!online
            ? "Đang mất mạng. Bạn vẫn có thể đọc và lưu ghi chú trên thiết bị."
            : auth.user
              ? workspace.state?.dirty
                ? "Có thay đổi trên thiết bị đang chờ bạn đồng bộ."
                : "Bản trên thiết bị sẵn sàng. Bấm Đồng bộ để đối chiếu với Firebase."
              : "Ghi chú được lưu trong trình duyệt này. Xuất bản sao lưu để giữ thêm một bản."}
        </p>
      </div>
      {auth.configured ? (
        <>
          {auth.user ? (
            <>
              <Button disabled={workspace.busy || !online} onClick={() => void workspace.sync()}>
                {workspace.busy ? "Đang đồng bộ…" : "Đồng bộ ngay"}
              </Button>
              <Button variant="outline" disabled={workspace.busy || !online} onClick={confirmPull}>
                Tải bản đám mây
              </Button>
            </>
          ) : null}
          <Button
            variant={auth.user ? "outline" : "default"}
            disabled={auth.busy || workspace.busy || !online}
            onClick={() => void auth.authenticate(Boolean(auth.user))}
          >
            {auth.busy ? "Đang xử lý…" : auth.user ? "Đăng xuất" : "Đăng nhập với Google"}
          </Button>
          <p className="help">
            Mỗi tài khoản có không gian riêng. Ghi chú khách không tự chuyển sang tài khoản; dùng
            xuất/nhập bản sao lưu nếu muốn chuyển.
          </p>
        </>
      ) : (
        <p className="notice">
          Firebase chưa được cấu hình cho bản app này. Bạn có thể dùng đầy đủ ghi chú và sao lưu
          trên thiết bị.
        </p>
      )}
      {workspace.syncStatus && (
        <p className="success-text" role="status">
          {workspace.syncStatus}
        </p>
      )}
      {auth.error && (
        <p className="form-error" role="alert">
          {auth.error}
        </p>
      )}
    </section>
  );
}
export function PwaPanel({
  pwa,
  confirmUpdate,
}: {
  pwa: ReturnType<typeof usePwa>;
  confirmUpdate: () => void;
}) {
  return (
    <section className="panel form-stack">
      <div className="account-summary">
        <span className="settings-icon green">
          <Smartphone />
        </span>
        <div>
          <h2>{pwa.standalone ? "Bạn đang dùng bản ứng dụng" : "Luôn ở trong tầm tay"}</h2>
          <p className="subtitle">Mở từ màn hình chính như một app.</p>
        </div>
      </div>
      <dl className="detail-rows">
        <div>
          <dt>Mạng</dt>
          <dd>{pwa.online ? "Đang kết nối" : "Đang mất mạng"}</dd>
        </div>
        <div>
          <dt>Dùng khi mất mạng</dt>
          <dd>{pwa.ready ? "Đã sẵn sàng" : "Chưa sẵn sàng"}</dd>
        </div>
        <div>
          <dt>Phiên bản</dt>
          <dd>{appConfig.version}</dd>
        </div>
      </dl>
      {pwa.canInstall && <Button onClick={() => void pwa.install()}>Cài ứng dụng</Button>}
      {!pwa.standalone && (
        <div className="install-guide">
          <h3>Trên iPhone / iPad</h3>
          <p>
            Mở bằng Safari, chọn Chia sẻ, rồi chọn <strong>Thêm vào MH chính</strong>.
          </p>
          <h3>Trên Android / máy tính</h3>
          <p>
            Chọn <strong>Cài ứng dụng</strong> hoặc <strong>Thêm vào màn hình chính</strong> trong
            menu Chrome / Edge.
          </p>
        </div>
      )}
      {pwa.waiting && (
        <Button disabled={pwa.updating} onClick={confirmUpdate}>
          {pwa.updating ? "Đang cập nhật…" : "Cập nhật phiên bản mới"}
        </Button>
      )}
      {pwa.error && (
        <p className="form-error" role="alert">
          {pwa.error}
        </p>
      )}
      <p className="help">
        Mở app khi có mạng ít nhất một lần để lưu giao diện dùng offline. Chỉ bản production có tính
        năng này.
      </p>
    </section>
  );
}
export function BackupPanel({
  exportData,
  importData,
  reset,
}: {
  exportData: () => void;
  importData: (file: File) => void;
  reset: () => void;
}) {
  return (
    <section className="panel form-stack">
      <div>
        <h2>Giữ thêm một bản an toàn</h2>
        <p className="subtitle">
          Bản JSON chứa hồ sơ và toàn bộ ghi chú trong không gian hiện tại.
        </p>
      </div>
      <Button onClick={exportData}>
        <Download />
        Xuất bản sao lưu
      </Button>
      <label className="file-label">
        <Upload size={16} />
        Nhập bản sao lưu
        <input
          type="file"
          aria-label="Nhập bản sao lưu"
          accept=".json,application/json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) importData(file);
            event.target.value = "";
          }}
        />
      </label>
      <p className="help">
        Nhập sẽ thay thế dữ liệu hiện tại sau khi xác nhận. Tệp JSON dưới 1 MB, tối đa 500 ghi chú.
      </p>
      <div className="danger-zone">
        <h3>Xóa dữ liệu không gian này</h3>
        <p className="help">
          Xóa hồ sơ và ghi chú trên thiết bị. Nếu đang đăng nhập, thay đổi chỉ lên Firebase khi bạn
          bấm Đồng bộ.
        </p>
        <Button variant="destructive" onClick={reset}>
          Xóa dữ liệu
        </Button>
      </div>
    </section>
  );
}
export function AboutPanel({ children }: { children?: ReactNode }) {
  return (
    <section className="panel form-stack about-panel">
      <span className="brand-mark">
        <Layers size={26} />
      </span>
      <div>
        <h2>{appConfig.name}</h2>
        <p className="subtitle">{appConfig.description}</p>
      </div>
      <dl className="detail-rows">
        <div>
          <dt>Phiên bản</dt>
          <dd>{appConfig.version}</dd>
        </div>
        <div>
          <dt>Ngôn ngữ</dt>
          <dd>Tiếng Việt</dd>
        </div>
        <div>
          <dt>Múi giờ hiển thị</dt>
          <dd>Việt Nam (UTC+7)</dd>
        </div>
      </dl>
      {children}
      <p className="help">
        Bộ khung dựa trên WorkingTimeTracking, dành cho dự án web và ứng dụng cài trên thiết bị.
      </p>
    </section>
  );
}
