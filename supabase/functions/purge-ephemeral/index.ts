// Edge Function: pulizia oraria dei contenuti effimeri di Flux.
// Deploy con:  npx supabase functions deploy purge-ephemeral --no-verify-jwt --use-api
// (l'autenticazione è gestita qui sotto con CRON_SECRET)

import { createClient } from "jsr:@supabase/supabase-js@2";

const PAGE = 1000;
const CHUNK = 100;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("Authorization") !== `Bearer ${secret}`) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } }
  );

  // Un unico istante di riferimento per tutta l'operazione
  const cutoff = new Date().toISOString();

  // 1. Raccogli i file dei post scaduti: foto (post-media) e audio (post-audio)
  const photoPaths: string[] = [];
  const audioPaths: string[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("posts")
      .select("id, media_paths, audio_path")
      .lt("expires_at", cutoff)
      .order("id")
      .range(from, from + PAGE - 1);

    if (error) return json({ error: error.message }, 500);
    if (!data || data.length === 0) break;
    for (const post of data) {
      photoPaths.push(...((post.media_paths as string[] | null) ?? []));
      if (post.audio_path) audioPaths.push(post.audio_path as string);
    }
    if (data.length < PAGE) break;
  }

  // 2. Elimina i file dallo Storage. Se fallisce ci fermiamo SENZA toccare il DB:
  //    al prossimo giro (tra un'ora) riproverà con gli stessi post.
  let filesRemoved = 0;
  for (const [bucket, paths] of [
    ["post-media", photoPaths],
    ["post-audio", audioPaths],
  ] as const) {
    for (let i = 0; i < paths.length; i += CHUNK) {
      const { data, error } = await supabase.storage.from(bucket).remove(paths.slice(i, i + CHUNK));
      if (error) return json({ error: `storage (${bucket}): ${error.message}` }, 500);
      filesRemoved += data?.length ?? 0;
    }
  }

  // 3. Elimina post, commenti, messaggi e chat temporanee scadute
  const { error: rpcError } = await supabase.rpc("purge_ephemeral", {
    only_expired: true,
    cutoff,
  });
  if (rpcError) return json({ error: `db: ${rpcError.message}` }, 500);

  // 4. File delle chat rimasti senza messaggio: messaggi scaduti, chat temporanee finite, gruppi eliminati.
  //    (si ignorano quelli di meno di un'ora: potrebbero essere in fase di invio)
  const ORPHAN_BATCH = 500;
  let orphansRemoved = 0;
  for (let round = 0; round < 5; round++) {
    const { data: orphans, error: orphanError } = await supabase.rpc("orphan_chat_files", {
      max_rows: ORPHAN_BATCH,
    });
    if (orphanError) return json({ error: `orphans: ${orphanError.message}` }, 500);

    const rows = (orphans ?? []) as { bucket_id: string; name: string }[];
    if (rows.length === 0) break;

    for (const bucket of ["chat-media", "chat-audio"]) {
      const names = rows.filter((r) => r.bucket_id === bucket).map((r) => r.name);
      for (let i = 0; i < names.length; i += CHUNK) {
        const { data, error } = await supabase.storage.from(bucket).remove(names.slice(i, i + CHUNK));
        if (error) return json({ error: `storage (${bucket}): ${error.message}` }, 500);
        orphansRemoved += data?.length ?? 0;
      }
    }
    if (rows.length < ORPHAN_BATCH) break;
  }

  return json({ ok: true, cutoff, filesRemoved, orphansRemoved });
});
