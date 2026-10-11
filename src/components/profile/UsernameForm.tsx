"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useDebounce } from "@/hooks/useDebounce";
import { createClient } from "@/lib/supabase/client";
import {
  RESERVED_USERNAMES,
  USERNAME_COOLDOWN_DAYS,
  USERNAME_RE,
  normalizeUsername,
} from "@/lib/username";
import { cn } from "@/lib/utils";

type Props = {
  current: string;
  /** quando è stato cambiato l'ultima volta (null = mai) */
  changedAt: string | null;
};

type Availability = "idle" | "checking" | "free" | "taken";
type Checked = { name: string; taken: boolean };

const DAY_MS = 24 * 60 * 60 * 1000;

function friendlyError(message: string) {
  if (message.includes("cooldown")) return "Hai cambiato username da poco: riprova più avanti.";
  if (message.includes("taken")) return "Questo username è già in uso.";
  if (message.includes("reserved")) return "Questo username non è disponibile.";
  if (message.includes("invalid_format")) return "Usa da 3 a 20 caratteri: lettere minuscole, numeri e _.";
  if (message.includes("same")) return "È già il tuo username.";
  return "Non sono riuscito a cambiare username. Riprova.";
}

export default function UsernameForm({ current, changedAt }: Props) {
  const router = useRouter();
  const [value, setValue] = useState(current);
  const [checked, setChecked] = useState<Checked | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justChanged, setJustChanged] = useState<string | null>(null);

  const normalized = normalizeUsername(value);
  const debounced = useDebounce(normalized, 350);

  const formatOk = USERNAME_RE.test(normalized);
  const reserved = RESERVED_USERNAMES.includes(normalized);
  const same = normalized === current;

  // Blocco: dopo un cambio non se ne può fare un altro per 30 giorni
  const lastChange = justChanged ? Date.now() : changedAt ? new Date(changedAt).getTime() : null;
  const nextChange = lastChange === null ? null : lastChange + USERNAME_COOLDOWN_DAYS * DAY_MS;
  const locked = nextChange !== null && Date.now() < nextChange;
  const nextDate =
    nextChange === null
      ? ""
      : new Date(nextChange).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });

  const valid = formatOk && !reserved && !same;

  // Disponibilità in tempo reale
  useEffect(() => {
    if (locked || !valid || debounced !== normalized) return;
    let cancelled = false;
    createClient()
      .from("profiles")
      .select("id")
      .eq("username", debounced)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setChecked({ name: debounced, taken: Boolean(data) });
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, normalized, valid, locked]);

  // l'esito vale solo per il nome che è stato davvero controllato
  const status: Availability =
    !valid || locked
      ? "idle"
      : checked?.name === normalized
        ? checked.taken
          ? "taken"
          : "free"
        : "checking";

  const canSubmit = valid && !locked && status === "free" && !saving;

  async function confirm() {
    setSaving(true);
    setError(null);
    const { data, error } = await createClient().rpc("change_username", { new_username: normalized });
    setSaving(false);
    if (error || !data) {
      setConfirming(false);
      setError(friendlyError(error?.message ?? ""));
      return;
    }
    setConfirming(false);
    setJustChanged(data);
    setValue(data);
    router.refresh(); // aggiorna barra laterale e link al profilo
  }

  let hint: { text: string; tone: "ok" | "bad" | "muted" } | null = null;
  if (locked) hint = null;
  else if (!normalized || same) hint = { text: "Da 3 a 20 caratteri: lettere minuscole, numeri e _.", tone: "muted" };
  else if (!formatOk) hint = { text: "Usa da 3 a 20 caratteri: lettere minuscole, numeri e _.", tone: "bad" };
  else if (reserved) hint = { text: "Questo username non è disponibile.", tone: "bad" };
  else if (status === "checking") hint = { text: "Controllo la disponibilità…", tone: "muted" };
  else if (status === "free") hint = { text: `@${normalized} è disponibile.`, tone: "ok" };
  else if (status === "taken") hint = { text: "Questo username è già in uso.", tone: "bad" };

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-5">
      <div>
        <h2 className="font-bold">Username</h2>
        <p className="text-sm text-muted">
          Puoi cambiarlo una volta ogni {USERNAME_COOLDOWN_DAYS} giorni. Il tuo profilo si trova su /{current}.
        </p>
      </div>

      <div className="space-y-1.5">
        <div
          className={cn(
            "flex items-center rounded-xl border bg-surface px-4 transition focus-within:border-accent",
            locked ? "border-border opacity-60" : "border-border"
          )}
        >
          <span className="text-muted">@</span>
          <input
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setConfirming(false);
              setError(null);
              setJustChanged(null);
            }}
            disabled={locked || saving}
            maxLength={21}
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            aria-label="Username"
            className="min-w-0 flex-1 bg-transparent py-3 pl-1 text-base outline-none"
          />
        </div>

        {locked ? (
          <p suppressHydrationWarning className="text-sm text-muted">
            {justChanged ? "Username aggiornato! " : ""}
            Potrai cambiarlo di nuovo dal {nextDate}.
          </p>
        ) : (
          hint && (
            <p
              className={cn(
                "text-sm",
                hint.tone === "ok" && "text-green-500",
                hint.tone === "bad" && "text-red-500",
                hint.tone === "muted" && "text-muted"
              )}
            >
              {hint.text}
            </p>
          )
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {!locked &&
        (confirming ? (
          <div className="space-y-3 rounded-2xl border border-orange-500/40 bg-orange-500/10 p-3">
            <p className="text-sm">
              Il tuo profilo diventerà /{normalized}. I link al vecchio username smetteranno di funzionare e
              potrai cambiarlo di nuovo solo tra {USERNAME_COOLDOWN_DAYS} giorni.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setConfirming(false)} disabled={saving}>
                Annulla
              </Button>
              <Button onClick={confirm} disabled={saving}>
                {saving ? "Cambio…" : "Conferma"}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setConfirming(true)} disabled={!canSubmit} className="w-full py-3">
            Cambia username
          </Button>
        ))}
    </section>
  );
}
