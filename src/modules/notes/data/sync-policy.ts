import type { Envelope } from "./repository";
export function syncAction(
  local: Envelope,
  remoteVersion: number | null,
): "pull" | "push" | "conflict" {
  if (!local.dirty) return "pull";
  if (
    local.cloudVersion === (remoteVersion ?? 0) ||
    (local.cloudVersion === null && remoteVersion === null)
  )
    return "push";
  return "conflict";
}
