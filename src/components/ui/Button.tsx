import { cn } from "@/lib/utils";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export default function Button({ variant = "primary", className, ...rest }: Props) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100",
        variant === "primary" && "bg-accent text-accent-fg",
        variant === "secondary" && "border border-border bg-surface-2 hover:bg-border/40",
        variant === "ghost" && "text-muted hover:bg-surface-2 hover:text-fg",
        className
      )}
    />
  );
}
