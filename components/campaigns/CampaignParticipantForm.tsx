"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { assignCampaignParticipantAction } from "@/app/campaign-actions";

type Option = { id: string; name: string; teamId: string };

export function CampaignParticipantForm({ campaignId, participants, assignedIds }: { campaignId: string; participants: Option[]; assignedIds: string[] }) {
  const [participantId, setParticipantId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const available = participants.filter((person) => !assignedIds.includes(person.id));
  const submit = () => {
    const person = available.find((item) => item.id === participantId);
    if (!person) return;
    startTransition(async () => {
      const result = await assignCampaignParticipantAction({ campaignId, participantId: person.id, teamId: person.teamId });
      if (result.error) setError(result.error); else { setError(""); setMessage("Participante atribuído."); setParticipantId(""); router.refresh(); }
    });
  };
  return <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><select aria-label="Participante" className="field" value={participantId} onChange={(event) => setParticipantId(event.target.value)} style={{ maxWidth: 360 }}><option value="">Selecionar integrante</option>{available.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select><button className="button-primary" type="button" disabled={!participantId || pending} onClick={submit}><UserPlus size={14} /> Atribuir</button>{error && <span role="alert" style={{ color: "var(--red)", fontSize: 11 }}>{error}</span>}{message && <span role="status" style={{ color: "var(--green)", fontSize: 11 }}>{message}</span>}</div>;
}