import { createClient } from "@/lib/supabase/client";
import type { Bucket } from "@/lib/storage";

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Carica un file in `<bucket>/<userId>/<uuid>.<ext>` e restituisce il percorso. */
export async function uploadImage(bucket: Bucket, userId: string, file: File): Promise<string> {
  const path = `${userId}/${crypto.randomUUID()}.${EXT[file.type] ?? "jpg"}`;
  const { error } = await createClient()
    .storage.from(bucket)
    .upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) throw new Error("Caricamento immagine non riuscito. Riprova.");
  return path;
}

/** Cancellazione "best effort": non blocca mai il flusso se fallisce. */
export async function removeImages(bucket: Bucket, paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  await createClient().storage.from(bucket).remove(paths);
}
