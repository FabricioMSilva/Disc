"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CalendarClock } from "lucide-react";
import { createCampaignAction } from "@/app/campaign-actions";

type Option = { id: string; name: string };
type VersionOption = { id: string; title: string; version: number };

export function CampaignCreateForm({ teams, versions }: { teams: Option[]; versions: VersionOption[] }) {
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const toggleTeam = (id: string) => setTeamIds((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  const submit = (formData: FormData) => startTransition(async () => {
    const starts = String(formData.get("startsAt"));
    const ends = String(formData.get("endsAt"));
    const result = await createCampaignAction({
      name: String(formData.get("name")), description: String(formData.get("description")),
      versionId: String(formData.get("versionId")), teamIds,
      startsAt: new Date(starts).toISOString(), endsAt: ends ? new Date(ends).toISOString() : null,
      resultVisibility: String(formData.get("resultVisibility")),
    });
    if (result.error) setError(result.error);
    else if (result.campaignId) router.push(`/campanhas/${result.campaignId}`);
  });
  return <form action={submit} className="surface" style={{ padding: 20, display: "grid", gap: 13 }}>
    <div><label className="field-label" htmlFor="campaign-name">Nome da campanha</label><input id="campaign-name" name="name" className="field" required minLength={2} maxLength={160} /></div>
    <div><label className="field-label" htmlFor="campaign-description">Descrição</label><textarea id="campaign-description" name="description" className="field" rows={2} maxLength={2000} style={{ padding: 11 }} /></div>
    <div><label className="field-label" htmlFor="versionId">Questionário publicado</label><select className="field" id="versionId" name="versionId" required defaultValue=""><option value="" disabled>Selecione uma versão</option>{versions.map((version) => <option key={version.id} value={version.id}>{version.title} · v{version.version}</option>)}</select></div>
    <fieldset style={{ border: "1px solid var(--line)", borderRadius: 6, padding: 12 }}><legend className="field-label" style={{ padding: "0 5px" }}>Equipes participantes</legend>{teams.length ? teams.map((team) => <label key={team.id} style={{ display: "flex", gap: 8, padding: "5px 0", fontSize: 12 }}><input type="checkbox" checked={teamIds.includes(team.id)} onChange={() => toggleTeam(team.id)} />{team.name}</label>) : <span className="muted" style={{ fontSize: 11 }}>Nenhuma equipe disponível no seu escopo.</span>}</fieldset>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><div><label className="field-label" htmlFor="startsAt">Abertura</label><input className="field" type="datetime-local" id="startsAt" name="startsAt" required /></div><div><label className="field-label" htmlFor="endsAt">Encerramento</label><input className="field" type="datetime-local" id="endsAt" name="endsAt" /></div></div>
    <div><label className="field-label" htmlFor="resultVisibility">Quem pode ver resultados individuais</label><select className="field" id="resultVisibility" name="resultVisibility"><option value="admin">Administradores</option><option value="manager">Administradores e gestores da equipe</option><option value="participant">Administradores e o próprio participante</option></select></div>
    {error && <p role="alert" style={{ color: "var(--red)", fontSize: 11 }}>{error}</p>}
    <button className="button-primary" disabled={pending || !teams.length || !versions.length}>{pending ? "Criando campanha..." : "Criar campanha"} <ArrowRight size={14} /></button>
    <p className="muted" style={{ fontSize: 10, margin: 0 }}><CalendarClock size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />Convites ficam pendentes até o participante acessar a plataforma.</p>
  </form>;
}