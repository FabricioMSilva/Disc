"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarClock } from "lucide-react";
import { startAssessmentAction } from "@/app/assessment-actions";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export function ParticipantRetakeCard({
  availableAt,
  hasNewCycle,
}: {
  availableAt: string;
  hasNewCycle: boolean;
}) {
  const [now, setNow] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const updateTime = () => setNow(Date.now());
    updateTime();
    const intervalId = window.setInterval(updateTime, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const remainingMs = now === null ? null : new Date(availableAt).getTime() - now;
  const remainingDays = remainingMs === null ? null : Math.max(0, Math.ceil(remainingMs / 86_400_000));
  const cooldownActive = remainingMs === null || remainingMs > 0;
  const canStart = hasNewCycle && !cooldownActive;

  const start = () => startTransition(async () => {
    setError("");
    const result = await startAssessmentAction();
    if (result?.error) setError(result.error);
    else router.refresh();
  });

  const buttonLabel = remainingMs === null
    ? "Verificando prazo..."
    : cooldownActive
      ? `Nova avaliação em ${remainingDays} ${remainingDays === 1 ? "dia" : "dias"}`
    : canStart
      ? "Refazer avaliação"
      : "Aguardando nova avaliação";

  return <section className="surface participant-retake-card no-print">
    <div className="participant-retake-icon" aria-hidden="true"><CalendarClock size={21} /></div>
    <div className="participant-retake-copy">
      <p className="eyebrow">Seu próximo passo</p>
      <h2>Você poderá fazer uma nova avaliação em {formatDate(availableAt)}</h2>
      <p>
        O intervalo de três meses ajuda você a observar seu desenvolvimento ao longo do tempo.
        {hasNewCycle ? "" : " Uma nova avaliação ainda precisa ser liberada pela equipe."}
      </p>
      {error && <p className="participant-retake-error" role="alert">{error}</p>}
    </div>
    <button className="button-primary participant-retake-button" type="button" disabled={!canStart || pending} onClick={start}>
      {pending ? "Abrindo..." : buttonLabel}
      {canStart && !pending && <ArrowRight size={15} />}
    </button>
  </section>;
}
