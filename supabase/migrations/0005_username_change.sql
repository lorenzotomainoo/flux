-- =====================================================================
-- Flux — 0005: cambio username (una volta ogni 30 giorni)
-- Esegui UNA SOLA VOLTA nel SQL Editor di Supabase.
-- Dopo l'esecuzione rigenera i tipi TypeScript.
-- =====================================================================

alter table public.profiles add column username_changed_at timestamptz;  -- null = mai cambiato

-- ---------------------------------------------------------------------
-- BLOCCO DELLE MODIFICHE DIRETTE
-- Finora la policy "profiles_update_own" lasciava aggiornare QUALSIASI colonna del
-- proprio profilo: bastava una chiamata diretta per cambiare username e saltare il limite.
-- Ora si possono aggiornare solo le colonne elencate qui; username e username_changed_at
-- si cambiano esclusivamente con change_username().
-- (Se in futuro aggiungi una colonna modificabile dall'utente, ricordati di aggiungerla a questo grant.)
-- ---------------------------------------------------------------------
revoke update on public.profiles from anon, authenticated;
grant update (
  display_name, bio, avatar_url, banner_url, theme, accent_color,
  avatar_x, avatar_y, banner_x, banner_y
) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- change_username: valida, applica il limite dei 30 giorni e cambia
-- Errori (nel messaggio): invalid_format, reserved, same, cooldown, taken
-- ---------------------------------------------------------------------
create or replace function public.change_username(new_username text)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  clean text := lower(btrim(coalesce(new_username, '')));
  cur text;
  last_change timestamptz;
begin
  if me is null then raise exception 'not authenticated'; end if;

  -- blocca la riga: due richieste simultanee non possono aggirare il limite
  select username, username_changed_at into cur, last_change
  from public.profiles where id = me for update;
  if cur is null then raise exception 'profile not found'; end if;

  if clean !~ '^[a-z0-9_]{3,20}$' then raise exception 'invalid_format'; end if;
  if clean in ('home','messages','login','signup','api','search','settings',
               'auth','admin','flux','null','undefined') then
    raise exception 'reserved';
  end if;
  if clean = cur then raise exception 'same'; end if;

  if last_change is not null and now() < last_change + interval '30 days' then
    raise exception 'cooldown';
  end if;

  begin
    update public.profiles set username = clean, username_changed_at = now() where id = me;
  exception when unique_violation then
    raise exception 'taken';
  end;

  return clean;
end;
$$;

revoke execute on function public.change_username(text) from public, anon;
grant  execute on function public.change_username(text) to authenticated;
