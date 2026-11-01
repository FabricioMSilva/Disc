"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, Plus } from "lucide-react";
import { createQuestionnaireAction } from "@/app/questionnaire-actions";

const schema = z.object({ title: z.string().trim().min(2, "Informe ao menos dois caracteres.").max(160), description: z.string().max(2000), visibility: z.enum(["private", "team", "organization"]) });
type Values = z.infer<typeof schema>;

export function QuestionnaireCreateForm() {
  const [open, setOpen] = useState(true);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const { register, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { title: "", description: "", visibility: "private" } });
  const submit = (values: Values) => startTransition(async () => {
    const result = await createQuestionnaireAction(values);
    if (result?.error) setError(result.error);
  });
  if (!open) return <button type="button" className="button-primary" onClick={() => setOpen(true)}><Plus size={15} /> Novo questionário</button>;
  return <form className="surface" onSubmit={handleSubmit(submit)} style={{ padding: 20, display: "grid", gap: 12, marginTop: 18 }}>
    <h2 style={{ fontSize: 17, margin: 0 }}>Novo questionário</h2>
    <div><label className="field-label" htmlFor="title">Título</label><input id="title" className="field" {...register("title")} />{errors.title && <p role="alert" style={{ color: "var(--red)", fontSize: 11 }}>{errors.title.message}</p>}</div>
    <div><label className="field-label" htmlFor="description">Descrição</label><textarea id="description" className="field" rows={3} style={{ padding: 11 }} {...register("description")} /></div>
    <div><label className="field-label" htmlFor="visibility">Visibilidade</label><select id="visibility" className="field" {...register("visibility")}><option value="private">Privado</option><option value="team">Equipe</option><option value="organization">Organização</option></select></div>
    {error && <p role="alert" style={{ color: "var(--red)", fontSize: 12 }}>{error}</p>}
    <div style={{ display: "flex", gap: 8 }}><button className="button-primary" disabled={pending}>{pending ? "Criando..." : "Criar rascunho"} <ArrowRight size={14} /></button><button type="button" className="button-secondary" onClick={() => setOpen(false)}>Cancelar</button></div>
  </form>;
}