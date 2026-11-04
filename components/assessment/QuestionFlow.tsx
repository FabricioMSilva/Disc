"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import type { Question } from "@/lib/database.types";
import { saveScaleAnswerAction } from "@/app/assessment-actions";
import { QuestionProgress } from "@/components/assessment/QuestionProgress";
import { QuestionSpeech, speakQuestion } from "@/components/assessment/QuestionSpeech";
import { ScaleOptions } from "@/components/assessment/ScaleOptions";
import { shuffleForAssessment } from "@/lib/assessment-order";

type SavedAnswer = { question_id: string; score: number | null };
type ScaleQuestion = { id: string; texto: string; ordem: number; obrigatoria: boolean; responseLabels?: readonly string[] };

export function QuestionFlow({ assessmentId, questions, answers, startQuestionId, nextPath, nextQuestion }: {
  assessmentId: string; questions: ScaleQuestion[]; answers: SavedAnswer[]; startQuestionId?: string; nextPath: string;
  nextQuestion?: Pick<Question, "id" | "texto">;
}) {
  const router = useRouter();
  const scaleQuestions = useMemo(
    () => shuffleForAssessment(questions, assessmentId),
    [assessmentId, questions],
  );
  const requestedIndex = scaleQuestions.findIndex((question) => question.id === startQuestionId);
  const answeredIds = new Set(answers.filter((answer) => answer.score !== null).map((answer) => answer.question_id));
  const firstUnansweredIndex = scaleQuestions.findIndex(
    (question) => question.obrigatoria && !answeredIds.has(question.id),
  );
  const startIndex = startQuestionId && requestedIndex >= 0
    ? requestedIndex
    : Math.max(0, firstUnansweredIndex);
  const [index, setIndex] = useState(startIndex);
  const [saved, setSaved] = useState(() => Object.fromEntries(answers.flatMap((answer) => answer.score === null ? [] : [[answer.question_id, answer.score]])) as Record<string, number>);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [advancePending, setAdvancePending] = useState(false);
  const advanceAfterSave = useRef<string | null>(null);
  const [pending, startTransition] = useTransition();
  const current = scaleQuestions[index];
  const canContinue = current ? !current.obrigatoria || Boolean(saved[current.id]) : false;
  if (!current) return <div className="surface empty-state">Não há perguntas pontuadas disponíveis neste questionário.</div>;
  const advanceFrom = (questionId: string) => {
    const questionIndex = scaleQuestions.findIndex((question) => question.id === questionId);
    if (questionIndex < 0) return;
    if (questionIndex === scaleQuestions.length - 1) {
      router.push(nextPath);
      return;
    }
    setIndex(questionIndex + 1);
    setError("");
    setStatus("");
  };

  const handleAnswer = (score: number) => {
    const previous = saved[current.id];
    setSaved((state) => ({ ...state, [current.id]: score }));
    setError("");
    setStatus("Salvando resposta...");
    setSavingQuestionId(current.id);
    startTransition(async () => {
      let saveError: string | null = null;
      try {
        const result = await saveScaleAnswerAction({ assessmentId, questionId: current.id, score });
        saveError = result.error;
      } catch {
        saveError = "Não foi possível salvar a resposta. Verifique a conexão e tente novamente.";
      }
      if (saveError) {
        setError(saveError);
        setStatus("");
        setSavingQuestionId(null);
        if (advanceAfterSave.current === current.id) {
          advanceAfterSave.current = null;
          setAdvancePending(false);
        }
        setSaved((state) => {
          const next = { ...state };
          if (previous === undefined) delete next[current.id]; else next[current.id] = previous;
          return next;
        });
      } else {
        setSavingQuestionId(null);
        setStatus("Resposta salva");
        if (advanceAfterSave.current === current.id) {
          advanceAfterSave.current = null;
          setAdvancePending(false);
          advanceFrom(current.id);
        }
      }
    });
  };
  const next = () => {
    if (!canContinue || advancePending) return;
    if (index === scaleQuestions.length - 1) {
      if (nextQuestion) speakQuestion(nextQuestion.id, nextQuestion.texto);
    } else {
      const upcomingQuestion = scaleQuestions[index + 1];
      speakQuestion(upcomingQuestion.id, upcomingQuestion.texto);
    }
    if (savingQuestionId === current.id) {
      advanceAfterSave.current = current.id;
      setAdvancePending(true);
      setStatus("Salvando resposta antes de avançar...");
      return;
    }
    advanceFrom(current.id);
  };

  return (
    <div className="question-flow">
      <QuestionProgress label="Comportamentos e competências" current={index + 1} total={scaleQuestions.length} ariaLabel="Progresso da avaliação" />
      <motion.section key={current.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }} className="surface question-card">
        <h2 className="question-text">{current.texto}</h2>
        <QuestionSpeech questionId={current.id} text={current.texto} />
        <p className="question-helper">{current.responseLabels ? "Escolha a resposta que melhor descreve como você costuma agir nessa situação." : "Indique o quanto você se identifica com a situação apresentada."}</p>
        <ScaleOptions assessmentId={assessmentId} questionId={current.id} value={saved[current.id]} onChange={handleAnswer} disabled={pending} responseLabels={current.responseLabels} />
        <div className={`question-feedback${error ? " is-error" : ""}`} aria-live="polite">{error || (status && <><Save size={13} />{status}</>)}</div>
      </motion.section>
      <div className="question-navigation">
        <button type="button" className="button-secondary" disabled={index === 0 || pending || advancePending} onClick={() => {
          const previousQuestion = scaleQuestions[index - 1];
          if (previousQuestion) speakQuestion(previousQuestion.id, previousQuestion.texto);
          setIndex((value) => Math.max(0, value - 1));
          setError("");
          setStatus("");
        }}><ArrowLeft size={15} /> Voltar</button>
        <button type="button" className="button-primary" disabled={!canContinue || advancePending} onClick={next}>{advancePending ? "Salvando..." : index === scaleQuestions.length - 1 ? "Continuar" : "Próxima pergunta"} {!advancePending && (index === scaleQuestions.length - 1 ? <Check size={15} /> : <ArrowRight size={15} />)}</button>
      </div>
      <p className="question-disclaimer">Responda considerando seu comportamento real. Não há respostas certas ou erradas.</p>
    </div>
  );
}