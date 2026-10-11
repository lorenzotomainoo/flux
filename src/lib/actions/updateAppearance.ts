"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  isBackgroundId,
  isFontId,
  isRadiusId,
  isTextSizeId,
  isTintLevel,
  type Appearance,
} from "@/lib/appearance";
import { HEX_RE } from "@/lib/utils";
import type { ActionResult } from "@/types";

export async function updateAppearance(input: Appearance): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessione scaduta, accedi di nuovo." };

  // i valori arrivano dal browser: li controlliamo uno per uno (il database fa un secondo controllo)
  if (input.theme !== "light" && input.theme !== "dark") return { error: "Tema non valido." };
  if (!HEX_RE.test(input.accent)) return { error: "Colore non valido (usa il formato #RRGGBB)." };
  if (!isFontId(input.font)) return { error: "Carattere non valido." };
  if (!isRadiusId(input.radius)) return { error: "Angoli non validi." };
  if (!isTextSizeId(input.textSize)) return { error: "Dimensione del testo non valida." };
  if (!isBackgroundId(input.background)) return { error: "Sfondo non valido." };
  if (!isTintLevel(input.tint)) return { error: "Tinta non valida." };

  const { error } = await supabase
    .from("profiles")
    .update({
      theme: input.theme,
      accent_color: input.accent.toLowerCase(),
      ui_font: input.font,
      ui_radius: input.radius,
      ui_text_size: input.textSize,
      ui_background: input.background,
      ui_tint: input.tint,
      ui_reduce_motion: Boolean(input.reduceMotion),
    })
    .eq("id", user.id);
  if (error) return { error: "Non sono riuscito a salvare l'aspetto. Riprova." };

  revalidatePath("/", "layout");
  return {};
}
