"use client";
import { useEffect, useRef, useState } from "react";
import { readWorkspace, writeWorkspace, storageKey, type Envelope } from "./repository";
import { emptySnapshot, type Snapshot } from "../core/domain";
import { syncAction } from "./sync-policy";
import { appConfig } from "@/config/app";
function message(error: unknown) {
  return error instanceof Error ? error.message : "Thao tác chưa hoàn tất. Hãy thử lại.";
}
export function useWorkspace(owner: string) {
  const [state, setState] = useState<Envelope | null>(null);
  const stateRef = useRef<Envelope | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [syncStatus, setSyncStatus] = useState("");
  function accept(next: Envelope) {
    stateRef.current = next;
    setState(next);
  }
  useEffect(() => {
    function load() {
      try {
        const next = readWorkspace(localStorage, owner);
        stateRef.current = next;
        setState(next);
        setError("");
      } catch (cause) {
        setError(message(cause));
      }
    }
    load();
    const storage = (event: StorageEvent) => {
      if (event.key === storageKey(owner)) load();
    };
    window.addEventListener("storage", storage);
    return () => window.removeEventListener("storage", storage);
  }, [owner]);
  function commit(snapshot: Snapshot, expected = stateRef.current?.localVersion): boolean {
    try {
      if (busyRef.current || !stateRef.current || expected === undefined)
        throw new Error("Dữ liệu đang được mở hoặc đồng bộ. Hãy thử lại sau.");
      const next = writeWorkspace(
        localStorage,
        owner,
        expected,
        snapshot,
        stateRef.current.cloudVersion,
        true,
      );
      accept(next);
      setError("");
      setSyncStatus("");
      return true;
    } catch (cause) {
      setError(message(cause));
      return false;
    }
  }
  async function sync(pullOnly = false, expected?: number) {
    if (owner === "guest" || busyRef.current || !stateRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setSyncStatus("");
    setError("");
    try {
      if (!navigator.onLine)
        throw new Error("Bạn đang mất mạng. Dữ liệu trên thiết bị vẫn được giữ để đồng bộ sau.");
      const local = stateRef.current;
      if (
        expected !== undefined &&
        (local.localVersion !== expected ||
          readWorkspace(localStorage, owner).localVersion !== expected)
      ) {
        throw new Error("Dữ liệu vừa thay đổi. Hãy kiểm tra rồi xác nhận lại.");
      }
      const { readCloud, writeCloud } = await import("./cloud");
      const remote = await readCloud(owner);
      const action = pullOnly ? "pull" : syncAction(local, remote?.version ?? null);
      if (action === "conflict")
        throw new Error(
          "Thiết bị và đám mây có thay đổi riêng. Xuất bản sao lưu trước khi chọn Tải bản đám mây; app sẽ không tự ghi đè.",
        );
      if (action === "push") {
        // Check other tabs again before sending. Transaction checks the cloud version.
        if (readWorkspace(localStorage, owner).localVersion !== local.localVersion)
          throw new Error("Cửa sổ khác vừa sửa dữ liệu. Hãy đồng bộ lại.");
        const version = await writeCloud(owner, remote?.version ?? 0, local.snapshot);
        accept(
          writeWorkspace(localStorage, owner, local.localVersion, local.snapshot, version, false),
        );
      } else {
        if (pullOnly && !remote)
          throw new Error("Tài khoản chưa có bản đám mây. Dữ liệu trên thiết bị được giữ nguyên.");
        accept(
          writeWorkspace(
            localStorage,
            owner,
            local.localVersion,
            remote?.snapshot ?? emptySnapshot(),
            remote?.version ?? 0,
            false,
          ),
        );
      }
      setSyncStatus(
        `Đã được Firebase xác nhận lúc ${new Intl.DateTimeFormat(appConfig.locale, { hour: "2-digit", minute: "2-digit", timeZone: appConfig.timeZone }).format(new Date())}.`,
      );
      return true;
    } catch (cause) {
      setError(message(cause));
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  return { state, error, busy, syncStatus, commit, sync };
}
export type Workspace = ReturnType<typeof useWorkspace>;
