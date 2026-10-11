"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type SheetAction = {
  key: string;
  label: string;
  description: string;
  confirmLabel: string;
  /** restituisce un messaggio d'errore, oppure null se è andata bene */
  run: () => Promise<string | null>;
};

type Props = {
  title: string;
  actions: SheetAction[];
  onClose: () => void;
};

/** Foglio di azioni che sale dal basso (al centro su desktop). */
export default function ChatActionSheet({ title, actions, onClose }: Props) {
  const [pending, setPending] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // dopo una pressione prolungata il dito che si solleva non deve chiudere subito il foglio
  const [openedAt] = useState(() => Date.now());

  function close() {
    if (busy) return;
    if (Date.now() - openedAt < 350) return;
    onClose();
  }

  async function confirm(action: SheetAction) {
    setBusy(true);
    setError(null);
    const message = await action.run();
    setBusy(false);
    if (message) setError(message);
    else onClose();
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <button aria-label="Chiudi" onClick={close} className="absolute inset-0 cursor-default bg-black/60" />

      <motion.div
        role="dialog"
        aria-label={title}
        className="relative w-full max-w-sm space-y-2 rounded-t-3xl border border-border bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:rounded-3xl"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 36 }}
      >
        <p className="truncate px-1 pb-1 text-center text-sm font-semibold text-muted">{title}</p>

        {actions.map((a) =>
          pending === a.key ? (
            <div key={a.key} className="space-y-3 rounded-2xl border border-red-500/40 bg-red-500/10 p-3">
              <p className="text-sm">{a.description}</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPending(null)}
                  disabled={busy}
                  className="rounded-xl border border-border bg-surface-2 py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  Annulla
                </button>
                <button
                  onClick={() => confirm(a)}
                  disabled={busy}
                  className="rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {busy ? "Un attimo…" : a.confirmLabel}
                </button>
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
          ) : (
            <button
              key={a.key}
              onClick={() => {
                setError(null);
                setPending(a.key);
              }}
              className={cn(
                "w-full rounded-2xl border border-border bg-surface-2 px-4 py-3 text-left text-red-500 transition hover:bg-border/40"
              )}
            >
              <span className="block font-semibold">{a.label}</span>
            </button>
          )
        )}

        <button onClick={close} className="w-full rounded-2xl py-3 text-sm font-semibold text-muted hover:text-fg">
          Chiudi
        </button>
      </motion.div>
    </motion.div>
  );
}

