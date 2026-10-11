import Link from "next/link";
import { redirect } from "next/navigation";
import { Palette } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import EditProfileForm from "@/components/profile/EditProfileForm";
import UsernameForm from "@/components/profile/UsernameForm";

export const metadata = { title: "Impostazioni" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, username_changed_at, display_name, bio, avatar_url, banner_url, avatar_x, avatar_y, banner_x, banner_y")
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("Profilo non trovato");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Modifica profilo</h1>
      <Link
        href="/settings/appearance"
        className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition hover:bg-surface-2"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent">
          <Palette size={20} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Aspetto del sito</span>
          <span className="block text-sm text-muted">Temi, colori, carattere, angoli, sfondo e dimensione del testo</span>
        </span>
        <span className="text-muted">›</span>
      </Link>
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
        }}
      />
    </div>
  );
}
