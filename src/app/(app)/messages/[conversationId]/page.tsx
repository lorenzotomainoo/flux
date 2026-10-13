import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getChat } from "@/lib/queries/messages";
import ChatWindow from "@/components/messages/ChatWindow";

export const metadata = { title: "Chat" };

type Props = { params: Promise<{ conversationId: string }> };

export default async function ChatPage({ params }: Props) {
  const { conversationId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const chat = await getChat(supabase, conversationId, user.id);
  if (!chat) notFound();

  return (
    <ChatWindow
      chat={chat.info}
      currentUserId={user.id}
      members={chat.members}
      initialMessages={chat.messages}
      signedUrls={chat.signedUrls}
    />
  );
}
