"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Toglie una persona dai tuoi follower (non può più vedere i tuoi post se l'account è privato). */
export default function RemoveFollowerButton({ followerId, myId }: { followerId: string; myId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function remove() {
    setBusy(true);
    setError(false);
    const { error: err } = await createClient()
      .from("follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", myId);
    setBusy(false);
    if (err) {
      setError(true);
      return;
    }
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="shrink-0 whitespace-nowrap rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted transition hover:text-red-500"
      >
        Rimuovi
      </button>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="whitespace-nowrap rounded-xl bg-red-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
      >
        {busy ? "…" : error ? "Riprova" : "Conferma"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={busy}
        className="px-1.5 py-2 text-xs text-muted"
      >
        No
      </button>
    </div>
  );
}
