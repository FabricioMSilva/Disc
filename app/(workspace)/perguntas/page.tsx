import { redirect } from "next/navigation";
import { StructuredQuestionFlow } from "@/components/assessment/StructuredQuestionFlow";
import { getAssessmentSnapshot } from "@/app/assessment-actions";

export default async function StructuredQuestionsPage({ searchParams }: { searchParams: Promise<{ pergunta?: string }> }) {
  const params = await searchParams;
  const snapshot = await getAssessmentSnapshot();
  const { assessment, questions, options, answers, selections } = snapshot;
  if (!assessment) redirect("/identificacao");
  if (assessment.status === "concluida") redirect(`/resultados/${assessment.id}`);
  const scaleQuestions = questions.filter((question) => question.tipo === "escala");
  const answeredScaleIds = new Set(answers.filter((answer) => answer.score !== null).map((answer) => answer.question_id));
  if (scaleQuestions.some((question) => question.obrigatoria && !answeredScaleIds.has(question.id))) redirect("/avaliacao");
  const structured = questions.filter((question) => !["escala", "texto"].includes(question.tipo));
  const nextQuestion = questions.find((question) => question.tipo === "texto");
  const answered = new Set(answers.filter((answer) => answer.selected_option_id || answer.numeric_value !== null || answer.boolean_value !== null || answer.date_value).map((answer) => answer.question_id));
  if (!structured.length || structured.every((question) => !question.obrigatoria || answered.has(question.id))) redirect(questions.some((question) => question.tipo === "texto") ? "/reflexao" : "/revisao");
  return <><p className="eyebrow">Avaliação em andamento</p><h1 className="page-title">Perguntas adicionais</h1><p className="page-subtitle" style={{ marginBottom: 26 }}>Responda os itens desta campanha.</p><StructuredQuestionFlow assessmentId={assessment.id} questions={structured} options={options} answers={answers} selections={selections} hasTextQuestions={questions.some((question) => question.tipo === "texto")} startQuestionId={params.pergunta} nextQuestion={nextQuestion} /></>;
}