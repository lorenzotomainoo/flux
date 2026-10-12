export type Bucket = "avatars" | "banners" | "post-media" | "post-audio";

const base = () => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`;

export const publicUrl = (bucket: Bucket, path: string) => `${base()}/${bucket}/${path}`;

/** Ricava il percorso interno al bucket da un URL pubblico (null se non è nostro). */
export function pathFromPublicUrl(bucket: Bucket, url: string | null): string | null {
  if (!url) return null;
  const prefix = `${base()}/${bucket}/`;
  return url.startsWith(prefix) ? url.slice(prefix.length) : null;
}
