import Link from "next/link";
import { ArrowRight, ClipboardCheck } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

export async function PersonalAssessmentCard({ supabase, userId }: {
  supabase: SupabaseClient<Database>;
  userId: string;
}) {
  const { data: assessment, error } = await supabase.from("assessments")
    .select("id,status").eq("user_id", userId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(`Não foi possível carregar sua avaliação pessoal: ${error.message}`);
  const unfinished = assessment?.status === "iniciada" || assessment?.status === "em_andamento";
  const completed = assessment?.status === "concluida";
  const href = unfinished ? "/avaliacao" : completed ? `/resultados/${assessment.id}` : "/identificacao";
  const label = unfinished ? "Retomar minha avaliação" : completed ? "Ver meu resultado" : "Iniciar minha avaliação";
  return <section className="surface" style={{ padding: 20, margin: "20px 0", borderLeft: "4px solid var(--blue)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
    <div>
      <p className="eyebrow">Minha avaliação pessoal</p>
      <h2 style={{ fontSize: 20, margin: "6px 0" }}>{unfinished ? "Continue de onde parou" : completed ? "Seu resultado está disponível" : "Você também faz parte da avaliação"}</h2>
      <p className="muted" style={{ fontSize: 12, margin: 0 }}>{unfinished ? "Suas respostas salvas serão mantidas. Retome a avaliação sem começar novamente." : completed ? "Consulte seu dashboard individual e guarde seu resultado em PDF." : "Seu acesso de gestão não impede que você responda sua própria avaliação."}</p>
    </div>
    <Link href={href} className="button-primary"><ClipboardCheck size={17} />{label}<ArrowRight size={16} /></Link>
  </section>;
}
