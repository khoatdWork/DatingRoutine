"use client";
import { useEffect, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { firebaseClients, firebaseConfigured } from "@/lib/firebase/client";
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!firebaseConfigured);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!firebaseConfigured) return;
    let unsubscribe: (() => void) | undefined;
    let disposed = false;
    // Firebase initialization can fail; deliver all state changes asynchronously.
    void Promise.resolve()
      .then(() => {
        if (disposed) return;
        unsubscribe = onAuthStateChanged(
          firebaseClients().auth,
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
          setError("Không khởi tạo được Firebase. Hãy kiểm tra cấu hình ứng dụng.");
          setReady(true);
        }
      });
    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, []);
  async function authenticate(logout = false) {
    setBusy(true);
    setError("");
    try {
      if (logout) await signOut(firebaseClients().auth);
      else await signInWithPopup(firebaseClients().auth, new GoogleAuthProvider());
    } catch {
      setError(
        logout
          ? "Chưa đăng xuất được. Hãy thử lại."
          : "Chưa đăng nhập được. Cho phép cửa sổ bật lên và thử lại khi có mạng.",
      );
    } finally {
      setBusy(false);
    }
  }
  return { user, ready, busy, error, configured: firebaseConfigured, authenticate };
}
export type AuthState = ReturnType<typeof useAuth>;
