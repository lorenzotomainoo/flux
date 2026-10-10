import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserPosts } from "@/lib/queries/posts";
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
    .select("id, username, display_name, bio, avatar_url, banner_url, accent_color")
    .eq("username", username.toLowerCase())
    .maybeSingle();
  if (!profile) notFound();

  const isMe = profile.id === user.id;

  const [followers, following, followRow, posts] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profile.id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profile.id),
    isMe
      ? Promise.resolve({ data: null })
      : supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("following_id", profile.id)
          .maybeSingle(),
    getUserPosts(supabase, profile.id),
  ]);

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
        isFollowing={Boolean(followRow.data)}
        followers={followers.count ?? 0}
        following={following.count ?? 0}
      />

      {posts.length === 0 ? (
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
