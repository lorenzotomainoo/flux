"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw } from "lucide-react";
import AccentPicker from "./AccentPicker";
import ThemePicker from "./ThemePicker";
import Button from "@/components/ui/Button";
import { useTheme } from "@/context/ThemeContext";
import { updateAppearance } from "@/lib/actions/updateAppearance";
import {
  BACKGROUNDS,
  DEFAULT_APPEARANCE,
  FONTS,
  PRESETS,
  RADII,
  TEXT_SIZES,
  TINTS,
  type Appearance,
} from "@/lib/appearance";
import { cn } from "@/lib/utils";

const radiusPreview: Record<string, string> = {
  sharp: "rounded-none",
  medium: "rounded-md",
  soft: "rounded-xl",
  round: "rounded-3xl",
};

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-5">
      <div>
        <h2 className="font-bold">{title}</h2>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Choice({
  active,
  onClick,
  children,
  className,
  style,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      style={style}
      className={cn(
        "flex flex-col items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium transition",
        active ? "border-accent bg-accent/15 text-accent" : "border-border text-muted hover:text-fg",
        className
      )}
    >
      {children}
    </button>
  );
}

export default function AppearanceForm({ saved }: { saved: Appearance }) {
  const router = useRouter();
  const t = useTheme();
  const { setAppearance } = t;
  const current: Appearance = {
    theme: t.theme,
    accent: t.accent,
    font: t.font,
    radius: t.radius,
    textSize: t.textSize,
    background: t.background,
    tint: t.tint,
    reduceMotion: t.reduceMotion,
  };

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // ultimo aspetto salvato: se esci senza salvare, l'anteprima live viene annullata
  const baseline = useRef(saved);
  useEffect(() => {
    return () => setAppearance(baseline.current);
  }, [setAppearance]);

  const changed = JSON.stringify(current) !== JSON.stringify(baseline.current);

  function apply(patch: Partial<Appearance>) {
    setDone(false);
    setAppearance(patch);
  }

  async function save() {
    setSaving(true);
    setError(null);
    setDone(false);
    const res = await updateAppearance(current);
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    baseline.current = current;
    setDone(true);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <p className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted">
        L&apos;anteprima è immediata su tutto il sito. Premi <strong className="text-fg">Salva aspetto</strong> per
        renderla definitiva: la ritroverai su ogni dispositivo.
      </p>

      <Section title="Temi pronti" hint="Un punto di partenza: poi puoi cambiare ogni dettaglio qui sotto.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {PRESETS.map((p) => {
            const active =
              current.theme === p.values.theme &&
              current.accent.toLowerCase() === p.values.accent &&
              current.tint === p.values.tint &&
              current.background === p.values.background &&
              current.radius === p.values.radius &&
              current.font === p.values.font;
            return (
              <Choice key={p.id} active={active} onClick={() => apply(p.values)}>
                <span className="flex items-center gap-2">
                  <span className="size-3.5 rounded-full" style={{ backgroundColor: p.values.accent }} />
                  {p.label}
                </span>
              </Choice>
            );
          })}
        </div>
      </Section>

      <Section title="Modalità e colore">
        <ThemePicker />
        <AccentPicker />
      </Section>

      <Section title="Tinta dello sfondo" hint="Mescola un po' del tuo colore accento nei fondi, nelle schede e nei bordi.">
        <div className="grid grid-cols-4 gap-2">
          {TINTS.map((o) => (
            <Choice key={o.value} active={current.tint === o.value} onClick={() => apply({ tint: o.value })}>
              {o.label}
            </Choice>
          ))}
        </div>
      </Section>

      <Section title="Sfondo">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BACKGROUNDS.map((o) => (
            <Choice key={o.value} active={current.background === o.value} onClick={() => apply({ background: o.value })}>
              {o.label}
            </Choice>
          ))}
        </div>
      </Section>

      <Section title="Carattere">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {FONTS.map((o) => (
            <Choice
              key={o.value}
              active={current.font === o.value}
              onClick={() => apply({ font: o.value })}
              style={{ fontFamily: o.stack }}
            >
              <span className="text-xl leading-none text-fg">Aa</span>
              {o.label}
            </Choice>
          ))}
        </div>
      </Section>

      <Section title="Angoli">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RADII.map((o) => (
            <Choice key={o.value} active={current.radius === o.value} onClick={() => apply({ radius: o.value })}>
              <span className={cn("size-8 border-2 border-current", radiusPreview[o.value])} />
              {o.label}
            </Choice>
          ))}
        </div>
      </Section>

      <Section title="Dimensione del testo" hint="Ingrandisce o rimpicciolisce l'intero sito.">
        <div className="grid grid-cols-3 gap-2">
          {TEXT_SIZES.map((o) => (
            <Choice key={o.value} active={current.textSize === o.value} onClick={() => apply({ textSize: o.value })}>
              <span style={{ fontSize: `${o.percent}%` }} className="leading-none text-fg">
                Aa
              </span>
              {o.label}
            </Choice>
          ))}
        </div>
      </Section>

      <Section title="Animazioni">
        <button
          type="button"
          role="switch"
          aria-checked={current.reduceMotion}
          onClick={() => apply({ reduceMotion: !current.reduceMotion })}
          className="flex w-full items-center justify-between gap-4 text-left"
        >
          <span>
            <span className="block font-medium">Riduci le animazioni</span>
            <span className="block text-sm text-muted">Niente transizioni e movimenti, per un sito più statico.</span>
          </span>
          <span
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full transition-colors",
              current.reduceMotion ? "bg-accent" : "bg-surface-2 ring-1 ring-border"
            )}
          >
            <span
              className={cn(
                "absolute top-1 size-5 rounded-full bg-white shadow transition-all",
                current.reduceMotion ? "left-6" : "left-1"
              )}
            />
          </span>
        </button>
      </Section>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {done && (
        <p className="flex items-center gap-1.5 text-sm text-accent">
          <Check size={16} /> Aspetto salvato!
        </p>
      )}

      <div className="sticky bottom-24 z-10 flex gap-2 md:bottom-4">
        <Button
          variant="secondary"
          onClick={() => apply(DEFAULT_APPEARANCE)}
          disabled={saving}
          aria-label="Ripristina l'aspetto predefinito"
          className="px-3.5"
        >
          <RotateCcw size={18} />
        </Button>
        <Button onClick={save} disabled={saving || !changed} className="flex-1 py-3 shadow-lg">
          {saving ? "Salvo…" : "Salva aspetto"}
        </Button>
      </div>
    </div>
  );
}
