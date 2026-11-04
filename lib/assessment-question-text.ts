import type { Question } from "@/lib/database.types";
import { assessmentQuestionContent } from "@/lib/assessment-question-content";

export function getAssessmentQuestionText(question: Pick<Question, "numero" | "texto" | "tipo">): string {
  if (question.tipo !== "escala") return question.texto;
  return assessmentQuestionContent[question.numero]?.pergunta ?? question.texto;
}

export function getAssessmentQuestionResponses(question: Pick<Question, "numero" | "tipo">) {
  return question.tipo === "escala" ? assessmentQuestionContent[question.numero]?.respostas : undefined;
}
