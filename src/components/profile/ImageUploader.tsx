/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair, ImagePlus, Trash2 } from "lucide-react";
import { ACCEPT_ATTR, prepareImage } from "@/lib/media";
import { cn } from "@/lib/utils";

export type ImageChange = { file: File | null; removed: boolean };
export type FocusPoint = { x: number; y: number };

type Props = {
  label: string;
  shape: "avatar" | "banner";
  currentUrl: string | null;
  maxDim: number;
  /** punto focale scelto (0-100, 50 = centro) */
  position: FocusPoint;
  onPositionChange: (p: FocusPoint) => void;
  onChange: (change: ImageChange) => void;
};

const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));
const CENTER: FocusPoint = { x: 50, y: 50 };

/**
 * Carica l'immagine e permette di scegliere COSA mostrare trascinandola dentro la cornice.
 * Non ritaglia il file: salva solo il punto focale, quindi funziona anche con le GIF animate
 * e si può cambiare in qualsiasi momento senza ricaricare la foto.
 */
export default function ImageUploader({
  label,
  shape,
  currentUrl,
  maxDim,
  position,
  onPositionChange,
  onChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const natural = useRef({ w: 0, h: 0 });
  const drag = useRef<{ px: number; py: number; start: FocusPoint; cw: number; ch: number } | null>(null);

  const [preview, setPreview] = useState<string | null>(null);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const shown = removed ? null : (preview ?? currentUrl);

  function readNatural(img: HTMLImageElement | null) {
    if (img && img.naturalWidth) natural.current = { w: img.naturalWidth, h: img.naturalHeight };
  }

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
      onPositionChange(CENTER);
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
    onPositionChange(CENTER);
    onChange({ file: null, removed: true });
  }

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!shown) return;
    const rect = e.currentTarget.getBoundingClientRect();
    drag.current = { px: e.clientX, py: e.clientY, start: position, cw: rect.width, ch: rect.height };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = drag.current;
    const { w, h } = natural.current;
    if (!d || !w || !h) return;
    // quanto l'immagine "sborda" dalla cornice con object-fit: cover
    const scale = Math.max(d.cw / w, d.ch / h);
    const overX = w * scale - d.cw;
    const overY = h * scale - d.ch;
    onPositionChange({
      // trascinare verso destra mostra più parte sinistra, quindi il punto focale scende
      x: overX > 1 ? clamp(d.start.x - ((e.clientX - d.px) / overX) * 100) : d.start.x,
      y: overY > 1 ? clamp(d.start.y - ((e.clientY - d.py) / overY) * 100) : d.start.y,
    });
  }

  function endDrag() {
    drag.current = null;
    setDragging(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const step = 5;
    const moves: Record<string, FocusPoint> = {
      ArrowLeft: { x: position.x - step, y: position.y },
      ArrowRight: { x: position.x + step, y: position.y },
      ArrowUp: { x: position.x, y: position.y - step },
      ArrowDown: { x: position.x, y: position.y + step },
    };
    const next = moves[e.key];
    if (!next) return;
    e.preventDefault();
    onPositionChange({ x: clamp(next.x), y: clamp(next.y) });
  }

  const centered = position.x === 50 && position.y === 50;

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{label}</p>

      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        tabIndex={shown ? 0 : -1}
        aria-label={shown ? "Trascina per scegliere l'inquadratura" : undefined}
        className={cn(
          "relative overflow-hidden border border-border bg-surface-2 outline-none focus-visible:border-accent",
          shape === "avatar" ? "size-32 rounded-full" : "aspect-[3/1] w-full rounded-2xl",
          shown && "touch-none select-none",
          shown && (dragging ? "cursor-grabbing" : "cursor-grab")
        )}
      >
        {shown ? (
          <img
            ref={readNatural}
            src={shown}
            alt=""
            draggable={false}
            onLoad={(e) => readNatural(e.currentTarget)}
            className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
            style={{ objectPosition: `${position.x}% ${position.y}%` }}
          />
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="absolute inset-0 grid place-items-center text-muted transition hover:text-accent"
            aria-label="Scegli un'immagine"
          >
            <ImagePlus size={26} />
          </button>
        )}
      </div>

      {shown && (
        <p className="text-xs text-muted">Trascina l&apos;immagine per scegliere cosa mostrare.</p>
      )}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 font-semibold text-accent disabled:opacity-50"
        >
          <ImagePlus size={16} />
          {busy ? "Preparo…" : shown ? "Cambia" : "Scegli immagine"}
        </button>
        {shown && !centered && (
          <button
            type="button"
            onClick={() => onPositionChange(CENTER)}
            className="inline-flex items-center gap-1.5 text-muted transition hover:text-fg"
          >
            <Crosshair size={16} /> Centra
          </button>
        )}
        {shown && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 text-muted transition hover:text-red-500"
          >
            <Trash2 size={16} /> Rimuovi
          </button>
        )}
      </div>

      <input ref={inputRef} type="file" accept={ACCEPT_ATTR} hidden onChange={onPick} />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
