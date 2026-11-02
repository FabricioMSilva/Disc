import { requireUser } from "@/lib/auth";
import type { Json } from "@/lib/database.types";

const discFields = [
  { code: "D", resultField: "dominancia", themeCode: "D" },
  { code: "I", resultField: "influencia", themeCode: "I" },
  { code: "S", resultField: "estabilidade", themeCode: "S" },
  { code: "C", resultField: "conformidade", themeCode: "C" },
] as const;

const competencyFields = [
  { code: "SEG", resultField: "seguranca" },
  { code: "DIS", resultField: "disciplina" },
  { code: "TE", resultField: "trabalho_equipe" },
  { code: "COM", resultField: "comunicacao" },
] as const;

export type ReportResponse = {
  number: number;
  section: string;
  question: string;
  response: string;
};

export type CompetencyClassification = "Ponto consolidado" | "Em desenvolvimento" | "Prioridade sugerida";

function getJsonRecord(value: Json | null): Record<string, Json | undefined> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value;
}

function formatClassification(value: number) {
  if (value >= 81) return "Excelente";
  if (value >= 61) return "Muito Bom";
  if (value >= 41) return "Adequado";
  return "Requer Desenvolvimento";
}

function formatCompetencyBand(value: number): CompetencyClassification {
  if (value >= 81) return "Ponto consolidado";
  if (value >= 41) return "Em desenvolvimento";
  return "Prioridade sugerida";
}

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export async function loadAssessmentReport(assessmentId: string) {
  const { supabase, user, profile } = await requireUser();
  const role = profile?.role ?? "participant";
  const canReviewTeam = role === "admin" || role === "super_admin" || role === "manager";

  const { data: result, error: resultError } = await supabase
    .from("admin_assessment_results")
    .select("*")
    .eq("assessment_id", assessmentId)
    .eq("status", "concluida")
    .maybeSingle();

  if (resultError) throw new Error(`Não foi possível carregar o resultado: ${resultError.message}`);
  if (!result || (!canReviewTeam && result.user_id !== user.id)) return null;

  const [
    { data: catalog, error: catalogError },
    { data: themes, error: themesError },
    { data: answers, error: answersError },
    { data: textAnswers, error: textAnswersError },
  ] = await Promise.all([
    supabase.from("disc_profile_catalog").select("code,name,description,traits,color,sort_order,action_recommendation").order("sort_order"),
    supabase.from("themes").select("id,codigo,nome,descricao,tipo,ordem").eq("ativo", true).order("ordem"),
    supabase.from("answers").select("id,question_id,score,selected_option_id,numeric_value,text_value,boolean_value,date_value").eq("assessment_id", assessmentId),
    supabase.from("text_answers").select("question_id,answer_text").eq("assessment_id", assessmentId),
  ]);

  if (catalogError) throw new Error(`Não foi possível carregar os perfis: ${catalogError.message}`);
  if (themesError) throw new Error(`Não foi possível carregar as competências: ${themesError.message}`);
  if (answersError) throw new Error(`Não foi possível carregar as respostas: ${answersError.message}`);
  if (textAnswersError) throw new Error(`Não foi possível carregar as respostas reflexivas: ${textAnswersError.message}`);

  const answerRows = answers ?? [];
  const questionIds = [...new Set([...answerRows.map((answer) => answer.question_id), ...(textAnswers ?? []).map((answer) => answer.question_id)])];
  const answerIds = answerRows.map((answer) => answer.id);

  const [
    { data: questions, error: questionsError },
    { data: options, error: optionsError },
    { data: selections, error: selectionsError },
  ] = await Promise.all([
    questionIds.length
      ? supabase.from("questions").select("id,numero,texto,tipo,ordem,theme_id,dimension_code").in("id", questionIds).order("ordem")
      : Promise.resolve({ data: [], error: null }),
    questionIds.length
      ? supabase.from("question_options").select("id,question_id,label,score,display_order").in("question_id", questionIds).order("display_order")
      : Promise.resolve({ data: [], error: null }),
    answerIds.length
      ? supabase.from("answer_option_selections").select("answer_id,option_id").in("answer_id", answerIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (questionsError) throw new Error(`Não foi possível carregar as perguntas: ${questionsError.message}`);
  if (optionsError) throw new Error(`Não foi possível carregar as alternativas: ${optionsError.message}`);
  if (selectionsError) throw new Error(`Não foi possível carregar as alternativas respondidas: ${selectionsError.message}`);

  const profileByCode = new Map((catalog ?? []).map((item) => [item.code, item]));
  const themeById = new Map((themes ?? []).map((theme) => [theme.id, theme]));
  const optionById = new Map((options ?? []).map((option) => [option.id, option]));
  const answerByQuestion = new Map(answerRows.map((answer) => [answer.question_id, answer]));
  const textAnswerByQuestion = new Map((textAnswers ?? []).map((answer) => [answer.question_id, answer.answer_text]));
  const selectedOptionIds = new Map<string, string[]>();

  for (const selection of selections ?? []) {
    selectedOptionIds.set(selection.answer_id, [...(selectedOptionIds.get(selection.answer_id) ?? []), selection.option_id]);
  }

  const responses: ReportResponse[] = (questions ?? []).map((question) => {
    const answer = answerByQuestion.get(question.id);
    const text = textAnswerByQuestion.get(question.id);
    const selectedIds = answer ? selectedOptionIds.get(answer.id) ?? [] : [];
    const selectedLabels = selectedIds.map((id) => optionById.get(id)?.label).filter((label): label is string => Boolean(label));
    const singleOption = answer?.selected_option_id ? optionById.get(answer.selected_option_id)?.label : null;
    const scoreOption = answer?.score === null || answer?.score === undefined
      ? null
      : options?.find((option) => option.question_id === question.id && option.score === answer.score)?.label ?? null;
    const value = typeof text === "string" && text.trim()
      ? text.trim()
      : selectedLabels.length
        ? selectedLabels.join(", ")
        : singleOption
          ?? scoreOption
          ?? (answer?.score !== null && answer?.score !== undefined ? `${answer.score} / 5` : null)
          ?? (answer?.numeric_value !== null && answer?.numeric_value !== undefined ? String(answer.numeric_value) : null)
          ?? (answer?.text_value?.trim() || null)
          ?? (answer?.boolean_value !== null && answer?.boolean_value !== undefined ? (answer.boolean_value ? "Sim" : "Não") : null)
          ?? (answer?.date_value ? new Date(`${answer.date_value}T00:00:00`).toLocaleDateString("pt-BR") : null)
          ?? "Não respondida";

    return {
      number: question.numero,
      section: question.theme_id ? themeById.get(question.theme_id)?.nome ?? "Questionário" : "Reflexão",
      question: question.texto,
      response: value,
    };
  });

  const themeByCode = new Map((themes ?? []).map((theme) => [theme.codigo, theme]));
  const scoreByCode = new Map(discFields.map(({ code, resultField }) => [code, result[resultField]]));
  const maxDiscScore = Math.max(...[...scoreByCode.values()].filter((value): value is number => value !== null));
  const selectedProfiles = discFields
    .filter(({ code }) => scoreByCode.get(code) === maxDiscScore)
    .map(({ code }) => profileByCode.get(code))
    .filter((item): item is NonNullable<typeof catalog>[number] => Boolean(item));
  const competencies = competencyFields
    .map(({ code, resultField }) => {
      const theme = themeByCode.get(code);
      const score = result[resultField];
      if (score === null || score === undefined) return null;
      const percentage = clampPercentage((score / 25) * 100);
      return {
        code,
        name: theme?.nome ?? code,
        description: theme?.descricao ?? "",
        score,
        percentage,
        classification: formatCompetencyBand(percentage),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const discScores = discFields.map(({ code, resultField, themeCode }) => {
    const theme = themeByCode.get(themeCode);
    const score = result[resultField];
    return {
      code,
      name: theme?.nome ?? profileByCode.get(code)?.name ?? code,
      score,
      percentage: score === null ? 0 : clampPercentage((score / 25) * 100),
      color: profileByCode.get(code)?.color ?? "#64748B",
      band: getJsonRecord(result.faixas_disc)[code],
    };
  });

  const customDimensions = Object.entries(getJsonRecord(result.dimensions))
    .filter((entry): entry is [string, number] => typeof entry[1] === "number")
    .map(([code, value]) => ({
      code,
      name: themeByCode.get(code)?.nome ?? code,
      value,
    }));

  const overall = result.indice_competencias;
  const tiedActions = [...new Set(selectedProfiles.map((item) => item.action_recommendation))];

  return {
    assessmentId,
    viewerIsOwner: result.user_id === user.id,
    participantName: result.participante,
    teamName: result.equipe,
    roleName: result.funcao,
    completedAt: result.concluida_em,
    standardResult: result.dominancia !== null && result.dominancia !== undefined,
    profile: {
      codes: selectedProfiles.map((item) => item.code),
      name: selectedProfiles.map((item) => item.name).join(" / "),
      description: selectedProfiles.map((item) => item.description).join(" "),
      traits: [...new Set(selectedProfiles.flatMap((item) => item.traits))],
      color: selectedProfiles[0]?.color ?? "#64748B",
      recommendation: tiedActions.join(" · ") || result.recomendacao || "Continue acompanhando seu desenvolvimento.",
    },
    discScores,
    competencies,
    overall: overall ?? result.total_score,
    classification: result.classificacao_competencias ?? (overall === null ? null : formatClassification(overall)),
    weightedScore: result.resultado_ponderado,
    customDimensions,
    responses,
  };
}
