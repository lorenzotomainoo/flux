/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";
import type { AuthorLite } from "@/types";

type Props = {
  src: string | null;
  name: string;
  size?: number;
  /** punto focale 0-100 (50 = centro) */
  x?: number;
  y?: number;
  className?: string;
};

export default function Avatar({ src, name, size = 40, x = 50, y = 50, className }: Props) {
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  const style = { width: size, height: size };

  if (src) {
    return (
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        style={{ ...style, objectPosition: `${x}% ${y}%` }}
        className={cn("shrink-0 rounded-full bg-surface-2 object-cover", className)}
      />
    );
  }
  return (
    <div
      style={{ ...style, fontSize: size * 0.4 }}
      className={cn("grid shrink-0 place-items-center rounded-full bg-accent font-bold text-accent-fg", className)}
      aria-hidden
    >
      {initial}
    </div>
  );
}

/** Avatar a partire da un profilo: applica da solo il punto focale scelto. */
export function UserAvatar({ user, size, className }: { user: AuthorLite; size?: number; className?: string }) {
  return (
    <Avatar
      src={user.avatar_url}
      name={user.display_name || user.username}
      x={user.avatar_x}
      y={user.avatar_y}
      size={size}
      className={className}
    />
  );
}
