-- =====================================================================
-- Flux — 0008: foto, GIF e audio nelle chat (private e di gruppo)
-- Esegui UNA SOLA VOLTA nel SQL Editor di Supabase.
-- Dopo l'esecuzione: rigenera i tipi TypeScript e ridistribuisci la Edge Function.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. COLONNE DEI MESSAGGI
-- ---------------------------------------------------------------------
alter table public.messages
  add column media_paths    text[] not null default '{}',
  add column audio_path     text,
  add column audio_duration integer,
  add column audio_peaks    smallint[];

-- Un messaggio può avere solo allegati: il testo non è più obbligatorio.
-- Il vecchio vincolo ("tra 1 e 2000 caratteri") viene sostituito da uno sul massimo + uno "non vuoto".
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.messages'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%char_length(content)%'
  loop
    execute format('alter table public.messages drop constraint %I', c.conname);
  end loop;
end $$;

-- tutti i percorsi devono stare nella cartella di chi invia
create or replace function public.paths_in_folder(paths text[], folder text)
returns boolean
language sql immutable
as $$
  select not exists (select 1 from unnest(paths) p where p not like (folder || '/%'));
$$;

alter table public.messages
  add constraint messages_content_len   check (char_length(content) <= 2000),
  add constraint messages_media_max     check (cardinality(media_paths) <= 4),
  add constraint messages_media_folder  check (public.paths_in_folder(media_paths, sender_id::text)),
  add constraint messages_audio_dur     check (audio_duration is null or audio_duration between 1 and 600),
  add constraint messages_audio_peaks   check (audio_peaks is null or cardinality(audio_peaks) between 8 and 128),
  add constraint messages_audio_complete check ((audio_path is null) = (audio_duration is null)),
  add constraint messages_audio_folder  check (audio_path is null or audio_path like (sender_id::text || '/%')),
  add constraint messages_not_empty     check (
    char_length(content) > 0 or cardinality(media_paths) > 0 or audio_path is not null
  );

-- ---------------------------------------------------------------------
-- 2. STORAGE PRIVATO
--    A differenza dei post, i file delle chat NON sono pubblici: si leggono solo con un
--    link temporaneo firmato, e solo se sei partecipante della conversazione.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('chat-media', 'chat-media', false, 3145728,
   array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('chat-audio', 'chat-audio', false, 5242880,
   array['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac',
         'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm', 'audio/flac'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- carichi solo nella tua cartella
create policy "chat_files_insert_own_folder" on storage.objects
  for insert to authenticated with check (
    bucket_id in ('chat-media', 'chat-audio') and (storage.foldername(name))[1] = auth.uid()::text
  );

-- elimini solo i tuoi (serve a ripulire se l'invio fallisce)
create policy "chat_files_delete_own_folder" on storage.objects
  for delete to authenticated using (
    bucket_id in ('chat-media', 'chat-audio') and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Leggi un file se:
--   a) è tuo (cartella con il tuo id): serve anche per poterlo eliminare, perché in Postgres per cancellare
--      una riga bisogna poterla leggere. Così se un invio fallisce l'app ripulisce i file già caricati.
--   b) oppure compare in un messaggio che TU puoi leggere. La sicurezza dei messaggi (partecipanti, chat
--      scadute, chat eliminate per te) si applica da sola: chi non è nella conversazione non vede il file.
create policy "chat_files_select" on storage.objects
  for select to authenticated using (
    bucket_id in ('chat-media', 'chat-audio')
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.messages m
        where (bucket_id = 'chat-media' and name = any (m.media_paths))
           or (bucket_id = 'chat-audio' and name = m.audio_path)
      )
    )
  );

-- ---------------------------------------------------------------------
-- 3. FILE ORFANI
--    Quando un messaggio sparisce (dopo 24 ore, chat temporanea scaduta, gruppo eliminato) i suoi file
--    restano nello Storage: la Edge Function li elenca con questa funzione e li cancella.
--    Si ignorano i file più recenti di 1 ora: potrebbero essere in fase di invio.
-- ---------------------------------------------------------------------
create or replace function public.orphan_chat_files(max_rows integer default 500)
returns table (bucket_id text, name text)
language sql stable security definer set search_path = public, storage
as $$
  select o.bucket_id, o.name
  from storage.objects o
  where o.bucket_id in ('chat-media', 'chat-audio')
    and o.created_at < now() - interval '1 hour'
    and not exists (
      select 1 from public.messages m
      where (o.bucket_id = 'chat-media' and o.name = any (m.media_paths))
         or (o.bucket_id = 'chat-audio' and o.name = m.audio_path)
    )
  limit max_rows;
$$;
revoke execute on function public.orphan_chat_files(integer) from public, anon, authenticated;
grant  execute on function public.orphan_chat_files(integer) to service_role;
