-- =====================================================================
-- Flux — 0007: audio nei post
-- Esegui UNA SOLA VOLTA nel SQL Editor di Supabase.
-- Dopo l'esecuzione: rigenera i tipi TypeScript e ridistribuisci la Edge Function.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. COLONNE
--    audio_peaks = ampiezza di ~48 barre (0-100), calcolata dal browser: serve a disegnare la forma d'onda
-- ---------------------------------------------------------------------
alter table public.posts
  add column audio_path     text,
  add column audio_duration integer
    check (audio_duration is null or audio_duration between 1 and 600),
  add column audio_peaks    smallint[]
    check (audio_peaks is null or cardinality(audio_peaks) between 8 and 128);

-- durata obbligatoria se c'è un audio, e il file deve stare nella cartella dell'autore
alter table public.posts
  add constraint posts_audio_complete
    check ((audio_path is null) = (audio_duration is null)),
  add constraint posts_audio_own_folder
    check (audio_path is null or audio_path like (author_id::text || '/%'));

-- ---------------------------------------------------------------------
-- 2. "UN POST NON PUÒ ESSERE VUOTO": ora vale anche con il solo audio
-- ---------------------------------------------------------------------
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.posts'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%char_length(content) > 0%'
  loop
    execute format('alter table public.posts drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.posts add constraint posts_not_empty check (
  char_length(content) > 0 or cardinality(media_paths) > 0 or audio_path is not null
);

-- ---------------------------------------------------------------------
-- 3. STORAGE: bucket degli audio (max 5MB, solo formati audio)
--    I formati devono coincidere con quelli accettati dall'app (src/lib/audio.ts)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-audio', 'post-audio', true, 5242880,
  array['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac',
        'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/webm', 'audio/flac']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "audio_read_public" on storage.objects
  for select using (bucket_id = 'post-audio');

create policy "audio_insert_own_folder" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'post-audio' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "audio_update_own_folder" on storage.objects
  for update to authenticated using (
    bucket_id = 'post-audio' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "audio_delete_own_folder" on storage.objects
  for delete to authenticated using (
    bucket_id = 'post-audio' and (storage.foldername(name))[1] = auth.uid()::text
  );
