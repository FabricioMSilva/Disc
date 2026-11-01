"use server";

import { z } from "zod";
import { requireUser } from "@/lib/auth";

const campaignSchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().max(2000),
  versionId: z.string().uuid(),
  teamIds: z.array(z.string().uuid()).min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable(),
  resultVisibility: z.enum(["admin", "manager", "participant"]),
});

const invitationSchema = z.object({
  email: z.string().trim().email().max(254),
  teamId: z.string().uuid(),
  role: z.enum(["manager", "questionnaire_editor", "participant"]),
});

export async function createCampaignAction(input: {
  name: string; description: string; versionId: string; teamIds: string[];
  startsAt: string; endsAt: string | null; resultVisibility: string;
}) {
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados da campanha inválidos." };
  const { supabase, profile } = await requireUser();
  if (!profile || !["super_admin", "admin", "manager"].includes(profile.role)) return { error: "Seu perfil não pode criar campanhas." };
  const { data, error } = await supabase.rpc("create_campaign", {
    p_name: parsed.data.name, p_description: parsed.data.description, p_questionnaire_version_id: parsed.data.versionId,
    p_team_ids: parsed.data.teamIds, p_starts_at: parsed.data.startsAt, p_ends_at: parsed.data.endsAt,
    p_result_visibility: parsed.data.resultVisibility,
  });
  return error || !data ? { error: error?.message ?? "Não foi possível criar a campanha." } : { error: null, campaignId: data };
}

export async function assignCampaignParticipantAction(input: { campaignId: string; participantId: string; teamId: string }) {
  const parsed = z.object({ campaignId: z.string().uuid(), participantId: z.string().uuid(), teamId: z.string().uuid() }).safeParse(input);
  if (!parsed.success) return { error: "Atribuição inválida." };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("assign_participant_to_campaign", {
    p_campaign_id: parsed.data.campaignId, p_participant_id: parsed.data.participantId, p_team_id: parsed.data.teamId,
  });
  return error ? { error: error.message } : { error: null };
}

export async function createInvitationAction(input: { email: string; teamId: string; role: string }) {
  const parsed = invitationSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Convite inválido." };
  const { supabase, user, profile } = await requireUser();
  if (!profile || !["super_admin", "admin", "manager"].includes(profile.role)) return { error: "Seu perfil não pode convidar pessoas." };
  if (profile.role === "manager") {
    if (parsed.data.role !== "participant") return { error: "Gestores podem convidar somente participantes." };
    const { data: managesTeam } = await supabase.rpc("manages_team", { p_team_id: parsed.data.teamId });
    if (!managesTeam) return { error: "Equipe fora do seu escopo." };
  }
  const { error } = await supabase.from("invitations").insert({
    email: parsed.data.email.toLowerCase(), team_id: parsed.data.teamId, role: parsed.data.role, invited_by: user.id,
  });
  if (error?.code === "23505") return { error: "Já existe um convite pendente para este e-mail e equipe." };
  return error ? { error: "Não foi possível registrar o convite pendente." } : { error: null };
}