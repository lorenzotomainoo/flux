import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-6xl font-extrabold tracking-tight">
        404<span className="text-accent">.</span>
      </h1>
      <p className="text-muted">Questa pagina è già svanita. Tutto dura 24 ore.</p>
      <Link
        href="/home"
        className="rounded-xl bg-accent px-5 py-2.5 font-semibold text-accent-fg"
      >
        Torna alla home
      </Link>
    </div>
  );
}