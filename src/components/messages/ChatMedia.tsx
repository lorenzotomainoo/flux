/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  /** un elemento per ogni foto/GIF; url undefined = link temporaneo ancora in arrivo */
  items: { path: string; url: string | undefined }[];
};

function Tile({ url, className }: { url: string | undefined; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (!url) return <div className={cn("animate-pulse bg-surface-2", className)} />;
  if (failed) {
    return (
      <div className={cn("grid place-items-center bg-surface-2 text-muted", className)}>
        <ImageOff size={22} aria-label="Immagine non disponibile" />
      </div>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className={cn("block overflow-hidden bg-surface-2", className)}>
      <img
        src={url}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover"
      />
    </a>
  );
}

/** Foto e GIF di un messaggio: una sola in grande, più di una in griglia. */
export default function ChatMedia({ items }: Props) {
  if (items.length === 0) return null;

  if (items.length === 1) {
    return (
      <div className="w-64 max-w-[80%] overflow-hidden rounded-2xl border border-border sm:w-72">
        <Tile url={items[0].url} className="max-h-80 min-h-32 w-full [&>img]:max-h-80" />
      </div>
    );
  }

  return (
    <div className="grid w-64 max-w-[80%] grid-cols-2 gap-1 overflow-hidden rounded-2xl border border-border sm:w-72">
      {items.map((item, i) => (
        <Tile
          key={item.path}
          url={item.url}
          className={cn("aspect-square", items.length === 3 && i === 0 && "row-span-2 aspect-auto")}
        />
      ))}
    </div>
  );
}
