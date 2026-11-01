import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/shared";

export async function requireUser() {
  if (!isSupabaseConfigured()) redirect("/login?setup=1");
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  await supabase.rpc("accept_current_user_invitation");
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (profile?.status === "inactive" || profile?.ativo === false) redirect("/acesso-negado");
  return { supabase, user, profile };
}

export async function requireAdmin() {
  const session = await requireUser();
  if (session.profile?.role !== "admin" && session.profile?.role !== "super_admin") redirect("/acesso-negado");
  return session;
}

export async function requireManager() {
  const session = await requireUser();
  if (!session.profile || !["manager", "admin", "super_admin"].includes(session.profile.role)) redirect("/acesso-negado");
  return session;
}