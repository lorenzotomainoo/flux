import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUnreadCount } from "@/lib/queries/messages";
import { ThemeProvider } from "@/context/ThemeContext";
import AppShell from "@/components/layout/AppShell";
import type { Theme } from "@/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile, error }, unread] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name, avatar_url, theme, accent_color")
      .eq("id", user.id)
      .single(),
    getUnreadCount(supabase, user.id),
  ]);

  // Non fare redirect a /login qui: il middleware ti rimanderebbe a /home (loop).
  if (error || !profile) throw new Error("Profilo non trovato");

  return (
    <ThemeProvider initialTheme={profile.theme as Theme} initialAccent={profile.accent_color}>
      <AppShell
        userId={user.id}
        username={profile.username}
        displayName={profile.display_name}
        avatarUrl={profile.avatar_url}
        unread={unread}
      >
        {children}
      </AppShell>
    </ThemeProvider>
  );
}
