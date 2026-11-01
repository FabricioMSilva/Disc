import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { QuestionnaireBuilder } from "@/components/questionnaires/QuestionnaireBuilder";

export default async function EditQuestionnairePage({ params }: { params: Promise<{ id: string }> }) {
  const [{ id }, { supabase, profile }] = await Promise.all([params, requireUser()]);
  if (!profile || !["super_admin", "admin", "manager", "questionnaire_editor"].includes(profile.role)) redirect("/acesso-negado");
  const { data: questionnaire } = await supabase.from("questionnaires").select("id,title").eq("id", id).maybeSingle();
  if (!questionnaire) notFound();
  const { data: versions } = await supabase.from("questionnaire_versions").select("id,version_number,status")
    .eq("questionnaire_id", id).order("version_number", { ascending: false });
  const version = versions?.find((item) => item.status === "draft") ?? versions?.[0];
  if (!version) notFound();
  const { data: section } = await supabase.from("questionnaire_sections").select("id")
    .eq("version_id", version.id).order("display_order").limit(1).maybeSingle();
  if (!section) notFound();
  const { data: questions } = await supabase.from("questions").select("id,texto,tipo,obrigatoria,ordem,dimension_code")
    .eq("section_id", section.id).order("ordem");
  return <QuestionnaireBuilder questionnaireId={id} questionnaireTitle={questionnaire.title} versionId={version.id}
    versionNumber={version.version_number} versionStatus={version.status} sectionId={section.id} questions={questions ?? []} />;
}