import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ThemeProvider } from "@/context/ThemeContext";
import AppShell from "@/components/layout/AppShell";
import type { Theme } from "@/types";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username, display_name, theme, accent_color")
    .eq("id", user.id)
    .single();

  // Non fare redirect a /login qui: il middleware ti rimanderebbe a /home (loop).
  if (error || !profile) throw new Error("Profilo non trovato");

  return (
    <ThemeProvider
      initialTheme={profile.theme as Theme}
      initialAccent={profile.accent_color}
    >
      <AppShell username={profile.username} displayName={profile.display_name}>
        {children}
      </AppShell>
    </ThemeProvider>
  );
}
