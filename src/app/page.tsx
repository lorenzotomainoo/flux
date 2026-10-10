import { redirect } from "next/navigation";

// Il middleware manda al login chi non è autenticato.
export default function RootPage() {
  redirect("/home");
}
