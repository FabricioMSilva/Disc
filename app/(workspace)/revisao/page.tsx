import { redirect } from "next/navigation";
import { ReviewPanel } from "@/components/assessment/ReviewPanel";
import { getAssessmentSnapshot } from "@/app/assessment-actions";

export default async function ReviewPage() {
  const { assessment, questions, themes, answers, textAnswers, options, selections } = await getAssessmentSnapshot();
  if (!assessment) redirect("/identificacao");
  if (assessment.status === "concluida") redirect("/fim");
  const structured = questions.filter((question) => !["escala", "texto"].includes(question.tipo));
  const answeredScaleIds = new Set(answers.filter((answer) => answer.score !== null).map((answer) => answer.question_id));
  const answeredStructured = new Set(answers.filter((answer) => answer.selected_option_id || answer.numeric_value !== null || answer.boolean_value !== null || answer.date_value).map((answer) => answer.question_id));
  const answeredTexts = new Set(textAnswers.filter((answer) => answer.answer_text.trim()).map((answer) => answer.question_id));
  if (questions.some((question) => question.tipo === "escala" && question.obrigatoria && !answeredScaleIds.has(question.id))) redirect("/avaliacao");
  if (structured.some((question) => question.obrigatoria && !answeredStructured.has(question.id))) redirect("/perguntas");
  if (questions.some((question) => question.tipo === "texto" && question.obrigatoria && !answeredTexts.has(question.id))) redirect("/reflexao");
  return <><p className="eyebrow">Antes do envio</p><h1 className="page-title">Revisão da avaliação</h1><p className="page-subtitle">Confira suas respostas e edite qualquer item antes de enviar.</p><ReviewPanel assessmentId={assessment.id} questions={questions} themes={themes} answers={answers} textAnswers={textAnswers} options={options} selections={selections} /></>;
}