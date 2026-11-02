"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CircleCheck } from "lucide-react";
import type { Question } from "@/lib/database.types";
import { completeAssessmentAction } from "@/app/assessment-actions";

type ThemeView = { id: string; nome: string; ordem: number };
type ScaleAnswer = { question_id: string; score: number | null };
type TextAnswer = { question_id: string; answer_text: string };
type StructuredAnswer = { id: string; question_id: string; score: number | null; selected_option_id: string | null; numeric_value: number | null; boolean_value: boolean | null; date_value: string | null };
type Option = { id: string; question_id: string; label: string; score: number | null; display_order: number };

export function ReviewPanel({ assessmentId, questions, themes, answers, textAnswers, options, selections }: {
  assessmentId: string; questions: Question[]; themes: ThemeView[]; answers: StructuredAnswer[]; textAnswers: TextAnswer[];
  options: Option[]; selections: { answer_id: string; option_id: string }[];
}) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const answerScores = new Map(answers.map((answer) => [answer.question_id, answer.score]));
  const answerByQuestion = new Map(answers.map((answer) => [answer.question_id, answer]));
  const reflections = new Map(textAnswers.map((answer) => [answer.question_id, answer.answer_text]));
  const submit = () => {
    if (!window.confirm("Enviar sua avaliação? Depois do envio, as respostas não poderão ser alteradas.")) return;
    setError("");
    startTransition(async () => {
      const result = await completeAssessmentAction(assessmentId);
      if (result?.error) setError(result.error); else router.push("/fim");
    });
  };
  const labels = ["", "Nunca", "Raramente", "Às vezes", "Frequentemente", "Sempre"];

  return <div style={{ maxWidth: 920, margin: "26px auto 0" }}>
    {themes.map((theme) => {
      const sectionQuestions = questions.filter((question) => question.theme_id === theme.id).sort((a, b) => a.ordem - b.ordem);
      return <section key={theme.id} className="surface" style={{ marginBottom: 14, overflow: "hidden" }}>
        <div style={{ padding: "15px 19px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}><strong>{theme.nome}</strong><span className="status">{sectionQuestions.filter((question) => answerScores.has(question.id)).length}/{sectionQuestions.length} respondidas</span></div>
        {sectionQuestions.map((question) => {
          const score = answerScores.get(question.id);
          return <div key={question.id} style={{ padding: "14px 19px", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, borderBottom: "1px solid #edf1f6", alignItems: "center" }}>
            <div style={{ fontSize: 12, lineHeight: 1.5 }}>{question.texto}<div className="muted" style={{ marginTop: 3 }}>{score ? labels[score] : "Sem resposta"}</div></div>
            <Link className="button-secondary" href={`/avaliacao?pergunta=${question.id}`} style={{ minHeight: 34, fontSize: 11 }}>Revisar</Link>
          </div>;
        })}
      </section>;
    })}
    {questions.some((question) => question.tipo === "escala" && !question.theme_id) && <section className="surface" style={{ marginBottom: 18, overflow: "hidden" }}>
      <div style={{ padding: "15px 19px", borderBottom: "1px solid var(--line)" }}><strong>Perguntas de escala</strong></div>
      {questions.filter((question) => question.tipo === "escala" && !question.theme_id).map((question) => {
        const score = answerScores.get(question.id);
        return <div key={question.id} style={{ padding: "14px 19px", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, borderBottom: "1px solid #edf1f6", alignItems: "center" }}><div style={{ fontSize: 12, lineHeight: 1.5 }}>{question.texto}<div className="muted" style={{ marginTop: 3 }}>{score ? labels[score] : "Sem resposta"}</div></div><Link className="button-secondary" href={`/avaliacao?pergunta=${question.id}`} style={{ minHeight: 34, fontSize: 11 }}>Revisar</Link></div>;
      })}
    </section>}
    {questions.some((question) => !["escala", "texto"].includes(question.tipo)) && <section className="surface" style={{ marginBottom: 18, overflow: "hidden" }}>
      <div style={{ padding: "15px 19px", borderBottom: "1px solid var(--line)" }}><strong>Perguntas adicionais</strong></div>
      {questions.filter((question) => !["escala", "texto"].includes(question.tipo)).map((question) => {
        const answer = answerByQuestion.get(question.id);
        const selected = answer ? options.filter((option) => option.question_id === question.id && (option.id === answer.selected_option_id || selections.some((item) => item.answer_id === answer.id && item.option_id === option.id))).map((option) => option.label).join(", ") : "";
        const value = selected || (answer?.numeric_value !== null && answer?.numeric_value !== undefined ? String(answer.numeric_value) : answer?.date_value ?? (answer?.boolean_value === null || answer?.boolean_value === undefined ? "" : answer.boolean_value ? "Sim" : "Não"));
        return <div key={question.id} style={{ padding: "14px 19px", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, borderBottom: "1px solid #edf1f6", alignItems: "center" }}><div style={{ fontSize: 12, lineHeight: 1.5 }}>{question.texto}<div className="muted" style={{ marginTop: 3 }}>{value || "Sem resposta"}</div></div><Link className="button-secondary" href={`/perguntas?pergunta=${question.id}`} style={{ minHeight: 34, fontSize: 11 }}>Revisar</Link></div>;
      })}
    </section>}
    {questions.some((question) => question.tipo === "texto") && <section className="surface" style={{ marginBottom: 18, overflow: "hidden" }}>
      <div style={{ padding: "15px 19px", borderBottom: "1px solid var(--line)" }}><strong>Autoavaliação reflexiva</strong></div>
      {questions.filter((question) => question.tipo === "texto").map((question) => {
        const answer = reflections.get(question.id)?.trim() ?? "";
        return <div key={question.id} style={{ padding: "14px 19px", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, borderBottom: "1px solid #edf1f6", alignItems: "center" }}>
          <div style={{ fontSize: 12, lineHeight: 1.5 }}>{question.texto}<div className="muted" style={{ marginTop: 3 }}>{answer ? `${answer.slice(0, 130)}${answer.length > 130 ? "..." : ""}` : "Sem resposta"}</div></div>
          <Link className="button-secondary" href={`/reflexao?pergunta=${question.id}`} style={{ minHeight: 34, fontSize: 11 }}>Revisar</Link>
        </div>;
      })}
    </section>}
    {error && <p role="alert" style={{ color: "var(--red)", fontSize: 12 }}>{error}</p>}
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><Link href={questions.some((question) => question.tipo === "texto") ? "/reflexao" : questions.some((question) => !["escala", "texto"].includes(question.tipo)) ? "/perguntas" : "/avaliacao"} className="button-secondary"><ArrowLeft size={15} /> Voltar</Link><button type="button" className="button-primary" disabled={pending} onClick={submit}>{pending ? "Enviando..." : "Enviar avaliação"} {!pending && <ArrowRight size={15} />}</button></div>
    <p style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--muted)", fontSize: 11, marginTop: 18 }}><CircleCheck size={14} /> As respostas ficam editáveis até o envio definitivo.</p>
  </div>;
}