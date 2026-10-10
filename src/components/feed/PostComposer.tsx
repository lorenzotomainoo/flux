/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import { createPost } from "@/lib/actions/createPost";
import { MAX_IMAGES_PER_POST, MAX_POST_LENGTH } from "@/lib/limits";
import { ACCEPT_ATTR, prepareImage } from "@/lib/media";
import { removeImages, uploadImage } from "@/lib/upload";

type Props = { userId: string; displayName: string; avatarUrl: string | null };
type Attachment = { file: File; url: string };

export default function PostComposer({ userId, displayName, avatarUrl }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<Attachment[]>([]);
  const [preparing, setPreparing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // libera le anteprime alla chiusura della pagina
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  useEffect(() => () => filesRef.current.forEach((f) => URL.revokeObjectURL(f.url)), []);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (picked.length === 0) return;

    setError(null);
    const room = MAX_IMAGES_PER_POST - files.length;
    if (picked.length > room) setError(`Puoi allegare al massimo ${MAX_IMAGES_PER_POST} foto per post.`);

    setPreparing(true);
    const added: Attachment[] = [];
    for (const file of picked.slice(0, Math.max(room, 0))) {
      try {
        const prepared = await prepareImage(file, 1920);
        added.push({ file: prepared, url: URL.createObjectURL(prepared) });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Immagine non valida.");
      }
    }
    setFiles((prev) => [...prev, ...added]);
    setPreparing(false);
  }

  function removeAt(index: number) {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  }

  const canPost = (content.trim().length > 0 || files.length > 0) && !posting && !preparing;

  async function submit() {
    if (!canPost) return;
    setPosting(true);
    setError(null);
    const uploaded: string[] = [];
    try {
      for (const { file } of files) uploaded.push(await uploadImage("post-media", userId, file));
      const res = await createPost(content, uploaded);
      if (res.error) throw new Error(res.error);

      files.forEach((f) => URL.revokeObjectURL(f.url));
      setFiles([]);
      setContent("");
      router.refresh();
    } catch (err) {
      await removeImages("post-media", uploaded); // niente file orfani se il post non è stato creato
      setError(err instanceof Error ? err.message : "Qualcosa è andato storto.");
    } finally {
      setPosting(false);
    }
  }

  const remaining = MAX_POST_LENGTH - content.length;

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex gap-3">
        <Avatar src={avatarUrl} name={displayName} size={42} />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={MAX_POST_LENGTH}
          rows={2}
          placeholder="Cosa succede? Sparirà tra 24 ore."
          className="min-h-14 flex-1 resize-none bg-transparent pt-2 text-base outline-none placeholder:text-muted"
        />
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {files.map((f, i) => (
            <div key={f.url} className="relative aspect-square overflow-hidden rounded-xl bg-surface-2">
              <img src={f.url} alt="" className="h-full w-full object-cover" />
              <button
                onClick={() => removeAt(i)}
                aria-label="Rimuovi foto"
                className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-black/70 text-white"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <input ref={inputRef} type="file" accept={ACCEPT_ATTR} multiple hidden onChange={onPick} />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={files.length >= MAX_IMAGES_PER_POST || preparing}
            aria-label="Aggiungi foto"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-accent transition hover:bg-accent/10 disabled:opacity-40"
          >
            <ImagePlus size={20} />
            <span className="text-muted">
              {preparing ? "Preparo…" : `${files.length}/${MAX_IMAGES_PER_POST}`}
            </span>
          </button>
          <span className={remaining < 40 ? "text-sm text-orange-500" : "text-sm text-muted"}>{remaining}</span>
        </div>
        <Button onClick={submit} disabled={!canPost}>
          {posting ? "Pubblico…" : "Pubblica"}
        </Button>
      </div>
    </section>
  );
}
