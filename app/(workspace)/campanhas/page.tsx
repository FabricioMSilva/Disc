import Link from "next/link";
import { ArrowUpRight, CalendarClock } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { CampaignCreateForm } from "@/components/campaigns/CampaignCreateForm";

export default async function CampaignsPage() {
  const { supabase, profile } = await requireUser();
  const [{ data: campaigns }, { data: teams }, { data: versions }, { data: questionnaires }] = await Promise.all([
    supabase.from("campaigns").select("id,name,description,status,starts_at,ends_at,result_visibility").order("starts_at", { ascending: false }),
    supabase.from("teams").select("id,name").eq("active", true).order("name"),
    supabase.from("questionnaire_versions").select("id,questionnaire_id,version_number,status").eq("status", "published"),
    supabase.from("questionnaires").select("id,title").eq("status", "published"),
  ]);
  const titles = new Map((questionnaires ?? []).map((item) => [item.id, item.title]));
  const versionsForSelect = (versions ?? []).flatMap((version) => {
    const title = titles.get(version.questionnaire_id);
    return title ? [{ id: version.id, title, version: version.version_number }] : [];
  });
  const canCreate = Boolean(profile && ["super_admin", "admin", "manager"].includes(profile.role));
  return <>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "end", flexWrap: "wrap" }}><div><p className="eyebrow">Distribuição e participação</p><h1 className="page-title">Campanhas</h1><p className="page-subtitle">Agende avaliações para equipes e acompanhe a participação.</p></div><CalendarClock color="var(--blue)" /></div>
    {canCreate && <section style={{ marginTop: 22 }}><h2 style={{ fontSize: 18 }}>Criar campanha</h2><CampaignCreateForm teams={teams ?? []} versions={versionsForSelect} /></section>}
    <section style={{ marginTop: 28 }}><h2 style={{ fontSize: 18 }}>Campanhas disponíveis no seu escopo</h2><div style={{ display: "grid", gap: 10, marginTop: 12 }}>{campaigns?.length ? campaigns.map((campaign) => <article key={campaign.id} className="surface" style={{ padding: 18, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}><div><h3 style={{ margin: 0, fontSize: 15 }}>{campaign.name}</h3><p className="muted" style={{ fontSize: 11, margin: "5px 0" }}>{campaign.description || "Sem descrição"}</p><p className="muted" style={{ fontSize: 10, margin: 0 }}>{new Date(campaign.starts_at).toLocaleString("pt-BR")} · {campaign.ends_at ? new Date(campaign.ends_at).toLocaleString("pt-BR") : "Sem data de encerramento"}</p></div><div style={{ display: "flex", gap: 8, alignItems: "center" }}><span className="status">{campaign.status}</span><Link className="button-secondary" href={`/campanhas/${campaign.id}`} style={{ minHeight: 34, fontSize: 11 }}>Detalhes <ArrowUpRight size={13} /></Link></div></article>) : <div className="surface empty-state">Não há campanhas disponíveis neste escopo.</div>}</div></section>
  </>;
}