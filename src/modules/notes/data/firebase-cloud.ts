import { doc, getDocFromServer, runTransaction, serverTimestamp } from "firebase/firestore";
import { firebaseClients } from "@/lib/firebase/client";
import { cloudConflictMessage } from "./cloud-errors";
import { validateSnapshot, type Snapshot } from "../core/domain";
export async function readCloud(uid: string) {
  const result = await getDocFromServer(
    doc(firebaseClients().db, "users", uid, "workspaces", "default"),
  );
  if (!result.exists()) return null;
  const data = result.data();
  if (!Number.isSafeInteger(data.version) || data.version < 1)
    throw new Error("Phiên bản trên đám mây không hợp lệ.");
  return { version: data.version as number, snapshot: validateSnapshot(data.snapshot) };
}
export async function writeCloud(uid: string, expectedVersion: number, snapshot: Snapshot) {
  const { db } = firebaseClients();
  const ref = doc(db, "users", uid, "workspaces", "default");
  const clean = validateSnapshot(snapshot);
  return runTransaction(db, async (transaction) => {
    const current = await transaction.get(ref);
    const version: unknown = current.exists() ? current.data().version : 0;
    if (version !== expectedVersion) throw new Error(cloudConflictMessage);
    transaction.set(ref, {
      version: expectedVersion + 1,
      snapshot: clean,
      updatedAt: serverTimestamp(),
    });
    return expectedVersion + 1;
  });
}
