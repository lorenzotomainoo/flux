/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils";

type Props = { src: string | null; name: string; size?: number; className?: string };

export default function Avatar({ src, name, size = 40, className }: Props) {
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
        style={style}
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
