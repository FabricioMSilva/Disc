"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import type { Question } from "@/lib/database.types";
import { saveTextAnswerAction } from "@/app/assessment-actions";

type TextAnswer = { question_id: string; answer_text: string };

export function ReflectionFlow({ assessmentId, questions, answers, startQuestionId, scaleCount, totalCount }: {
  assessmentId: string; questions: Question[]; answers: TextAnswer[]; startQuestionId?: string; scaleCount: number; totalCount: number;
}) {
  const router = useRouter();
  const textQuestions = useMemo(() => questions.filter((question) => question.tipo === "texto"), [questions]);
  const startIndex = Math.max(0, textQuestions.findIndex((question) => question.id === startQuestionId));
  const [index, setIndex] = useState(startIndex);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(answers.map((answer) => [answer.question_id, answer.answer_text])));
  const [dirty, setDirty] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const current = textQuestions[index];

  useEffect(() => {
    const timers = Object.entries(dirty).filter(([, changed]) => changed).map(([questionId]) => window.setTimeout(() => {
      const answer = values[questionId] ?? "";
      startTransition(async () => {
        const result = await saveTextAnswerAction({ assessmentId, questionId, answer });
        if (result.error) setError(result.error);
        else if (values[questionId] === answer) {
          setError("");
          setMessage("Resposta salva");
          setDirty((state) => ({ ...state, [questionId]: false }));
        }
      });
    }, 650));
    return () => timers.forEach(window.clearTimeout);
  }, [assessmentId, dirty, values]);

  if (!current) return <div className="surface empty-state">Não há perguntas reflexivas disponíveis.</div>;
  const answer = values[current.id] ?? "";
  const canContinue = !current.obrigatoria || Boolean(answer.trim());
  const next = () => {
    if (!canContinue || dirty[current.id] || pending) return;
    if (index === textQuestions.length - 1) router.push("/revisao");
    else { setIndex((value) => value + 1); setMessage(""); setError(""); }
  };
  const back = () => {
    if (index === 0) router.push("/avaliacao");
    else { setIndex((value) => value - 1); setMessage(""); setError(""); }
  };
  const progress = Math.round(((scaleCount + index + 1) / totalCount) * 100);

  return (
    <div style={{ maxWidth: 850, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)" }}><span>Autoavaliação reflexiva</span><span>{scaleCount + index + 1} de {totalCount}</span></div>
      <div role="progressbar" aria-label="Progresso da avaliação" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} style={{ height: 5, marginTop: 10, background: "#dce4ef", borderRadius: 8 }}><div style={{ width: `${progress}%`, height: "100%", background: "var(--blue)", borderRadius: 8 }} /></div>
      <section className="surface" style={{ marginTop: 28, padding: "clamp(23px, 5vw, 44px)" }}>
        <p className="eyebrow">Reflexão {index + 1} de {textQuestions.length}</p>
        <label htmlFor="reflection-answer" style={{ display: "block", maxWidth: 700, margin: "14px auto 22px", textAlign: "center", font: "600 clamp(22px, 4vw, 30px) 'Space Grotesk', sans-serif", lineHeight: 1.35 }}>{current.texto}</label>
        <textarea id="reflection-answer" className="field" rows={7} maxLength={10000} value={answer} onChange={(event) => {
          setValues((state) => ({ ...state, [current.id]: event.target.value }));
          setDirty((state) => ({ ...state, [current.id]: true }));
          setMessage("Salvando automaticamente...");
          setError("");
        }} placeholder="Escreva sua resposta..." style={{ padding: 14, resize: "vertical", minHeight: 180, lineHeight: 1.6 }} />
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, minHeight: 20, fontSize: 11, color: error ? "var(--red)" : "var(--muted)" }}><span aria-live="polite">{error || (message && <><Save size={12} style={{ verticalAlign: "middle", marginRight: 5 }} />{message}</>)}</span><span>{answer.length}/10000</span></div>
      </section>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
        <button type="button" className="button-secondary" onClick={back}><ArrowLeft size={15} /> Voltar</button>
        <button type="button" className="button-primary" disabled={!canContinue || dirty[current.id] || pending} onClick={next}>{index === textQuestions.length - 1 ? "Revisar avaliação" : "Próxima reflexão"} {index === textQuestions.length - 1 ? <Check size={15} /> : <ArrowRight size={15} />}</button>
      </div>
      <p className="muted" style={{ textAlign: "center", fontSize: 11, marginTop: 24 }}>As respostas abertas apoiam sua reflexão e não recebem pontuação.</p>
    </div>
  );
}