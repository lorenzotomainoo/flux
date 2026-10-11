-- =====================================================================
-- Flux — 0004: chat di gruppo (permanenti e temporanee), eliminazione chat,
--             punto focale di avatar e banner
-- Esegui UNA SOLA VOLTA nel SQL Editor di Supabase.
-- Dopo l'esecuzione rigenera i tipi TypeScript (vedi istruzioni).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. PROFILI: punto focale delle immagini (0-100, 50 = centro)
-- ---------------------------------------------------------------------
alter table public.profiles
  add column avatar_x smallint not null default 50 check (avatar_x between 0 and 100),
  add column avatar_y smallint not null default 50 check (avatar_y between 0 and 100),
  add column banner_x smallint not null default 50 check (banner_x between 0 and 100),
  add column banner_y smallint not null default 50 check (banner_y between 0 and 100);

-- ---------------------------------------------------------------------
-- 2. CONVERSAZIONI: gruppi e scadenza
-- ---------------------------------------------------------------------
-- il vecchio vincolo "user_a < user_b" non vale per i gruppi
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.conversations'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%user_a < user_b%'
  loop
    execute format('alter table public.conversations drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.conversations
  add column kind       text not null default 'direct' check (kind in ('direct', 'group')),
  add column name       text check (name is null or char_length(name) between 1 and 40),
  add column created_by uuid references public.profiles(id) on delete set null,
  add column expires_at timestamptz;   -- null = permanente

alter table public.conversations alter column user_a drop not null;
alter table public.conversations alter column user_b drop not null;

alter table public.conversations add constraint conversations_shape check (
  (kind = 'direct' and user_a is not null and user_b is not null and user_a < user_b
     and name is null and expires_at is null)
  or
  (kind = 'group' and user_a is null and user_b is null and name is not null)
);

-- ---------------------------------------------------------------------
-- 3. PARTECIPANTI (valgono sia per le chat 1-a-1 sia per i gruppi)
--    last_read_at → messaggi non letti
--    hidden/cleared_at → "elimina chat solo per me"
-- ---------------------------------------------------------------------
create table public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  role            text not null default 'member' check (role in ('admin', 'member')),
  joined_at       timestamptz not null default now(),
  last_read_at    timestamptz not null default now(),
  hidden          boolean not null default false,
  cleared_at      timestamptz,
  primary key (conversation_id, user_id)
);
create index conversation_members_user_idx on public.conversation_members (user_id);

-- le chat 1-a-1 già esistenti: aggiungi i due partecipanti
insert into public.conversation_members (conversation_id, user_id)
select id, user_a from public.conversations where kind = 'direct' and user_a is not null
union
select id, user_b from public.conversations where kind = 'direct' and user_b is not null
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 4. FUNZIONI DI SUPPORTO PER LA RLS
--    security definer: evitano ricorsioni tra le policy.
--    Una chat scaduta smette di essere accessibile SUBITO (anche prima che
--    il job orario la cancelli davvero).
-- ---------------------------------------------------------------------
create or replace function public.is_member(conv uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members cm
    join public.conversations c on c.id = cm.conversation_id
    where cm.conversation_id = conv
      and cm.user_id = auth.uid()
      and (c.expires_at is null or c.expires_at > now())
  );
$$;

create or replace function public.can_read_message(conv uuid, created timestamptz)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members cm
    join public.conversations c on c.id = cm.conversation_id
    where cm.conversation_id = conv
      and cm.user_id = auth.uid()
      and (c.expires_at is null or c.expires_at > now())
      and created > coalesce(cm.cleared_at, '-infinity'::timestamptz)
  );
$$;

-- ---------------------------------------------------------------------
-- 5. POLICY (sostituiscono quelle basate su user_a / user_b)
-- ---------------------------------------------------------------------
drop policy if exists "conversations_select_members" on public.conversations;
create policy "conversations_select_member" on public.conversations
  for select to authenticated using (public.is_member(id));

alter table public.conversation_members enable row level security;
create policy "members_select" on public.conversation_members
  for select to authenticated using (public.is_member(conversation_id));
-- niente policy di insert/update/delete: si passa solo dalle funzioni qui sotto
revoke insert, update, delete on public.conversation_members from anon, authenticated;

drop policy if exists "messages_select_members" on public.messages;
drop policy if exists "messages_insert_members" on public.messages;
drop policy if exists "messages_update_read"    on public.messages;

create policy "messages_select_member" on public.messages
  for select to authenticated using (public.can_read_message(conversation_id, created_at));

create policy "messages_insert_member" on public.messages
  for insert to authenticated
  with check (sender_id = auth.uid() and public.is_member(conversation_id));

-- i messaggi non si modificano più (il "letto" ora sta in conversation_members)
revoke update on public.messages from anon, authenticated;

-- ---------------------------------------------------------------------
-- 6. TRIGGER sui nuovi messaggi
-- ---------------------------------------------------------------------
create or replace function public.touch_conversation()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  -- un nuovo messaggio fa riapparire la chat a chi l'aveva eliminata per sé
  update public.conversation_members set hidden = false
   where conversation_id = new.conversation_id and hidden;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 7. FUNZIONI (RPC)
-- ---------------------------------------------------------------------

-- Chat 1-a-1: trova o crea (e ripristina se l'avevi eliminata)
create or replace function public.get_or_create_conversation(other_user uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  a uuid; b uuid; conv uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if me = other_user then raise exception 'cannot message yourself'; end if;

  a := least(me, other_user);
  b := greatest(me, other_user);

  select id into conv from public.conversations where kind = 'direct' and user_a = a and user_b = b;

  if conv is null then
    insert into public.conversations (kind, user_a, user_b) values ('direct', a, b) returning id into conv;
    insert into public.conversation_members (conversation_id, user_id) values (conv, a), (conv, b);
  else
    insert into public.conversation_members (conversation_id, user_id) values (conv, me)
    on conflict (conversation_id, user_id) do update set hidden = false;
  end if;
  return conv;
end;
$$;

-- Crea un gruppo. duration_minutes null = permanente; altrimenti 30/60/180/720/1440.
-- Puoi aggiungere solo persone che segui (evita di trascinare sconosciuti in un gruppo).
create or replace function public.create_group(
  group_name text,
  member_ids uuid[],
  duration_minutes integer default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  conv uuid;
  ids uuid[];
begin
  if me is null then raise exception 'not authenticated'; end if;

  group_name := btrim(coalesce(group_name, ''));
  if char_length(group_name) not between 1 and 40 then raise exception 'invalid name'; end if;
  if duration_minutes is not null and duration_minutes not in (30, 60, 180, 720, 1440) then
    raise exception 'invalid duration';
  end if;

  select coalesce(array_agg(distinct x), '{}'::uuid[]) into ids
  from unnest(member_ids) as x where x <> me;

  if cardinality(ids) < 1 then raise exception 'at least one member'; end if;
  if cardinality(ids) > 49 then raise exception 'too many members'; end if;

  if exists (
    select 1 from unnest(ids) as x
    where not exists (select 1 from public.follows f where f.follower_id = me and f.following_id = x)
  ) then
    raise exception 'you can only add people you follow';
  end if;

  insert into public.conversations (kind, name, created_by, expires_at)
  values (
    'group', group_name, me,
    case when duration_minutes is null then null else now() + make_interval(mins => duration_minutes) end
  )
  returning id into conv;

  insert into public.conversation_members (conversation_id, user_id, role) values (conv, me, 'admin');
  insert into public.conversation_members (conversation_id, user_id)
  select conv, x from unnest(ids) as x;

  return conv;
end;
$$;

-- Segna come lette le conversazioni (usa l'orologio del server)
create or replace function public.mark_read(conv uuid)
returns void
language sql security definer set search_path = public
as $$
  update public.conversation_members set last_read_at = now()
  where conversation_id = conv and user_id = auth.uid();
$$;

-- Messaggi non letti per conversazione
create or replace function public.unread_counts()
returns table (conversation_id uuid, unread bigint)
language sql stable security definer set search_path = public
as $$
  select m.conversation_id, count(*)::bigint
  from public.conversation_members cm
  join public.conversations c
    on c.id = cm.conversation_id and (c.expires_at is null or c.expires_at > now())
  join public.messages m
    on m.conversation_id = cm.conversation_id
   and m.created_at > greatest(cm.last_read_at, coalesce(cm.cleared_at, '-infinity'::timestamptz))
   and m.sender_id <> cm.user_id
  where cm.user_id = auth.uid()
  group by m.conversation_id;
$$;

-- "Elimina chat": 1-a-1 → la nascondi solo per te; gruppo → esci dal gruppo.
-- Se esce l'ultimo admin, il membro più "anziano" diventa admin; se esce l'ultimo membro il gruppo sparisce.
create or replace function public.leave_conversation(conv uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  k text;
  was_admin boolean;
begin
  if me is null then raise exception 'not authenticated'; end if;

  select kind into k from public.conversations where id = conv;
  select (role = 'admin') into was_admin
  from public.conversation_members where conversation_id = conv and user_id = me;

  if k is null or was_admin is null then raise exception 'not a member'; end if;

  if k = 'direct' then
    update public.conversation_members
       set hidden = true, cleared_at = now()
     where conversation_id = conv and user_id = me;
    return;
  end if;

  delete from public.conversation_members where conversation_id = conv and user_id = me;

  if not exists (select 1 from public.conversation_members where conversation_id = conv) then
    delete from public.conversations where id = conv;
  elsif was_admin and not exists (
    select 1 from public.conversation_members where conversation_id = conv and role = 'admin'
  ) then
    update public.conversation_members set role = 'admin'
     where conversation_id = conv
       and user_id = (
         select user_id from public.conversation_members
          where conversation_id = conv order by joined_at, user_id limit 1
       );
  end if;
end;
$$;

-- Solo un admin può eliminare il gruppo per tutti
create or replace function public.delete_group_for_all(conv uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.conversation_members cm
    join public.conversations c on c.id = cm.conversation_id
    where cm.conversation_id = conv and cm.user_id = auth.uid()
      and cm.role = 'admin' and c.kind = 'group'
  ) then
    raise exception 'not allowed';
  end if;
  delete from public.conversations where id = conv;   -- cascade su membri e messaggi
end;
$$;

-- Le funzioni "azione" sono per utenti autenticati
revoke execute on function public.create_group(text, uuid[], integer) from public, anon;
revoke execute on function public.mark_read(uuid) from public, anon;
revoke execute on function public.unread_counts() from public, anon;
revoke execute on function public.leave_conversation(uuid) from public, anon;
revoke execute on function public.delete_group_for_all(uuid) from public, anon;
revoke execute on function public.get_or_create_conversation(uuid) from public, anon;
grant execute on function public.create_group(text, uuid[], integer) to authenticated;
grant execute on function public.mark_read(uuid) to authenticated;
grant execute on function public.unread_counts() to authenticated;
grant execute on function public.leave_conversation(uuid) to authenticated;
grant execute on function public.delete_group_for_all(uuid) to authenticated;
grant execute on function public.get_or_create_conversation(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 8. PULIZIA: ora cancella anche le chat temporanee scadute
-- ---------------------------------------------------------------------
create or replace function public.purge_ephemeral(
  only_expired boolean default true,
  cutoff timestamptz default now()
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if only_expired then
    delete from public.messages      where created_at < cutoff - interval '24 hours';
    delete from public.comments      where created_at < cutoff - interval '24 hours';
    delete from public.posts         where expires_at < cutoff;
    delete from public.conversations where expires_at is not null and expires_at < cutoff;
  else
    delete from public.messages where true;
    delete from public.comments where true;
    delete from public.posts    where true;
    delete from public.conversations where expires_at is not null;
    update public.conversations set last_message_at = null;
  end if;
end;
$$;
revoke execute on function public.purge_ephemeral(boolean, timestamptz) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 9. REALTIME: aggiornamenti di lettura e nuove appartenenze
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversation_members'
  ) then
    alter publication supabase_realtime add table public.conversation_members;
  end if;
end $$;
