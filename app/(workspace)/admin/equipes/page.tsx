import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

export default async function AdminTeamsPage() {
  await requireAdmin();
  redirect("/admin/pessoas");
}
