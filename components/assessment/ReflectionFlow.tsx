"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import type { Question } from "@/lib/database.types";
import { saveTextAnswerAction } from "@/app/assessment-actions";
import { QuestionProgress } from "@/components/assessment/QuestionProgress";
import { QuestionSpeech, speakQuestion } from "@/components/assessment/QuestionSpeech";

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
    else {
      const nextQuestion = textQuestions[index + 1];
      speakQuestion(nextQuestion.id, nextQuestion.texto);
      setIndex((value) => value + 1);
      setMessage("");
      setError("");
    }
  };
  const back = () => {
    if (index === 0) router.push("/avaliacao");
    else {
      const previousQuestion = textQuestions[index - 1];
      speakQuestion(previousQuestion.id, previousQuestion.texto);
      setIndex((value) => value - 1);
      setMessage("");
      setError("");
    }
  };
  return (
    <div className="question-flow">
      <QuestionProgress label="Autoavaliação reflexiva" current={scaleCount + index + 1} total={totalCount} ariaLabel="Progresso da autoavaliação" />
      <section className="surface question-card">
        <p className="eyebrow">Reflexão {index + 1} de {textQuestions.length}</p>
        <label htmlFor="reflection-answer" className="question-text question-text-label">{current.texto}</label>
        <QuestionSpeech questionId={current.id} text={current.texto} />
        <textarea id="reflection-answer" rows={7} maxLength={10000} value={answer} onChange={(event) => {
          setValues((state) => ({ ...state, [current.id]: event.target.value }));
          setDirty((state) => ({ ...state, [current.id]: true }));
          setMessage("Salvando automaticamente...");
          setError("");
        }} placeholder="Escreva sua resposta..." className="field reflection-answer" />
        <div className={`reflection-feedback${error ? " is-error" : ""}`}><span aria-live="polite">{error || (message && <><Save size={13} />{message}</>)}</span><span>{answer.length}/10000</span></div>
      </section>
      <div className="question-navigation">
        <button type="button" className="button-secondary" onClick={back}><ArrowLeft size={15} /> Voltar</button>
        <button type="button" className="button-primary" disabled={!canContinue || dirty[current.id] || pending} onClick={next}>{index === textQuestions.length - 1 ? "Revisar avaliação" : "Próxima reflexão"} {index === textQuestions.length - 1 ? <Check size={15} /> : <ArrowRight size={15} />}</button>
      </div>
      <p className="question-disclaimer">As respostas abertas apoiam sua reflexão e não recebem pontuação.</p>
    </div>
  );
}