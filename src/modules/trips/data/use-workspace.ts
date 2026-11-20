"use client";

import { useEffect, useRef, useState } from "react";
import { appConfig } from "@/config/app";
import { dataProvider, dataProviderLabel } from "@/config/services";
import { emptySnapshot, type Snapshot } from "../core/domain";
import {
  readWorkspace,
  storageKey,
  writeWorkspace,
  type Envelope,
  type WorkspaceOwner,
} from "./repository";

function message(error: unknown) {
  return error instanceof Error ? error.message : "Thao tác chưa hoàn tất. Hãy thử lại.";
}

export function useTripsWorkspace(owner: WorkspaceOwner) {
  const key = storageKey(owner);
  const provider = owner === "guest" ? null : owner.provider;
  const project = owner === "guest" ? null : owner.project;
  const uid = owner === "guest" ? null : owner.uid;
  const [loaded, setLoaded] = useState<{ key: string; envelope: Envelope | null } | null>(null);
  const current = useRef<typeof loaded>(null);
  const [feedback, setFeedback] = useState({ key, error: "", status: "" });
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const busyKeys = useRef(new Set<string>());

  useEffect(() => {
    const activeOwner: WorkspaceOwner =
      provider && project !== null && uid !== null ? { provider, project, uid } : "guest";
    function load() {
      try {
        const next = { key, envelope: readWorkspace(localStorage, activeOwner) };
        current.current = next;
        setLoaded(next);
        setFeedback({ key, error: "", status: "" });
      } catch (cause) {
        if (current.current?.key !== key) {
          const next = { key, envelope: null };
          current.current = next;
          setLoaded(next);
        }
        setFeedback({ key, error: message(cause), status: "" });
      }
    }
    load();
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea === localStorage && (event.key === key || event.key === null)) load();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      current.current = null;
      window.removeEventListener("storage", onStorage);
    };
  }, [key, provider, project, uid]);

  function accept(envelope: Envelope, status = "") {
    if (current.current?.key !== key) return;
    const next = { key, envelope };
    current.current = next;
    setLoaded(next);
    setFeedback({ key, error: "", status });
  }

  function report(cause: unknown) {
    if (current.current?.key === key) setFeedback({ key, error: message(cause), status: "" });
  }

  function save(snapshot: Snapshot, expected: number): boolean {
    try {
      const active = current.current?.key === key && current.current.envelope;
      if (busyKeys.current.has(key) || !active)
        throw new Error("Dữ liệu đang được mở hoặc đồng bộ. Hãy thử lại sau.");
      accept(
        writeWorkspace(
          localStorage,
          owner,
          expected,
          snapshot,
          active.cloudVersion,
          owner !== "guest",
        ),
      );
      return true;
    } catch (cause) {
      report(cause);
      return false;
    }
  }

  async function sync(forcePull = false, expected?: number): Promise<void> {
    const local = current.current?.key === key && current.current.envelope;
    if (!local || busyKeys.current.has(key)) return;
    if (owner === "guest" || owner.provider !== "supabase" || dataProvider !== "supabase") {
      report(new Error("Không gian này hiện chưa có đồng bộ Supabase."));
      return;
    }

    busyKeys.current.add(key);
    setBusyKey(key);
    setFeedback({ key, error: "", status: "" });
    try {
      if (!navigator.onLine)
        throw new Error("Bạn đang mất mạng. Hãy thử đồng bộ lại khi có kết nối.");
      if (
        (forcePull && expected === undefined) ||
        (expected !== undefined &&
          (expected !== local.localVersion ||
            readWorkspace(localStorage, owner).localVersion !== expected))
      )
        throw new Error("Dữ liệu vừa thay đổi. Hãy kiểm tra rồi xác nhận lại.");

      const { readCloud, writeCloud, cloudConflictMessage } = await import("./supabase-cloud");
      const remote = await readCloud(owner.uid);
      if (forcePull && !remote) throw new Error("Tài khoản này chưa có bản đám mây.");

      let snapshot = remote?.snapshot ?? emptySnapshot();
      let cloudVersion = remote?.version ?? 0;
      if (local.dirty && !forcePull) {
        if ((local.cloudVersion ?? 0) !== cloudVersion) throw new Error(cloudConflictMessage);
        if (current.current?.key !== key) return;
        if (readWorkspace(localStorage, owner).localVersion !== local.localVersion)
          throw new Error("Cửa sổ khác vừa sửa dữ liệu. Hãy đồng bộ lại.");
        snapshot = local.snapshot;
        cloudVersion = await writeCloud(owner.uid, cloudVersion, snapshot);
      } else if (!remote && local.cloudVersion) {
        throw new Error(
          "Không tìm thấy bản đám mây đã đồng bộ trước đó. Bản thiết bị vẫn được giữ.",
        );
      }
      if (current.current?.key !== key) return;

      const next = writeWorkspace(
        localStorage,
        owner,
        local.localVersion,
        snapshot,
        cloudVersion,
        false,
      );
      const time = new Intl.DateTimeFormat(appConfig.locale, {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: appConfig.timeZone,
      }).format(new Date());
      accept(next, `Đã được ${dataProviderLabel} xác nhận lúc ${time}.`);
    } catch (cause) {
      report(cause);
    } finally {
      busyKeys.current.delete(key);
      setBusyKey((active) => (active === key ? null : active));
    }
  }

  return {
    state: loaded?.key === key ? loaded.envelope : null,
    error: feedback.key === key ? feedback.error : "",
    status: feedback.key === key ? feedback.status : "",
    busy: busyKey === key,
    save,
    sync,
  };
}

export type TripsWorkspace = ReturnType<typeof useTripsWorkspace>;
