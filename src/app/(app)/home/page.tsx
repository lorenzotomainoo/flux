import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFeed } from "@/lib/queries/posts";
import PostComposer from "@/components/feed/PostComposer";
import FeedList from "@/components/feed/FeedList";

export const metadata = { title: "Home" };

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, feed] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url, avatar_x, avatar_y").eq("id", user.id).single(),
    getFeed(supabase, user.id),
  ]);

  return (
    <div className="space-y-5">
      <PostComposer
        userId={user.id}
        displayName={profile?.display_name ?? ""}
        avatarUrl={profile?.avatar_url ?? null}
        avatarX={profile?.avatar_x}
        avatarY={profile?.avatar_y}
      />
      <FeedList initialPosts={feed.posts} hasMoreInitial={feed.hasMore} currentUserId={user.id} />
    </div>
  );
}
