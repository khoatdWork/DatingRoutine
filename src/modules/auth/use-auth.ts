"use client";
import { useEffect, useState } from "react";
import { dataProvider } from "@/config/services";
import { authConfigured, loadAuthProvider, type AccountUser } from "./provider";

export function useAuth() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [ready, setReady] = useState(!authConfigured);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authConfigured) return;
    let unsubscribe: (() => void) | undefined;
    let disposed = false;

    void loadAuthProvider()
      .then((provider) => {
        if (disposed) return;
        unsubscribe = provider.subscribe(
          (next) => {
            setUser(next);
            setReady(true);
            setError("");
          },
          () => {
            setError("Chưa khôi phục được phiên đăng nhập. Hãy kết nối mạng rồi tải lại.");
            setReady(true);
          },
        );
      })
      .catch(() => {
        if (!disposed) {
          setError("Không khởi tạo được đăng nhập. Hãy kiểm tra cấu hình ứng dụng.");
          setReady(true);
        }
      });

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, []);

  async function authenticate(logout = false) {
    if (!authConfigured) return;
    setBusy(true);
    setError("");
    try {
      const provider = await loadAuthProvider();
      if (logout) await provider.signOut();
      else await provider.signIn();
    } catch {
      const loginError =
        dataProvider === "firebase"
          ? "Chưa đăng nhập được. Cho phép cửa sổ bật lên và thử lại khi có mạng."
          : "Chưa đăng nhập được. Hãy kiểm tra kết nối mạng rồi thử lại.";
      setError(logout ? "Chưa đăng xuất được. Hãy thử lại." : loginError);
    } finally {
      setBusy(false);
    }
  }

  return { user, ready, busy, error, configured: authConfigured, authenticate };
}

export type AuthState = ReturnType<typeof useAuth>;
