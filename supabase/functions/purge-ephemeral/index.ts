// Edge Function: pulizia oraria dei contenuti effimeri di Flux.
// Deploy con:  npx supabase functions deploy purge-ephemeral --no-verify-jwt
// (l'autenticazione è gestita qui sotto con CRON_SECRET)

import { createClient } from "jsr:@supabase/supabase-js@2";

const BUCKET = "post-media";
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

  // 1. Raccogli i percorsi dei file dei post scaduti (paginato)
  const paths: string[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("posts")
      .select("id, media_paths")
      .lt("expires_at", cutoff)
      .order("id")
      .range(from, from + PAGE - 1);

    if (error) return json({ error: error.message }, 500);
    if (!data || data.length === 0) break;
    for (const post of data) paths.push(...(post.media_paths as string[]));
    if (data.length < PAGE) break;
  }

  // 2. Elimina i file dallo Storage. Se fallisce ci fermiamo SENZA toccare il DB:
  //    al prossimo giro (tra un'ora) riproverà con gli stessi post.
  let filesRemoved = 0;
  for (let i = 0; i < paths.length; i += CHUNK) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .remove(paths.slice(i, i + CHUNK));
    if (error) return json({ error: `storage: ${error.message}` }, 500);
    filesRemoved += data?.length ?? 0;
  }

  // 3. Elimina post, commenti e messaggi scaduti
  const { error: rpcError } = await supabase.rpc("purge_ephemeral", {
    only_expired: true,
    cutoff,
  });
  if (rpcError) return json({ error: `db: ${rpcError.message}` }, 500);

  return json({ ok: true, cutoff, filesRemoved });
});
