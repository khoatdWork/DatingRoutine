import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { emptySnapshot } from "../../src/modules/notes/core/domain";

const alice = "11111111-1111-1111-1111-111111111111";
const bob = "22222222-2222-2222-2222-222222222222";
const snapshot = emptySnapshot();
const db = new PGlite();
const writeSql = "select public.write_note_workspace($1, $2, $3) as version";

beforeAll(async () => {
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.jwt() returns jsonb language sql stable as $$
      select nullif(current_setting('request.jwt.claims', true), '')::jsonb
    $$;
    create function auth.uid() returns uuid language sql stable as $$
      select (auth.jwt() ->> 'sub')::uuid
    $$;
    grant usage on schema auth to anon, authenticated;
  `);
  await db.query("insert into auth.users values ($1), ($2)", [alice, bob]);
  const migration = await readFile(
    new URL("../../supabase/migrations/20261120000000_note_workspaces.sql", import.meta.url),
    "utf8",
  );
  await db.exec(migration);
}, 30_000);

afterAll(async () => db.close());

beforeEach(async () => {
  await db.exec("reset role; truncate public.note_workspaces");
});

async function authenticate(role: "anon" | "authenticated", sub: string | null, anonymous = false) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claims', $1, false)", [
    JSON.stringify({ sub, is_anonymous: anonymous }),
  ]);
  await db.exec(`set role ${role}`);
}

function write(owner: string, version: number, data: unknown = snapshot) {
  return db.query<{ version: number }>(writeSql, [owner, version, JSON.stringify(data)]);
}

describe("Supabase note workspaces", () => {
  it("requires a non-anonymous account", async () => {
    await authenticate("anon", null);
    await expect(db.query("select * from public.note_workspaces")).rejects.toMatchObject({
      code: "42501",
    });
    await expect(write(alice, 0)).rejects.toMatchObject({ code: "42501" });
    await authenticate("authenticated", null);
    await expect(write(alice, 0)).rejects.toMatchObject({ code: "42501" });
    await authenticate("authenticated", alice, true);
    await expect(write(alice, 0)).rejects.toMatchObject({ code: "42501" });
  });

  it("allows only the owner to read or write through the RPC", async () => {
    await authenticate("authenticated", alice);
    await expect(write(alice, 0)).resolves.toMatchObject({ rows: [{ version: 1 }] });
    await expect(
      db.query("update public.note_workspaces set version = 2 where owner_id = $1", [alice]),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.query("delete from public.note_workspaces where owner_id = $1", [alice]),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(
      db.query(
        "insert into public.note_workspaces (owner_id, version, snapshot) values ($1, 1, $2)",
        [bob, snapshot],
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await expect(db.query("select version from public.note_workspaces")).resolves.toMatchObject({
      rows: [{ version: 1 }],
    });
    await authenticate("authenticated", bob);
    await expect(write(alice, 1)).rejects.toMatchObject({ code: "42501" });
    await expect(db.query("select * from public.note_workspaces")).resolves.toMatchObject({
      rows: [],
    });
    await authenticate("authenticated", alice, true);
    await expect(db.query("select * from public.note_workspaces")).resolves.toMatchObject({
      rows: [],
    });
  });

  it("checks the expected version on both create and update", async () => {
    await authenticate("authenticated", alice);
    await expect(write(alice, 0)).resolves.toMatchObject({ rows: [{ version: 1 }] });
    await expect(write(alice, 0)).rejects.toMatchObject({ code: "PT409" });
    await expect(write(alice, 2)).rejects.toMatchObject({ code: "PT409" });
    const changes = await Promise.allSettled([write(alice, 1), write(alice, 1)]);
    expect(changes).toEqual([
      expect.objectContaining({
        status: "fulfilled",
        value: expect.objectContaining({ rows: [{ version: 2 }] }),
      }),
      expect.objectContaining({
        status: "rejected",
        reason: expect.objectContaining({ code: "PT409" }),
      }),
    ]);
    await authenticate("authenticated", bob);
    await expect(write(bob, 1)).rejects.toMatchObject({ code: "PT409" });
  });

  it("rejects malformed snapshots and accepts valid notes", async () => {
    await authenticate("authenticated", bob);
    const note = {
      id: "a-note",
      kind: "idea",
      title: "Ghi chú",
      body: "",
      completed: false,
      updatedAt: "2026-11-20T01:00:00.000Z",
    };
    const oversizedNotes = Array.from({ length: 210 }, (_, index) => ({
      ...note,
      id: String(index),
      body: "x".repeat(5000),
    }));
    for (const invalid of [
      null,
      [],
      { schemaVersion: 1 },
      { ...snapshot, extra: true },
      { ...snapshot, profile: { displayName: 42 } },
      { ...snapshot, notes: {} },
      { ...snapshot, notes: [null] },
      { ...snapshot, notes: [{ ...note, updatedAt: "not-a-date" }] },
      { ...snapshot, notes: [note, note] },
      { ...snapshot, notes: oversizedNotes },
    ]) {
      await expect(write(bob, 0, invalid)).rejects.toMatchObject({ code: "22023" });
    }
    await expect(write(bob, 0, { ...snapshot, notes: [note] })).resolves.toMatchObject({
      rows: [{ version: 1 }],
    });
  });
});
