/* eslint-disable @next/next/no-img-element */
import { publicUrl } from "@/lib/storage";
import { cn } from "@/lib/utils";

export default function MediaGrid({ paths }: { paths: string[] }) {
  if (paths.length === 0) return null;
  const n = paths.length;

  return (
    <div
      className={cn(
        "grid gap-1 overflow-hidden rounded-2xl border border-border",
        n === 1 ? "grid-cols-1" : "grid-cols-2",
        n === 1 ? "max-h-[28rem]" : "aspect-[4/3]"
      )}
    >
      {paths.map((path, i) => (
        <a
          key={path}
          href={publicUrl("post-media", path)}
          target="_blank"
          rel="noreferrer"
          className={cn("block overflow-hidden bg-surface-2", n === 3 && i === 0 && "row-span-2")}
        >
          <img
            src={publicUrl("post-media", path)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        </a>
      ))}
    </div>
  );
}
