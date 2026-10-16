"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

export async function updatePrivacy(isPrivate: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessione scaduta, accedi di nuovo." };

  const { error } = await supabase
    .from("profiles")
    .update({ is_private: Boolean(isPrivate) })
    .eq("id", user.id);
  if (error) return { error: "Non sono riuscito a salvare. Riprova." };

  revalidatePath("/", "layout");
  return {};
}
