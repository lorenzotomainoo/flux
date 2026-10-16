"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock, X } from "lucide-react";
import { UserAvatar } from "@/components/ui/Avatar";
import { updatePrivacy } from "@/lib/actions/updatePrivacy";
import { createClient } from "@/lib/supabase/client";
import { cn, timeAgo } from "@/lib/utils";
import type { AuthorLite } from "@/types";

export type FollowRequest = { requester: AuthorLite; created_at: string };

type Props = { isPrivate: boolean; requests: FollowRequest[] };

export default function PrivacyForm({ isPrivate, requests }: Props) {
  const router = useRouter();
  const [priv, setPriv] = useState(isPrivate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handled, setHandled] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState<string | null>(null);

  const pending = requests.filter((r) => !handled.has(r.requester.id));

  async function toggle() {
    const next = !priv;
    // tornare pubblici accetta in automatico le richieste in attesa: chiedi conferma
    if (!next && pending.length > 0) {
      const ok = window.confirm(
        `Rendendo l'account pubblico, le ${pending.length} richieste in attesa verranno accettate e i tuoi post saranno visibili a tutti. Continuare?`
      );
      if (!ok) return;
    }
    setPriv(next);
    setSaving(true);
    setError(null);
    const res = await updatePrivacy(next);
    setSaving(false);
    if (res.error) {
      setPriv(!next);
      setError(res.error);
      return;
    }
    router.refresh();
  }

  async function respond(requesterId: string, accept: boolean) {
    setWorking(requesterId);
    setError(null);
    const { error: err } = await createClient().rpc("respond_follow_request", {
      requester: requesterId,
      accept,
    });
    setWorking(null);
    if (err) {
      setError("Non sono riuscito a rispondere alla richiesta.");
      return;
    }
    setHandled((prev) => new Set(prev).add(requesterId));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
        <button
          type="button"
          role="switch"
          aria-checked={priv}
          disabled={saving}
          onClick={toggle}
          className="flex w-full items-center justify-between gap-4 text-left disabled:opacity-70"
        >
          <span className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
              <Lock size={20} />
            </span>
            <span>
              <span className="block font-semibold">Account privato</span>
              <span className="block text-sm text-muted">{priv ? "Attivo" : "Disattivato: chiunque può seguirti"}</span>
            </span>
          </span>
          <span
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full transition-colors",
              priv ? "bg-accent" : "bg-surface-2 ring-1 ring-border"
            )}
          >
            <span
              className={cn(
                "absolute top-1 size-5 rounded-full bg-white shadow transition-all",
                priv ? "left-6" : "left-1"
              )}
            />
          </span>
        </button>

        <ul className="space-y-1.5 text-sm text-muted">
          <li>• Solo i tuoi follower vedono post, commenti e mi piace.</li>
          <li>• Per seguirti serve una richiesta, che accetti o rifiuti tu.</li>
          <li>• I tuoi post non compaiono nel feed Mondiale.</li>
          <li>• Nome, foto, bio e numero di follower restano visibili a tutti.</li>
          <li>• I follower che hai già restano: puoi toglierli dalla lista dei follower.</li>
          <li>• Le foto e gli audio dei post hanno un indirizzo non pubblicato ma non protetto da password: chi ne ha il link può aprirlo. Non condividere i link dei tuoi contenuti.</li>
        </ul>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-bold">
          Richieste di follow {pending.length > 0 && <span className="text-accent">({pending.length})</span>}
        </h2>

        {pending.length === 0 ? (
          <p className="text-sm text-muted">
            {priv ? "Nessuna richiesta in attesa." : "Le richieste arrivano solo se il tuo account è privato."}
          </p>
        ) : (
          <ul className="space-y-2">
            {pending.map(({ requester, created_at }) => (
              <li key={requester.id} className="flex items-center gap-3 rounded-xl bg-surface-2 p-2.5">
                <UserAvatar user={requester} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{requester.display_name || requester.username}</p>
                  <p suppressHydrationWarning className="truncate text-xs text-muted">
                    @{requester.username} · {timeAgo(created_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => respond(requester.id, false)}
                  disabled={working === requester.id}
                  aria-label={`Rifiuta la richiesta di ${requester.username}`}
                  className="grid size-9 place-items-center rounded-full border border-border text-muted transition hover:text-red-500 disabled:opacity-50"
                >
                  <X size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => respond(requester.id, true)}
                  disabled={working === requester.id}
                  aria-label={`Accetta la richiesta di ${requester.username}`}
                  className="grid size-9 place-items-center rounded-full bg-accent text-accent-fg transition active:scale-95 disabled:opacity-50"
                >
                  <Check size={18} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
