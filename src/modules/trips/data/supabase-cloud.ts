import { supabaseClient } from "@/lib/supabase/client";
import { validateSnapshot, type Snapshot } from "../core/domain";

export const cloudConflictMessage =
  "Đám mây đã thay đổi. Hãy sao lưu thiết bị rồi tải bản đám mây để đối chiếu.";

export async function readCloud(uid: string) {
  const { data, error } = await supabaseClient()
    .from("trip_workspaces")
    .select("version,snapshot")
    .eq("owner_id", uid)
    .maybeSingle<{ version: number; snapshot: unknown }>();
  if (error) throw new Error("Chưa đọc được dữ liệu Supabase. Hãy thử lại.");
  if (!data) return null;
  if (!Number.isSafeInteger(data.version) || data.version < 1)
    throw new Error("Phiên bản trên đám mây không hợp lệ.");
  return { version: data.version, snapshot: validateSnapshot(data.snapshot) };
}

export async function writeCloud(uid: string, expectedVersion: number, snapshot: Snapshot) {
  const { data, error } = await supabaseClient().rpc("write_trip_workspace", {
    p_owner_id: uid,
    p_expected_version: expectedVersion,
    p_snapshot: validateSnapshot(snapshot),
  });
  if (error?.code === "PT409") throw new Error(cloudConflictMessage);
  if (error) throw new Error("Supabase chưa xác nhận lưu dữ liệu. Hãy thử lại.");
  if (data !== expectedVersion + 1) throw new Error("Phiên bản trên đám mây không hợp lệ.");
  return data as number;
}
