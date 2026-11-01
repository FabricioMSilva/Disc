"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { createInvitationAction } from "@/app/campaign-actions";

type TeamOption = { id: string; name: string };

export function InvitationForm({ teams, manager = false }: { teams: TeamOption[]; manager?: boolean }) {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const submit = (formData: FormData) => startTransition(async () => {
    const result = await createInvitationAction({ email: String(formData.get("email")), teamId: String(formData.get("teamId")), role: manager ? "participant" : String(formData.get("role")) });
    if (result.error) { setError(result.error); setNotice(""); }
    else { setError(""); setNotice("Convite registrado como pendente."); router.refresh(); }
  });
  return <form action={submit} className="surface" style={{ padding: 18, display: "grid", gap: 12 }}>
    <strong style={{ fontSize: 13 }}>Convidar participante</strong>
    <div><label className="field-label" htmlFor="invite-email">E-mail corporativo</label><input id="invite-email" name="email" type="email" className="field" required maxLength={254} /></div>
    <div><label className="field-label" htmlFor="invite-team">Equipe</label><select className="field" id="invite-team" name="teamId" required defaultValue=""><option value="" disabled>Selecione uma equipe</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></div>
    {!manager && <div><label className="field-label" htmlFor="invite-role">Acesso solicitado</label><select className="field" id="invite-role" name="role" defaultValue="participant"><option value="participant">Participante</option><option value="manager">Gestor</option><option value="questionnaire_editor">Editor de questionários</option></select></div>}
    {error && <p role="alert" style={{ color: "var(--red)", fontSize: 11 }}>{error}</p>}{notice && <p role="status" style={{ color: "var(--green)", fontSize: 11 }}>{notice} Compartilhe manualmente o endereço /cadastro; a confirmação de conta usa o e-mail do Supabase Auth.</p>}
    <button className="button-primary" disabled={pending || !teams.length}>{pending ? "Registrando..." : "Registrar convite"} <Send size={14} /></button>
  </form>;
}