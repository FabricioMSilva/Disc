"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";

export async function setTeamMemberWorkScheduleAction(input: { userId: string; schedule: string | null }) {
  const parsed = z.object({
    userId: z.string().uuid(),
    schedule: z.enum(["Turno", "Administrativo"]).nullable(),
  }).safeParse(input);
  if (!parsed.success) return { error: "Horário de trabalho inválido." };

  const { supabase, profile } = await requireUser();
  if (!profile || !["manager", "admin", "super_admin"].includes(profile.role)) {
    return { error: "Você não tem permissão para alterar horários de trabalho." };
  }

  const { error } = await supabase.rpc("set_team_member_work_schedule", {
    p_user_id: parsed.data.userId,
    p_horario_trabalho: parsed.data.schedule,
  });
  if (error) {
    console.error("set_team_member_work_schedule RPC failed", { code: error.code, message: error.message });
    if (error.code === "42501") return { error: "Sem permissão para alterar esse integrante. Gestores só podem alterar integrantes de suas próprias equipes." };
    if (error.code === "P0002") return { error: "O integrante não possui cadastro vinculado para receber o horário." };
    return { error: "Não foi possível salvar o horário de trabalho. Tente novamente." };
  }

  revalidatePath("/gestor/pessoas");
  revalidatePath("/admin/pessoas");
  return { error: null };
}
