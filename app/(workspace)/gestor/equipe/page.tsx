import { redirect } from "next/navigation";
import { requireTeamManager } from "@/lib/auth";

export default async function ManagerTeamPage() {
  await requireTeamManager();
  redirect("/gestor/pessoas");
}
