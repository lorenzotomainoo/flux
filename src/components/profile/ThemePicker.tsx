"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Chiaro", icon: Sun },
  { value: "dark", label: "Scuro", icon: Moon },
] as const;

export default function ThemePicker() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="grid grid-cols-2 gap-2">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme(value)}
          className={cn(
            "flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-medium transition",
            theme === value ? "border-accent bg-accent/15 text-accent" : "border-border text-muted hover:text-fg"
          )}
        >
          <Icon size={18} />
          {label}
        </button>
      ))}
    </div>
  );
}
