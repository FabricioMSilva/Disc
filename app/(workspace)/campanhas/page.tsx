import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export default async function CampaignsPage() {
  const { profile } = await requireUser();
  if (profile?.role === "manager") redirect("/gestor/pessoas");
  if (profile && ["admin", "super_admin"].includes(profile.role)) redirect("/admin/pessoas");
  redirect("/painel");
}
