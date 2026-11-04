"use client";

import { Check } from "lucide-react";
import { shuffleForAssessment } from "@/lib/assessment-order";

const options = [
  "Nunca me identifico",
  "Raramente me identifico",
  "Às vezes me identifico",
  "Frequentemente me identifico",
  "Sempre me identifico",
] as const;

export function ScaleOptions({ assessmentId, questionId, value, onChange, disabled = false, responseLabels }: {
  assessmentId: string;
  questionId: string;
  value?: number;
  onChange: (score: number) => void;
  disabled?: boolean;
  responseLabels?: readonly string[];
}) {
  const shuffled = shuffleForAssessment(
    (responseLabels ?? options).map((label, index) => ({ label, score: index + 1 })),
    `${assessmentId}:${questionId}:responses`,
  );
  const displayedOptions = shuffled.length > 1 && shuffled.every((option, index) => option.score === index + 1)
    ? [...shuffled.slice(1), shuffled[0]]
    : shuffled;
  return (
    <div className="scale-options" role="radiogroup" aria-label="Identificação com a situação">
      {displayedOptions.map(({ label, score }) => {
        return (
          <label key={score} className="scale-option">
            <input
              className="scale-option-input"
              type="radio"
              name={`scale-${questionId}`}
              value={score}
              checked={value === score}
              disabled={disabled}
              aria-label={label}
              onChange={() => onChange(score)}
            />
            <span className="scale-option-card">
              <span className="scale-option-label">{label}</span>
              <span className="scale-option-check" aria-hidden="true"><Check size={14} strokeWidth={2.5} /></span>
            </span>
          </label>
        );
      })}
    </div>
  );
}