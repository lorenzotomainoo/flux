import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import UserResult from "@/components/search/UserResult";
import RemoveFollowerButton from "@/components/profile/RemoveFollowerButton";
import { AUTHOR_FIELDS } from "@/lib/fields";
import { cn } from "@/lib/utils";
import type { AuthorLite } from "@/types";

type Props = { params: Promise<{ username: string; list: string }> };

export default async function FollowListPage({ params }: Props) {
  const { username, list } = await params;
  if (list !== "followers" && list !== "following") notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, is_private")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (!profile) notFound();

  const isMe = profile.id === user.id;

  // account privato: le liste le vede solo chi lo segue
  let locked = false;
  if (profile.is_private && !isMe) {
    const { data: row } = await supabase
      .from("follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("following_id", profile.id)
      .maybeSingle();
    locked = !row;
  }

  let users: AuthorLite[] = [];
  if (!locked) {
    const { data } =
      list === "followers"
        ? await supabase
            .from("follows")
            .select(`created_at, user:profiles!follows_follower_id_fkey(${AUTHOR_FIELDS})`)
            .eq("following_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(100)
        : await supabase
            .from("follows")
            .select(`created_at, user:profiles!follows_following_id_fkey(${AUTHOR_FIELDS})`)
            .eq("follower_id", profile.id)
            .order("created_at", { ascending: false })
            .limit(100);
    users = ((data ?? []) as unknown as { user: AuthorLite }[]).map((r) => r.user);
  }

  const tab = (value: string, label: string) => (
    <Link
      href={`/${profile.username}/${value}`}
      className={cn(
        "flex-1 rounded-xl py-2 text-center text-sm font-semibold transition",
        list === value ? "bg-accent text-accent-fg" : "text-muted hover:bg-surface-2"
      )}
    >
      {label}
    </Link>
  );

  return (
    <div className="space-y-4">
      <Link href={`/${profile.username}`} className="text-sm text-muted hover:text-fg">
        ← @{profile.username}
      </Link>
      <div className="flex gap-1 rounded-2xl border border-border bg-surface p-1">
        {tab("followers", "Follower")}
        {tab("following", "Seguiti")}
      </div>

      {locked ? (
        <div className="space-y-2 rounded-2xl border border-dashed border-border p-8 text-center">
          <Lock size={26} className="mx-auto text-muted" />
          <p className="font-semibold">Account privato</p>
          <p className="text-sm text-muted">Solo chi segue questo account può vedere queste liste.</p>
        </div>
      ) : users.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
          {list === "followers" ? "Ancora nessun follower." : "Non segue ancora nessuno."}
        </p>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <UserResult user={u} />
              </div>
              {isMe && list === "followers" && <RemoveFollowerButton followerId={u.id} myId={user.id} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
