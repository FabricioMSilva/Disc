"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/shared";
import type { Database } from "@/lib/database.types";
import { z } from "zod";

const employeeSearchSchema = z.string().trim().min(3).max(120);
const employeeCredentialsSchema = z.object({
  employeeNumber: z.string().trim().min(3).max(120),
  password: z.string().min(8),
});

type DirectoryEmployee = Database["public"]["Functions"]["search_employee_directory"]["Returns"][number];
type EmployeeLookup =
  | { employee: DirectoryEmployee; error: null }
  | { employee: null; error: string };

async function findEmployeeByNumber(employeeNumber: string): Promise<EmployeeLookup> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("search_employee_directory", {
    p_query: employeeNumber,
  });

  if (error) {
    console.error("Employee directory lookup failed:", error.message);
    return { employee: null, error: "Não foi possível validar a matrícula. Tente novamente." };
  }

  const normalizedNumber = employeeNumber.trim().toLocaleLowerCase("pt-BR");
  const employee = data?.find(
    (entry) => entry.employee_number?.trim().toLocaleLowerCase("pt-BR") === normalizedNumber,
  ) ?? null;

  if (!employee) {
    return { employee: null, error: "Matrícula não encontrada ou não liberada. Confira os dados ou contate o administrador." };
  }

  return { employee, error: null };
}

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

  return {
    employees: (data ?? []).map((employee) => ({
      employee_id: employee.employee_id,
      name: employee.name,
      employee_number: employee.employee_number,
      profile: employee.profile,
      has_account: employee.has_account,
      has_password: employee.has_password,
      email_confirmed: employee.email_confirmed,
    })),
  };
}

export async function signInAction(values: { employeeNumber: string; password: string }) {
  const parsed = employeeCredentialsSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  if (!isSupabaseConfigured()) return { error: "Configure o Supabase para habilitar o acesso." };

  const { employee, error: lookupError } = await findEmployeeByNumber(parsed.data.employeeNumber);
  if (!employee) return { error: lookupError ?? "Matrícula não encontrada ou não liberada." };
  if (!employee.email) return { error: "Seu acesso não foi configurado. Contate o administrador." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: employee.email,
    password: parsed.data.password,
  });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Seu acesso ainda não foi liberado. Contate o administrador." };
    }
    return { error: "Não foi possível entrar. Confira sua matrícula e senha." };
  }
  redirect("/painel");
}

export async function signUpAction(values: { employeeNumber: string; password: string }) {
  const parsed = employeeCredentialsSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  if (!isSupabaseConfigured()) return { error: "Configure o Supabase para habilitar o acesso." };

  const { employee, error: lookupError } = await findEmployeeByNumber(parsed.data.employeeNumber);
  if (!employee) return { error: lookupError ?? "Matrícula não encontrada ou não liberada." };
  if (!employee.email) return { error: "Seu cadastro de acesso não está completo. Contate o administrador." };
  if (employee.has_account) return { error: "Esta matrícula já possui uma conta. Entre com sua senha ou contate o administrador." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: employee.email,
    password: parsed.data.password,
    options: {
      data: {
        name: employee.name,
        employee_number: employee.employee_number,
      },
    },
  });

  if (error) {
    console.error("Supabase sign-up failed", { code: error.code, status: error.status });
    if (error.code === "email_provider_disabled") {
      return { error: "Para usar matrícula e senha, o provedor Email do Supabase precisa estar ativo. Deixe “Confirm email” desligado; o usuário não precisará informar nem confirmar e-mail." };
    }
    if (error.code === "user_already_exists") {
      return { error: "Esta matrícula já possui uma conta. Entre com sua senha ou contate o administrador." };
    }
    if (error.status === 429) {
      return { error: "Muitas tentativas de cadastro. Aguarde alguns minutos antes de tentar novamente." };
    }
    return { error: "Não foi possível criar o acesso. Verifique as configurações do Supabase ou contate o administrador." };
  }

  if (!data.session) {
    return { error: "O Supabase não liberou a sessão. Confirme que “Confirm email” está desligado e salvo." };
  }

  return { authenticated: true };
}

export async function signOutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}