"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { setProfileAccessAction } from "@/app/admin-actions";

export function ProfileAccessEditor({ userId, role, status, superAdmin = false }: { userId: string; role: string; status: string; superAdmin?: boolean }) {
  const [nextRole, setNextRole] = useState(role);
  const [nextStatus, setNextStatus] = useState(status);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
    <select aria-label="Função" className="field" value={nextRole} onChange={(event) => setNextRole(event.target.value)} style={{ minWidth: 140, minHeight: 34, fontSize: 10, padding: "0 6px" }}>{(superAdmin ? ["super_admin", "admin", "manager", "questionnaire_editor", "participant", "auditor"] : ["admin", "manager", "questionnaire_editor", "participant", "auditor"]).map((item) => <option key={item} value={item}>{item.replace("_", " ")}</option>)}{role === "super_admin" && !superAdmin && <option value="super_admin" disabled>super admin</option>}</select>
    <select aria-label="Status" className="field" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)} style={{ minWidth: 100, minHeight: 34, fontSize: 10, padding: "0 6px" }}><option value="active">Ativo</option><option value="inactive">Inativo</option><option value="invited">Convidado</option></select>
    <button type="button" title="Salvar acesso" aria-label="Salvar acesso" className="button-secondary" disabled={pending || (nextRole === role && nextStatus === status)} onClick={() => startTransition(async () => { const result = await setProfileAccessAction({ userId, role: nextRole, status: nextStatus }); if (result.error) setError(result.error); else { setError(""); router.refresh(); } })} style={{ minHeight: 34, padding: "0 8px" }}><Save size={13} /></button>
    {error && <span role="alert" style={{ color: "var(--red)", fontSize: 10 }}>{error}</span>}
  </div>;
}