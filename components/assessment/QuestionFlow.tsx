"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Save } from "lucide-react";
import type { Question } from "@/lib/database.types";
import { saveScaleAnswerAction } from "@/app/assessment-actions";
import { ScaleOptions } from "@/components/assessment/ScaleOptions";

type ThemeView = { id: string; codigo: string; nome: string; descricao: string; ordem: number };
type SavedAnswer = { question_id: string; score: number | null };

export function QuestionFlow({ assessmentId, questions, themes, answers, startQuestionId, nextPath }: {
  assessmentId: string; questions: Question[]; themes: ThemeView[]; answers: SavedAnswer[]; startQuestionId?: string; nextPath: string;
}) {
  const router = useRouter();
  const scaleQuestions = useMemo(() => questions.filter((question) => question.tipo === "escala"), [questions]);
  const startIndex = Math.max(0, scaleQuestions.findIndex((question) => question.id === startQuestionId));
  const [index, setIndex] = useState(startIndex);
  const [saved, setSaved] = useState(() => Object.fromEntries(answers.flatMap((answer) => answer.score === null ? [] : [[answer.question_id, answer.score]])) as Record<string, number>);
  const [seenThemes, setSeenThemes] = useState<Set<string>>(() => new Set(scaleQuestions.slice(0, startIndex).map((question) => question.theme_id ?? "")));
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [pending, startTransition] = useTransition();
  const current = scaleQuestions[index];
  const canContinue = current ? !current.obrigatoria || Boolean(saved[current.id]) : false;
  const theme = themes.find((item) => item.id === current?.theme_id);
  const isThemeIntro = Boolean(theme && !seenThemes.has(theme.id) && scaleQuestions.findIndex((question) => question.theme_id === theme.id) === index);
  const progress = scaleQuestions.length ? Math.round((index / scaleQuestions.length) * 100) : 0;

  if (!current) return <div className="surface empty-state">Não há perguntas pontuadas disponíveis neste questionário.</div>;
  const handleAnswer = (score: number) => {
    const previous = saved[current.id];
    setSaved((state) => ({ ...state, [current.id]: score }));
    setError("");
    setStatus("Salvando resposta...");
    startTransition(async () => {
      const result = await saveScaleAnswerAction({ assessmentId, questionId: current.id, score });
      if (result.error) {
        setError(result.error);
        setStatus("");
        setSaved((state) => {
          const next = { ...state };
          if (previous === undefined) delete next[current.id]; else next[current.id] = previous;
          return next;
        });
      } else {
        setStatus("Resposta salva");
      }
    });
  };
  const next = () => {
    if (!canContinue || pending) return;
    if (index === scaleQuestions.length - 1) router.push(nextPath);
    else {
      if (theme) setSeenThemes((state) => new Set(state).add(theme.id));
      setIndex((value) => value + 1);
      setError("");
      setStatus("");
    }
  };

  return (
    <div style={{ maxWidth: 850, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)" }}><span>Questionário DISC</span><span>{index + 1} de {scaleQuestions.length}</span></div>
      <div role="progressbar" aria-label="Progresso da avaliação" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} style={{ height: 5, marginTop: 10, background: "#dce4ef", borderRadius: 8 }}><div style={{ width: `${Math.max(progress, 2)}%`, height: "100%", background: "var(--blue)", borderRadius: 8, transition: "width .25s" }} /></div>
      <motion.section key={isThemeIntro ? `intro-${theme?.id}` : current.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }} className="surface" style={{ marginTop: 28, padding: "clamp(24px, 5vw, 48px)" }}>
        {isThemeIntro ? <>
          <p className="eyebrow">Tema {theme?.ordem} de 8</p><h1 style={{ fontSize: 32, margin: "10px 0" }}>{theme?.nome}</h1>
          <p className="muted" style={{ lineHeight: 1.7, maxWidth: 590 }}>{theme?.descricao}</p>
          <button type="button" className="button-primary" onClick={() => setSeenThemes((state) => new Set(state).add(theme?.id ?? ""))} style={{ marginTop: 18 }}>Começar tema <ArrowRight size={16} /></button>
        </> : <>
          <p className="eyebrow">{theme?.nome ?? "Pergunta"}</p>
          <h1 style={{ maxWidth: 700, margin: "14px auto 34px", textAlign: "center", fontSize: "clamp(23px, 4vw, 31px)", lineHeight: 1.35 }}>{current.texto}</h1>
          <ScaleOptions value={saved[current.id]} onChange={handleAnswer} disabled={pending} />
          <div aria-live="polite" style={{ minHeight: 25, marginTop: 12, fontSize: 11, color: error ? "var(--red)" : "var(--muted)" }}>{error || (status && <><Save size={12} style={{ verticalAlign: "middle", marginRight: 5 }} />{status}</>)}</div>
        </>}
      </motion.section>
      {!isThemeIntro && <div style={{ display: "flex", justifyContent: "space-between", marginTop: 18 }}>
        <button type="button" className="button-secondary" disabled={index === 0 || pending} onClick={() => { setIndex((value) => Math.max(0, value - 1)); setError(""); setStatus(""); }}><ArrowLeft size={15} /> Voltar</button>
        <button type="button" className="button-primary" disabled={!canContinue || pending} onClick={next}>{index === scaleQuestions.length - 1 ? "Continuar" : "Próxima pergunta"} {index === scaleQuestions.length - 1 ? <Check size={15} /> : <ArrowRight size={15} />}</button>
      </div>}
      <p className="muted" style={{ textAlign: "center", fontSize: 11, marginTop: 25 }}>Responda considerando seu comportamento real. Não há respostas certas ou erradas.</p>
    </div>
  );
}