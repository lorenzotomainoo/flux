"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getContrastColor, HEX_RE } from "@/lib/utils";
import type { Theme } from "@/types";

type ThemeCtx = {
  theme: Theme;
  accent: string;
  setTheme: (t: Theme) => void;
  setAccent: (hex: string) => void;
};

const ThemeContext = createContext<ThemeCtx | null>(null);

type Props = {
  initialTheme: Theme;
  initialAccent: string;
  children: React.ReactNode;
};

/**
 * Applica tema e colore accento letti dal database.
 * Il wrapper è renderizzato già lato server con i valori giusti (niente flash);
 * setTheme/setAccent permettono l'anteprima live nelle impostazioni.
 * Il salvataggio su DB lo faremo con una Server Action.
 */
export function ThemeProvider({ initialTheme, initialAccent, children }: Props) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [accent, setAccentState] = useState(initialAccent);

  const setAccent = (hex: string) => {
    if (HEX_RE.test(hex)) setAccentState(hex);
  };

  const accentFg = getContrastColor(accent);

  // Sincronizza anche <html> (sfondo in overscroll, barre del browser, ecc.)
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.setProperty("--accent", accent);
    root.style.setProperty("--accent-fg", accentFg);
  }, [theme, accent, accentFg]);

  const value = useMemo(() => ({ theme, accent, setTheme, setAccent }), [theme, accent]);

  return (
    <ThemeContext.Provider value={value}>
      <div
        data-theme={theme}
        style={{ "--accent": accent, "--accent-fg": accentFg } as React.CSSProperties}
        className="min-h-dvh bg-bg text-fg"
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme deve essere usato dentro <ThemeProvider>");
  return ctx;
}
