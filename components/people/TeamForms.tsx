"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserRoundCog } from "lucide-react";
import { assignManagerAction, createTeamAction } from "@/app/admin-actions";

type Option = { id: string; name: string };

export function CreateTeamForm() {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const submit = (formData: FormData) => startTransition(async () => {
    const result = await createTeamAction({ name: String(formData.get("name")), code: String(formData.get("code")), description: String(formData.get("description")) });
    if (result.error) setError(result.error); else { setError(""); router.refresh(); }
  });
  return <form action={submit} className="surface" style={{ padding: 18, display: "grid", gap: 10 }}><strong style={{ fontSize: 13 }}>Criar equipe</strong><input name="name" className="field" aria-label="Nome da equipe" placeholder="Nome da equipe" required minLength={2} maxLength={120} /><input name="code" className="field" aria-label="Código da equipe" placeholder="Código opcional" maxLength={40} /><textarea name="description" className="field" aria-label="Descrição" placeholder="Descrição opcional" rows={2} style={{ padding: 10 }} />{error && <p role="alert" style={{ color: "var(--red)", fontSize: 11 }}>{error}</p>}<button disabled={pending} className="button-primary">{pending ? "Salvando..." : "Criar equipe"} <Plus size={14} /></button></form>;
}

export function AssignManagerForm({ teams, managers }: { teams: Option[]; managers: Option[] }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const submit = (formData: FormData) => startTransition(async () => {
    const start = new Date(String(formData.get("validFrom"))).toISOString();
    const endText = String(formData.get("validUntil"));
    const result = await assignManagerAction({ managerId: String(formData.get("managerId")), teamId: String(formData.get("teamId")), validFrom: start, validUntil: endText ? new Date(endText).toISOString() : null });
    if (result.error) setError(result.error); else { setError(""); router.refresh(); }
  });
  return <form action={submit} className="surface" style={{ padding: 18, display: "grid", gap: 10 }}><strong style={{ fontSize: 13 }}>Vincular gestor a equipe</strong><select className="field" name="managerId" required defaultValue=""><option value="" disabled>Selecione um gestor</option>{managers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select className="field" name="teamId" required defaultValue=""><option value="" disabled>Selecione uma equipe</option>{teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><label className="field-label">Vigência inicial<input type="datetime-local" name="validFrom" className="field" required /></label><label className="field-label">Vigência final opcional<input type="datetime-local" name="validUntil" className="field" /></label>{error && <p role="alert" style={{ color: "var(--red)", fontSize: 11 }}>{error}</p>}<button className="button-primary" disabled={pending || !teams.length || !managers.length}>{pending ? "Salvando..." : "Designar gestor"} <UserRoundCog size={14} /></button></form>;
}