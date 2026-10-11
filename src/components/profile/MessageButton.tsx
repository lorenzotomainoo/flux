"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export default function MessageButton({ targetId }: { targetId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  async function open() {
    setBusy(true);
    setError(false);
    const { data, error } = await createClient().rpc("get_or_create_conversation", {
      other_user: targetId,
    });
    if (error || !data) {
      setBusy(false);
      setError(true);
      return;
    }
    router.push(`/messages/${data}`);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      {/* su telefono solo icona: lascia spazio al pulsante Segui */}
      <Button
        variant="secondary"
        onClick={open}
        disabled={busy}
        aria-label="Scrivi un messaggio"
        className="px-3 sm:px-4"
      >
        <MessageCircle size={18} />
        <span className="hidden sm:inline">{busy ? "Apro…" : "Scrivi"}</span>
      </Button>
      {error && <span className="text-xs text-red-500">Chat non disponibile</span>}
    </div>
  );
}
