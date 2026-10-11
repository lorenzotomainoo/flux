import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getConversations } from "@/lib/queries/messages";
import ConversationList from "@/components/messages/ConversationList";

export const metadata = { title: "Messaggi" };

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const conversations = await getConversations(supabase, user.id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Messaggi</h1>
        <Link
          href="/messages/new"
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-accent-fg transition active:scale-[0.98]"
        >
          <Plus size={16} />
          Nuovo gruppo
        </Link>
      </div>
      <p className="text-sm text-muted">
        I messaggi spariscono dopo 24 ore. Tieni premuto su una chat per eliminarla.
      </p>
      <ConversationList conversations={conversations} currentUserId={user.id} />
    </div>
  );
}
