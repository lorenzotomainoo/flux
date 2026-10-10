import clsx, { type ClassValue } from "clsx";

export const cn = (...inputs: ClassValue[]) => clsx(inputs);

export const HEX_RE = /^#[0-9a-f]{6}$/i;

/** Restituisce nero o bianco, a seconda di quale è più leggibile sopra `hex`. */
export function getContrastColor(hex: string): "#000000" | "#ffffff" {
  if (!HEX_RE.test(hex)) return "#ffffff";
  const h = hex.slice(1);
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.4 ? "#000000" : "#ffffff";
}

/** "ora", "5 min fa", "3 h fa" */
export function timeAgo(iso: string): string {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "ora";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min fa`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} h fa` : "1 g fa";
}

/** Tempo rimanente prima della scadenza di un contenuto. */
export function timeLeft(iso: string): { label: string; urgent: boolean } {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { label: "in scadenza", urgent: true };
  const m = Math.ceil(ms / 60000);
  if (m < 60) return { label: `${m} min`, urgent: true };
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return { label: rest ? `${h}h ${rest}m` : `${h}h`, urgent: false };
}
