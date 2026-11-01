import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { QuestionnaireCreateForm } from "@/components/questionnaires/QuestionnaireCreateForm";

export default async function CreateQuestionnairePage() {
  const { profile } = await requireUser();
  if (!profile || !["super_admin", "admin", "manager", "questionnaire_editor"].includes(profile.role)) redirect("/acesso-negado");
  return <><p className="eyebrow">Question builder</p><h1 className="page-title">Criar questionário</h1><p className="page-subtitle">Um novo rascunho é criado com sua primeira versão e seção.</p><div style={{ maxWidth: 620, marginTop: 22 }}><QuestionnaireCreateForm /></div></>;
}