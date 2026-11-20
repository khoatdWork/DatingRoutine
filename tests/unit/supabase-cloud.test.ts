import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptySnapshot } from "@/modules/notes/core/domain";
import { readCloud, writeCloud } from "@/modules/notes/data/supabase-cloud";
import { cloudConflictMessage } from "@/modules/notes/data/cloud-errors";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({ supabaseClient: () => mocks }));

const snapshot = emptySnapshot();

beforeEach(() => {
  vi.resetAllMocks();
  mocks.from.mockReturnValue(mocks);
  mocks.select.mockReturnValue(mocks);
  mocks.eq.mockReturnValue(mocks);
});

describe("Supabase cloud adapter", () => {
  it("reads only the requested owner and accepts a valid row", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { version: 3, snapshot }, error: null });
    await expect(readCloud("owner")).resolves.toEqual({ version: 3, snapshot });
    expect(mocks.from).toHaveBeenCalledWith("note_workspaces");
    expect(mocks.select).toHaveBeenCalledWith("version,snapshot");
    expect(mocks.eq).toHaveBeenCalledWith("owner_id", "owner");
  });

  it("returns null for a missing row and rejects invalid server data", async () => {
    mocks.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { version: 0, snapshot }, error: null })
      .mockResolvedValueOnce({ data: { version: 3, snapshot: {} }, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: "42501" } });
    await expect(readCloud("owner")).resolves.toBeNull();
    await expect(readCloud("owner")).rejects.toThrow("Phiên bản");
    await expect(readCloud("owner")).rejects.toThrow("định dạng");
    await expect(readCloud("owner")).rejects.toThrow("Chưa đọc");
  });

  it("passes the validated snapshot and version to the owner RPC", async () => {
    mocks.rpc.mockResolvedValue({ data: 4, error: null });
    await expect(writeCloud("owner", 3, snapshot)).resolves.toBe(4);
    expect(mocks.rpc).toHaveBeenCalledWith("write_note_workspace", {
      p_owner_id: "owner",
      p_expected_version: 3,
      p_snapshot: snapshot,
    });
  });

  it("distinguishes stale versions and rejects unconfirmed writes", async () => {
    mocks.rpc
      .mockResolvedValueOnce({ data: null, error: { code: "PT409" } })
      .mockResolvedValueOnce({ data: null, error: { code: "42501" } })
      .mockResolvedValueOnce({ data: 3, error: null });
    await expect(writeCloud("owner", 3, snapshot)).rejects.toThrow(cloudConflictMessage);
    await expect(writeCloud("owner", 3, snapshot)).rejects.toThrow("chưa xác nhận");
    await expect(writeCloud("owner", 3, snapshot)).rejects.toThrow("Phiên bản");
  });
});
