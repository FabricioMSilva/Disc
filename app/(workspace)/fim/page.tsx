import { redirect } from "next/navigation";
import { getAssessmentSnapshot } from "@/app/assessment-actions";

export default async function FinishPage() {
  const { assessment } = await getAssessmentSnapshot();
  if (!assessment || assessment.status !== "concluida") redirect("/painel");
  redirect(`/resultados/${assessment.id}`);
}