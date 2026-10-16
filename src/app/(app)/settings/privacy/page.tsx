import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AUTHOR_FIELDS } from "@/lib/fields";
import PrivacyForm, { type FollowRequest } from "@/components/profile/PrivacyForm";

export const metadata = { title: "Privacy" };

export default async function PrivacyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: rows }] = await Promise.all([
    supabase.from("profiles").select("is_private").eq("id", user.id).single(),
    supabase
      .from("follow_requests")
      .select(`created_at, requester:profiles!follow_requests_requester_id_fkey(${AUTHOR_FIELDS})`)
      .eq("target_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  if (!profile) throw new Error("Profilo non trovato");

  return (
    <div className="space-y-4">
      <Link href="/settings" className="text-sm text-muted hover:text-fg">
        ← Impostazioni
      </Link>
      <h1 className="text-2xl font-bold">Privacy</h1>
      <PrivacyForm isPrivate={profile.is_private} requests={(rows ?? []) as unknown as FollowRequest[]} />
    </div>
  );
}
