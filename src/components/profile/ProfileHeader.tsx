/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import FollowButton from "./FollowButton";
import MessageButton from "./MessageButton";

type Props = {
  profile: {
    id: string;
    username: string;
    display_name: string;
    bio: string;
    avatar_url: string | null;
    banner_url: string | null;
    avatar_x: number;
    avatar_y: number;
    banner_x: number;
    banner_y: number;
  };
  isMe: boolean;
  isFollowing: boolean;
  followers: number;
  following: number;
};

export default function ProfileHeader({ profile, isMe, isFollowing, followers, following }: Props) {
  const name = profile.display_name || profile.username;

  return (
    <section className="overflow-hidden rounded-3xl border border-border bg-surface">
      <div className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-accent/70 to-accent/10 sm:h-44">
        {profile.banner_url && (
          <img
            src={profile.banner_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: `${profile.banner_x}% ${profile.banner_y}%` }}
          />
        )}
      </div>

      <div className="px-5 pb-5">
        <div className="relative z-10 -mt-12 flex items-end justify-between gap-3">
          <div className="shrink-0 rounded-full border-4 border-surface bg-surface">
            <Avatar
              src={profile.avatar_url}
              name={name}
              size={96}
              x={profile.avatar_x}
              y={profile.avatar_y}
            />
          </div>
          {isMe ? (
            <Link
              href="/settings"
              className="whitespace-nowrap rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm font-semibold transition hover:bg-border/40"
            >
              Modifica profilo
            </Link>
          ) : (
            <div className="flex shrink-0 items-start gap-2">
              <MessageButton targetId={profile.id} />
              <FollowButton
                targetId={profile.id}
                targetUsername={profile.username}
                initialFollowing={isFollowing}
              />
            </div>
          )}
        </div>

        <div className="mt-3">
          <h1 className="text-xl font-extrabold">{name}</h1>
          <p className="text-muted">@{profile.username}</p>
        </div>

        {profile.bio && <p className="mt-3 whitespace-pre-wrap break-words">{profile.bio}</p>}

        <div className="mt-4 flex gap-5 text-sm">
          <Link href={`/${profile.username}/followers`} className="hover:underline">
            <span className="font-bold">{followers}</span> <span className="text-muted">follower</span>
          </Link>
          <Link href={`/${profile.username}/following`} className="hover:underline">
            <span className="font-bold">{following}</span> <span className="text-muted">seguiti</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
