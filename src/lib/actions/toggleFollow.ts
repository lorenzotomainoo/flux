"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

export async function toggleFollow(
  targetId: string,
  targetUsername: string,
  follow: boolean
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessione scaduta, accedi di nuovo." };
  if (user.id === targetId) return { error: "Non puoi seguire te stesso." };

  if (follow) {
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: user.id, following_id: targetId });
    // 23505 = già seguito: va bene così
    if (error && error.code !== "23505") return { error: "Operazione non riuscita." };
  } else {
    const { error } = await supabase
      .from("follows")
      .delete()
      .eq("follower_id", user.id)
      .eq("following_id", targetId);
    if (error) return { error: "Operazione non riuscita." };
  }

  revalidatePath(`/${targetUsername}`);
  revalidatePath("/home");
  return {};
}
