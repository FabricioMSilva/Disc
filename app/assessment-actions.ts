"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";

const scaleSchema = z.object({ assessmentId: z.string().uuid(), questionId: z.string().uuid(), score: z.number().int().min(1).max(5) });
const textSchema = z.object({ assessmentId: z.string().uuid(), questionId: z.string().uuid(), answer: z.string().max(10000) });
const structuredSchema = z.object({ assessmentId: z.string().uuid(), questionId: z.string().uuid(), value: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.array(z.string())])) });

export async function startAssessmentAction() {
  const { supabase, profile } = await requireUser();
  if (profile?.status === "inactive" || profile?.ativo === false) return { error: "Conta inativa. Procure o administrador." };
  const { data: cycle } = await supabase.from("assessment_cycles").select("id")
    .eq("ativo", true).order("data_inicio", { ascending: false }).limit(1).maybeSingle();
  if (!cycle) return { error: "Não há uma avaliação disponível neste momento." };
  const { error } = await supabase.rpc("start_assessment", { p_cycle_id: cycle.id });
  if (error) return { error: "Não foi possível iniciar. Verifique o ciclo com o administrador." };
  redirect("/avaliacao");
}

export async function saveScaleAnswerAction(input: { assessmentId: string; questionId: string; score: number }) {
  const parsed = scaleSchema.safeParse(input);
  if (!parsed.success) return { error: "Resposta inválida." };
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.rpc("save_scale_answer", {
      p_assessment_id: parsed.data.assessmentId, p_question_id: parsed.data.questionId, p_score: parsed.data.score,
    });
    return error ? { error: "Não foi possível salvar. Verifique sua conexão." } : { error: null };
  } catch {
    return { error: "Sua sessão expirou. Entre novamente para continuar." };
  }
}

export async function saveTextAnswerAction(input: { assessmentId: string; questionId: string; answer: string }) {
  const parsed = textSchema.safeParse(input);
  if (!parsed.success) return { error: "Resposta inválida." };
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.rpc("save_text_answer", {
      p_assessment_id: parsed.data.assessmentId, p_question_id: parsed.data.questionId, p_answer_text: parsed.data.answer,
    });
    return error ? { error: "Não foi possível salvar. Verifique sua conexão." } : { error: null };
  } catch {
    return { error: "Sua sessão expirou. Entre novamente para continuar." };
  }
}

export async function saveStructuredAnswerAction(input: { assessmentId: string; questionId: string; value: Record<string, string | number | boolean | string[]> }) {
  const parsed = structuredSchema.safeParse(input);
  if (!parsed.success) return { error: "Resposta inválida." };
  try {
    const { supabase } = await requireUser();
    const { error } = await supabase.rpc("save_question_answer", {
      p_assessment_id: parsed.data.assessmentId,
      p_question_id: parsed.data.questionId,
      p_value: parsed.data.value,
    });
    return error ? { error: "Não foi possível salvar. Verifique a resposta e tente novamente." } : { error: null };
  } catch {
    return { error: "Sua sessão expirou. Entre novamente para continuar." };
  }
}

export async function completeAssessmentAction(assessmentId: string) {
  const parsed = z.string().uuid().safeParse(assessmentId);
  if (!parsed.success) return { error: "Avaliação inválida." };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("complete_assessment", { p_assessment_id: parsed.data });
  if (error) return { error: error.message.includes("perguntas obrigatórias")
    ? "Preencha todas as respostas obrigatórias antes do envio."
    : "Não foi possível concluir. Atualize a página e tente novamente." };
  redirect("/fim");
}

export async function getAssessmentSnapshot() {
  const { supabase, user } = await requireUser();
  const { data: assessment } = await supabase.from("assessments").select("*")
    .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!assessment) return { assessment: null, questions: [], themes: [], answers: [], textAnswers: [], options: [], selections: [] };
  const loadQuestions = async () => {
    if (!assessment.questionnaire_version_id) return supabase.from("questions").select("*").eq("ativa", true).order("ordem");
    const { data: sections } = await supabase.from("questionnaire_sections").select("id")
      .eq("version_id", assessment.questionnaire_version_id);
    const sectionIds = (sections ?? []).map((section) => section.id);
    if (!sectionIds.length) return { data: [] };
    return supabase.from("questions").select("*").eq("ativa", true).in("section_id", sectionIds).order("ordem");
  };
  const [{ data: questions }, { data: themes }, { data: answers }, { data: textAnswers }] = await Promise.all([
    loadQuestions(),
    supabase.from("themes").select("*").eq("ativo", true).order("ordem"),
    supabase.from("answers").select("id, question_id, score, selected_option_id, numeric_value, boolean_value, date_value").eq("assessment_id", assessment.id),
    supabase.from("text_answers").select("question_id, answer_text").eq("assessment_id", assessment.id),
  ]);
  const questionIds = (questions ?? []).map((question) => question.id);
  const answerIds = (answers ?? []).map((answer) => answer.id);
  const { data: options } = questionIds.length
    ? await supabase.from("question_options").select("id, question_id, label, score, display_order").in("question_id", questionIds).order("display_order")
    : { data: [] };
  const { data: selections } = answerIds.length
    ? await supabase.from("answer_option_selections").select("answer_id, option_id").in("answer_id", answerIds)
    : { data: [] };
  return { assessment, questions: questions ?? [], themes: themes ?? [], answers: answers ?? [], textAnswers: textAnswers ?? [], options: options ?? [], selections: selections ?? [] };
}

export async function confirmAndStartAction() {
  return startAssessmentAction();
}