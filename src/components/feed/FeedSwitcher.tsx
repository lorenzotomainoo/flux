"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeedScope } from "@/types";

const TABS = [
  { value: "seguiti", label: "Seguiti", icon: Users, href: "/home" },
  { value: "mondiale", label: "Mondiale", icon: Globe, href: "/home?feed=mondiale" },
] as const;

type Props = { current: FeedScope; children: React.ReactNode };

/** Selettore del feed. Il feed scelto sta nell'indirizzo (?feed=mondiale): sopravvive al ricaricamento. */
export default function FeedSwitcher({ current, children }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<FeedScope | null>(null);

  // la linguetta si accende subito, senza aspettare il caricamento
  const shown = pending && target ? target : current;

  function go(next: FeedScope, href: string) {
    if (next === shown) return;
    setTarget(next);
    startTransition(() => {
      router.replace(href, { scroll: false });
    });
  }

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Scegli il feed" className="flex gap-1 rounded-2xl border border-border bg-surface p-1">
        {TABS.map(({ value, label, icon: Icon, href }) => (
          <button
            key={value}
            role="tab"
            aria-selected={shown === value}
            onClick={() => go(value, href)}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold transition",
              shown === value ? "bg-accent text-accent-fg" : "text-muted hover:bg-surface-2 hover:text-fg"
            )}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      <div aria-busy={pending} className={cn("transition-opacity duration-150", pending && "opacity-50")}>
        {children}
      </div>
    </div>
  );
}
