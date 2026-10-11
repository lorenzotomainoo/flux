import { HEX_RE } from "@/lib/utils";
import type { Theme } from "@/types";

export type FontId = "jakarta" | "inter" | "grotesk" | "serif" | "mono";
export type RadiusId = "sharp" | "medium" | "soft" | "round";
export type TextSizeId = "small" | "normal" | "large";
export type BackgroundId = "clean" | "glow" | "dots" | "grid";
export type TintLevel = 0 | 1 | 2 | 3;

export type Appearance = {
  theme: Theme;
  accent: string;
  font: FontId;
  radius: RadiusId;
  textSize: TextSizeId;
  background: BackgroundId;
  tint: TintLevel;
  reduceMotion: boolean;
};

export const DEFAULT_APPEARANCE: Appearance = {
  theme: "dark",
  accent: "#7c5cff",
  font: "jakarta",
  radius: "medium",
  textSize: "normal",
  background: "clean",
  tint: 0,
  reduceMotion: false,
};

// Le variabili --font-* sono definite nel layout principale (next/font).
export const FONTS: { value: FontId; label: string; stack: string }[] = [
  { value: "jakarta", label: "Jakarta", stack: "var(--font-jakarta), ui-sans-serif, system-ui, sans-serif" },
  { value: "inter", label: "Inter", stack: "var(--font-inter), ui-sans-serif, system-ui, sans-serif" },
  { value: "grotesk", label: "Grotesk", stack: "var(--font-grotesk), ui-sans-serif, system-ui, sans-serif" },
  { value: "serif", label: "Lora", stack: "var(--font-serif), ui-serif, Georgia, serif" },
  { value: "mono", label: "Mono", stack: "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace" },
];

export const RADII: { value: RadiusId; label: string }[] = [
  { value: "sharp", label: "Squadrati" },
  { value: "medium", label: "Medi" },
  { value: "soft", label: "Morbidi" },
  { value: "round", label: "Rotondi" },
];

/** percentuale applicata al font-size della pagina: scala tutto, perché il sito usa rem */
export const TEXT_SIZES: { value: TextSizeId; label: string; percent: number }[] = [
  { value: "small", label: "Piccolo", percent: 93.75 },
  { value: "normal", label: "Normale", percent: 100 },
  { value: "large", label: "Grande", percent: 112.5 },
];

export const BACKGROUNDS: { value: BackgroundId; label: string }[] = [
  { value: "clean", label: "Pulito" },
  { value: "glow", label: "Alone" },
  { value: "dots", label: "Punti" },
  { value: "grid", label: "Griglia" },
];

export const TINTS: { value: TintLevel; label: string }[] = [
  { value: 0, label: "Nessuna" },
  { value: 1, label: "Leggera" },
  { value: 2, label: "Media" },
  { value: 3, label: "Forte" },
];

/** Combinazioni pronte: applicano tema, accento, tinta, sfondo, angoli e carattere in un colpo. */
export const PRESETS: { id: string; label: string; values: Omit<Appearance, "textSize" | "reduceMotion"> }[] = [
  { id: "default", label: "Predefinito", values: { theme: "dark", accent: "#7c5cff", tint: 0, background: "clean", radius: "medium", font: "jakarta" } },
  { id: "sunset", label: "Tramonto", values: { theme: "dark", accent: "#ff7a45", tint: 2, background: "glow", radius: "soft", font: "jakarta" } },
  { id: "ocean", label: "Oceano", values: { theme: "dark", accent: "#3dc9ff", tint: 3, background: "glow", radius: "round", font: "inter" } },
  { id: "forest", label: "Foresta", values: { theme: "dark", accent: "#2ee59d", tint: 2, background: "dots", radius: "medium", font: "grotesk" } },
  { id: "paper", label: "Carta", values: { theme: "light", accent: "#d9480f", tint: 1, background: "clean", radius: "sharp", font: "serif" } },
  { id: "terminal", label: "Terminale", values: { theme: "dark", accent: "#22c55e", tint: 0, background: "grid", radius: "sharp", font: "mono" } },
];

const isOne = <T extends string>(list: { value: T }[], v: unknown): v is T =>
  typeof v === "string" && list.some((o) => o.value === v);

export const isFontId = (v: unknown): v is FontId => isOne(FONTS, v);
export const isRadiusId = (v: unknown): v is RadiusId => isOne(RADII, v);
export const isTextSizeId = (v: unknown): v is TextSizeId => isOne(TEXT_SIZES, v);
export const isBackgroundId = (v: unknown): v is BackgroundId => isOne(BACKGROUNDS, v);
export const isTintLevel = (v: unknown): v is TintLevel => v === 0 || v === 1 || v === 2 || v === 3;

/** Costruisce l'aspetto dalle colonne del profilo, scartando qualunque valore inatteso. */
export function appearanceFromProfile(p: {
  theme: string;
  accent_color: string;
  ui_font: string;
  ui_radius: string;
  ui_text_size: string;
  ui_background: string;
  ui_tint: number;
  ui_reduce_motion: boolean;
}): Appearance {
  const d = DEFAULT_APPEARANCE;
  return {
    theme: p.theme === "light" ? "light" : "dark",
    accent: HEX_RE.test(p.accent_color) ? p.accent_color : d.accent,
    font: isFontId(p.ui_font) ? p.ui_font : d.font,
    radius: isRadiusId(p.ui_radius) ? p.ui_radius : d.radius,
    textSize: isTextSizeId(p.ui_text_size) ? p.ui_text_size : d.textSize,
    background: isBackgroundId(p.ui_background) ? p.ui_background : d.background,
    tint: isTintLevel(p.ui_tint) ? p.ui_tint : d.tint,
    reduceMotion: Boolean(p.ui_reduce_motion),
  };
}
