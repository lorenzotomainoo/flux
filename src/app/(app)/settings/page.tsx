import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditProfileForm from "@/components/profile/EditProfileForm";
import type { Theme } from "@/types";

export const metadata = { title: "Impostazioni" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, bio, avatar_url, banner_url, theme, accent_color")
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("Profilo non trovato");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Modifica profilo</h1>
      <EditProfileForm
        userId={user.id}
        initial={{
          display_name: profile.display_name,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
          banner_url: profile.banner_url,
          theme: profile.theme as Theme,
          accent_color: profile.accent_color,
        }}
      />
    </div>
  );
}
