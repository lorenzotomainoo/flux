-- =====================================================================
-- Flux — 0006: preferenze di aspetto del sito
-- Esegui UNA SOLA VOLTA nel SQL Editor di Supabase.
-- Dopo l'esecuzione rigenera i tipi TypeScript.
-- =====================================================================

alter table public.profiles
  add column ui_font          text     not null default 'jakarta'
    check (ui_font in ('jakarta', 'inter', 'grotesk', 'serif', 'mono')),
  add column ui_radius        text     not null default 'medium'
    check (ui_radius in ('sharp', 'medium', 'soft', 'round')),
  add column ui_text_size     text     not null default 'normal'
    check (ui_text_size in ('small', 'normal', 'large')),
  add column ui_background    text     not null default 'clean'
    check (ui_background in ('clean', 'glow', 'dots', 'grid')),
  add column ui_tint          smallint not null default 0
    check (ui_tint between 0 and 3),
  add column ui_reduce_motion boolean  not null default false;

-- Come per le altre colonne del profilo, l'utente può modificare solo quelle esplicitamente consentite
-- (username e username_changed_at restano bloccati: si cambiano solo con change_username()).
grant update (ui_font, ui_radius, ui_text_size, ui_background, ui_tint, ui_reduce_motion)
  on public.profiles to authenticated;
