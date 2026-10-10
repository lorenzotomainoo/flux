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
