"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Ghost, Users } from "lucide-react";
import { UserAvatar } from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { AuthorLite } from "@/types";

const DURATIONS = [
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 ora" },
  { minutes: 180, label: "3 ore" },
  { minutes: 720, label: "12 ore" },
  { minutes: 1440, label: "24 ore" },
];

const inputCls =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none transition focus:border-accent";

function friendlyError(message: string) {
  if (message.includes("follow")) return "Puoi aggiungere solo persone che segui.";
  if (message.includes("invalid name")) return "Dai un nome al gruppo (massimo 40 caratteri).";
  if (message.includes("at least one")) return "Scegli almeno una persona.";
  if (message.includes("too many")) return "Un gruppo può avere al massimo 50 persone.";
  return "Non sono riuscito a creare il gruppo. Riprova.";
}

export default function NewGroupForm({ following }: { following: AuthorLite[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [temporary, setTemporary] = useState(false);
  const [minutes, setMinutes] = useState(60);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^@/, "");
    if (!q) return following;
    return following.filter(
      (u) => u.username.includes(q) || (u.display_name ?? "").toLowerCase().includes(q)
    );
  }, [following, query]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 49) next.add(id);
      return next;
    });
  }

  const canCreate = name.trim().length > 0 && selected.size > 0 && !busy;

  async function create() {
    if (!canCreate) return;
    setBusy(true);
    setError(null);
    const { data, error } = await createClient().rpc("create_group", {
      group_name: name.trim(),
      member_ids: [...selected],
      duration_minutes: temporary ? minutes : undefined,
    });
    if (error || !data) {
      setBusy(false);
      setError(friendlyError(error?.message ?? ""));
      return;
    }
    router.push(`/messages/${data}`);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <label htmlFor="group-name" className="text-sm font-semibold">Nome del gruppo</label>
        <input
          id="group-name"
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          placeholder="Es. Squadra del sabato"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Durata</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: false, label: "Permanente", icon: Users },
            { value: true, label: "Temporanea", icon: Ghost },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => setTemporary(value)}
              className={cn(
                "flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-medium transition",
                temporary === value ? "border-accent bg-accent/15 text-accent" : "border-border text-muted hover:text-fg"
              )}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>

        {temporary && (
          <div className="space-y-2 rounded-2xl border border-border bg-surface p-3">
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d.minutes}
                  type="button"
                  onClick={() => setMinutes(d.minutes)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                    minutes === d.minutes ? "border-accent bg-accent text-accent-fg" : "border-border text-muted hover:text-fg"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted">
              Dopo il tempo scelto la chat si autodistrugge, con tutti i messaggi. Avrà lo sfondo con il fantasma.
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold">Partecipanti</p>
          <span className="text-xs text-muted">{selected.size} selezionati</span>
        </div>

        {following.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted">
            Puoi aggiungere solo persone che segui. <Link href="/search" className="font-semibold text-accent">Cerca qualcuno</Link> da seguire.
          </p>
        ) : (
          <>
            <input
              className={inputCls}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtra tra chi segui"
              autoCapitalize="none"
            />
            <ul className="max-h-80 space-y-1 overflow-y-auto rounded-2xl border border-border bg-surface p-1.5">
              {filtered.length === 0 && <li className="p-3 text-center text-sm text-muted">Nessun risultato.</li>}
              {filtered.map((u) => {
                const on = selected.has(u.id);
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => toggle(u.id)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition",
                        on ? "bg-accent/10" : "hover:bg-surface-2"
                      )}
                    >
                      <UserAvatar user={u} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{u.display_name || u.username}</span>
                        <span className="block truncate text-sm text-muted">@{u.username}</span>
                      </span>
                      <span
                        className={cn(
                          "grid size-6 shrink-0 place-items-center rounded-full border transition",
                          on ? "border-accent bg-accent text-accent-fg" : "border-border"
                        )}
                      >
                        {on && <Check size={14} />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button onClick={create} disabled={!canCreate} className="w-full py-3">
        {busy ? "Creo…" : temporary ? "Crea chat temporanea" : "Crea gruppo"}
      </Button>
    </div>
  );
}
