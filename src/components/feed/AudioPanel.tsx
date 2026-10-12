"use client";

import { Square, X } from "lucide-react";
import AudioPlayer from "./AudioPlayer";
import { formatClock } from "@/lib/audio";
import { MAX_AUDIO_SECONDS } from "@/lib/limits";
import type { AudioDraft } from "@/hooks/useAudioDraft";

type Props = {
  recording: boolean;
  seconds: number;
  busy: boolean;
  draft: AudioDraft | null;
  onStop: () => void;
  onCancel: () => void;
  onRemove: () => void;
};

/** Mostra lo stato dell'audio nel compositore: registrazione in corso, elaborazione o anteprima. */
export default function AudioPanel({ recording, seconds, busy, draft, onStop, onCancel, onRemove }: Props) {
  if (recording) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-3 py-2.5">
        <span className="size-3 shrink-0 animate-pulse rounded-full bg-red-500" aria-hidden />
        <span className="flex-1 text-sm font-semibold tabular-nums">
          Registro… {formatClock(seconds)}{" "}
          <span className="font-normal text-muted">/ {formatClock(MAX_AUDIO_SECONDS)}</span>
        </span>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Annulla registrazione"
          className="grid size-9 place-items-center rounded-full text-muted transition hover:text-fg"
        >
          <X size={18} />
        </button>
        <button
          type="button"
          onClick={onStop}
          aria-label="Ferma la registrazione"
          className="grid size-10 place-items-center rounded-full bg-red-500 text-white transition active:scale-95"
        >
          <Square size={16} fill="currentColor" />
        </button>
      </div>
    );
  }

  if (busy) {
    return <p className="rounded-2xl border border-border bg-surface-2 px-3 py-3 text-sm text-muted">Elaboro l&apos;audio…</p>;
  }

  if (draft) {
    return (
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <AudioPlayer src={draft.url} duration={draft.duration} peaks={draft.peaks} preload="metadata" />
        </div>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Rimuovi audio"
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-2 hover:text-red-500"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  return null;
}
