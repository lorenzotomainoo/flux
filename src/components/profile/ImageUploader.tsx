/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { ACCEPT_ATTR, prepareImage } from "@/lib/media";
import { cn } from "@/lib/utils";

export type ImageChange = { file: File | null; removed: boolean };

type Props = {
  label: string;
  shape: "avatar" | "banner";
  currentUrl: string | null;
  maxDim: number;
  onChange: (change: ImageChange) => void;
};

export default function ImageUploader({ label, shape, currentUrl, maxDim, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const prepared = await prepareImage(file, maxDim);
      setPreview(URL.createObjectURL(prepared));
      setRemoved(false);
      onChange({ file: prepared, removed: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Immagine non valida.");
    } finally {
      setBusy(false);
    }
  }

  function onRemove() {
    setPreview(null);
    setRemoved(true);
    onChange({ file: null, removed: true });
  }

  const shown = removed ? null : (preview ?? currentUrl);

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{label}</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={cn(
            "group relative grid shrink-0 place-items-center overflow-hidden border border-dashed border-border bg-surface-2 transition hover:border-accent",
            shape === "avatar" ? "size-24 rounded-full" : "aspect-[3/1] w-full rounded-2xl"
          )}
        >
          {shown ? (
            <img src={shown} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="text-muted" size={24} />
          )}
          <span className="absolute inset-0 grid place-items-center bg-black/50 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
            {busy ? "Preparo…" : "Cambia"}
          </span>
        </button>
        {shape === "avatar" && shown && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-red-500"
          >
            <Trash2 size={16} /> Rimuovi
          </button>
        )}
      </div>
      {shape === "banner" && shown && (
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-red-500"
        >
          <Trash2 size={16} /> Rimuovi banner
        </button>
      )}
      <input ref={inputRef} type="file" accept={ACCEPT_ATTR} hidden onChange={onPick} />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
