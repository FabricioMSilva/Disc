"use server";

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { redirect } from "next/navigation";
import { z } from "zod";
import { credentialsSchema } from "@/lib/validations/assessment";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/shared";

const employeeSchema = z.object({
  Nome: z.string(), Matricula: z.string(), Email: z.string(), Perfil: z.string(),
  HorarioTrabalho: z.string(), LocalTrabalho: z.string(), Ativo: z.boolean(),
  NomesAlternativos: z.array(z.string()).optional(), EmployeeID: z.string().optional(),
});

async function getEmployeeDirectory() {
  const contents = await readFile(join(process.cwd(), "data", "private", "funcionarios.json"), "utf8");
  return z.array(employeeSchema).parse(JSON.parse(contents));
}

function normalizeSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export async function searchEmployeeDirectoryAction(query: string) {
  const parsed = z.string().trim().min(3).max(120).safeParse(query);
  if (!parsed.success) return { matches: [], error: null };
  try {
    const needle = normalizeSearch(parsed.data);
    const employees = await getEmployeeDirectory();
    const matches = employees.filter((employee) => employee.Ativo && [
      employee.Nome, employee.Matricula, employee.Email, employee.EmployeeID ?? "", ...(employee.NomesAlternativos ?? []),
    ].some((field) => normalizeSearch(field).includes(needle))).slice(0, 8).map((employee) => ({
      name: employee.Nome, employeeNumber: employee.Matricula, profile: employee.Perfil,
      shift: employee.HorarioTrabalho, location: employee.LocalTrabalho, hasEmail: Boolean(employee.Email.trim()),
    }));
    return { matches, error: null };
  } catch {
    return { matches: [], error: "A lista de funcionários não está disponível no servidor." };
  }
}

export async function signInEmployeeAction(values: { employeeNumber: string; password: string }) {
  const parsed = z.object({ employeeNumber: z.string().trim().min(1).max(40), password: z.string().min(8).max(128) }).safeParse(values);
  if (!parsed.success) return { error: "Informe a matrícula e a senha cadastradas." };
  if (!isSupabaseConfigured()) return { error: "Configure o Supabase para habilitar o acesso." };
  let employee: z.infer<typeof employeeSchema> | undefined;
  try {
    const directory = await getEmployeeDirectory();
    employee = directory.find((item) => item.Ativo && item.Matricula.toLocaleLowerCase("pt-BR") === parsed.data.employeeNumber.toLocaleLowerCase("pt-BR"));
  } catch {
    return { error: "A lista de funcionários não está disponível no servidor." };
  }
  if (!employee) return { error: "Não foi possível entrar. Confira a identificação e a senha ou contate o administrador." };
  if (!employee.Email.trim()) return { error: "Seu cadastro não tem e-mail corporativo. Contate o administrador para habilitar o acesso." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email: employee.Email, password: parsed.data.password });
  if (error) return { error: "Não foi possível entrar. Confira a identificação e a senha ou contate o administrador." };
  redirect("/painel");
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