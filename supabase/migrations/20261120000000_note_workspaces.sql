begin;

create table public.note_workspaces (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  version bigint not null check (version between 1 and 9007199254740991),
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.note_workspaces enable row level security;
revoke all on table public.note_workspaces from public, anon, authenticated;
grant select on table public.note_workspaces to authenticated;

create policy note_workspace_owner_read on public.note_workspaces
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    and ((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true'
  );

create function public.write_note_workspace(
  p_owner_id uuid,
  p_expected_version bigint,
  p_snapshot jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_version bigint;
  note jsonb;
  note_ids text[] := '{}';
  note_id text;
  snapshot_bytes integer;
begin
  if auth.uid() is null
    or auth.uid() is distinct from p_owner_id
    or (auth.jwt() ->> 'is_anonymous') = 'true' then
    raise exception using errcode = '42501', message = 'Workspace owner required';
  end if;

  if p_expected_version is null or p_expected_version not between 0 and 9007199254740990 then
    raise exception using errcode = '22023', message = 'Invalid expected version';
  end if;

  if jsonb_typeof(p_snapshot) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'Invalid snapshot';
  end if;

  if p_snapshot - array['schemaVersion', 'profile', 'notes'] <> '{}'::jsonb
    or (p_snapshot -> 'schemaVersion') is distinct from '1'::jsonb
    or jsonb_typeof(p_snapshot -> 'profile') is distinct from 'object'
    or jsonb_typeof(p_snapshot -> 'notes') is distinct from 'array' then
    raise exception using errcode = '22023', message = 'Invalid snapshot';
  end if;

  if (p_snapshot -> 'profile') - 'displayName' <> '{}'::jsonb
    or jsonb_typeof(p_snapshot #> '{profile,displayName}') is distinct from 'string'
    or length(p_snapshot #>> '{profile,displayName}') > 60
    or jsonb_array_length(p_snapshot -> 'notes') > 500 then
    raise exception using errcode = '22023', message = 'Invalid snapshot';
  end if;

  -- Count compact JSON bytes, excluding the spaces inserted by JSONB output.
  snapshot_bytes := length('{"schemaVersion":1,"profile":{"displayName":},"notes":[]}')
    + octet_length((p_snapshot #> '{profile,displayName}')::text);

  for note in select value from jsonb_array_elements(p_snapshot -> 'notes') loop
    if jsonb_typeof(note) is distinct from 'object' then
      raise exception using errcode = '22023', message = 'Invalid note';
    end if;

    note_id := note ->> 'id';
    if note - array['id', 'title', 'body', 'kind', 'completed', 'updatedAt'] <> '{}'::jsonb
      or jsonb_typeof(note -> 'id') is distinct from 'string'
      or note_id !~ '^[a-zA-Z0-9-]{1,80}$'
      or note_id = any(note_ids)
      or jsonb_typeof(note -> 'title') is distinct from 'string'
      or (note ->> 'title') !~ '[^[:space:]]'
      or length(note ->> 'title') > 120
      or jsonb_typeof(note -> 'body') is distinct from 'string'
      or length(note ->> 'body') > 5000
      or coalesce(note ->> 'kind', '') not in ('idea', 'task')
      or jsonb_typeof(note -> 'completed') is distinct from 'boolean'
      or jsonb_typeof(note -> 'updatedAt') is distinct from 'string'
      or (note ->> 'updatedAt') !~ '^([0-9]{4}|[+-][0-9]{6})-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9][.][0-9]{3}Z$' then
      raise exception using errcode = '22023', message = 'Invalid note';
    end if;

    snapshot_bytes := snapshot_bytes
      + case when cardinality(note_ids) > 0 then 1 else 0 end
      + length('{"id":,"title":,"body":,"kind":,"completed":,"updatedAt":}')
      + octet_length((note -> 'id')::text)
      + octet_length((note -> 'title')::text)
      + octet_length((note -> 'body')::text)
      + octet_length((note -> 'kind')::text)
      + octet_length((note -> 'completed')::text)
      + octet_length((note -> 'updatedAt')::text);
    if snapshot_bytes > 1000000 then
      raise exception using errcode = '22023', message = 'Snapshot is too large';
    end if;
    note_ids := array_append(note_ids, note_id);
  end loop;

  -- The unique key and conditional UPDATE serialize competing writes.
  if p_expected_version = 0 then
    insert into public.note_workspaces (owner_id, version, snapshot)
    values (p_owner_id, 1, p_snapshot)
    on conflict (owner_id) do nothing
    returning version into next_version;
  else
    update public.note_workspaces
    set version = version + 1, snapshot = p_snapshot, updated_at = now()
    where owner_id = p_owner_id and version = p_expected_version
    returning version into next_version;
  end if;

  if next_version is null then
    raise exception using errcode = 'PT409', message = 'Workspace version conflict';
  end if;
  return next_version;
end;
$$;

revoke all on function public.write_note_workspace(uuid, bigint, jsonb)
  from public, anon, authenticated;
grant execute on function public.write_note_workspace(uuid, bigint, jsonb) to authenticated;

commit;
