import { redirect } from "next/navigation";
import { IdentityConfirmation } from "@/components/assessment/IdentityConfirmation";
import { getAssessmentSnapshot } from "@/app/assessment-actions";
import { requireUser } from "@/lib/auth";

export default async function IdentificationPage() {
  const { user, profile } = await requireUser();
  const { assessment } = await getAssessmentSnapshot();
  if (assessment?.status === "concluida") redirect(`/resultados/${assessment.id}`);
  const name = profile?.nome || String(user.user_metadata.name ?? user.user_metadata.full_name ?? "");
  return <><p className="eyebrow">Antes de começar</p><h1 className="page-title">Identificação</h1><p className="page-subtitle">Confirme seus dados para iniciar ou continuar a avaliação.</p><IdentityConfirmation name={name} email={user.email ?? ""} /></>;
}