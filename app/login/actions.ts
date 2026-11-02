"use server";

import { redirect } from "next/navigation";
import { credentialsSchema } from "@/lib/validations/assessment";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/shared";
import { z } from "zod";

const employeeSearchSchema = z.string().trim().min(3).max(120);

export async function searchEmployeeDirectoryAction(query: string) {
  const parsed = employeeSearchSchema.safeParse(query);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Pesquisa inválida." };
  if (!isSupabaseConfigured()) return { error: "Configure o Supabase para pesquisar funcionários." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("search_employee_directory", {
    p_query: parsed.data,
  });

  if (error) {
    console.error("Employee directory search failed:", error.message);
    return { error: "Não foi possível pesquisar funcionários. Tente novamente." };
  }

  return { employees: data ?? [] };
}

export async function signInAction(values: { email: string; password: string }) {
  const parsed = credentialsSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  if (!isSupabaseConfigured()) return { error: "Configure o Supabase para habilitar o acesso." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "Não foi possível entrar. Verifique suas credenciais ou contate o administrador." };
  redirect("/painel");
}

export async function signOutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}