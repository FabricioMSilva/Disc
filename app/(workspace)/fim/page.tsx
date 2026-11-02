import { redirect } from "next/navigation";
import Link from "next/link";
import { CircleCheck } from "lucide-react";
import { getAssessmentSnapshot } from "@/app/assessment-actions";

export default async function FinishPage() {
  const { assessment } = await getAssessmentSnapshot();
  if (!assessment || assessment.status !== "concluida") redirect("/painel");
  return <section className="surface" style={{ maxWidth: 650, margin: "50px auto", padding: "clamp(28px, 6vw, 54px)", textAlign: "center" }}>
    <div style={{ width: 58, height: 58, margin: "0 auto 20px", display: "grid", placeItems: "center", borderRadius: "50%", background: "#e4f8f2", color: "var(--green)" }}><CircleCheck size={30} /></div>
    <p className="eyebrow">Avaliação concluída</p><h1 className="page-title">Seu resultado está pronto</h1>
    <p className="page-subtitle" style={{ maxWidth: 460, margin: "12px auto 24px", lineHeight: 1.7 }}>Sua avaliação foi registrada. Consulte seu dashboard individual e suas respostas.</p>
    <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 9 }}>
      <Link href={`/resultados/${assessment.id}`} className="button-primary">Ver meu dashboard</Link>
      <Link href="/painel" className="button-secondary">Voltar ao meu painel</Link>
    </div>
  </section>;
}