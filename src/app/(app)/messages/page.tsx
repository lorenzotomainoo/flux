import { redirect } from "next/navigation";
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
      <h1 className="text-2xl font-bold">Messaggi</h1>
      <p className="text-sm text-muted">I messaggi spariscono dopo 24 ore. Le conversazioni restano.</p>
      <ConversationList conversations={conversations} currentUserId={user.id} />
    </div>
  );
}
