import { cn } from "@/lib/utils";

const CREATOR_NAME = "lorenzotomainoo";
const CREATOR_URL = "https://github.com/lorenzotomainoo";

export default function Footer({ className }: { className?: string }) {
  const year = new Date().getFullYear();

  return (
    <footer className={cn("mx-auto w-full max-w-xl px-4 pt-6 text-center text-xs text-muted", className)}>
      <p>
        © <span suppressHydrationWarning>{year}</span> Flux. Tutti i diritti riservati.
      </p>
      <p className="mt-1">
        Creato da{" "}
        <a
          href={CREATOR_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-accent hover:underline"
        >
          {CREATOR_NAME}
        </a>
      </p>
    </footer>
  );
}
