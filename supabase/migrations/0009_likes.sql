-- =====================================================================
-- Flux — 0009: "mi piace" a post, commenti e audio dei post
-- Esegui UNA SOLA VOLTA nel SQL Editor di Supabase.
-- Dopo l'esecuzione rigenera i tipi TypeScript.
-- =====================================================================
-- Tre tabelle separate (invece di una sola "generica") così ogni "mi piace" sparisce da solo
-- quando sparisce ciò che apprezza: i contenuti sono effimeri e anche i like lo sono.
--   post_likes    → il post
--   comment_likes → un commento
--   audio_likes   → l'audio allegato a un post (separato dal like al post)
-- user_id si compila da solo con l'utente collegato (default auth.uid()): dal browser basta indicare il bersaglio.

create table public.post_likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index post_likes_user_idx on public.post_likes (user_id);

create table public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
create index comment_likes_user_idx on public.comment_likes (user_id);

create table public.audio_likes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index audio_likes_user_idx on public.audio_likes (user_id);

alter table public.post_likes    enable row level security;
alter table public.comment_likes enable row level security;
alter table public.audio_likes   enable row level security;

-- I like sono visibili a tutti gli utenti collegati (servono per i contatori).
create policy "post_likes_select"    on public.post_likes    for select to authenticated using (true);
create policy "comment_likes_select" on public.comment_likes for select to authenticated using (true);
create policy "audio_likes_select"   on public.audio_likes   for select to authenticated using (true);

-- Metti un like solo a nome tuo e solo a ciò che vedi (un post scaduto non si può più apprezzare:
-- la sicurezza dei post si applica anche qui dentro).
create policy "post_likes_insert" on public.post_likes
  for insert to authenticated with check (
    user_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id)
  );
create policy "comment_likes_insert" on public.comment_likes
  for insert to authenticated with check (
    user_id = auth.uid() and exists (select 1 from public.comments c where c.id = comment_id)
  );
-- l'audio si può apprezzare solo se il post ne ha uno
create policy "audio_likes_insert" on public.audio_likes
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.posts p where p.id = post_id and p.audio_path is not null)
  );

-- Togli solo i tuoi like.
create policy "post_likes_delete"    on public.post_likes    for delete to authenticated using (user_id = auth.uid());
create policy "comment_likes_delete" on public.comment_likes for delete to authenticated using (user_id = auth.uid());
create policy "audio_likes_delete"   on public.audio_likes   for delete to authenticated using (user_id = auth.uid());

-- Un like non si modifica: si mette o si toglie.
revoke update on public.post_likes, public.comment_likes, public.audio_likes from anon, authenticated;
