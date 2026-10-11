"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MotionConfig } from "framer-motion";
import { FONTS, TEXT_SIZES, type Appearance } from "@/lib/appearance";
import { getContrastColor, HEX_RE } from "@/lib/utils";
import type { Theme } from "@/types";

type ThemeCtx = Appearance & {
  /** applica una o più preferenze (anteprima live: il salvataggio lo fa chi chiama updateAppearance) */
  setAppearance: (patch: Partial<Appearance>) => void;
  setTheme: (t: Theme) => void;
  setAccent: (hex: string) => void;
};

const ThemeContext = createContext<ThemeCtx | null>(null);

type Props = { initial: Appearance; children: React.ReactNode };

/**
 * Applica l'aspetto scelto dall'utente (letto dal database).
 * Il wrapper è renderizzato già lato server con i valori giusti: niente flash.
 */
export function ThemeProvider({ initial, children }: Props) {
  const [appearance, setState] = useState<Appearance>(initial);

  const setAppearance = useCallback((patch: Partial<Appearance>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      if (!HEX_RE.test(next.accent)) next.accent = prev.accent;
      return next;
    });
  }, []);
  const setTheme = useCallback((theme: Theme) => setAppearance({ theme }), [setAppearance]);
  const setAccent = useCallback((accent: string) => setAppearance({ accent }), [setAppearance]);

  const { theme, accent, tint, font, radius, textSize, background, reduceMotion } = appearance;
  const accentFg = getContrastColor(accent);
  const fontStack = (FONTS.find((f) => f.value === font) ?? FONTS[0]).stack;
  const percent = (TEXT_SIZES.find((t) => t.value === textSize) ?? TEXT_SIZES[1]).percent;

  // Sincronizza anche <html> (sfondo in overscroll, barre del browser, ecc.)
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.tint = String(tint);
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--accent-fg", accentFg);
  }, [theme, tint, accent, accentFg]);

  const value = useMemo<ThemeCtx>(
    () => ({ ...appearance, setAppearance, setTheme, setAccent }),
    [appearance, setAppearance, setTheme, setAccent]
  );

  return (
    <ThemeContext.Provider value={value}>
      <MotionConfig reducedMotion={reduceMotion ? "always" : "user"}>
        {/* la dimensione del testo scala tutto il sito (usa rem); sparisce da sola quando esci dall'area autenticata */}
        <style>{`html{font-size:${percent}%}`}</style>
        <div
          data-theme={theme}
          data-tint={tint}
          data-radius={radius}
          data-bg={background}
          data-motion={reduceMotion ? "reduced" : "normal"}
          style={{ "--accent": accent, "--accent-fg": accentFg, fontFamily: fontStack } as React.CSSProperties}
          className="min-h-dvh bg-bg text-fg"
        >
          {children}
        </div>
      </MotionConfig>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve essere usato dentro <ThemeProvider>");
  return ctx;
}
