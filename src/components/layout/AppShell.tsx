"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, LogOut, MessageCircle, Search, Settings, User } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  unread: number;
  children: React.ReactNode;
};

export default function AppShell({ userId, username, displayName, avatarUrl, unread, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const items = [
    { href: "/home", label: "Home", icon: Home },
    { href: "/search", label: "Cerca", icon: Search },
    { href: "/messages", label: "Messaggi", icon: MessageCircle },
    { href: `/${username}`, label: "Profilo", icon: User },
  ];
  const sidebarItems = [...items, { href: "/settings", label: "Impostazioni", icon: Settings }];

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  // dentro una chat nascondiamo la barra in basso per far spazio alla tastiera
  const inChat = /^\/messages\/[^/]+/.test(pathname);

  // Nuovi messaggi in arrivo o letti: aggiorna badge e lista conversazioni
  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const refresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 400);
    };

    const channel = supabase
      .channel("inbox")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        if (payload.new.sender_id !== userId) refresh();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, refresh)
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [router, userId]);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  const Logo = (
    <span className="text-2xl font-extrabold tracking-tight">
      Flux<span className="text-accent">.</span>
    </span>
  );

  const badge = (href: string) =>
    href === "/messages" && unread > 0 ? (
      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-fg">
        {unread > 9 ? "9+" : unread}
      </span>
    ) : null;

  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col justify-between border-r border-border p-5 md:flex">
        <div className="space-y-8">
          {Logo}
          <nav className="space-y-1">
            {sidebarItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium transition-colors",
                  isActive(href)
                    ? "bg-accent/15 text-accent"
                    : "text-muted hover:bg-surface-2 hover:text-fg"
                )}
              >
                <Icon size={20} />
                <span className="flex-1">{label}</span>
                {badge(href)}
              </Link>
            ))}
          </nav>
        </div>
        <div className="space-y-2">
          <Link
            href={`/${username}`}
            className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-surface-2"
          >
            <Avatar src={avatarUrl} name={displayName || username} size={36} />
            <div className="min-w-0 text-sm">
              <p className="truncate font-semibold">{displayName || username}</p>
              <p className="truncate text-muted">@{username}</p>
            </div>
          </Link>
          <button
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-muted transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <LogOut size={20} />
            Esci
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar mobile */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-bg/80 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))] backdrop-blur md:hidden">
          {Logo}
          <div className="flex items-center">
            <Link href="/settings" aria-label="Impostazioni" className="p-2 text-muted">
              <Settings size={20} />
            </Link>
            <button onClick={signOut} aria-label="Esci" className="p-2 text-muted">
              <LogOut size={20} />
            </button>
          </div>
        </header>

        <main
          className={cn(
            "mx-auto w-full max-w-xl flex-1 px-4 pt-5 md:pb-10",
            inChat ? "pb-[calc(1rem+env(safe-area-inset-bottom))]" : "pb-28"
          )}
        >
          {children}
        </main>
      </div>

      {/* Bottom nav mobile */}
      {!inChat && (
        <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-bg/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
          {items.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                isActive(href) ? "text-accent" : "text-muted"
              )}
            >
              <span className="relative">
                <Icon size={22} />
                {href === "/messages" && unread > 0 && (
                  <span className="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-fg">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </span>
              {label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
