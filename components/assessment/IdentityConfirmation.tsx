"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, UserRound, X } from "lucide-react";
import { startAssessmentAction } from "@/app/assessment-actions";

export function IdentityConfirmation({ name, email }: { name: string; email: string }) {
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const start = () => startTransition(async () => {
    const result = await startAssessmentAction();
    if (result?.error) setError(result.error);
    else router.push("/avaliacao");
  });
  return (
    <section className="surface" style={{ maxWidth: 650, margin: "36px auto 0", padding: "clamp(24px, 5vw, 42px)" }}>
      <div style={{ width: 48, height: 48, display: "grid", placeItems: "center", borderRadius: 8, color: "var(--blue)", background: "#e8f3ff" }}><UserRound size={23} /></div>
      <p className="eyebrow" style={{ marginTop: 24 }}>Confirmação de identidade</p>
      <h1 style={{ fontSize: 23, margin: "8px 0 20px" }}>Você confirma que é a pessoa identificada nesta conta?</h1>
      <div style={{ padding: 17, background: "var(--page)", borderRadius: 6, display: "grid", gap: 5, marginBottom: 19 }}>
        <strong>{name || "Nome não informado"}</strong><span className="muted" style={{ fontSize: 12 }}>{email}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
        <button type="button" className={confirmed ? "button-primary" : "button-secondary"} onClick={() => { setConfirmed(true); setError(""); }}><Check size={15} /> Sim, sou eu</button>
        <button type="button" className="button-secondary" onClick={() => router.push("/acesso-negado")}><X size={15} /> Não, esta não é minha conta</button>
      </div>
      {error && <p role="alert" style={{ color: "var(--red)", fontSize: 12, marginTop: 16 }}>{error}</p>}
      <button type="button" className="button-primary" disabled={!confirmed || pending} onClick={start} style={{ width: "100%", marginTop: 21 }}>{pending ? "Iniciando..." : "Iniciar avaliação"} {!pending && <ArrowRight size={16} />}</button>
    </section>
  );
}