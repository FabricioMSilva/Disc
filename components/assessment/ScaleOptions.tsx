"use client";

import { Check } from "lucide-react";

const options = [
  "Nunca me identifico",
  "Raramente me identifico",
  "Às vezes me identifico",
  "Frequentemente me identifico",
  "Sempre me identifico",
] as const;

export function ScaleOptions({ questionId, value, onChange, disabled = false, responseLabels }: {
  questionId: string;
  value?: number;
  onChange: (score: number) => void;
  disabled?: boolean;
  responseLabels?: readonly string[];
}) {
  return (
    <div className="scale-options" role="radiogroup" aria-label="Identificação com a situação">
      {(responseLabels ?? options).map((label, index) => {
        const score = index + 1;
        return (
          <label key={label} className="scale-option">
            <input
              className="scale-option-input"
              type="radio"
              name={`scale-${questionId}`}
              value={score}
              checked={value === score}
              disabled={disabled}
              aria-label={`${score}: ${label}`}
              onChange={() => onChange(score)}
            />
            <span className="scale-option-card">
              <span className="scale-option-number" aria-hidden="true">{score}</span>
              <span className="scale-option-label">{label}</span>
              <span className="scale-option-check" aria-hidden="true"><Check size={14} strokeWidth={2.5} /></span>
            </span>
          </label>
        );
      })}
    </div>
  );
}