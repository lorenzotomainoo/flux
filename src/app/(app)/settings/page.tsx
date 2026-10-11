import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EditProfileForm from "@/components/profile/EditProfileForm";
import UsernameForm from "@/components/profile/UsernameForm";
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
    .select("username, username_changed_at, display_name, bio, avatar_url, banner_url, avatar_x, avatar_y, banner_x, banner_y, theme, accent_color")
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("Profilo non trovato");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Modifica profilo</h1>
      <UsernameForm current={profile.username} changedAt={profile.username_changed_at} />
      <EditProfileForm
        userId={user.id}
        initial={{
          display_name: profile.display_name,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
          banner_url: profile.banner_url,
          avatar_x: profile.avatar_x,
          avatar_y: profile.avatar_y,
          banner_x: profile.banner_x,
          banner_y: profile.banner_y,
          theme: profile.theme as Theme,
          accent_color: profile.accent_color,
        }}
      />
    </div>
  );
}
