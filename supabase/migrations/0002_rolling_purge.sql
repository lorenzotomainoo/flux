-- Flux — TTL rolling: sostituisce purge_ephemeral() con una versione che
-- accetta un "cutoff" fisso. L'Edge Function lo usa per cancellare PRIMA i
-- file dallo Storage e POI le righe del DB, con lo stesso identico istante,
-- così non restano file orfani.

drop function if exists public.purge_ephemeral(boolean);

create or replace function public.purge_ephemeral(
  only_expired boolean default true,
  cutoff timestamptz default now()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if only_expired then
    -- TTL rolling: elimina solo ciò che ha superato le 24 ore
    delete from public.messages where created_at < cutoff - interval '24 hours';
    delete from public.comments where created_at < cutoff - interval '24 hours';
    delete from public.posts    where expires_at < cutoff;   -- cascade sui commenti
  else
    -- reset totale (emergenza / manutenzione)
    delete from public.messages where true;
    delete from public.comments where true;
    delete from public.posts    where true;
    update public.conversations set last_message_at = null;
  end if;
end;
$$;

revoke execute on function public.purge_ephemeral(boolean, timestamptz)
  from public, anon, authenticated;
