import { redirect } from "next/navigation";
import { QuestionFlow } from "@/components/assessment/QuestionFlow";
import { getAssessmentSnapshot } from "@/app/assessment-actions";

export default async function AssessmentPage({ searchParams }: { searchParams: Promise<{ pergunta?: string }> }) {
  const [{ assessment, questions, themes, answers }, params] = await Promise.all([getAssessmentSnapshot(), searchParams]);
  if (!assessment) redirect("/identificacao");
  if (assessment.status === "concluida") redirect("/fim");
  const scaleQuestions = questions.filter((question) => question.tipo === "escala");
  const structured = questions.filter((question) => !["escala", "texto"].includes(question.tipo));
  const textQuestions = questions.filter((question) => question.tipo === "texto");
  const answeredIds = new Set(answers.filter((answer) => answer.score !== null).map((answer) => answer.question_id));
  const missingRequired = scaleQuestions.some((question) => question.obrigatoria && !answeredIds.has(question.id));
  if (!scaleQuestions.length) redirect(structured.length ? "/perguntas" : textQuestions.length ? "/reflexao" : "/revisao");
  if (!missingRequired && !params.pergunta) redirect(structured.length ? "/perguntas" : textQuestions.length ? "/reflexao" : "/revisao");
  const nextPath = structured.length ? "/perguntas" : textQuestions.length ? "/reflexao" : "/revisao";
  return <><p className="eyebrow">Avaliação em andamento</p><h1 className="page-title">Comportamentos e competências</h1><p className="page-subtitle" style={{ marginBottom: 26 }}>Uma pergunta por vez, com salvamento automático.</p><QuestionFlow assessmentId={assessment.id} questions={scaleQuestions} themes={themes} answers={answers} startQuestionId={params.pergunta} nextPath={nextPath} /></>;
}