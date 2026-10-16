import { notFound, redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserPosts } from "@/lib/queries/posts";
import type { FollowStatus } from "@/types";
import { getContrastColor } from "@/lib/utils";
import ProfileHeader from "@/components/profile/ProfileHeader";
import PostCard from "@/components/feed/PostCard";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props) {
  const { username } = await params;
  return { title: `@${username.toLowerCase()}` };
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, username, display_name, bio, avatar_url, banner_url, avatar_x, avatar_y, banner_x, banner_y, accent_color, is_private"
    )
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (!profile) notFound();

  const isMe = profile.id === user.id;

  const [counts, followRow, requestRow, posts] = await Promise.all([
    supabase.rpc("follow_counts", { uid: profile.id }),
    isMe
      ? Promise.resolve({ data: null })
      : supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("following_id", profile.id)
          .maybeSingle(),
    isMe
      ? Promise.resolve({ data: null })
      : supabase
          .from("follow_requests")
          .select("requester_id")
          .eq("requester_id", user.id)
          .eq("target_id", profile.id)
          .maybeSingle(),
    // se non puoi vedere i post di un account privato, il database restituisce semplicemente una lista vuota
    getUserPosts(supabase, profile.id, user.id),
  ]);

  const isFollowing = Boolean(followRow.data);
  const followStatus: FollowStatus = isFollowing ? "following" : requestRow.data ? "requested" : "none";
  const totals = (counts.data as { followers: number; following: number }[] | null)?.[0];
  const locked = profile.is_private && !isMe && !isFollowing;

  // La pagina si tinge del colore accento di chi la possiede
  const accentStyle = {
    "--accent": profile.accent_color,
    "--accent-fg": getContrastColor(profile.accent_color),
  } as React.CSSProperties;

  return (
    <div style={accentStyle} className="space-y-5">
      <ProfileHeader
        profile={profile}
        isMe={isMe}
        followStatus={followStatus}
        followers={totals?.followers ?? 0}
        following={totals?.following ?? 0}
      />

      {locked ? (
        <div className="space-y-2 rounded-2xl border border-dashed border-border p-8 text-center">
          <Lock size={26} className="mx-auto text-muted" />
          <p className="font-semibold">Questo account è privato</p>
          <p className="text-sm text-muted">
            {followStatus === "requested"
              ? "Hai inviato la richiesta: potrai vedere i suoi post quando la accetterà."
              : "Segui questo account per vedere i suoi post. Dovrà accettare la tua richiesta."}
          </p>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted">
          Nessun post nelle ultime 24 ore.
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} currentUserId={user.id} />
          ))}
        </div>
      )}
    </div>
  );
}
