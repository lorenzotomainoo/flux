"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { cn, timeLeft } from "@/lib/utils";

export default function ExpiryBadge({ expiresAt }: { expiresAt: string }) {
  const [left, setLeft] = useState(() => timeLeft(expiresAt));

  useEffect(() => {
    const id = setInterval(() => setLeft(timeLeft(expiresAt)), 30_000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return (
    <span
      suppressHydrationWarning
      className={cn(
        "inline-flex items-center gap-1 text-xs",
        left.urgent ? "font-semibold text-orange-500" : "text-muted"
      )}
    >
      <Clock size={12} />
      scade tra {left.label}
    </span>
  );
}
