"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  initialCount: number;
  initialLiked: boolean;
  /** salva il cambiamento; restituisce false se non è riuscito (il pulsante torna com'era) */
  onChange: (liked: boolean) => Promise<boolean>;
  /** a chi si riferisce, per chi usa un lettore di schermo: "al post", "al commento"… */
  label: string;
  size?: number;
  className?: string;
};

/** Cuore con contatore: risponde subito al tocco e annulla da solo se il salvataggio fallisce. */
export default function LikeButton({ initialCount, initialLiked, onChange, label, size = 18, className }: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    const next = !liked;
    const delta = next ? 1 : -1;
    setLiked(next);
    setCount((c) => Math.max(0, c + delta));
    setBusy(true);
    let ok = false;
    try {
      ok = await onChange(next);
    } catch {
      ok = false; // rete caduta o errore imprevisto: si annulla come se il salvataggio fosse fallito
    }
    setBusy(false);
    if (!ok) {
      setLiked(!next);
      setCount((c) => Math.max(0, c - delta));
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={liked}
      aria-label={liked ? `Togli il mi piace ${label}` : `Mi piace ${label}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm transition hover:bg-surface-2",
        liked ? "text-accent" : "text-muted hover:text-fg",
        className
      )}
    >
      {/* la chiave rimonta il cuore a ogni cambio: piccolo "pop" quando lo accendi */}
      <motion.span
        key={liked ? "on" : "off"}
        initial={liked ? { scale: 0.6 } : false}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 14 }}
        className="inline-flex"
      >
        <Heart size={size} fill={liked ? "currentColor" : "none"} />
      </motion.span>
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  );
}
