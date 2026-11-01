"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, ArrowUpRight, Check, Copy, FilePlus2, Rocket } from "lucide-react";
import { addQuestionAction, cloneQuestionnaireVersionAction, publishQuestionnaireAction } from "@/app/questionnaire-actions";

const schema = z.object({
  text: z.string().trim().min(4, "A pergunta deve ter pelo menos 4 caracteres.").max(1000),
  type: z.enum(["escala", "likert", "escolha_unica", "multipla_escolha", "texto", "numero", "data", "booleano"]),
  required: z.boolean(), weight: z.coerce.number().min(0.1).max(10), dimension: z.string().max(40), options: z.string().max(1000),
});
type Values = z.infer<typeof schema>;
type QuestionView = { id: string; texto: string; tipo: string; obrigatoria: boolean; ordem: number; dimension_code: string | null };

export function QuestionnaireBuilder({ questionnaireId, questionnaireTitle, versionId, versionNumber, versionStatus, sectionId, questions }: {
  questionnaireId: string; questionnaireTitle: string; versionId: string; versionNumber: number; versionStatus: string; sectionId: string; questions: QuestionView[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<z.input<typeof schema>, unknown, Values>({ resolver: zodResolver(schema), defaultValues: { text: "", type: "escala", required: true, weight: 1, dimension: "", options: "" } });
  const questionType = watch("type");
  const editable = versionStatus === "draft";
  const submit = (values: Values) => startTransition(async () => {
    const result = await addQuestionAction({ sectionId, ...values });
    if (result.error) setError(result.error); else { setError(""); setMessage("Pergunta adicionada ao rascunho."); reset({ ...values, text: "", options: "" }); router.refresh(); }
  });
  const publish = () => startTransition(async () => {
    const result = await publishQuestionnaireAction(versionId);
    if (result.error) setError(result.error); else { setMessage("Versão publicada."); setError(""); router.refresh(); }
  });
  const clone = () => startTransition(async () => {
    const result = await cloneQuestionnaireVersionAction(questionnaireId);
    if (result.error) setError(result.error); else { setMessage("Nova versão criada como rascunho."); router.refresh(); }
  });
  return <>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><Link href="/questionarios" className="muted" style={{ display: "inline-flex", gap: 5, alignItems: "center", fontSize: 11 }}><ArrowLeft size={13} /> Questionários</Link><p className="eyebrow" style={{ marginTop: 16 }}>Question builder</p><h1 className="page-title">{questionnaireTitle}</h1><p className="page-subtitle">Versão {versionNumber} <span className="status" style={{ marginLeft: 8 }}>{versionStatus === "draft" ? "Rascunho" : versionStatus}</span></p></div>
      <div style={{ display: "flex", gap: 8 }}>{editable ? <button className="button-primary" type="button" disabled={pending || questions.length === 0} onClick={publish}><Rocket size={15} /> Publicar versão</button> : <button className="button-secondary" type="button" disabled={pending} onClick={clone}><Copy size={14} /> Nova versão</button>}</div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(290px, .75fr)", gap: 14, marginTop: 24, alignItems: "start" }}>
      <section className="surface" style={{ overflow: "hidden" }}><div style={{ padding: "16px 18px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between" }}><strong style={{ fontSize: 13 }}>Canvas do questionário</strong><span className="muted" style={{ fontSize: 11 }}>{questions.length} perguntas</span></div>
        {questions.length ? questions.map((question) => <article key={question.id} style={{ padding: "16px 18px", borderBottom: "1px solid #edf1f6", display: "grid", gridTemplateColumns: "30px 1fr auto", gap: 12, alignItems: "start" }}><span style={{ color: "var(--blue)", font: "600 12px 'Space Grotesk'" }}>{String(question.ordem).padStart(2, "0")}</span><div><div style={{ fontSize: 13, lineHeight: 1.5 }}>{question.texto}</div><div className="muted" style={{ marginTop: 5, fontSize: 10 }}>{question.dimension_code || "Geral"} · {question.obrigatoria ? "Obrigatória" : "Opcional"}</div></div><span className="status">{question.tipo.replace("_", " ")}</span></article>) : <div className="empty-state"><FilePlus2 size={22} style={{ margin: "0 auto 10px" }} /><div>Este rascunho ainda não tem perguntas.</div></div>}
      </section>
      <div style={{ display: "grid", gap: 14 }}>
        {editable && <form className="surface" onSubmit={handleSubmit(submit)} style={{ padding: 18, display: "grid", gap: 12 }}>
          <strong style={{ fontSize: 13 }}>Adicionar pergunta</strong>
          <div><label className="field-label" htmlFor="question-text">Texto</label><textarea id="question-text" rows={3} className="field" style={{ padding: 11 }} {...register("text")} />{errors.text && <p role="alert" style={{ color: "var(--red)", fontSize: 10 }}>{errors.text.message}</p>}</div>
          <div><label className="field-label" htmlFor="question-type">Tipo de resposta</label><select id="question-type" className="field" {...register("type")}><option value="escala">Escala de frequência</option><option value="likert">Escala Likert</option><option value="escolha_unica">Escolha única</option><option value="multipla_escolha">Múltipla escolha</option><option value="texto">Texto longo</option><option value="numero">Número</option><option value="data">Data</option><option value="booleano">Sim ou não</option></select></div>
          {["escala", "likert", "escolha_unica", "multipla_escolha"].includes(questionType) && <div><label className="field-label" htmlFor="options">Alternativas (uma por linha; vazio usa escala Nunca a Sempre)</label><textarea id="options" rows={4} className="field" style={{ padding: 11 }} {...register("options")} /></div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}><div><label className="field-label" htmlFor="dimension">Dimensão</label><input id="dimension" className="field" {...register("dimension")} /></div><div><label className="field-label" htmlFor="weight">Peso</label><input id="weight" type="number" step="0.1" min="0.1" max="10" className="field" {...register("weight")} /></div></div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}><input type="checkbox" {...register("required")} /> Obrigatória</label>
          {error && <p role="alert" style={{ color: "var(--red)", fontSize: 11 }}>{error}</p>}{message && <p role="status" style={{ color: "var(--green)", fontSize: 11 }}><Check size={12} style={{ verticalAlign: "middle" }} /> {message}</p>}
          <button type="submit" disabled={pending} className="button-primary">Adicionar ao rascunho <ArrowUpRight size={14} /></button>
        </form>}
        {!editable && <div className="surface" style={{ padding: 19 }}><p className="eyebrow">Versão somente leitura</p><p className="muted" style={{ fontSize: 12, lineHeight: 1.6 }}>Conteúdo publicado é imutável. Crie uma nova versão para alterar perguntas sem modificar avaliações históricas.</p></div>}
      </div>
    </div>
  </>;
}