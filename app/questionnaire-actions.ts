"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";

const questionnaireSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(2000).default(""),
  visibility: z.enum(["private", "team", "organization"]),
});

const questionSchema = z.object({
  sectionId: z.string().uuid(),
  text: z.string().trim().min(4).max(1000),
  type: z.enum(["escala", "likert", "escolha_unica", "multipla_escolha", "texto", "numero", "data", "booleano"]),
  required: z.boolean(),
  weight: z.number().min(0.1).max(10),
  dimension: z.string().trim().max(40).default(""),
  options: z.string().max(1000).default(""),
});

const allowedRoles = ["super_admin", "admin", "manager", "questionnaire_editor"];

export async function createQuestionnaireAction(input: { title: string; description: string; visibility: string }) {
  const parsed = questionnaireSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const { supabase, user, profile } = await requireUser();
  if (!profile || !allowedRoles.includes(profile.role)) return { error: "Seu perfil não pode criar questionários." };
  const slug = `${parsed.data.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${crypto.randomUUID().slice(0, 8)}`;
  const { data: id, error } = await supabase.rpc("create_questionnaire", {
    p_title: parsed.data.title, p_description: parsed.data.description, p_slug: slug, p_visibility: parsed.data.visibility,
  });
  if (error || !id) return { error: "Não foi possível criar o questionário." };
  redirect(`/questionarios/${id}/editar`);
}

export async function addQuestionAction(input: {
  sectionId: string; text: string; type: string; required: boolean; weight: number; dimension: string; options: string;
}) {
  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Pergunta inválida." };
  const { supabase, profile } = await requireUser();
  if (!profile || !allowedRoles.includes(profile.role)) return { error: "Seu perfil não pode editar questionários." };
  const requiresOptions = ["escala", "likert", "escolha_unica", "multipla_escolha"].includes(parsed.data.type);
  if (requiresOptions) {
    const labels = ["escala", "likert"].includes(parsed.data.type) && !parsed.data.options.trim()
      ? ["Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"]
      : parsed.data.options.split("\n").map((label) => label.trim()).filter(Boolean);
    if (labels.length < 2) return { error: "Informe pelo menos duas alternativas, uma por linha." };
    if (["escala", "likert"].includes(parsed.data.type) && labels.length !== 5) return { error: "Escalas precisam ter exatamente cinco alternativas." };
    const { error } = await supabase.rpc("add_question_to_section", {
      p_section_id: parsed.data.sectionId, p_text: parsed.data.text, p_type: parsed.data.type,
      p_required: parsed.data.required, p_weight: parsed.data.weight, p_dimension_code: parsed.data.dimension,
      p_options: labels,
    });
    return error ? { error: "Não foi possível adicionar a pergunta ao rascunho." } : { error: null };
  }
  const { error } = await supabase.rpc("add_question_to_section", {
    p_section_id: parsed.data.sectionId, p_text: parsed.data.text, p_type: parsed.data.type,
    p_required: parsed.data.required, p_weight: parsed.data.weight, p_dimension_code: parsed.data.dimension,
    p_options: [],
  });
  return error ? { error: "Não foi possível adicionar a pergunta ao rascunho." } : { error: null };
}

export async function publishQuestionnaireAction(versionId: string) {
  const parsed = z.string().uuid().safeParse(versionId);
  if (!parsed.success) return { error: "Versão inválida." };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("publish_questionnaire_version", { p_version_id: parsed.data });
  return error ? { error: error.message } : { error: null };
}

export async function cloneQuestionnaireVersionAction(questionnaireId: string) {
  const parsed = z.string().uuid().safeParse(questionnaireId);
  if (!parsed.success) return { error: "Questionário inválido." };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("create_questionnaire_version", { p_questionnaire_id: parsed.data });
  if (error || !data) return { error: "Não foi possível criar uma nova versão." };
  return { error: null, versionId: data };
}