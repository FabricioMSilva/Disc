import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { requireUser } from "@/lib/auth";

export default async function AssessmentsPage() {
  const { supabase, user } = await requireUser();
  const [{ data: cycles }, { data: assessments }] = await Promise.all([
    supabase.from("assessment_cycles").select("id,titulo,descricao,data_inicio,data_fim").eq("ativo", true).order("data_inicio", { ascending: false }),
    supabase.from("assessments").select("id,cycle_id,status,iniciada_em,concluida_em").eq("user_id", user.id).order("created_at", { ascending: false }),
  ]);
  const existingByCycle = new Map((assessments ?? []).map((assessment) => [assessment.cycle_id, assessment]));
  return <><p className="eyebrow">Participação</p><h1 className="page-title">Minhas avaliações</h1><p className="page-subtitle">Avaliações disponíveis para sua conta e seu histórico recente.</p>
    <div style={{ display: "grid", gap: 12, marginTop: 26 }}>{(cycles ?? []).length ? cycles?.map((cycle) => {
      const current = existingByCycle.get(cycle.id);
      const done = current?.status === "concluida";
      return <article key={cycle.id} className="surface" style={{ padding: 20, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap" }}>
        <div><p className="eyebrow">DISC e competências operacionais</p><h2 style={{ fontSize: 19, margin: "6px 0" }}>{cycle.titulo}</h2><p className="muted" style={{ fontSize: 12, margin: 0 }}>{cycle.descricao ?? "Autoavaliação comportamental e operacional."}</p><p className="muted" style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 6 }}><CalendarDays size={13} />{cycle.data_fim ? `Disponível até ${new Date(cycle.data_fim).toLocaleDateString("pt-BR")}` : "Disponível"}</p></div>
        {done ? <span className="status">Concluída</span> : <Link className="button-primary" href={current ? "/avaliacao" : "/identificacao"}>{current ? "Continuar" : "Começar"} <ArrowRight size={15} /></Link>}
      </article>;
    }) : <div className="surface empty-state">Não há avaliações disponíveis no momento.</div>}</div>
  </>;
}