import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFollowing } from "@/lib/queries/messages";
import NewGroupForm from "@/components/messages/NewGroupForm";

export const metadata = { title: "Nuovo gruppo" };

export default async function NewGroupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const following = await getFollowing(supabase, user.id);

  return (
    <div className="space-y-4">
      <Link href="/messages" className="text-sm text-muted hover:text-fg">
        ← Messaggi
      </Link>
      <h1 className="text-2xl font-bold">Nuovo gruppo</h1>
      <NewGroupForm following={following} />
    </div>
  );
}
