"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
const RESERVED = [
  "home", "messages", "login", "signup", "api", "search",
  "settings", "auth", "admin", "flux", "null", "undefined",
];

const inputCls =
  "w-full rounded-xl border border-border bg-surface px-4 py-3 text-base outline-none transition focus:border-accent";

function translate(message: string) {
  if (message.includes("Invalid login credentials")) return "Email o password errati.";
  if (message.includes("already registered")) return "Esiste già un account con questa email.";
  if (message.includes("rate limit")) return "Troppi tentativi, riprova tra qualche minuto.";
  return message;
}

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const isSignup = mode === "signup";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    try {
      if (isSignup) {
        const uname = username.trim().toLowerCase().replace(/^@/, "");
        if (!USERNAME_RE.test(uname)) {
          throw new Error("Username: 3-20 caratteri, solo lettere minuscole, numeri e _");
        }
        if (RESERVED.includes(uname)) throw new Error("Questo username non è disponibile.");
        if (password.length < 8) throw new Error("La password deve avere almeno 8 caratteri.");

        const { data: taken } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", uname)
          .maybeSingle();
        if (taken) throw new Error("Questo username è già in uso.");

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: uname, display_name: displayName.trim() || uname },
            emailRedirectTo: `${location.origin}/auth/callback`,
          },
        });
        if (error) throw error;

        // Con conferma email attiva non c'è ancora una sessione
        if (!data.session) {
          setInfo("Ti abbiamo mandato un'email: clicca il link per confermare l'account.");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }

      router.replace("/home");
      router.refresh();
    } catch (err) {
      setError(translate(err instanceof Error ? err.message : "Qualcosa è andato storto."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-6"
    >
      <div className="space-y-1 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">
          Flux<span className="text-accent">.</span>
        </h1>
        <p className="text-muted">
          {isSignup ? "Crea il tuo account. Tutto dura 24 ore." : "Bentornato."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-3">
        {isSignup && (
          <>
            <input
              className={inputCls}
              placeholder="Nome visualizzato"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              autoComplete="name"
            />
            <input
              className={inputCls}
              placeholder="@username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={21}
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
          </>
        )}
        <input
          className={inputCls}
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          className={inputCls}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
        />

        {error && <p className="text-sm text-red-500">{error}</p>}
        {info && <p className="text-sm text-accent">{info}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-accent py-3 font-semibold text-accent-fg transition active:scale-[0.98] disabled:opacity-60"
        >
          {loading ? "Un attimo…" : isSignup ? "Registrati" : "Accedi"}
        </button>
      </form>

      <p className="text-center text-sm text-muted">
        {isSignup ? "Hai già un account? " : "Non hai un account? "}
        <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-accent">
          {isSignup ? "Accedi" : "Registrati"}
        </Link>
      </p>
    </motion.div>
  );
}
