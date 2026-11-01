"use server";

import { z } from "zod";
import { requireAdmin, requireManager } from "@/lib/auth";

export async function setProfileAccessAction(input: { userId: string; role: string; status: string }) {
  const parsed = z.object({ userId: z.string().uuid(), role: z.enum(["super_admin", "admin", "manager", "questionnaire_editor", "participant", "auditor"]), status: z.enum(["invited", "active", "inactive"]) }).safeParse(input);
  if (!parsed.success) return { error: "Acesso inválido." };
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("set_profile_access", { p_user_id: parsed.data.userId, p_role: parsed.data.role, p_status: parsed.data.status });
  return error ? { error: error.message } : { error: null };
}

export async function createTeamAction(input: { name: string; code: string; description: string }) {
  const parsed = z.object({ name: z.string().trim().min(2).max(120), code: z.string().max(40), description: z.string().max(1000) }).safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados de equipe inválidos." };
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("create_team", { p_name: parsed.data.name, p_code: parsed.data.code, p_description: parsed.data.description, p_area_id: null });
  return error ? { error: error.message } : { error: null };
}

export async function assignManagerAction(input: { managerId: string; teamId: string; validFrom: string; validUntil: string | null }) {
  const parsed = z.object({ managerId: z.string().uuid(), teamId: z.string().uuid(), validFrom: z.string().datetime(), validUntil: z.string().datetime().nullable() }).safeParse(input);
  if (!parsed.success) return { error: "Período de designação inválido." };
  const { supabase } = await requireAdmin();
  const { error } = await supabase.rpc("assign_manager_to_team", {
    p_manager_id: parsed.data.managerId, p_team_id: parsed.data.teamId,
    p_valid_from: parsed.data.validFrom, p_valid_until: parsed.data.validUntil,
  });
  return error ? { error: error.message } : { error: null };
}

export async function addTeamMemberAction(input: { teamId: string; userId: string }) {
  const parsed = z.object({ teamId: z.string().uuid(), userId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { error: "Vínculo inválido." };
  const { supabase } = await requireManager();
  const { error } = await supabase.rpc("add_team_member", { p_team_id: parsed.data.teamId, p_user_id: parsed.data.userId });
  return error ? { error: error.message } : { error: null };
}