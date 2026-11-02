export function QuestionProgress({ label, current, total, ariaLabel }: {
  label: string;
  current: number;
  total: number;
  ariaLabel: string;
}) {
  const progress = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div className="question-progress">
      <div className="question-progress-meta">
        <div className="question-progress-label">
          <span className="question-progress-mark">DISC</span>
          <span>{label}</span>
        </div>
        <div className="question-progress-count">
          <span>Pergunta {current} de {total}</span>
          <strong>{progress}%</strong>
        </div>
      </div>
      <div
        className="question-progress-track"
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={`${current} de ${total} perguntas, ${progress}%`}
      >
        <div className="question-progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
