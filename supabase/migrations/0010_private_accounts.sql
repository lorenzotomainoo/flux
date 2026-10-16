-- =====================================================================
-- Flux — 0010: account pubblici e privati
-- Esegui UNA SOLA VOLTA nel SQL Editor di Supabase.
-- Dopo l'esecuzione rigenera i tipi TypeScript.
-- =====================================================================
-- Un account privato:
--   • mostra post, commenti e "mi piace" solo a chi lo segue (e a lui stesso);
--   • per essere seguito richiede una richiesta, che il proprietario accetta o rifiuta;
--   • non compare nel feed "Mondiale" (filtro dell'app) e nasconde le liste di follower/seguiti.
-- Restano visibili a tutti: nome, username, foto, bio e il NUMERO di follower/seguiti (come su Instagram).

alter table public.profiles add column is_private boolean not null default false;
grant update (is_private) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- 1. FUNZIONI DI SUPPORTO (security definer: evitano ricorsioni nelle regole)
-- ---------------------------------------------------------------------
create or replace function public.is_private_account(uid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_private from public.profiles where id = uid), false);
$$;

-- Posso vedere i contenuti di questo profilo? Sì se è il mio, se è pubblico, o se lo seguo (richiesta accettata).
create or replace function public.can_view_profile(target uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select target = auth.uid()
      or not public.is_private_account(target)
      or exists (
        select 1 from public.follows f
        where f.follower_id = auth.uid() and f.following_id = target
      );
$$;

-- Numero di follower e seguiti: visibile a tutti, anche per gli account privati.
create or replace function public.follow_counts(uid uuid)
returns table (followers bigint, following bigint)
language sql stable security definer set search_path = public
as $$
  select (select count(*) from public.follows where following_id = uid),
         (select count(*) from public.follows where follower_id = uid);
$$;

-- ---------------------------------------------------------------------
-- 2. RICHIESTE DI FOLLOW
-- ---------------------------------------------------------------------
create table public.follow_requests (
  requester_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  target_id    uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (requester_id, target_id),
  check (requester_id <> target_id)
);
create index follow_requests_target_idx on public.follow_requests (target_id, created_at desc);

alter table public.follow_requests enable row level security;

create policy "follow_requests_select" on public.follow_requests
  for select to authenticated using (requester_id = auth.uid() or target_id = auth.uid());

-- Puoi chiedere solo a nome tuo, solo a un account privato, e solo se non lo segui già.
create policy "follow_requests_insert" on public.follow_requests
  for insert to authenticated with check (
    requester_id = auth.uid()
    and public.is_private_account(target_id)
    and not exists (
      select 1 from public.follows f where f.follower_id = auth.uid() and f.following_id = target_id
    )
  );

-- Annulla la tua richiesta (requester) oppure rifiuta quelle che ricevi (target).
create policy "follow_requests_delete" on public.follow_requests
  for delete to authenticated using (requester_id = auth.uid() or target_id = auth.uid());

revoke update on public.follow_requests from anon, authenticated;

-- Accetta (o rifiuta) una richiesta ricevuta. Solo il proprietario dell'account può farlo.
create or replace function public.respond_follow_request(requester uuid, accept boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not exists (
    select 1 from public.follow_requests where requester_id = requester and target_id = auth.uid()
  ) then
    raise exception 'request not found';
  end if;

  if accept then
    insert into public.follows (follower_id, following_id) values (requester, auth.uid())
    on conflict do nothing;
  end if;
  delete from public.follow_requests where requester_id = requester and target_id = auth.uid();
end;
$$;

revoke execute on function public.respond_follow_request(uuid, boolean) from public, anon;
grant  execute on function public.respond_follow_request(uuid, boolean) to authenticated;

-- Quando un account torna pubblico, le richieste in attesa diventano follow.
create or replace function public.accept_requests_when_public()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if old.is_private and not new.is_private then
    insert into public.follows (follower_id, following_id)
    select requester_id, new.id from public.follow_requests where target_id = new.id
    on conflict do nothing;
    delete from public.follow_requests where target_id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_profile_made_public
  after update of is_private on public.profiles
  for each row execute function public.accept_requests_when_public();

-- ---------------------------------------------------------------------
-- 3. FOLLOW: per un account privato si passa dalle richieste
-- ---------------------------------------------------------------------
drop policy if exists "follows_insert_own" on public.follows;
create policy "follows_insert_own" on public.follows
  for insert to authenticated with check (
    follower_id = auth.uid() and not public.is_private_account(following_id)
  );

-- Chi è seguito può rimuovere un follower (utile con un account privato).
create policy "follows_delete_as_target" on public.follows
  for delete to authenticated using (following_id = auth.uid());

-- Le liste di follower/seguiti: vedi le righe che ti riguardano, quelle tra account che puoi vedere.
drop policy if exists "follows_select_all" on public.follows;
create policy "follows_select_visible" on public.follows
  for select to authenticated using (
    follower_id = auth.uid()
    or following_id = auth.uid()
    or (public.can_view_profile(follower_id) and public.can_view_profile(following_id))
  );

-- ---------------------------------------------------------------------
-- 4. POST, COMMENTI E "MI PIACE": seguono la visibilità del profilo
-- ---------------------------------------------------------------------
drop policy if exists "posts_select_live" on public.posts;
create policy "posts_select_visible" on public.posts
  for select to authenticated using (
    expires_at > now() and public.can_view_profile(author_id)
  );

-- un commento si vede (e si scrive) solo se si vede il post (la sicurezza dei post si applica qui dentro)
drop policy if exists "comments_select_all" on public.comments;
drop policy if exists "comments_insert_own" on public.comments;
create policy "comments_select_visible" on public.comments
  for select to authenticated using (
    exists (select 1 from public.posts p where p.id = post_id)
  );
create policy "comments_insert_visible" on public.comments
  for insert to authenticated with check (
    author_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id)
  );

drop policy if exists "post_likes_select"    on public.post_likes;
drop policy if exists "audio_likes_select"   on public.audio_likes;
drop policy if exists "comment_likes_select" on public.comment_likes;
create policy "post_likes_select" on public.post_likes
  for select to authenticated using (exists (select 1 from public.posts p where p.id = post_id));
create policy "audio_likes_select" on public.audio_likes
  for select to authenticated using (exists (select 1 from public.posts p where p.id = post_id));
create policy "comment_likes_select" on public.comment_likes
  for select to authenticated using (exists (select 1 from public.comments c where c.id = comment_id));

grant execute on function public.follow_counts(uuid) to authenticated;
