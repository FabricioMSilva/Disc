export const ASSESSMENT_RETAKE_MONTHS = 3;

export function getAssessmentRetakeDate(completedAt: string | null) {
  if (!completedAt) return null;

  const date = new Date(completedAt);
  if (Number.isNaN(date.getTime())) return null;

  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + ASSESSMENT_RETAKE_MONTHS);
  const lastDayOfMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDayOfMonth));
  return date.toISOString();
}
