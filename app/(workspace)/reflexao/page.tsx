import { redirect } from "next/navigation";
import { ReflectionFlow } from "@/components/assessment/ReflectionFlow";
import { getAssessmentSnapshot } from "@/app/assessment-actions";

export default async function ReflectionPage({ searchParams }: { searchParams: Promise<{ pergunta?: string }> }) {
  const [{ assessment, questions, answers, textAnswers }, params] = await Promise.all([getAssessmentSnapshot(), searchParams]);
  if (!assessment) redirect("/identificacao");
  if (assessment.status === "concluida") redirect("/fim");
  const scaleTotal = questions.filter((question) => question.tipo === "escala").length;
  const answeredScaleIds = new Set(answers.filter((answer) => answer.score !== null).map((answer) => answer.question_id));
  if (questions.some((question) => question.tipo === "escala" && question.obrigatoria && !answeredScaleIds.has(question.id))) redirect("/avaliacao");
  const structured = questions.filter((question) => !["escala", "texto"].includes(question.tipo));
  const answeredStructured = new Set(answers.filter((answer) => answer.selected_option_id || answer.numeric_value !== null || answer.boolean_value !== null || answer.date_value).map((answer) => answer.question_id));
  if (structured.some((question) => question.obrigatoria && !answeredStructured.has(question.id))) redirect("/perguntas");
  if (!questions.some((question) => question.tipo === "texto")) redirect("/revisao");
  return <><p className="eyebrow">Etapa final</p><h1 className="page-title">Autoavaliação reflexiva</h1><p className="page-subtitle" style={{ marginBottom: 26 }}>Respostas abertas para apoiar seu desenvolvimento.</p><ReflectionFlow assessmentId={assessment.id} questions={questions} answers={textAnswers} startQuestionId={params.pergunta} scaleCount={scaleTotal + structured.length} totalCount={questions.length} /></>;
}