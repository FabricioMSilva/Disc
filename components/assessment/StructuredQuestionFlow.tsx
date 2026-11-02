"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import type { Question } from "@/lib/database.types";
import { saveStructuredAnswerAction } from "@/app/assessment-actions";
import { QuestionProgress } from "@/components/assessment/QuestionProgress";
import { QuestionSpeech, speakQuestion } from "@/components/assessment/QuestionSpeech";

type Option = { id: string; question_id: string; label: string; score: number | null; display_order: number };
type Answer = { id: string; question_id: string; selected_option_id: string | null; numeric_value: number | null; boolean_value: boolean | null; date_value: string | null };
type Value = { optionId?: string; optionIds?: string[]; score?: number; value?: string | number | boolean };

export function StructuredQuestionFlow({ assessmentId, questions, options, answers, selections, hasTextQuestions, startQuestionId, nextQuestion }: {
  assessmentId: string; questions: Question[]; options: Option[]; answers: Answer[];
  selections: { answer_id: string; option_id: string }[]; hasTextQuestions: boolean; startQuestionId?: string; nextQuestion?: Question;
}) {
  const router = useRouter();
  const structured = useMemo(() => questions.filter((question) => !["escala", "texto"].includes(question.tipo)), [questions]);
  const [index, setIndex] = useState(() => Math.max(0, structured.findIndex((question) => question.id === startQuestionId)));
  const [values, setValues] = useState<Record<string, Value>>(() => {
    const restored: Record<string, Value> = {};
    for (const answer of answers) {
      const question = structured.find((item) => item.id === answer.question_id);
      if (!question) continue;
      if (question.tipo === "likert") {
        const score = options.find((option) => option.id === answer.selected_option_id)?.score;
        if (score !== null && score !== undefined) restored[question.id] = { score };
      } else if (question.tipo === "escolha_unica" && answer.selected_option_id) restored[question.id] = { optionId: answer.selected_option_id };
      else if (question.tipo === "multipla_escolha") restored[question.id] = { optionIds: selections.filter((item) => item.answer_id === answer.id).map((item) => item.option_id) };
      else if (question.tipo === "numero" && answer.numeric_value !== null) restored[question.id] = { value: answer.numeric_value };
      else if (question.tipo === "data" && answer.date_value) restored[question.id] = { value: answer.date_value };
      else if (question.tipo === "booleano" && answer.boolean_value !== null) restored[question.id] = { value: answer.boolean_value };
    }
    return restored;
  });
  const [persisted, setPersisted] = useState(() => new Set(answers.map((answer) => answer.question_id)));
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [pending, startTransition] = useTransition();
  const current = structured[index];
  const currentOptions = options.filter((option) => option.question_id === current?.id);
  const currentValue = current ? values[current.id] : undefined;
  const hasValue = current ? current.tipo === "multipla_escolha" ? Boolean(currentValue?.optionIds?.length) : current.tipo === "numero" || current.tipo === "data" ? currentValue?.value !== undefined && currentValue.value !== "" : currentValue !== undefined : false;
  const answered = current ? !current.obrigatoria || hasValue : false;
  const save = (questionId: string, value: Value) => {
    setValues((state) => ({ ...state, [questionId]: value }));
    setPersisted((state) => new Set(state).add(questionId));
    setError(""); setStatus("Salvando resposta...");
    startTransition(async () => {
      const result = await saveStructuredAnswerAction({ assessmentId, questionId, value });
      if (result.error) setPersisted((state) => { const next = new Set(state); next.delete(questionId); return next; });
      setError(result.error ?? ""); setStatus(result.error ? "" : "Resposta salva");
    });
  };
  if (!current) return <div className="surface empty-state">Não há perguntas deste tipo nesta avaliação.</div>;
  const choose = (key: keyof Value, selected: Value[keyof Value]) => save(current.id, { ...currentValue, [key]: selected });
  const next = () => {
    if (!answered || (hasValue && !persisted.has(current.id)) || pending) return;
    if (index === structured.length - 1) {
      if (hasTextQuestions && nextQuestion) speakQuestion(nextQuestion.id, nextQuestion.texto);
      router.push(hasTextQuestions ? "/reflexao" : "/revisao");
    }
    else {
      const nextQuestion = structured[index + 1];
      speakQuestion(nextQuestion.id, nextQuestion.texto);
      setIndex((value) => value + 1);
      setError("");
      setStatus("");
    }
  };
  const back = () => {
    if (index === 0) {
      router.push("/avaliacao");
      return;
    }
    const previousQuestion = structured[index - 1];
    speakQuestion(previousQuestion.id, previousQuestion.texto);
    setIndex((value) => value - 1);
  };
  return <div className="question-flow">
    <QuestionProgress label="Perguntas adicionais" current={index + 1} total={structured.length} ariaLabel="Progresso das perguntas adicionais" />
    <section className="surface question-card">
      <p className="eyebrow">Pergunta {index + 1} de {structured.length}</p><h2 className="question-text">{current.texto}</h2><QuestionSpeech questionId={current.id} text={current.texto} />
      {current.tipo === "likert" || current.tipo === "escolha_unica" ? <div className="structured-option-list" role="radiogroup" aria-label={current.texto}>{currentOptions.map((option) => {
        const selected = current.tipo === "likert" ? currentValue?.score === option.score : currentValue?.optionId === option.id;
        return <button key={option.id} type="button" className={`answer-choice${selected ? " is-selected" : ""}`} aria-checked={selected} role="radio" disabled={pending} onClick={() => current.tipo === "likert" ? choose("score", option.score ?? 0) : choose("optionId", option.id)}>{option.label}</button>;
      })}</div>
      : current.tipo === "multipla_escolha" ? <div className="structured-option-list">{currentOptions.map((option) => { const selected = currentValue?.optionIds ?? []; return <label key={option.id} className="structured-checkbox-option"><input type="checkbox" checked={selected.includes(option.id)} disabled={pending} onChange={(event) => choose("optionIds", event.target.checked ? [...selected, option.id] : selected.filter((id) => id !== option.id))} />{option.label}</label>; })}</div>
      : current.tipo === "booleano" ? <div className="structured-binary-options">{[true, false].map((value) => <button type="button" className={`answer-choice${currentValue?.value === value ? " is-selected" : ""}`} disabled={pending} key={String(value)} onClick={() => choose("value", value)}>{value ? "Sim" : "Não"}</button>)}</div>
      : <input className="field structured-number-field" type={current.tipo === "data" ? "date" : "number"} value={currentValue?.value === undefined ? "" : String(currentValue.value)} onChange={(event) => { setPersisted((state) => { const next = new Set(state); next.delete(current.id); return next; }); setValues((state) => ({ ...state, [current.id]: { value: current.tipo === "numero" && event.target.value !== "" ? Number(event.target.value) : event.target.value } })); }} onBlur={() => { if (currentValue?.value !== undefined && currentValue.value !== "") save(current.id, currentValue); }} aria-label={current.texto} />}
      <div className={`question-feedback${error ? " is-error" : ""}`} aria-live="polite">{error || (status && <><Save size={13} />{status}</>)}</div>
    </section>
    <div className="question-navigation"><button type="button" className="button-secondary" disabled={pending} onClick={back}><ArrowLeft size={15} /> Voltar</button><button type="button" className="button-primary" disabled={!answered || (hasValue && !persisted.has(current.id)) || pending} onClick={next}>{index === structured.length - 1 ? "Continuar" : "Próxima pergunta"} {index === structured.length - 1 ? <Check size={15} /> : <ArrowRight size={15} />}</button></div>
  </div>;
}