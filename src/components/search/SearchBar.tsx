"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import UserResult from "./UserResult";
import { useDebounce } from "@/hooks/useDebounce";
import { AUTHOR_FIELDS } from "@/lib/fields";
import { createClient } from "@/lib/supabase/client";
import type { AuthorLite } from "@/types";

export default function SearchBar() {
  const [value, setValue] = useState("");
  const [results, setResults] = useState<AuthorLite[]>([]);
  const [loading, setLoading] = useState(false);

  // gli username sono solo a-z 0-9 _ : normalizziamo l'input
  const q = useDebounce(value.trim().toLowerCase().replace(/^@/, "").replace(/[^a-z0-9_]/g, ""), 250);

  useEffect(() => {
    if (!q) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    createClient()
      .from("profiles")
      .select(AUTHOR_FIELDS)
      .like("username", `${q}%`)
      .order("username")
      .limit(20)
      .then(({ data }) => {
        if (cancelled) return;
        setResults((data ?? []) as AuthorLite[]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [q]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Cerca @username"
          autoCapitalize="none"
          autoCorrect="off"
          autoFocus
          className="w-full rounded-2xl border border-border bg-surface py-3 pl-11 pr-4 text-base outline-none transition focus:border-accent"
        />
      </div>

      {!q && <p className="text-sm text-muted">Scrivi un @username per trovare persone da seguire.</p>}
      {q && loading && results.length === 0 && <p className="text-sm text-muted">Cerco…</p>}
      {q && !loading && results.length === 0 && (
        <p className="text-sm text-muted">Nessun utente trovato per @{q}.</p>
      )}

      <div className="space-y-2">
        {results.map((u) => (
          <UserResult key={u.id} user={u} />
        ))}
      </div>
    </div>
  );
}
