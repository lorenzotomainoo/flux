"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { HEX_RE, cn } from "@/lib/utils";

const PRESETS = ["#7c5cff", "#ff5c8a", "#ff8a3d", "#ffd23f", "#2ee59d", "#3dc9ff", "#4d7cff", "#c084fc"];

export default function AccentPicker() {
  const { accent, setAccent } = useTheme();
  const [draft, setDraft] = useState<string | null>(null);

  function onType(raw: string) {
    let v = raw.trim();
    if (!v.startsWith("#")) v = "#" + v;
    v = v.slice(0, 7);
    setDraft(v);
    if (HEX_RE.test(v)) setAccent(v);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Colore ${c}`}
            onClick={() => {
              setAccent(c);
              setDraft(null);
            }}
            style={{ backgroundColor: c }}
            className={cn(
              "grid size-9 place-items-center rounded-full ring-offset-2 ring-offset-surface transition",
              accent.toLowerCase() === c ? "ring-2 ring-fg" : "hover:scale-110"
            )}
          >
            {accent.toLowerCase() === c && <Check size={16} className="text-white mix-blend-difference" />}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <input
          type="color"
          value={accent}
          onChange={(e) => {
            setAccent(e.target.value);
            setDraft(null);
          }}
          aria-label="Scegli un colore"
          className="size-11 cursor-pointer rounded-xl border border-border bg-transparent p-1"
        />
        <input
          value={draft ?? accent}
          onChange={(e) => onType(e.target.value)}
          onBlur={() => setDraft(null)}
          maxLength={7}
          spellCheck={false}
          autoCapitalize="none"
          placeholder="#7c5cff"
          className="w-32 rounded-xl border border-border bg-surface px-3 py-2.5 font-mono text-base uppercase outline-none transition focus:border-accent"
        />
      </div>
    </div>
  );
}
