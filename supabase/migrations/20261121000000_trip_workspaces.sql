begin;

create table public.trip_workspaces (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  version bigint not null check (version between 1 and 9007199254740991),
  snapshot jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.trip_workspaces enable row level security;
revoke all on table public.trip_workspaces from public, anon, authenticated;
grant select on table public.trip_workspaces to authenticated;

create policy trip_workspace_owner_read on public.trip_workspaces
  for select to authenticated
  using (
    owner_id = (select auth.uid())
    and ((select auth.jwt()) ->> 'is_anonymous') is distinct from 'true'
  );

create function public.write_trip_workspace(
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
  -- Match the whitespace code points removed by JavaScript String.trim().
  trim_chars constant text := U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF';
  next_version bigint;
  trip jsonb;
  photo jsonb;
  expense jsonb;
  total numeric;
  trip_ids text[] := '{}';
  photo_ids text[];
  expense_ids text[];
  item_id text;
  amount numeric;
  field text;
begin
  if auth.uid() is null
    or auth.uid() is distinct from p_owner_id
    or (auth.jwt() ->> 'is_anonymous') = 'true' then
    raise exception using errcode = '42501', message = 'Workspace owner required';
  end if;

  if p_expected_version is null or p_expected_version not between 0 and 9007199254740990 then
    raise exception using errcode = '22023', message = 'Invalid expected version';
  end if;

  if jsonb_typeof(p_snapshot) is distinct from 'object'
    or (p_snapshot -> 'schemaVersion') is distinct from '1'::jsonb
    or jsonb_typeof(p_snapshot -> 'profile') is distinct from 'object'
    or jsonb_typeof(p_snapshot -> 'trips') is distinct from 'array' then
    raise exception using errcode = '22023', message = 'Invalid snapshot';
  end if;

  if p_snapshot - array['schemaVersion', 'profile', 'trips'] <> '{}'::jsonb
    or (p_snapshot -> 'profile') - 'displayName' <> '{}'::jsonb
    or jsonb_typeof(p_snapshot #> '{profile,displayName}') is distinct from 'string'
    or length(p_snapshot #>> '{profile,displayName}') > 60
    or jsonb_array_length(p_snapshot -> 'trips') > 300 then
    raise exception using errcode = '22023', message = 'Invalid snapshot';
  end if;

  -- Remove JSONB serialization spaces outside strings when checking compact backup size.
  if octet_length(p_snapshot::text) > 2000000
    and octet_length(regexp_replace(p_snapshot::text, $pattern$("([^"\\]|\\.)*")| $pattern$, '\1', 'g')) > 2000000 then
    raise exception using errcode = '22023', message = 'Snapshot is too large';
  end if;

  for trip in select value from jsonb_array_elements(p_snapshot -> 'trips') loop
    if jsonb_typeof(trip) is distinct from 'object'
      or jsonb_typeof(trip -> 'photos') is distinct from 'array'
      or jsonb_typeof(trip -> 'expenses') is distinct from 'array' then
      raise exception using errcode = '22023', message = 'Invalid trip';
    end if;

    item_id := trip ->> 'id';
    if trip - array['id', 'title', 'location', 'startDate', 'endDate', 'note', 'mood',
      'photos', 'expenses', 'createdAt', 'updatedAt'] <> '{}'::jsonb
      or jsonb_typeof(trip -> 'id') is distinct from 'string'
      or item_id !~ '^[a-zA-Z0-9-]{1,80}$'
      or item_id = any(trip_ids)
      or jsonb_typeof(trip -> 'title') is distinct from 'string'
      or btrim(trip ->> 'title', trim_chars) = ''
      or length(trip ->> 'title') > 120
      or jsonb_typeof(trip -> 'location') is distinct from 'string'
      or length(trip ->> 'location') > 120
      or jsonb_typeof(trip -> 'note') is distinct from 'string'
      or length(trip ->> 'note') > 10000
      or coalesce(trip ->> 'mood', '') not in ('happy', 'love', 'peaceful', 'adventure')
      or jsonb_array_length(trip -> 'photos') > 30
      or jsonb_array_length(trip -> 'expenses') > 200 then
      raise exception using errcode = '22023', message = 'Invalid trip';
    end if;

    foreach field in array array['startDate', 'endDate'] loop
      if jsonb_typeof(trip -> field) is distinct from 'string'
        or (trip ->> field) !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
        raise exception using errcode = '22023', message = 'Invalid trip date';
      end if;
      perform (trip ->> field)::date;
    end loop;

    foreach field in array array['createdAt', 'updatedAt'] loop
      if jsonb_typeof(trip -> field) is distinct from 'string'
        or (trip ->> field) !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9][.][0-9]{3}Z$' then
        raise exception using errcode = '22023', message = 'Invalid trip timestamp';
      end if;
      perform (trip ->> field)::timestamptz;
    end loop;
    if (trip ->> 'startDate')::date > (trip ->> 'endDate')::date
      or (trip ->> 'createdAt')::timestamptz > (trip ->> 'updatedAt')::timestamptz then
      raise exception using errcode = '22023', message = 'Invalid trip date order';
    end if;

    trip_ids := array_append(trip_ids, item_id);
    photo_ids := '{}';
    expense_ids := '{}';
    total := 0;
    for photo in select value from jsonb_array_elements(trip -> 'photos') loop
      if jsonb_typeof(photo) is distinct from 'object' then
        raise exception using errcode = '22023', message = 'Invalid photo';
      end if;
      item_id := photo ->> 'id';
      if photo - array['id', 'publicId', 'url', 'width', 'height', 'caption'] <> '{}'::jsonb
        or jsonb_typeof(photo -> 'id') is distinct from 'string'
        or item_id !~ '^[a-zA-Z0-9-]{1,80}$'
        or item_id = any(photo_ids)
        or jsonb_typeof(photo -> 'publicId') is distinct from 'string'
        or length(photo ->> 'publicId') > 255
        or (photo ->> 'publicId') !~ '^[a-zA-Z0-9_-]+(/[a-zA-Z0-9_-]+)*$'
        or jsonb_typeof(photo -> 'url') is distinct from 'string'
        or length(photo ->> 'url') > 2048
        or substring(photo ->> 'url' from '^https://res[.]cloudinary[.]com/[a-zA-Z0-9_-]+/image/authenticated/s--[a-zA-Z0-9_-]{32}--/v[0-9]+/([a-zA-Z0-9_/-]+)[.](?:jpg|png|webp)$')
          is distinct from (photo ->> 'publicId')
        or jsonb_typeof(photo -> 'caption') is distinct from 'string'
        or length(photo ->> 'caption') > 300 then
        raise exception using errcode = '22023', message = 'Invalid photo';
      end if;
      foreach field in array array['width', 'height'] loop
        if jsonb_typeof(photo -> field) is distinct from 'number' then
          raise exception using errcode = '22023', message = 'Invalid photo size';
        end if;
        amount := (photo ->> field)::numeric;
        if amount not between 1 and 9007199254740991 or trunc(amount) <> amount then
          raise exception using errcode = '22023', message = 'Invalid photo size';
        end if;
      end loop;
      photo_ids := array_append(photo_ids, item_id);
    end loop;

    for expense in select value from jsonb_array_elements(trip -> 'expenses') loop
      if jsonb_typeof(expense) is distinct from 'object' then
        raise exception using errcode = '22023', message = 'Invalid expense';
      end if;
      item_id := expense ->> 'id';
      if expense - array['id', 'label', 'amount', 'category', 'paidBy'] <> '{}'::jsonb
        or jsonb_typeof(expense -> 'id') is distinct from 'string'
        or item_id !~ '^[a-zA-Z0-9-]{1,80}$'
        or item_id = any(expense_ids)
        or jsonb_typeof(expense -> 'label') is distinct from 'string'
        or btrim(expense ->> 'label', trim_chars) = ''
        or length(expense ->> 'label') > 120
        or jsonb_typeof(expense -> 'amount') is distinct from 'number'
        or coalesce(expense ->> 'category', '') not in ('transport', 'food', 'stay', 'tickets', 'shopping', 'other')
        or coalesce(expense ->> 'paidBy', '') not in ('me', 'partner', 'shared') then
        raise exception using errcode = '22023', message = 'Invalid expense';
      end if;
      amount := (expense ->> 'amount')::numeric;
      total := total + amount;
      if amount < 0 or trunc(amount) <> amount or total > 9007199254740991 then
        raise exception using errcode = '22023', message = 'Invalid expense amount';
      end if;
      expense_ids := array_append(expense_ids, item_id);
    end loop;
  end loop;

  -- The unique key and conditional UPDATE serialize competing writes.
  if p_expected_version = 0 then
    insert into public.trip_workspaces (owner_id, version, snapshot)
    values (p_owner_id, 1, p_snapshot)
    on conflict (owner_id) do nothing
    returning version into next_version;
  else
    update public.trip_workspaces
    set version = version + 1, snapshot = p_snapshot, updated_at = now()
    where owner_id = p_owner_id and version = p_expected_version
    returning version into next_version;
  end if;
  if next_version is null then
    raise exception using errcode = 'PT409', message = 'Workspace version conflict';
  end if;
  return next_version;
exception
  when invalid_datetime_format or datetime_field_overflow then
    raise exception using errcode = '22023', message = 'Invalid trip date';
end;
$$;

revoke all on function public.write_trip_workspace(uuid, bigint, jsonb)
  from public, anon, authenticated;
grant execute on function public.write_trip_workspace(uuid, bigint, jsonb) to authenticated;

commit;
