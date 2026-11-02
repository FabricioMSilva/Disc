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
  const nextQuestion = structured[0] ?? textQuestions[0];
  return <div className="assessment-page">
    <header className="assessment-heading">
      <p className="eyebrow">Avaliação em andamento</p>
      <h1 className="page-title assessment-title">Comportamentos e competências</h1>
      <p className="page-subtitle">Responda de acordo com o comportamento que mais representa sua percepção.</p>
    </header>
    <QuestionFlow assessmentId={assessment.id} questions={scaleQuestions} themes={themes} answers={answers} startQuestionId={params.pergunta} nextPath={nextPath} nextQuestion={nextQuestion} />
  </div>;
}