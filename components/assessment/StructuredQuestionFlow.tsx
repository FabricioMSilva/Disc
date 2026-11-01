"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import type { Question } from "@/lib/database.types";
import { saveStructuredAnswerAction } from "@/app/assessment-actions";

type Option = { id: string; question_id: string; label: string; score: number | null; display_order: number };
type Answer = { id: string; question_id: string; selected_option_id: string | null; numeric_value: number | null; boolean_value: boolean | null; date_value: string | null };
type Value = { optionId?: string; optionIds?: string[]; score?: number; value?: string | number | boolean };

export function StructuredQuestionFlow({ assessmentId, questions, options, answers, selections, hasTextQuestions, startQuestionId }: {
  assessmentId: string; questions: Question[]; options: Option[]; answers: Answer[];
  selections: { answer_id: string; option_id: string }[]; hasTextQuestions: boolean; startQuestionId?: string;
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
  const progress = Math.round(((index + 1) / structured.length) * 100);
  const choose = (key: keyof Value, selected: Value[keyof Value]) => save(current.id, { ...currentValue, [key]: selected });
  const next = () => {
    if (!answered || (hasValue && !persisted.has(current.id)) || pending) return;
    if (index === structured.length - 1) router.push(hasTextQuestions ? "/reflexao" : "/revisao");
    else { setIndex((value) => value + 1); setError(""); setStatus(""); }
  };
  return <div style={{ maxWidth: 850, margin: "0 auto" }}>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)" }}><span>Perguntas adicionais</span><span>{index + 1} de {structured.length}</span></div>
    <div role="progressbar" aria-label="Progresso das perguntas" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} style={{ height: 5, marginTop: 10, background: "#dce4ef", borderRadius: 8 }}><div style={{ width: `${progress}%`, height: "100%", background: "var(--blue)", borderRadius: 8 }} /></div>
    <section className="surface" style={{ marginTop: 28, padding: "clamp(23px, 5vw, 44px)" }}>
      <p className="eyebrow">Pergunta {index + 1} de {structured.length}</p><h1 style={{ maxWidth: 700, margin: "14px auto 28px", textAlign: "center", fontSize: "clamp(23px, 4vw, 31px)", lineHeight: 1.35 }}>{current.texto}</h1>
      {current.tipo === "likert" || current.tipo === "escolha_unica" ? <div role="radiogroup" aria-label={current.texto} style={{ display: "grid", gap: 9, maxWidth: 560, margin: "0 auto" }}>{currentOptions.map((option) => <button key={option.id} type="button" className={current.tipo === "likert" ? "scale-option" : "button-secondary"} aria-checked={current.tipo === "likert" ? currentValue?.score === option.score : currentValue?.optionId === option.id} role="radio" disabled={pending} onClick={() => current.tipo === "likert" ? choose("score", option.score ?? 0) : choose("optionId", option.id)}>{option.label}</button>)}</div>
      : current.tipo === "multipla_escolha" ? <div style={{ display: "grid", gap: 9, maxWidth: 560, margin: "0 auto" }}>{currentOptions.map((option) => { const selected = currentValue?.optionIds ?? []; return <label key={option.id} className="button-secondary" style={{ justifyContent: "flex-start", cursor: "pointer" }}><input type="checkbox" checked={selected.includes(option.id)} disabled={pending} onChange={(event) => choose("optionIds", event.target.checked ? [...selected, option.id] : selected.filter((id) => id !== option.id))} />{option.label}</label>; })}</div>
      : current.tipo === "booleano" ? <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>{[true, false].map((value) => <button type="button" className={currentValue?.value === value ? "button-primary" : "button-secondary"} disabled={pending} key={String(value)} onClick={() => choose("value", value)}>{value ? "Sim" : "Não"}</button>)}</div>
      : <input className="field" type={current.tipo === "data" ? "date" : "number"} value={currentValue?.value === undefined ? "" : String(currentValue.value)} onChange={(event) => { setPersisted((state) => { const next = new Set(state); next.delete(current.id); return next; }); setValues((state) => ({ ...state, [current.id]: { value: current.tipo === "numero" && event.target.value !== "" ? Number(event.target.value) : event.target.value } })); }} onBlur={() => { if (currentValue?.value !== undefined && currentValue.value !== "") save(current.id, currentValue); }} aria-label={current.texto} style={{ maxWidth: 360, margin: "0 auto", display: "block" }} />}
      <div aria-live="polite" style={{ minHeight: 24, marginTop: 14, fontSize: 11, textAlign: "center", color: error ? "var(--red)" : "var(--muted)" }}>{error || (status && <><Save size={12} style={{ verticalAlign: "middle", marginRight: 5 }} />{status}</>)}</div>
    </section>
    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}><button type="button" className="button-secondary" disabled={pending} onClick={() => index ? setIndex((value) => value - 1) : router.push("/avaliacao")}><ArrowLeft size={15} /> Voltar</button><button type="button" className="button-primary" disabled={!answered || (hasValue && !persisted.has(current.id)) || pending} onClick={next}>{index === structured.length - 1 ? "Continuar" : "Próxima pergunta"} {index === structured.length - 1 ? <Check size={15} /> : <ArrowRight size={15} />}</button></div>
  </div>;
}