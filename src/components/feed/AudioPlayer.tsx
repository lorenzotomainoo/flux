"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { formatClock } from "@/lib/audio";
import { cn } from "@/lib/utils";

// Un solo audio alla volta: se ne parte un altro, il precedente si ferma.
let activeAudio: HTMLAudioElement | null = null;

const FLAT_BARS = Array.from({ length: 40 }, () => 28);

type Props = {
  src: string;
  /** durata in secondi (nota dal database: non serve scaricare il file per mostrarla) */
  duration: number;
  /** forma d'onda: valori 0-100 (null = barre uniformi) */
  peaks: number[] | null;
  preload?: "none" | "metadata" | "auto";
};

export default function AudioPlayer({ src, duration, peaks, preload = "none" }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [failed, setFailed] = useState(false);

  const bars = peaks && peaks.length > 0 ? peaks : FLAT_BARS;
  const ratio = duration > 0 ? Math.min(1, time / duration) : 0;

  useEffect(() => {
    const el = audioRef.current;
    return () => {
      if (el && activeAudio === el) activeAudio = null;
    };
  }, []);

  async function toggle() {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      return;
    }
    if (activeAudio && activeAudio !== el) activeAudio.pause();
    activeAudio = el;
    try {
      await el.play();
    } catch {
      setFailed(true);
    }
  }

  function seekTo(fraction: number) {
    const el = audioRef.current;
    if (!el) return;
    const t = Math.max(0, Math.min(duration, fraction * duration));
    el.currentTime = t;
    setTime(t);
  }

  function seekFromPointer(e: React.PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    seekTo((e.clientX - rect.left) / rect.width);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      seekTo((time + 5) / duration);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      seekTo((time - 5) / duration);
    }
  }

  if (failed) {
    return (
      <div className="rounded-2xl border border-border bg-surface-2 px-3 py-3 text-sm text-muted">
        Audio non disponibile.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2 px-3 py-2.5">
      <audio
        ref={audioRef}
        src={src}
        preload={preload}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setTime(0);
          if (audioRef.current) audioRef.current.currentTime = 0;
        }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onError={() => setFailed(true)}
      />

      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Metti in pausa" : "Riproduci audio"}
        className="grid size-10 shrink-0 place-items-center rounded-full bg-accent text-accent-fg transition active:scale-95"
      >
        {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
      </button>

      <div
        role="slider"
        tabIndex={0}
        aria-label="Posizione dell'audio"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={Math.round(time)}
        aria-valuetext={`${formatClock(time)} di ${formatClock(duration)}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          seekFromPointer(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons > 0) seekFromPointer(e);
        }}
        onKeyDown={onKeyDown}
        className="flex h-10 min-w-0 flex-1 cursor-pointer touch-none items-center gap-[2px] outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {bars.map((value, i) => (
          <span
            key={i}
            style={{ height: `${Math.min(100, Math.max(8, value))}%` }}
            className={cn(
              "w-full min-w-[2px] rounded-full transition-colors",
              i / bars.length < ratio ? "bg-accent" : "bg-fg/25"
            )}
          />
        ))}
      </div>

      <span className="w-11 shrink-0 text-right text-xs tabular-nums text-muted">
        {formatClock(playing || time > 0 ? time : duration)}
      </span>
    </div>
  );
}
