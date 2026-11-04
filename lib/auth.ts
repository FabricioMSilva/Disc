import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/shared";

export async function requireUser() {
  if (!isSupabaseConfigured()) redirect("/login?setup=1");
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { error: accessError } = await supabase.rpc("accept_current_user_invitation");
  if (accessError) {
    console.error("Could not prepare authenticated user access", { code: accessError.code, message: accessError.message });
    throw new Error("Não foi possível preparar seu acesso à avaliação. Tente novamente ou informe o administrador.");
  }
  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (profileError || !profile) {
    console.error("Could not load authenticated user profile", { userId: user.id, code: profileError?.code, message: profileError?.message });
    throw new Error("Não foi possível carregar o perfil da sua conta.");
  }
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

export async function requireTeamManager() {
  const session = await requireUser();
  if (!session.profile || !["manager", "super_admin"].includes(session.profile.role)) redirect("/acesso-negado");
  return session;
}