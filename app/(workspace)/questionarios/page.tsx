import Link from "next/link";
import { ArrowUpRight, FileQuestion, Plus } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { QuestionnaireCreateForm } from "@/components/questionnaires/QuestionnaireCreateForm";

const editors = ["super_admin", "admin", "manager", "questionnaire_editor"];

export default async function QuestionnairesPage() {
  const { supabase, profile } = await requireUser();
  const { data: questionnaires } = await supabase.from("questionnaires").select("id,title,description,status,visibility,updated_at")
    .order("updated_at", { ascending: false });
  const canCreate = Boolean(profile && editors.includes(profile.role));
  return <>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "end", flexWrap: "wrap" }}><div><p className="eyebrow">Question builder</p><h1 className="page-title">Questionários</h1><p className="page-subtitle">Modelos publicados e rascunhos disponíveis no seu escopo.</p></div>{canCreate && <a className="button-primary" href="#new-questionnaire"><Plus size={15} /> Criar questionário</a>}</div>
    {canCreate && <div id="new-questionnaire"><QuestionnaireCreateForm /></div>}
    <div style={{ display: "grid", gap: 11, marginTop: 22 }}>{questionnaires?.length ? questionnaires.map((item) => <article className="surface" key={item.id} style={{ padding: 19, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: 13, alignItems: "center" }}><div style={{ width: 40, height: 40, borderRadius: 7, display: "grid", placeItems: "center", background: "#e8f3ff", color: "var(--blue)" }}><FileQuestion size={18} /></div><div><h2 style={{ fontSize: 15, margin: 0 }}>{item.title}</h2><p className="muted" style={{ fontSize: 11, margin: "4px 0 0" }}>{item.description || "Sem descrição"}</p></div></div>
      <div style={{ display: "flex", gap: 9, alignItems: "center" }}><span className="status">{item.status}</span>{canCreate && <Link href={`/questionarios/${item.id}/editar`} className="button-secondary" style={{ minHeight: 34, fontSize: 11 }}>Abrir <ArrowUpRight size={13} /></Link>}</div>
    </article>) : <div className="surface empty-state">Não há questionários disponíveis neste escopo.</div>}</div>
  </>;
}