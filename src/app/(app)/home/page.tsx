import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFeed } from "@/lib/queries/posts";
import PostComposer from "@/components/feed/PostComposer";
import FeedList from "@/components/feed/FeedList";
import FeedSwitcher from "@/components/feed/FeedSwitcher";
import type { FeedScope } from "@/types";

export const metadata = { title: "Home" };

type Props = { searchParams: Promise<{ feed?: string }> };

export default async function HomePage({ searchParams }: Props) {
  const { feed } = await searchParams;
  const scope: FeedScope = feed === "mondiale" ? "mondiale" : "seguiti";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, feedData] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url, avatar_x, avatar_y").eq("id", user.id).single(),
    getFeed(supabase, user.id, scope),
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
      <FeedSwitcher current={scope}>
        {/* key: cambiando feed la lista riparte da zero (niente post del feed precedente) */}
        <FeedList
          key={scope}
          scope={scope}
          initialPosts={feedData.posts}
          hasMoreInitial={feedData.hasMore}
          currentUserId={user.id}
        />
      </FeedSwitcher>
    </div>
  );
}
