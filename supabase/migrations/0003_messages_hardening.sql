-- Flux — Fase 4: sicurezza dei messaggi
--
-- La policy "messages_update_read" lasciava a un partecipante la possibilità di
-- modificare QUALSIASI colonna dei messaggi ricevuti (anche il testo).
-- Restringiamo l'UPDATE alla sola colonna read_at ("letto").

revoke update on public.messages from anon, authenticated;
grant  update (read_at) on public.messages to authenticated;

-- Verifica (facoltativa): deve elencare solo read_at
-- select column_name, privilege_type
-- from information_schema.column_privileges
-- where table_name = 'messages' and grantee = 'authenticated' and privilege_type = 'UPDATE';
