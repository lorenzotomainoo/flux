import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { appearanceFromProfile } from "@/lib/appearance";
import AppearanceForm from "@/components/profile/AppearanceForm";

export const metadata = { title: "Aspetto" };

export default async function AppearancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("theme, accent_color, ui_font, ui_radius, ui_text_size, ui_background, ui_tint, ui_reduce_motion")
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("Profilo non trovato");

  return (
    <div className="space-y-4">
      <Link href="/settings" className="text-sm text-muted hover:text-fg">
        ← Impostazioni
      </Link>
      <h1 className="text-2xl font-bold">Aspetto</h1>
      <AppearanceForm saved={appearanceFromProfile(profile)} />
    </div>
  );
}
